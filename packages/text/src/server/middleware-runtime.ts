/**
 * Platform-agnostic `middleware.ts` execution: matcher compilation, the
 * `x-middleware-*` response protocol and request forwarding. Used by
 * `text dev`, `text start` and every deploy adapter.
 */

import {
  MIDDLEWARE_NEXT,
  MIDDLEWARE_OVERRIDE_HEADERS,
  MIDDLEWARE_REQUEST_PREFIX,
  MIDDLEWARE_REWRITE,
  MIDDLEWARE_SET_COOKIE,
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

/**
 * Compile a matcher source: `/about`, `/blog/:slug`, `/docs/:path*`,
 * `/a/:rest+`, `/:locale?/x`, `/user/:id(\\d+)` and raw groups such as
 * `/((?!api|assets|favicon.ico).*)`. A trailing slash is optional.
 */
export function compileMatcherSource(source: string): string {
  if (!source.startsWith("/")) throw new SyntaxError(`Middleware matcher must start with "/": ${JSON.stringify(source)}`);
  let re = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i] as string;
    const prefix = ch === "/" && (source[i + 1] === ":" || source[i + 1] === "(") ? "/" : "";
    let j = prefix ? i + 1 : i;
    const c = source[j] as string;
    if (c === ":" || c === "(") {
      let pattern = DEFAULT_SEGMENT;
      if (c === ":") {
        const m = /^:([A-Za-z_]\w*)/.exec(source.slice(j));
        if (!m) throw new SyntaxError(`Missing parameter name at ${j} in ${JSON.stringify(source)}`);
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
    re += escapeRe(ch);
    i++;
  }
  if (re.endsWith("\\/")) re = re.slice(0, -2);
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
  else actual = url.hostname;
  if (actual === null || actual === undefined) return false;
  if (cond.value === undefined) return true;
  return new RegExp(`^(?:${cond.value})$`).test(actual);
}

const regexCache = new Map<string, RegExp>();

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
  | { type: "next"; request: Request; headers: Headers; rewrite?: URL; matched: boolean };

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

function stripBase(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
}

const INTERNAL: string[] = [MIDDLEWARE_NEXT, MIDDLEWARE_REWRITE, MIDDLEWARE_OVERRIDE_HEADERS, MIDDLEWARE_SET_COOKIE];

/**
 * Run middleware for `request`. `request` is never consumed: middleware gets a
 * tee'd clone, and the outcome's `request` carries the original body.
 */
export async function runMiddleware(mod: MiddlewareModule, request: Request, options: RunMiddlewareOptions = {}): Promise<MiddlewareOutcome> {
  const basePath = options.basePath ?? "";
  const url = new URL(request.url);
  const matchers = options.matchers !== undefined ? options.matchers : middlewareMatchers(mod);
  if (!matchesMiddleware(matchers, stripBase(url.pathname, basePath), request)) {
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
  const result = await fn(nextRequest, event);

  // Cookies the middleware set on `request.cookies` are forwarded, like Next.js.
  const requestHeaders = new Headers(forwarded.headers);
  const mutatedCookie = nextRequest.headers.get("cookie");
  if (mutatedCookie !== request.headers.get("cookie")) {
    if (mutatedCookie === null) requestHeaders.delete("cookie");
    else requestHeaders.set("cookie", mutatedCookie);
  }

  if (!result) return { type: "next", request: rebuild(forwarded, requestHeaders), headers: new Headers(), matched: true };
  if (!(result instanceof Response)) throw new TypeError("Middleware must return a `Response`, `NextResponse` or nothing.");

  const rewriteTo = result.headers.get(MIDDLEWARE_REWRITE);
  const isNext = result.headers.get(MIDDLEWARE_NEXT) === "1";
  if (!rewriteTo && !isNext) return { type: "response", response: result };

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
  return { type: "next", request: rebuild(forwarded, finalHeaders, nextUrl), headers: responseHeaders, rewrite: target, matched: true };
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
  if (outcome.type === "response") return outcome.response;
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
  return new Response(null, { headers });
}

/** Return a copy of `response` with middleware headers applied (`Set-Cookie` appended, others only when absent). */
export function withMiddlewareHeaders(response: Response, headers: Headers): Response {
  let empty = true;
  headers.forEach(() => {
    empty = false;
  });
  if (empty) return response;
  const out = new Headers(response.headers);
  headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    if (!out.has(key)) out.set(key, value);
  });
  for (const c of headers.getSetCookie()) out.append("set-cookie", c);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: out });
}

/** Forward `request` to an external URL (a middleware or config rewrite). Credentials are stripped for third-party origins. */
export async function proxyFetch(request: Request, target: string | URL, options: { stripCredentials?: boolean } = {}): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  if (options.stripCredentials !== false) {
    headers.delete("cookie");
    headers.delete("authorization");
  }
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers, redirect: "manual", signal: request.signal };
  if (request.body && request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }
  try {
    const upstream = await fetch(target, init);
    const out = new Headers(upstream.headers);
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch (error) {
    return new Response(`▼ Text.js proxy error: ${String(target)}\n${error instanceof Error ? error.message : String(error)}`, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
