/**
 * `@textjs/next/server` — the `middleware.ts` API: `NextRequest`, `NextResponse`,
 * request / response cookies and the matcher config types.
 *
 * Web-standard only (no Node imports), so the same middleware runs on
 * `text dev`, `text start`, Bun, Vercel Edge and Cloudflare Workers.
 */

// ---------------------------------------------------------------------------
// Internal header protocol (the same headers Next.js and Vercel's edge
// routing understand, so middleware output can be handed to Vercel verbatim).
// ---------------------------------------------------------------------------

export const MIDDLEWARE_NEXT = "x-middleware-next";
export const MIDDLEWARE_REWRITE = "x-middleware-rewrite";
export const MIDDLEWARE_OVERRIDE_HEADERS = "x-middleware-override-headers";
export const MIDDLEWARE_REQUEST_PREFIX = "x-middleware-request-";
/** Cookies set on a `next()` / `rewrite()` response, forwarded to the downstream request. */
export const MIDDLEWARE_SET_COOKIE = "x-middleware-set-cookie";

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export interface RequestCookie {
  name: string;
  value: string;
}

export interface ResponseCookie extends RequestCookie {
  domain?: string;
  path?: string;
  expires?: Date | number;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none" | boolean;
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
}

export type CookieOptions = Omit<ResponseCookie, "name" | "value">;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parse a `Cookie` request header. The first occurrence of a name wins. */
export function parseCookieHeader(header: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || out.has(name)) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    out.set(name, decode(value));
  }
  return out;
}

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/** Serialize one `Set-Cookie` header value (RFC 6265bis). `path` defaults to `/`. */
export function serializeCookie(cookie: ResponseCookie): string {
  if (!COOKIE_NAME.test(cookie.name)) throw new TypeError(`Invalid cookie name: ${JSON.stringify(cookie.name)}`);
  const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
  parts.push(`Path=${cookie.path ?? "/"}`);
  if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
  if (cookie.expires !== undefined) parts.push(`Expires=${new Date(cookie.expires).toUTCString()}`);
  if (cookie.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(cookie.maxAge)}`);
  if (cookie.httpOnly) parts.push("HttpOnly");
  if (cookie.secure) parts.push("Secure");
  if (cookie.sameSite !== undefined && cookie.sameSite !== false) {
    const s = cookie.sameSite === true ? "strict" : cookie.sameSite;
    parts.push(`SameSite=${s.charAt(0).toUpperCase()}${s.slice(1)}`);
  }
  if (cookie.priority) parts.push(`Priority=${cookie.priority.charAt(0).toUpperCase()}${cookie.priority.slice(1)}`);
  if (cookie.partitioned) parts.push("Partitioned");
  return parts.join("; ");
}

/** Parse a `Set-Cookie` header value back into a cookie (name, value and attributes). */
export function parseSetCookie(header: string): ResponseCookie | null {
  const [pair, ...attrs] = header.split(";");
  const eq = (pair ?? "").indexOf("=");
  if (!pair || eq <= 0) return null;
  const cookie: ResponseCookie = { name: pair.slice(0, eq).trim(), value: decode(pair.slice(eq + 1).trim()) };
  for (const attr of attrs) {
    const i = attr.indexOf("=");
    const key = (i < 0 ? attr : attr.slice(0, i)).trim().toLowerCase();
    const val = i < 0 ? "" : attr.slice(i + 1).trim();
    if (key === "path") cookie.path = val;
    else if (key === "domain") cookie.domain = val;
    else if (key === "expires") cookie.expires = new Date(val);
    else if (key === "max-age") cookie.maxAge = Number(val);
    else if (key === "httponly") cookie.httpOnly = true;
    else if (key === "secure") cookie.secure = true;
    else if (key === "samesite") cookie.sameSite = val.toLowerCase() as "strict" | "lax" | "none";
    else if (key === "priority") cookie.priority = val.toLowerCase() as "low" | "medium" | "high";
    else if (key === "partitioned") cookie.partitioned = true;
  }
  return cookie;
}

/** `request.cookies`: reads the `Cookie` header; `set()` / `delete()` update it for downstream handlers. */
export class RequestCookies {
  readonly #headers: Headers;
  #map: Map<string, string>;

  constructor(headers: Headers) {
    this.#headers = headers;
    this.#map = parseCookieHeader(headers.get("cookie"));
  }

  get size(): number {
    return this.#map.size;
  }

  get(name: string | RequestCookie): RequestCookie | undefined {
    const n = typeof name === "string" ? name : name.name;
    const value = this.#map.get(n);
    return value === undefined ? undefined : { name: n, value };
  }

  getAll(name?: string | RequestCookie): RequestCookie[] {
    const all = [...this.#map].map(([n, value]) => ({ name: n, value }));
    if (name === undefined) return all;
    const n = typeof name === "string" ? name : name.name;
    return all.filter((c) => c.name === n);
  }

  has(name: string): boolean {
    return this.#map.has(name);
  }

  set(name: string | RequestCookie, value?: string): this {
    const c = typeof name === "string" ? { name, value: value ?? "" } : name;
    this.#map.set(c.name, c.value);
    this.#sync();
    return this;
  }

  delete(names: string | string[]): boolean | boolean[] {
    const list = Array.isArray(names) ? names : [names];
    const result = list.map((n) => this.#map.delete(n));
    this.#sync();
    return Array.isArray(names) ? result : (result[0] as boolean);
  }

  clear(): this {
    this.#map.clear();
    this.#sync();
    return this;
  }

  [Symbol.iterator](): IterableIterator<[string, RequestCookie]> {
    return new Map([...this.#map].map(([n, value]) => [n, { name: n, value }] as [string, RequestCookie]))[Symbol.iterator]();
  }

  toString(): string {
    return [...this.#map].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
  }

  #sync(): void {
    if (this.#map.size === 0) this.#headers.delete("cookie");
    else this.#headers.set("cookie", this.toString());
  }
}

/** `response.cookies`: a typed view over the response's `Set-Cookie` headers. */
export class ResponseCookies {
  readonly #headers: Headers;
  readonly #map = new Map<string, ResponseCookie>();

  constructor(headers: Headers) {
    this.#headers = headers;
    for (const line of headers.getSetCookie()) {
      const c = parseSetCookie(line);
      if (c) this.#map.set(c.name, c);
    }
  }

  get(name: string | ResponseCookie): ResponseCookie | undefined {
    return this.#map.get(typeof name === "string" ? name : name.name);
  }

  getAll(name?: string | ResponseCookie): ResponseCookie[] {
    const all = [...this.#map.values()];
    if (name === undefined) return all;
    const n = typeof name === "string" ? name : name.name;
    return all.filter((c) => c.name === n);
  }

  has(name: string): boolean {
    return this.#map.has(name);
  }

  set(name: string | ResponseCookie, value?: string, options?: CookieOptions): this {
    const c: ResponseCookie = typeof name === "string" ? { ...options, name, value: value ?? "" } : { ...name };
    serializeCookie(c);
    this.#map.set(c.name, c);
    this.#sync();
    return this;
  }

  /** Expire a cookie on the client (`Max-Age=0`). */
  delete(name: string | (CookieOptions & { name: string })): this {
    const opts = typeof name === "string" ? { name } : name;
    return this.set({ ...opts, value: "", expires: new Date(0), maxAge: 0 });
  }

  [Symbol.iterator](): IterableIterator<[string, ResponseCookie]> {
    return this.#map[Symbol.iterator]();
  }

  toString(): string {
    return [...this.#map.values()].map(serializeCookie).join(", ");
  }

  #sync(): void {
    this.#headers.delete("set-cookie");
    for (const c of this.#map.values()) this.#headers.append("set-cookie", serializeCookie(c));
  }
}

// ---------------------------------------------------------------------------
// NextURL / NextRequest
// ---------------------------------------------------------------------------

/** A `URL` whose `pathname` excludes the app's `basePath` (re-added when passed to `redirect()` / `rewrite()`). */
export class NextURL extends URL {
  basePath: string;

  constructor(input: string | URL, base?: string | URL, basePath = "") {
    super(input, base);
    this.basePath = basePath;
    if (basePath && (this.pathname === basePath || this.pathname.startsWith(`${basePath}/`))) {
      this.pathname = this.pathname.slice(basePath.length) || "/";
    }
  }

  /** The full URL including `basePath`. */
  toAbsolute(): URL {
    const u = new URL(this.href);
    if (this.basePath) u.pathname = this.basePath + (this.pathname === "/" ? "" : this.pathname) || "/";
    return u;
  }

  clone(): NextURL {
    const c = new NextURL(this.href);
    c.basePath = this.basePath;
    return c;
  }

  override toString(): string {
    return this.toAbsolute().href;
  }

  override toJSON(): string {
    return this.toString();
  }
}

export interface NextRequestInit extends RequestInit {
  basePath?: string;
}

/** The request passed to `middleware()`: a Web `Request` plus `nextUrl` and `cookies`. */
export class NextRequest extends Request {
  readonly nextUrl: NextURL;
  readonly cookies: RequestCookies;

  constructor(input: Request | string | URL, init: NextRequestInit = {}) {
    const { basePath, ...rest } = init;
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const base = input instanceof Request ? input : undefined;
    const reqInit: RequestInit & { duplex?: "half" } = { ...rest };
    if (base && reqInit.body === undefined && base.body) reqInit.duplex = "half";
    super(base ?? url, reqInit);
    this.nextUrl = new NextURL(url, undefined, basePath ?? "");
    this.cookies = new RequestCookies(this.headers);
  }
}

// ---------------------------------------------------------------------------
// NextResponse
// ---------------------------------------------------------------------------

export interface MiddlewareResponseInit extends ResponseInit {
  /** Replace the headers forwarded to route handlers, static files and pages. */
  request?: { headers?: HeadersInit };
}

function destination(url: string | URL): string {
  if (url instanceof NextURL) return url.toAbsolute().href;
  if (url instanceof URL) return url.href;
  try {
    return new URL(url).href;
  } catch {
    throw new TypeError(`URL is malformed "${String(url)}". Please use only absolute URLs, e.g. new URL("/login", request.url).`);
  }
}

function applyRequestOverride(headers: Headers, init: MiddlewareResponseInit | undefined): void {
  if (!init?.request?.headers) return;
  const next = new Headers(init.request.headers);
  const keys: string[] = [];
  next.forEach((value, key) => {
    keys.push(key);
    headers.set(`${MIDDLEWARE_REQUEST_PREFIX}${key}`, value);
  });
  headers.set(MIDDLEWARE_OVERRIDE_HEADERS, keys.join(","));
}

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export class NextResponse<Body = unknown> extends Response {
  readonly cookies: ResponseCookies;
  /** Type-only marker for `NextResponse.json<T>()`. */
  declare readonly __body?: Body;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this.cookies = new ResponseCookies(this.headers);
  }

  static override json<T>(body: T, init?: ResponseInit): NextResponse<T> {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse<T>(JSON.stringify(body), { ...init, headers });
  }

  /** Redirect (`307` by default). The URL must be absolute: `new URL("/login", request.url)`. */
  static override redirect(url: string | URL, init?: number | ResponseInit): NextResponse {
    const status = typeof init === "number" ? init : (init?.status ?? 307);
    if (!REDIRECTS.has(status)) throw new RangeError(`Failed to execute "redirect" on "response": Invalid status code ${status}`);
    const headers = new Headers(typeof init === "object" ? init.headers : undefined);
    headers.set("location", destination(url));
    return new NextResponse(null, { ...(typeof init === "object" ? init : {}), status, headers });
  }

  /** Serve another URL without changing the address bar. External origins are proxied. */
  static rewrite(url: string | URL, init?: MiddlewareResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set(MIDDLEWARE_REWRITE, destination(url));
    applyRequestOverride(headers, init);
    return new NextResponse(null, { ...init, headers });
  }

  /** Continue to the route handler / page, optionally adding response or request headers. */
  static next(init?: MiddlewareResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set(MIDDLEWARE_NEXT, "1");
    applyRequestOverride(headers, init);
    return new NextResponse(null, { ...init, headers });
  }
}

// ---------------------------------------------------------------------------
// Middleware module types
// ---------------------------------------------------------------------------

export type MatcherCondition =
  | { type: "header" | "cookie" | "query"; key: string; value?: string }
  | { type: "host"; key?: undefined; value: string };

export interface MatcherObject {
  source: string;
  has?: MatcherCondition[];
  missing?: MatcherCondition[];
}

export type Matcher = string | MatcherObject | Array<string | MatcherObject>;

export interface MiddlewareConfig {
  matcher?: Matcher;
}

export interface NextFetchEvent {
  /** Keep the runtime alive for background work after the response is sent. */
  waitUntil(promise: Promise<unknown>): void;
}

export type MiddlewareResult = Response | NextResponse | null | undefined | void;
export type NextMiddleware = (request: NextRequest, event: NextFetchEvent) => MiddlewareResult | Promise<MiddlewareResult>;

export interface MiddlewareModule {
  middleware?: NextMiddleware;
  default?: NextMiddleware;
  config?: MiddlewareConfig;
}
