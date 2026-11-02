/**
 * Crash reports: the payload, its limits and the scrubbing shared by the browser reporter
 * (`reporter.ts`) and the `POST /api/errors` Pages Function (`server/reports.ts`). The server
 * re-runs every check here, so nothing the browser sends is trusted.
 */

export const REPORT_PATH = "/api/errors";
/** Request body limit. A full report is under 4 KB. */
export const MAX_BODY_BYTES = 8 * 1024;
/** Reports a page load may send (after dedupe by fingerprint). */
export const MAX_REPORTS_PER_PAGE = 5;
/**
 * Share of page loads that report. The Function weights each report by `1 / SAMPLE_RATE` from this
 * constant, never from the request, so a client can't inflate counts.
 */
export const SAMPLE_RATE = 1;

export const KINDS = ["error", "rejection", "boundary", "console", "chunk"] as const;
export type ReportKind = (typeof KINDS)[number];

const LIMITS = { message: 500, route: 120, release: 40, browser: 32, os: 16, frame: 200, frames: 10 } as const;
export const VIEWPORTS = ["xs", "sm", "md", "lg"] as const;
export type ViewportBucket = (typeof VIEWPORTS)[number];

export interface Report {
  v: 1;
  kind: ReportKind;
  message: string;
  /** Our own frames only, origin and query stripped: `fn (/assets/Docs-abc123.js:1:234)`. */
  stack: string[];
  /** Pathname only, or `/404` for unknown paths. */
  route: string;
  release: string;
  /** Family and version, e.g. `Chrome 142`, `Safari 18.4`. Never the user agent. */
  browser: string;
  os: string;
  viewport: ViewportBucket;
  /** Text.js error code (`TX004`) when the error carries one. */
  code: string;
}

/**
 * Best-effort redaction of free text: strips query strings and fragments from absolute and
 * relative URLs and any leftover `key=value` parameters, then redacts emails, IP addresses, long
 * numbers and long tokens. It can't recognise every kind of personal data in a message.
 *
 * Runs on untrusted input in the Function, so every pattern stays linear: matches start only at a
 * delimiter or a bounded run, and no two adjacent quantifiers can match the same characters.
 * `test/telemetry.test.ts` times the worst cases.
 */
export function scrub(text: string): string {
  return text
    .replace(/(^|[\s?#"'`<>()])([^\s/?#"'`<>()]*\/[^\s?#"'`<>()]*)[?#][^\s"'`<>)]+/g, "$1$2")
    .replace(/[?&#][\w.%-]+=[^\s"'`<>)]*/g, "")
    .replace(/[\w.%+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/g, (m) => (/\.[a-z]{2,}$/i.test(m) ? "<email>" : m))
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>")
    .replace(/\b(?:[0-9a-f]{1,4}:){4,7}[0-9a-f]{1,4}\b/gi, "<ip>")
    .replace(/\d[\d -]{7,}\d/g, "<number>")
    .replace(/[\w-]{24,}/g, (m) => (/\d/.test(m) ? "<token>" : m));
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const FRAME_URL = /([a-z][\w+.-]*:\/\/[^\s()]+?):(\d+)(?::(\d+))?\)?\s*$/i;

/**
 * Keep the frames of a stack that run our own code (`origin`), formatted `fn (/path:line:col)`.
 * Handles V8 (`at fn (url:1:2)`) and Firefox/Safari (`fn@url:1:2`) stacks. Returns `null` when the
 * stack has frames but none of them are ours: a browser extension or a third-party script.
 */
export function ownFrames(stack: string, origin: string): string[] | null {
  const frames: string[] = [];
  let foreign = 0;
  for (const raw of stack.split("\n")) {
    const line = raw.trim();
    // Real frames are short; skipping long lines keeps the frame pattern cheap.
    if (line.length > 1000) continue;
    const m = FRAME_URL.exec(line);
    if (!m) continue;
    let url: URL;
    try {
      url = new URL(m[1] as string);
    } catch {
      foreign++;
      continue;
    }
    if (url.origin !== origin) {
      foreign++;
      continue;
    }
    if (frames.length >= LIMITS.frames) continue;
    const head = line.slice(0, m.index).replace(/^at\s+/, "").replace(/[@(\s]+$/, "");
    const fn = /^[\w$.<>\[\] ]{1,60}$/.test(head) && head !== "async" ? head.replace(/^async\s+/, "") : "";
    const at = `${url.pathname}:${m[2]}${m[3] ? `:${m[3]}` : ""}`;
    frames.push(clip(fn ? `${fn} (${at})` : at, LIMITS.frame));
  }
  return frames.length === 0 && foreign > 0 ? null : frames;
}

/** 32-bit FNV-1a, hex. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Bundle file names lose their content hash: `/assets/Docs-AbC12_-9.js` → `Docs`. */
function chunkName(path: string): string {
  const file = path.split("/").pop() ?? "";
  return file.replace(/-[A-Za-z0-9_-]{8}(\.[a-z]+)$/, "$1").replace(/\.[a-z]+$/, "");
}

/**
 * Groups reports across releases: the kind, the message with numbers, hashes and URLs normalised,
 * and the chunk of the top frame (minified names and columns change every release).
 */
export function fingerprint(report: Pick<Report, "kind" | "message" | "stack">): string {
  const message = report.message
    .replace(/\/assets\/([\w.-]+?)-[A-Za-z0-9_-]{8}\.(js|css)/g, "/assets/$1.$2")
    .replace(/\d+/g, "N");
  const top = report.stack[0];
  const file = top ? chunkName(/\(?([^\s(]+?):\d+(?::\d+)?\)?$/.exec(top)?.[1] ?? "") : "";
  return fnv1a(`${report.kind}|${message}|${file}`);
}

const TX_CODE = /^TX\d{3}$/;
const SAFE = /^[\x20-\x7e]*$/;

/** A structured field: the whole value must match `pattern`; anything past `max` is cut off. */
function str(value: unknown, max: number, pattern: RegExp = SAFE): string | null {
  if (typeof value !== "string" || value.length > max * 2 || !pattern.test(value)) return null;
  return value.slice(0, max);
}

/** C0 and C1 control characters and line separators, which have no place in a stored message. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g;
const plain = (text: string): string => text.replace(CONTROL, " ");

/** Validate and normalise an untrusted payload. Returns `null` for anything malformed. */
export function validateReport(input: unknown): Report | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (!KINDS.includes(o.kind as ReportKind)) return null;
  if (!VIEWPORTS.includes(o.viewport as ViewportBucket)) return null;
  if (typeof o.message !== "string" || o.message.length === 0 || o.message.length > LIMITS.message * 2) return null;
  const route = str(o.route, LIMITS.route, /^\/[\w\-./~%@:+]*$/);
  const release = str(o.release, LIMITS.release, /^[\w.\-+]+$/);
  const browser = str(o.browser, LIMITS.browser, /^[\w .]+$/);
  const os = str(o.os, LIMITS.os, /^[\w ]+$/);
  const code = o.code === "" ? "" : str(o.code, 5, TX_CODE);
  if (route === null || release === null || browser === null || os === null || code === null) return null;
  if (!Array.isArray(o.stack) || o.stack.length > LIMITS.frames * 2) return null;
  const stack: string[] = [];
  for (const f of o.stack.slice(0, LIMITS.frames)) {
    if (typeof f !== "string" || f.length > LIMITS.frame * 2) return null;
    stack.push(clip(scrub(plain(f)), LIMITS.frame));
  }
  return {
    v: 1,
    kind: o.kind as ReportKind,
    message: clip(scrub(plain(o.message)), LIMITS.message),
    stack,
    route: scrub(route).split(/[?#]/)[0] as string,
    release,
    browser,
    os,
    viewport: o.viewport as ViewportBucket,
    code,
  };
}

/** Browser family and version plus OS family from a user agent string. The string itself is discarded. */
export function browserOf(ua: string): { browser: string; os: string } {
  const m = (re: RegExp): string | null => re.exec(ua)?.[1] ?? null;
  let browser = "Other";
  let v: string | null;
  if ((v = m(/\bEdg(?:e|A|iOS)?\/(\d+)/))) browser = `Edge ${v}`;
  else if ((v = m(/\bOPR\/(\d+)/))) browser = `Opera ${v}`;
  else if ((v = m(/\bSamsungBrowser\/(\d+)/))) browser = `Samsung ${v}`;
  else if ((v = m(/\b(?:Firefox|FxiOS)\/(\d+)/))) browser = `Firefox ${v}`;
  else if ((v = m(/\bCriOS\/(\d+)/))) browser = `Chrome ${v}`;
  else if ((v = m(/(?:Chrome|Chromium)\/(\d+)/))) browser = `Chrome ${v}`;
  else if ((v = m(/\bVersion\/(\d+(?:\.\d+)?).*\bSafari\//))) browser = `Safari ${v}`;
  let os = "Other";
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) os = "iOS";
  else if (/\bAndroid\b/.test(ua)) os = "Android";
  else if (/\bWindows\b/.test(ua)) os = "Windows";
  else if (/\bCrOS\b/.test(ua)) os = "ChromeOS";
  else if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) os = "macOS";
  else if (/\bLinux\b/.test(ua)) os = "Linux";
  return { browser, os };
}

/** For terminals reading reports (`scripts/errors.ts`): escape control characters (ANSI escapes, carriage returns) before printing. */
export function printable(v: unknown): string {
  return String(v).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export function viewportBucket(width: number): ViewportBucket {
  if (width < 640) return "xs";
  if (width < 1024) return "sm";
  if (width < 1440) return "md";
  return "lg";
}
