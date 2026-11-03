/**
 * `@textjs/app/ansi`: answer terminal HTTP clients (curl, Wget, HTTPie, xh)
 * with a truecolor ANSI frame instead of the HTML document.
 *
 * Web-standard and dependency-free, so it runs anywhere a `Response` exists:
 * `text start`, every deploy adapter, and hosts that don't use `text build`.
 */

/** User-Agent prefixes of terminal HTTP clients that print a response body as is. */
export const TERMINAL_UA = /^(?:curl|Wget|wget2|HTTPie|xh)\//;

/** `Accept` values that ask for the HTML document (`curl -H 'Accept: text/html'`). */
const ACCEPTS_HTML = /text\/html/i;

/** `Cache-Control` for ANSI responses: shared caches (which may ignore `Vary: User-Agent`) never store them. */
export const ANSI_CACHE_CONTROL = "private, no-cache, no-store, max-age=0, must-revalidate";

/** The request headers an ANSI response depends on: set it on the HTML page at the same URL too. */
export const ANSI_VARY = "User-Agent, Accept";

/** Node's `IncomingHttpHeaders` shape (lowercase names). */
export type HeaderRecord = Record<string, string | string[] | undefined>;

interface HeaderReader {
  get(name: string): string | null;
}

function header(headers: HeaderReader | HeaderRecord, name: string): string | undefined {
  if (typeof (headers as HeaderReader).get === "function") return (headers as HeaderReader).get(name) ?? undefined;
  const v = (headers as HeaderRecord)[name];
  return typeof v === "string" ? v : v?.[0];
}

/**
 * `true` for a `GET` or `HEAD` from a terminal client ({@link TERMINAL_UA})
 * whose `Accept` header (missing counts as `*\/*`) doesn't ask for `text/html`.
 */
export function wantsAnsi(request: Pick<Request, "method" | "headers">): boolean;
export function wantsAnsi(method: string | undefined, headers: HeaderReader | HeaderRecord): boolean;
export function wantsAnsi(a: Pick<Request, "method" | "headers"> | string | undefined, b?: HeaderReader | HeaderRecord): boolean {
  const method = typeof a === "object" ? a.method : a;
  const headers = typeof a === "object" ? a.headers : b;
  if (!headers || (method !== "GET" && method !== "HEAD")) return false;
  const ua = header(headers, "user-agent");
  if (ua === undefined || !TERMINAL_UA.test(ua)) return false;
  const accept = header(headers, "accept");
  return accept === undefined || !ACCEPTS_HTML.test(accept);
}

const encoder = new TextEncoder();

/** A `text/plain` response carrying `frame` (no body for `HEAD`), with the headers terminal responses need. */
export function ansiResponse(frame: string, method = "GET", status = 200): Response {
  const bytes = encoder.encode(frame);
  return new Response(method === "HEAD" ? null : bytes, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-length": String(bytes.byteLength),
      vary: ANSI_VARY,
      "cache-control": ANSI_CACHE_CONTROL,
      "x-content-type-options": "nosniff",
    },
  });
}
