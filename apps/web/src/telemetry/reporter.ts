/**
 * Turns errors into crash reports and sends them to `POST /api/errors`: deduplicated by
 * fingerprint, at most five per page load, and nothing that identifies the visitor (no user agent,
 * query string, cookies or exact window size). Loaded lazily by `capture.ts`.
 */

import { matchRoute, normalizePath } from "../router";
import { RELOADED_KEY } from "./capture";
import { browserOf, fingerprint, MAX_REPORTS_PER_PAGE, ownFrames, REPORT_PATH, SAMPLE_RATE, scrub, viewportBucket, type Report, type ReportKind } from "./shared";

declare const __TEXTJS_RELEASE__: string | undefined;

export interface ReportContext {
  origin: string;
  pathname: string;
  release: string;
  userAgent: string;
  width: number;
}

/** Known routes as their path; anything else (typos, probes) as `/404`. */
export function routeOf(pathname: string): string {
  const path = normalizePath(pathname);
  return matchRoute(path).name === "not-found" ? "/404" : path;
}

/**
 * Errors keep their message. Anything else that's thrown or rejected (a string, a plain object, an
 * Event) is free text from who knows where, so only its type is reported. The one exception is the
 * reload marker `capture.ts` writes itself.
 */
function describe(error: unknown, kind: ReportKind): { message: string; stack: string; code: unknown } {
  try {
    if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack ?? "", code: (error as { code?: unknown }).code };
    if (typeof error === "object" && error !== null) {
      const e = error as { name?: unknown; message?: unknown; stack?: unknown; code?: unknown };
      // Errors from another realm (an iframe) fail `instanceof` but still carry a real stack.
      if (typeof e.message === "string" && typeof e.stack === "string" && e.stack.length > 0) {
        return { message: `${typeof e.name === "string" ? e.name : "Error"}: ${e.message}`, stack: e.stack, code: e.code };
      }
    }
    if (kind === "chunk" && typeof error === "string") return { message: error, stack: "", code: undefined };
    const type = typeof error === "object" || typeof error === "undefined" ? Object.prototype.toString.call(error).slice(8, -1) : typeof error;
    return { message: `Non-Error ${kind === "rejection" ? "rejection" : "throw"}: ${type}`, stack: "", code: undefined };
  } catch {
    return { message: "Unreadable error value", stack: "", code: undefined };
  }
}

/** Build a report, or `null` for errors we don't report (third-party code, browser noise). */
export function toReport(error: unknown, kind: ReportKind, ctx: ReportContext): Report | null {
  const { message: raw, stack: rawStack, code } = describe(error, kind);
  const message = scrub(raw.trim()).slice(0, 500);
  if (!message) return null;
  const stack = ownFrames(rawStack, ctx.origin);
  if (stack === null) return null;
  const { browser, os } = browserOf(ctx.userAgent);
  return {
    v: 1,
    kind,
    message,
    stack,
    route: routeOf(ctx.pathname),
    release: ctx.release,
    browser,
    os,
    viewport: viewportBucket(ctx.width),
    code: typeof code === "string" && /^TX\d{3}$/.test(code) ? code : "",
  };
}

/** Per page load: one report per fingerprint, `max` in total. */
export class ReportQueue {
  private readonly seen = new Set<string>();
  private sent = 0;

  constructor(
    private readonly send: (body: string) => void,
    private readonly max: number = MAX_REPORTS_PER_PAGE,
  ) {}

  get full(): boolean {
    return this.sent >= this.max;
  }

  /** `uncapped`: send even when full, without counting toward the cap. */
  add(report: Report, uncapped = false): boolean {
    if (this.full && !uncapped) return false;
    const fp = fingerprint(report);
    if (this.seen.has(fp)) return false;
    this.seen.add(fp);
    if (!uncapped) this.sent++;
    this.send(JSON.stringify(report));
    return true;
  }
}

/**
 * `fetch` with `keepalive` rather than `sendBeacon`: the same delivery guarantees, but
 * `credentials: "omit"` keeps the Terminal session cookie (`Path=/`) off the request, and
 * `referrerPolicy: "origin"` keeps the page's query string out of `Referer`.
 */
function post(body: string): void {
  try {
    void fetch(REPORT_PATH, { method: "POST", body, keepalive: true, credentials: "omit", referrerPolicy: "origin", headers: { "content-type": "text/plain" } }).catch(() => undefined);
  } catch {
    // Reporting must never throw.
  }
}

function context(): ReportContext {
  return {
    origin: location.origin,
    pathname: location.pathname,
    release: typeof __TEXTJS_RELEASE__ === "string" ? __TEXTJS_RELEASE__ : "dev",
    userAgent: navigator.userAgent,
    width: innerWidth,
  };
}

export function createSink(send: (body: string) => void = post, random: () => number = Math.random): (error: unknown, kind: ReportKind, uncapped?: boolean) => void {
  if (random() >= SAMPLE_RATE) return () => undefined;
  const queue = new ReportQueue(send);
  const sink = (error: unknown, kind: ReportKind, uncapped = false): void => {
    if (queue.full && !uncapped) return;
    try {
      const report = toReport(error, kind, context());
      if (report) queue.add(report, uncapped);
    } catch {
      // Reporting must never throw.
    }
  };
  try {
    const reloaded = sessionStorage.getItem(RELOADED_KEY);
    if (reloaded !== null) {
      sessionStorage.removeItem(RELOADED_KEY);
      sink(`Reloaded after a chunk failed to load: ${reloaded}`, "chunk");
    }
  } catch {
    // No sessionStorage, so there was no reload either.
  }
  return sink;
}
