/**
 * Platform-agnostic `middleware.ts` execution: matcher compilation, the
 * `x-middleware-*` response protocol and request forwarding. Used by
 * `text dev`, `text start` and every deploy adapter.
 */

import { encodePathText } from "../path-text";
import { badRequest, canonicalPathname, hasGeneratedCacheControl, PRIVATE_CACHE_CONTROL, requestOrigin, type OriginOptions } from "./http";
import {
  isMiddlewareControl,
  MIDDLEWARE_NEXT,
  MIDDLEWARE_OVERRIDE_HEADERS,
  MIDDLEWARE_REQUEST_PREFIX,
  MIDDLEWARE_REWRITE,
  NextRequest,
  parseCookieHeader,
  parseSetCookie,
  type Matcher,
  type MatcherCondition,
  type MatcherObject,
  type MiddlewareModule,
  type NextMiddleware,
} from "./middleware";

/** Candidate file names, relative to the project root (first match wins). */
export { proxyFetch } from "./http";

export const MIDDLEWARE_FILES = ["middleware.ts", "middleware.tsx", "middleware.js", "middleware.mjs", "src/middleware.ts", "src/middleware.js"] as const;

// ---------------------------------------------------------------------------
// Matchers (`path-to-regexp` syntax, as in Next.js `config.matcher`)
// ---------------------------------------------------------------------------

export interface CompiledMatcher {
  source: string;
  /** Anchored regular expression source (also valid PCRE, for Vercel routes). */
  regex: string;
  has?: MatcherCondition[];
  missing?: MatcherCondition[];
}

const DEFAULT_SEGMENT = "[^/#?]+?";

function escapeRe(s: string): string {
  return s.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
}

/** Read a balanced `( … )` group starting at `i` (which must be `(`). Returns the inner source and the index after `)`. */
function readGroup(src: string, i: number): [string, number] {
  let depth = 0;
  let j = i;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "\\") {
      j++;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return [src.slice(i + 1, j), j + 1];
    }
  }
  throw new SyntaxError(`Unbalanced parentheses in middleware matcher ${JSON.stringify(src)}`);
}

/** Capturing groups in a regular-expression source (escapes and character classes skipped). */
function capturingGroups(src: string): number {
  let n = 0;
  let inClass = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") inClass = true;
    else if (ch === "(" && (src[i + 1] !== "?" || (src[i + 2] === "<" && src[i + 3] !== "=" && src[i + 3] !== "!"))) n++;
  }
  return n;
}

/** Parameter names in capture-group order (`null` for unnamed groups) of a matcher source. */
export function matcherKeys(source: string): Array<string | null> {
  const keys: Array<string | null> = [];
  compileMatcherSource(source, keys);
  return keys;
}

/**
 * Compile a matcher source: `/about`, `/blog/:slug`, `/docs/:path*`,
 * `/a/:rest+`, `/:locale?/x`, `/user/:id(\\d+)` and raw groups such as
 * `/((?!api|assets|favicon.ico).*)`. A trailing slash is optional.
 */
export function compileMatcherSource(input: string, keys: Array<string | null> = []): string {
  if (!input.startsWith("/")) throw new SyntaxError(`Middleware matcher must start with "/": ${JSON.stringify(input)}`);
  // Requests arrive without a trailing slash (see `canonicalPathname`), so `/admin/` matches like `/admin`; `/` matches the root.
  const source = input.replace(/\/+$/, "");
  let re = "";
  // Literal text, compared with the canonical (percent-encoded) path. Escapes span characters (`%C3%A9`), so encode whole runs.
  let literal = "";
  const flush = (): void => {
    re += escapeRe(encodePathText(literal));
    literal = "";
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i] as string;
    const prefix = ch === "/" && (source[i + 1] === ":" || source[i + 1] === "(") ? "/" : "";
    let j = prefix ? i + 1 : i;
    const c = source[j] as string;
    if (c === ":" || c === "(") {
      flush();
      let pattern = DEFAULT_SEGMENT;
      let key: string | null = null;
      if (c === ":") {
        const m = /^:([A-Za-z_]\w*)/.exec(source.slice(j));
        if (!m) throw new SyntaxError(`Missing parameter name at ${j} in ${JSON.stringify(source)}`);
        key = m[1] as string;
        j += m[0].length;
        if (source[j] === "(") {
          const [inner, end] = readGroup(source, j);
          pattern = inner;
          j = end;
        }
      } else {
        const [inner, end] = readGroup(source, j);
        pattern = inner;
        j = end;
      }
      const mod = source[j];
      const p = escapeRe(prefix);
      keys.push(key);
      // `*` / `+` repeat the pattern once more in the emitted regex.
      for (let n = capturingGroups(pattern) * (mod === "*" || mod === "+" ? 2 : 1); n > 0; n--) keys.push(null);
      if (!prefix && pattern === DEFAULT_SEGMENT && (mod === "*" || mod === "+")) {
        // No separator between repetitions: `(?:x+?)*` would backtrack exponentially.
        re += mod === "*" ? "([^/#?]*)" : "([^/#?]+)";
        i = j + 1;
        continue;
      }
      if (mod === "*") {
        re += `(?:${p}((?:${pattern})(?:${p}(?:${pattern}))*))?`;
        j++;
      } else if (mod === "+") {
        re += `${p}((?:${pattern})(?:${p}(?:${pattern}))*)`;
        j++;
      } else if (mod === "?") {
        re += `(?:${p}(${pattern}))?`;
        j++;
      } else re += `${p}(${pattern})`;
      i = j;
      continue;
    }
    literal += ch;
    i++;
  }
  flush();
  return `^${re}(?:\\/)?$`;
}

export function compileMatcher(matcher: Matcher | undefined): CompiledMatcher[] | null {
  if (matcher === undefined) return null;
  const list = Array.isArray(matcher) ? matcher : [matcher];
  return list.map((m) => {
    const o: MatcherObject = typeof m === "string" ? { source: m } : m;
    return { source: o.source, regex: compileMatcherSource(o.source), ...(o.has ? { has: o.has } : {}), ...(o.missing ? { missing: o.missing } : {}) };
  });
}

function conditionHolds(cond: MatcherCondition, request: Request, url: URL, cookies: Map<string, string>): boolean {
  let actual: string | null | undefined;
  if (cond.type === "header") actual = request.headers.get(cond.key);
  else if (cond.type === "cookie") actual = cookies.get(cond.key);
  else if (cond.type === "query") actual = url.searchParams.get(cond.key);
  else actual = url.hostname.replace(/\.$/, "");
  if (actual === null || actual === undefined) return false;
  if (cond.value === undefined) return true;
  return new RegExp(`^(?:${cond.value})$`).test(actual);
}

const regexCache = new Map<string, RegExp>();

/** `true` when some matcher's path pattern covers `pathname`, ignoring `has` / `missing` (build-time routing decisions). */
export function matcherCouldMatch(matchers: readonly CompiledMatcher[] | null, pathname: string): boolean {
  if (matchers === null) return true;
  return matchers.some((m) => new RegExp(m.regex).test(pathname));
}

/** `true` when `pathname` (without basePath) is covered by the compiled matchers (`null` = every path). */
export function matchesMiddleware(matchers: readonly CompiledMatcher[] | null, pathname: string, request?: Request): boolean {
  if (matchers === null) return true;
  const url = request ? new URL(request.url) : null;
  const cookies = request ? parseCookieHeader(request.headers.get("cookie")) : new Map<string, string>();
  for (const m of matchers) {
    let re = regexCache.get(m.regex);
    if (!re) {
      re = new RegExp(m.regex);
      regexCache.set(m.regex, re);
    }
    if (!re.test(pathname)) continue;
    if (m.has || m.missing) {
      if (!request || !url) return false;
      if (m.has && !m.has.every((c) => conditionHolds(c, request, url, cookies))) continue;
      if (m.missing && m.missing.some((c) => conditionHolds(c, request, url, cookies))) continue;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export type MiddlewareOutcome =
  /** Middleware answered the request itself (redirect, 401, JSON, …). */
  | { type: "response"; response: Response }
  /**
   * Continue. `request` carries overridden headers / cookies; `headers` must be
   * merged into the final response; `rewrite` is set for `NextResponse.rewrite()`.
   */
  | {
      type: "next";
      request: Request;
      headers: Headers;
      rewrite?: URL;
      matched: boolean;
      /** `NextResponse.next({ status })` / `rewrite(url, { status })`. */
      status?: number;
      /** The response depends on this request's cookies or identity (set cookies, rewrote, overrode headers). */
      private?: boolean;
    };

export interface RunMiddlewareOptions {
  basePath?: string;
  waitUntil?: (promise: Promise<unknown>) => void;
  /** Precompiled matchers (defaults to compiling `mod.config.matcher`). */
  matchers?: CompiledMatcher[] | null;
}

const compiledByModule = new WeakMap<object, CompiledMatcher[] | null>();

export function middlewareFunction(mod: MiddlewareModule): NextMiddleware {
  const fn = mod.middleware ?? mod.default;
  if (typeof fn !== "function") throw new TypeError("The middleware file must export a `middleware` function (or a default export).");
  return fn;
}

export function middlewareMatchers(mod: MiddlewareModule): CompiledMatcher[] | null {
  let m = compiledByModule.get(mod);
  if (m === undefined) {
    m = compileMatcher(mod.config?.matcher);
    compiledByModule.set(mod, m);
  }
  return m;
}

function stripBase(pathname: string, basePath: string): string | null {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : null;
}

const INTERNAL: string[] = [MIDDLEWARE_NEXT, MIDDLEWARE_REWRITE, MIDDLEWARE_OVERRIDE_HEADERS];

function cancelUnread(request: Request): void {
  if (request.body && !request.bodyUsed && !request.body.locked) request.body.cancel().catch(() => undefined);
}

/** Drop `x-middleware-*` headers from a response that is returned to the client as-is. */
function stripInternal(response: Response): Response {
  let found = false;
  response.headers.forEach((_, key) => {
    if (key.startsWith("x-middleware-")) found = true;
  });
  if (!found) return response;
  const headers = new Headers(response.headers);
  for (const key of [...headers.keys()]) if (key.startsWith("x-middleware-")) headers.delete(key);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Run middleware for `request`. `request` is never consumed: middleware gets a
 * tee'd clone, and the outcome's `request` carries the original body.
 */
export async function runMiddleware(mod: MiddlewareModule, incoming: Request, options: RunMiddlewareOptions = {}): Promise<MiddlewareOutcome> {
  const basePath = options.basePath ?? "";
  // Match, and show middleware, the same pathname routing will use.
  const request = canonicalRequest(incoming);
  if (!request) {
    cancelUnread(incoming);
    return { type: "response", response: badRequest() };
  }
  const url = new URL(request.url);
  const matchers = options.matchers !== undefined ? options.matchers : middlewareMatchers(mod);
  // Outside basePath there's no app, so no middleware (even without a matcher).
  const pathname = stripBase(url.pathname, basePath);
  if (pathname === null || !matchesMiddleware(matchers, pathname, request)) {
    return { type: "next", request, headers: new Headers(), matched: false };
  }
  const fn = middlewareFunction(mod);
  const forwarded = request.body ? request.clone() : request;
  const nextRequest = new NextRequest(request, { basePath });
  const pending: Promise<unknown>[] = [];
  const event = {
    waitUntil(p: Promise<unknown>) {
      if (options.waitUntil) options.waitUntil(p);
      else pending.push(p.catch(() => undefined));
    },
  };
  let result: Awaited<ReturnType<NextMiddleware>>;
  try {
    result = await fn(nextRequest, event);
  } finally {
    // The tee buffers whatever one branch doesn't read: release middleware's copy
    // (Bun keeps the wrapped request's own stream separate, so release both).
    cancelUnread(nextRequest);
    if (forwarded !== request) cancelUnread(request);
  }

  // Cookies the middleware set on `request.cookies` are forwarded, like Next.js.
  const requestHeaders = new Headers(forwarded.headers);
  const mutatedCookie = nextRequest.headers.get("cookie");
  if (mutatedCookie !== request.headers.get("cookie")) {
    if (mutatedCookie === null) requestHeaders.delete("cookie");
    else requestHeaders.set("cookie", mutatedCookie);
  }

  if (!result) return { type: "next", request: rebuild(forwarded, requestHeaders), headers: new Headers(), matched: true };
  if (!(result instanceof Response)) {
    cancelUnread(forwarded);
    throw new TypeError("Middleware must return a `Response`, `NextResponse` or nothing.");
  }

  const control = isMiddlewareControl(result);
  const rewriteTo = control ? result.headers.get(MIDDLEWARE_REWRITE) : null;
  const isNext = control && result.headers.get(MIDDLEWARE_NEXT) === "1";
  if (!rewriteTo && !isNext) {
    cancelUnread(forwarded);
    return { type: "response", response: stripInternal(result) };
  }

  const override = result.headers.get(MIDDLEWARE_OVERRIDE_HEADERS);
  let finalHeaders = requestHeaders;
  if (override !== null) {
    finalHeaders = new Headers();
    for (const key of override.split(",").map((k) => k.trim()).filter(Boolean)) {
      const v = result.headers.get(`${MIDDLEWARE_REQUEST_PREFIX}${key}`);
      if (v !== null) finalHeaders.set(key, v);
    }
    const host = request.headers.get("host");
    if (host && !finalHeaders.has("host")) finalHeaders.set("host", host);
  }
  // Cookies set on the `next()` / `rewrite()` response are visible downstream too.
  const setCookies = result.headers.getSetCookie();
  if (setCookies.length > 0) {
    const jar = parseCookieHeader(finalHeaders.get("cookie"));
    for (const line of setCookies) {
      const c = parseSetCookie(line);
      if (!c) continue;
      if (c.maxAge === 0 || (c.expires !== undefined && new Date(c.expires).getTime() <= Date.now())) jar.delete(c.name);
      else jar.set(c.name, c.value);
    }
    if (jar.size === 0) finalHeaders.delete("cookie");
    else finalHeaders.set("cookie", [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; "));
  }

  const responseHeaders = new Headers();
  result.headers.forEach((value, key) => {
    if (key === "set-cookie" || INTERNAL.includes(key) || key.startsWith(MIDDLEWARE_REQUEST_PREFIX)) return;
    responseHeaders.set(key, value);
  });
  for (const c of setCookies) responseHeaders.append("set-cookie", c);

  const target = rewriteTo ? new URL(rewriteTo, url) : undefined;
  const nextUrl = target && target.origin === url.origin ? target : undefined;
  if (pending.length > 0) void Promise.all(pending);
  const isPrivate = setCookies.length > 0 || target !== undefined || override !== null;
  return {
    type: "next",
    request: rebuild(forwarded, finalHeaders, nextUrl),
    headers: responseHeaders,
    rewrite: target,
    matched: true,
    ...(result.status !== 200 ? { status: result.status } : {}),
    ...(isPrivate ? { private: true } : {}),
  };
}

/**
 * `request` with its URL's {@link canonicalPathname} (the same request when
 * it already is canonical; otherwise a copy that takes over the body), or
 * `null` when the path is invalid and the request should get a 400.
 */
export function canonicalRequest(request: Request): Request | null {
  const url = new URL(request.url);
  const pathname = canonicalPathname(url.pathname);
  if (pathname === null) return null;
  if (pathname === url.pathname) return request;
  url.pathname = pathname;
  return rebuild(request, new Headers(request.headers), url);
}

/** Copy `request` with new headers (and optionally a new URL), moving its body. */
export function rebuild(request: Request, headers: Headers, url?: URL | string): Request {
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers, signal: request.signal, redirect: request.redirect };
  if (request.body) {
    init.body = request.body;
    init.duplex = "half";
  }
  return new Request(url ?? request.url, init);
}

function sameHeaders(a: Headers, b: Headers): boolean {
  const x = [...a].map(([k, v]) => `${k}:${v}`).sort();
  const y = [...b].map(([k, v]) => `${k}:${v}`).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * Re-encode an outcome as the `x-middleware-*` response protocol, for
 * platforms that run middleware at the edge and route afterwards (Vercel).
 */
export function toMiddlewareResponse(outcome: MiddlewareOutcome, original: Request): Response {
  if (outcome.type === "response") return stripInternal(outcome.response);
  const headers = new Headers(outcome.headers);
  if (outcome.rewrite) headers.set(MIDDLEWARE_REWRITE, outcome.rewrite.href);
  else headers.set(MIDDLEWARE_NEXT, "1");
  if (!sameHeaders(original.headers, outcome.request.headers)) {
    const keys: string[] = [];
    outcome.request.headers.forEach((value, key) => {
      keys.push(key);
      headers.set(`${MIDDLEWARE_REQUEST_PREFIX}${key}`, value);
    });
    headers.set(MIDDLEWARE_OVERRIDE_HEADERS, keys.join(","));
  }
  return new Response(null, { headers, status: outcome.status ?? 200 });
}

export interface MiddlewareMerge {
  status?: number;
  private?: boolean;
}

/**
 * Return a copy of `response` with middleware headers applied: middleware
 * cookies first, then the response's own; other headers only when absent.
 */
export function withMiddlewareHeaders(response: Response, headers: Headers, merge: MiddlewareMerge = {}): Response {
  let empty = true;
  headers.forEach(() => {
    empty = false;
  });
  const downgrade = merge.private === true && hasGeneratedCacheControl(response);
  if (empty && merge.status === undefined && !downgrade) return response;
  const out = new Headers();
  headers.forEach((value, key) => {
    if (key !== "set-cookie") out.set(key, value);
  });
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") out.set(key, value);
  });
  for (const c of headers.getSetCookie()) out.append("set-cookie", c);
  for (const c of response.headers.getSetCookie()) out.append("set-cookie", c);
  if (downgrade) out.set("cache-control", PRIVATE_CACHE_CONTROL);
  const status = merge.status ?? response.status;
  const body = status === 204 || status === 205 || status === 304 ? null : response.body;
  if (body === null && response.body) response.body.cancel().catch(() => undefined);
  return new Response(body, { status, statusText: merge.status === undefined ? response.statusText : "", headers: out });
}

/**
 * Would `middleware.ts` let a document request for `href` (an app path,
 * without basePath) through unchanged? Used to authorize what a live session
 * renders: anything else (redirect, 401, rewrite elsewhere) is handed back to
 * the browser as a document load, where middleware answers over HTTP.
 */
export async function authorizeWithMiddleware(mod: MiddlewareModule, href: string, init: { origin: string; basePath?: string; headers: Headers }): Promise<boolean> {
  const basePath = init.basePath ?? "";
  const url = new URL(basePath + href, init.origin);
  if (url.origin !== new URL(init.origin).origin) return false;
  const headers = new Headers(init.headers);
  for (const h of ["content-type", "content-length", "last-event-id", "x-textjs-live", "origin"]) headers.delete(h);
  headers.set("accept", "text/html,application/xhtml+xml,*/*;q=0.8");
  headers.set("sec-fetch-dest", "document");
  headers.set("sec-fetch-mode", "navigate");
  // A rewrite is allowed only onto the path the session renders (the canonical `href`).
  const rendered = canonicalPathname(url.pathname);
  if (rendered === null) return false;
  const outcome = await runMiddleware(mod, new Request(url, { method: "GET", headers }), { basePath });
  if (outcome.type === "response") return false;
  if (outcome.status !== undefined && outcome.status >= 400) return false;
  // A rewrite must keep everything the session renders: origin, path and query.
  if (outcome.rewrite) return outcome.rewrite.origin === url.origin && canonicalPathname(outcome.rewrite.pathname) === rendered && outcome.rewrite.search === url.search;
  return true;
}

export interface LiveAuthorizerOptions extends OriginOptions {
  basePath?: string;
}

/** `LiveServer` `authorize` backed by a middleware module (`null` = no middleware: allow). */
export function createLiveAuthorizer(load: () => MiddlewareModule | null | undefined | Promise<MiddlewareModule | null | undefined>, options: LiveAuthorizerOptions = {}): (href: string, headers: Headers) => Promise<boolean> {
  return async (href, headers) => {
    const mod = await load();
    if (!mod) return true;
    const origin = requestOrigin({ headers: Object.fromEntries(headers) }, options);
    return authorizeWithMiddleware(mod, href, { origin, basePath: options.basePath, headers });
  };
}
