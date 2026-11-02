/**
 * `POST /api/errors`: crash reports from the website (`src/telemetry/`). Validates and re-scrubs
 * the payload, drops bots, and writes one Analytics Engine data point per report, plus one
 * structured log line for `wrangler pages deployment tail`. Stores no IP address, cookie or
 * user agent. Always answers 204 for well-formed requests, so it tells a sender nothing.
 */

import { fingerprint, MAX_BODY_BYTES, SAMPLE_RATE, validateReport, type Report } from "../src/telemetry/shared";

export interface AnalyticsEngineDataset {
  writeDataPoint(point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void;
}

export interface ReportsEnv {
  /** Analytics Engine dataset `textjs_errors` (wrangler.toml). Optional: without it, reports are only logged. */
  ERRORS?: AnalyticsEngineDataset;
}

/** Column order in the `textjs_errors` dataset. `scripts/errors.ts` reads the same names. */
export const COLUMNS = {
  index1: "fingerprint",
  blob1: "kind",
  blob2: "message",
  blob3: "route",
  blob4: "release",
  blob5: "browser",
  blob6: "os",
  blob7: "viewport",
  blob8: "code",
  blob9: "stack",
  blob10: "env",
  double1: "weight (1 / SAMPLE_RATE in src/telemetry/shared.ts, never from the request)",
} as const;

const BOT = /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|phantomjs|selenium|puppeteer|playwright|facebookexternalhit|embedly|^(?:curl|wget|python|go-http|java|node|axios|okhttp)/i;

/** Per-isolate limits, a backstop behind the browser's five reports per page load. */
const WINDOW_MS = 60_000;
const PER_CLIENT = 20;
const PER_ISOLATE = 2_000;
const MAX_CLIENTS = 5_000;
let windowStart = 0;
let total = 0;
const perClient = new Map<string, number>();

/** Counts in memory for one minute, keyed by `cf-connecting-ip`. The address is never written anywhere. */
export function allow(client: string, now: number): boolean {
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    total = 0;
    perClient.clear();
  }
  if (total >= PER_ISOLATE) return false;
  const n = perClient.get(client) ?? 0;
  if (n >= PER_CLIENT) return false;
  if (n === 0 && perClient.size >= MAX_CLIENTS) return false;
  perClient.set(client, n + 1);
  total++;
  return true;
}

export function resetLimits(): void {
  windowStart = 0;
  total = 0;
  perClient.clear();
}

const done = (status: number, headers: Record<string, string> = {}): Response => new Response(null, { status, headers: { "cache-control": "no-store", ...headers } });

async function readCapped(request: Request): Promise<string | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done: end, value } = await reader.read();
    if (end) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      void reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export function envOf(url: URL): "production" | "preview" {
  return url.hostname === "textjs.org" ? "production" : "preview";
}

export function dataPoint(report: Report, env: string): { indexes: string[]; blobs: string[]; doubles: number[] } {
  return {
    indexes: [fingerprint(report)],
    blobs: [report.kind, report.message, report.route, report.release, report.browser, report.os, report.viewport, report.code, report.stack.join("\n"), env],
    doubles: [1 / SAMPLE_RATE],
  };
}

export async function handleReport(request: Request, env: ReportsEnv, now: number = Date.now()): Promise<Response> {
  if (request.method !== "POST") return done(405, { allow: "POST" });
  const url = new URL(request.url);
  // Same-origin only. Browsers send Origin on every POST; Sec-Fetch-Site where supported.
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin !== null && origin !== url.origin) || (site !== null && site !== "same-origin")) return done(403);
  const ua = request.headers.get("user-agent") ?? "";
  if (ua === "" || BOT.test(ua)) return done(204);
  // Before touching the body, so a flood costs a header check per request.
  if (!allow(request.headers.get("cf-connecting-ip") ?? "unknown", now)) return done(204);
  const body = await readCapped(request).catch(() => null);
  if (body === null) return done(413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return done(400);
  }
  const report = validateReport(parsed);
  if (!report) return done(400);
  const point = dataPoint(report, envOf(url));
  try {
    env.ERRORS?.writeDataPoint(point);
  } catch {
    // Analytics Engine is best effort; the log line below still records the report.
  }
  console.log(JSON.stringify({ event: "textjs.report", fingerprint: point.indexes[0], env: point.blobs[9], ...report }));
  return done(204);
}
