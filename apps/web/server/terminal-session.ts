/**
 * textjs.org's side of "sign in with Terminal": a Cloudflare Pages Function (see
 * `functions/`) that runs the OAuth 2.0 authorization code + PKCE flow against Terminal's
 * OpenAuth server and proxies the Terminal API for the console shop at /terminal.
 *
 *   GET  /terminal/callback           OAuth redirect URI: checks state, exchanges the code
 *   GET  /api/terminal/_status        environment + whether you're signed in (never a token)
 *   GET  /api/terminal/login          starts the flow (302 to auth.terminal.shop/authorize)
 *   POST /api/terminal/logout         forgets the session
 *   *    /api/terminal/{env}/api/...  allowlisted Terminal API routes, bearer attached here
 *
 * Why server-side: the API's CORS reply (`Access-Control-Allow-Headers: *`) doesn't cover
 * `Authorization` (browsers never let `*` stand for it), so the page can't call the API with
 * a bearer token itself. Since requests go through here anyway, the tokens live in an
 * httpOnly cookie scoped to /api/terminal and page JavaScript never sees one.
 *
 * Terminal's OpenAuth issuer takes public clients: the token endpoint checks `client_id`,
 * `redirect_uri` and the PKCE verifier, never a client secret, so there is no secret here.
 * Nothing in this module logs; tokens never appear in URLs, logs or response bodies.
 */

export type TerminalEnv = "dev" | "prod";

export interface SessionConfig {
  /** Client id of the registered Terminal OAuth app (`ssh terminal.shop -t apps`). */
  TERMINAL_CLIENT_ID?: string;
  /** Which Terminal to talk to: `prod` (default) or `dev` (the sandbox, for previews). */
  TERMINAL_ENVIRONMENT?: string;
  /** Override the upstream API / auth server (local e2e against a mock only). */
  TERMINAL_API_URL?: string;
  TERMINAL_AUTH_URL?: string;
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface SessionOptions {
  fetch?: Fetch;
  now?: () => number;
}

export const UPSTREAMS: Record<TerminalEnv, { api: string; auth: string; label: string }> = {
  prod: { api: "https://api.terminal.shop", auth: "https://auth.terminal.shop", label: "production" },
  dev: { api: "https://api.dev.terminal.shop", auth: "https://auth.dev.terminal.shop", label: "dev sandbox" },
};

export const API_PREFIX = "/api/terminal";
export const CALLBACK_PATH = "/terminal/callback";
export const PAGE_PATH = "/terminal";
/** Client id used on loopback hosts when none is configured: Terminal accepts any id for localhost redirects. */
export const LOCAL_CLIENT_ID = "textjs-local";
export const MAX_BODY_BYTES = 64 * 1024;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE = 60 * 10;
/** Refresh this long before the access token expires. */
const REFRESH_SKEW_MS = 60_000;

const ID = "[A-Za-z0-9_-]{1,64}";
/** The Terminal API routes the shop uses (`apps/terminal-shop/lib/api.ts`), and nothing else. */
export const ROUTES: ReadonlyArray<{ method: string; path: RegExp; public?: boolean }> = [
  { method: "GET", path: /^\/product$/, public: true },
  { method: "GET", path: new RegExp(`^/product/${ID}$`), public: true },
  { method: "GET", path: /^\/view\/init$/ },
  { method: "GET", path: /^\/profile$/ },
  { method: "PUT", path: /^\/profile$/ },
  { method: "GET", path: /^\/cart$/ },
  { method: "DELETE", path: /^\/cart$/ },
  { method: "PUT", path: /^\/cart\/(item|address|card)$/ },
  { method: "POST", path: /^\/cart\/convert$/ },
  { method: "GET", path: /^\/address$/ },
  { method: "POST", path: /^\/address$/ },
  { method: "PATCH", path: new RegExp(`^/address/${ID}$`) },
  { method: "DELETE", path: new RegExp(`^/address/${ID}$`) },
  { method: "GET", path: /^\/card$/ },
  { method: "POST", path: /^\/card\/collect$/ },
  { method: "DELETE", path: new RegExp(`^/card/${ID}$`) },
  { method: "GET", path: /^\/order$/ },
  { method: "DELETE", path: new RegExp(`^/order/${ID}$`) },
  { method: "PATCH", path: new RegExp(`^/order/${ID}/shipping$`) },
  { method: "GET", path: /^\/subscription$/ },
  { method: "POST", path: /^\/subscription$/ },
  { method: "PUT", path: new RegExp(`^/subscription/${ID}$`) },
  { method: "DELETE", path: new RegExp(`^/subscription/${ID}$`) },
  { method: "GET", path: /^\/token$/ },
  { method: "POST", path: /^\/token$/ },
  { method: "DELETE", path: new RegExp(`^/token/${ID}$`) },
  { method: "GET", path: /^\/app$/ },
  { method: "POST", path: /^\/app$/ },
  { method: "DELETE", path: new RegExp(`^/app/${ID}$`) },
];

export function matchRoute(method: string, path: string): { public: boolean } | null {
  for (const r of ROUTES) if (r.method === method && r.path.test(path)) return { public: !!r.public };
  return null;
}

const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "idempotency-key", "x-terminal-region"];
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

// ── PKCE + encoding ─────────────────────────────────────────────────────────

export function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): string {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** RFC 7636 S256: `BASE64URL(SHA256(ASCII(verifier)))`. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

function encodeJSON(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJSON<T>(value: string | undefined): T | null {
  if (!value || value.length > 8192) return null;
  try {
    return JSON.parse(fromBase64url(value)) as T;
  } catch {
    return null;
  }
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── cookies ─────────────────────────────────────────────────────────────────

export interface StoredSession {
  /** Access token. */
  a: string;
  /** Refresh token. */
  r?: string;
  /** Access token expiry, epoch ms. */
  x?: number;
  e: TerminalEnv;
}

export interface PendingSignIn {
  /** PKCE verifier. */
  v: string;
  /** State. */
  s: string;
  /** In-app path to return to. */
  r: string;
  /** Redirect URI sent to /authorize (the token request must repeat it). */
  u: string;
  e: TerminalEnv;
}

function secureOrigin(url: URL): boolean {
  return url.protocol === "https:";
}

/** `__Secure-` names and the `Secure` attribute on https; plain names on http://localhost. */
export function cookieNames(url: URL): { session: string; oauth: string } {
  const p = secureOrigin(url) ? "__Secure-" : "";
  return { session: `${p}trm_session`, oauth: `${p}trm_oauth` };
}

function serializeCookie(url: URL, name: string, value: string, path: string, maxAge: number): string {
  const parts = [`${name}=${value}`, `Path=${path}`, `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax"];
  if (secureOrigin(url)) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

function readSession(request: Request, url: URL, env: TerminalEnv): StoredSession | null {
  const s = decodeJSON<StoredSession>(readCookie(request, cookieNames(url).session));
  if (!s || typeof s.a !== "string" || !s.a || s.e !== env) return null;
  return s;
}

function sessionCookie(url: URL, session: StoredSession | null): string {
  const name = cookieNames(url).session;
  return session ? serializeCookie(url, name, encodeJSON(session), API_PREFIX, SESSION_MAX_AGE) : serializeCookie(url, name, "", API_PREFIX, 0);
}

function oauthCookie(url: URL, pending: PendingSignIn | null): string {
  const name = cookieNames(url).oauth;
  return pending ? serializeCookie(url, name, encodeJSON(pending), CALLBACK_PATH, OAUTH_MAX_AGE) : serializeCookie(url, name, "", CALLBACK_PATH, 0);
}

// ── config ──────────────────────────────────────────────────────────────────

export interface ResolvedConfig {
  env: TerminalEnv;
  api: string;
  auth: string;
  label: string;
  clientId: string | null;
}

export function resolveConfig(config: SessionConfig, url: URL): ResolvedConfig {
  const env: TerminalEnv = config.TERMINAL_ENVIRONMENT?.trim() === "dev" ? "dev" : "prod";
  const up = UPSTREAMS[env];
  const trim = (v: string | undefined): string | undefined => (v && v.trim() ? v.trim().replace(/\/+$/, "") : undefined);
  const id = config.TERMINAL_CLIENT_ID?.trim();
  return {
    env,
    api: trim(config.TERMINAL_API_URL) ?? up.api,
    auth: trim(config.TERMINAL_AUTH_URL) ?? up.auth,
    label: up.label,
    clientId: id ? id : LOOPBACK.has(url.hostname) ? LOCAL_CLIENT_ID : null,
  };
}

/** Only same-origin in-app paths survive the round trip (no open redirects). */
export function safeReturnPath(value: string | null): string {
  if (!value || value.length > 200 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/shop";
  return /^\/[A-Za-z0-9/_\-.?=&%]*$/.test(value) ? value : "/shop";
}

// ── responses ───────────────────────────────────────────────────────────────

const NO_STORE = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

function json(body: unknown, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({ ...NO_STORE, "content-type": "application/json; charset=utf-8" });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ ...NO_STORE, location });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(null, { status: 302, headers });
}

const fail = (status: number, code: string, message: string, cookies: string[] = []): Response => json({ type: "error", code, message }, status, cookies);

/** Where the page opens after the callback: `/terminal`, plus `?at=` / `?signin_error=`. */
function pageUrl(params: Record<string, string> = {}): string {
  const q = new URLSearchParams(params).toString();
  return q ? `${PAGE_PATH}?${q}` : PAGE_PATH;
}

/** Cross-site reads and writes are refused; writes also need our client header (CSRF). */
function guard(request: Request, url: URL, write: boolean): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return fail(403, "cross_site", "cross-site requests are not allowed");
  if (write) {
    const origin = request.headers.get("origin");
    if (origin !== url.origin) return fail(403, "bad_origin", "origin not allowed");
    if (request.headers.get("x-terminal-client") !== "1") return fail(403, "missing_client_header", "missing x-terminal-client header");
  }
  return null;
}

// ── token endpoint ──────────────────────────────────────────────────────────

interface TokenReply {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(cfg: ResolvedConfig, form: Record<string, string>, doFetch: Fetch, now: number): Promise<StoredSession | { error: string }> {
  let res: Response;
  try {
    res = await doFetch(`${cfg.auth}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(form).toString(),
      redirect: "manual",
    });
  } catch {
    return { error: "couldn't reach terminal's sign in server, try again" };
  }
  const reply = (await res.json().catch(() => ({}))) as TokenReply;
  if (!res.ok || typeof reply.access_token !== "string" || !reply.access_token) {
    return { error: reply.error_description || reply.error || `sign in failed (${res.status})` };
  }
  return {
    a: reply.access_token,
    r: typeof reply.refresh_token === "string" ? reply.refresh_token : undefined,
    x: typeof reply.expires_in === "number" ? now + reply.expires_in * 1000 : undefined,
    e: cfg.env,
  };
}

async function refreshSession(cfg: ResolvedConfig, session: StoredSession, doFetch: Fetch, now: number): Promise<StoredSession | null> {
  if (!session.r || !cfg.clientId) return null;
  const next = await tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: session.r, client_id: cfg.clientId }, doFetch, now);
  if ("error" in next) return null;
  return { ...next, r: next.r ?? session.r };
}

// ── handlers ────────────────────────────────────────────────────────────────

async function login(request: Request, url: URL, cfg: ResolvedConfig): Promise<Response> {
  const denied = guard(request, url, false);
  if (denied) return denied;
  if (!cfg.clientId) return redirect(pageUrl({ signin_error: "sign in isn't set up on this deployment yet" }));
  const verifier = randomToken(32);
  const state = randomToken(16);
  const redirectUri = `${url.origin}${CALLBACK_PATH}`;
  const pending: PendingSignIn = { v: verifier, s: state, r: safeReturnPath(url.searchParams.get("return")), u: redirectUri, e: cfg.env };
  const authorize = new URL(`${cfg.auth}/authorize`);
  authorize.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  return redirect(authorize.toString(), [oauthCookie(url, pending)]);
}

/** Messages for the errors OpenAuth sends back to the redirect URI. */
export function describeAuthError(error: string, description: string | null): string {
  if (error === "unauthorized_client") return "terminal doesn't accept sign in from this site yet (its oauth app isn't registered for this address)";
  if (error === "access_denied") return "sign in was cancelled";
  return (description || error).slice(0, 200);
}

async function callback(request: Request, url: URL, cfg: ResolvedConfig, doFetch: Fetch, now: number): Promise<Response> {
  const clear = oauthCookie(url, null);
  const failWith = (message: string): Response => redirect(pageUrl({ signin_error: message }), [clear]);
  const pending = decodeJSON<PendingSignIn>(readCookie(request, cookieNames(url).oauth));
  const error = url.searchParams.get("error");
  if (error) return failWith(describeAuthError(error, url.searchParams.get("error_description")));
  if (!pending || typeof pending.v !== "string" || typeof pending.s !== "string" || typeof pending.u !== "string") return failWith("that sign in expired, try again");
  const state = url.searchParams.get("state") ?? "";
  if (!safeEqual(state, pending.s)) return failWith("sign in state didn't match, try again");
  if (pending.e !== cfg.env || !cfg.clientId) return failWith("sign in isn't set up on this deployment yet");
  const code = url.searchParams.get("code");
  if (!code) return failWith("terminal didn't send an authorization code, try again");
  const session = await tokenRequest(
    cfg,
    { grant_type: "authorization_code", code, redirect_uri: pending.u, client_id: cfg.clientId, code_verifier: pending.v },
    doFetch,
    now,
  );
  if ("error" in session) return failWith(session.error.slice(0, 200));
  const back = safeReturnPath(pending.r);
  return redirect(pageUrl(back === "/shop" ? {} : { at: back }), [clear, sessionCookie(url, session)]);
}

function status(request: Request, url: URL, cfg: ResolvedConfig, now: number): Response {
  const session = readSession(request, url, cfg.env);
  const signedIn = !!session && (!!session.r || !session.x || session.x > now);
  const environment = (e: TerminalEnv) => ({ label: UPSTREAMS[e].label, api: e === cfg.env ? cfg.api : UPSTREAMS[e].api, enabled: e === cfg.env, serverToken: false });
  const environments = { prod: environment("prod"), dev: environment("dev") };
  return json({
    mode: "site",
    defaultEnv: cfg.env,
    environments,
    session: { signedIn, configured: !!cfg.clientId, signInUrl: `${API_PREFIX}/login`, signOutUrl: `${API_PREFIX}/logout` },
  });
}

async function proxy(request: Request, url: URL, cfg: ResolvedConfig, env: string, path: string, doFetch: Fetch, now: number): Promise<Response> {
  const method = request.method.toUpperCase();
  const write = method !== "GET" && method !== "HEAD";
  const denied = guard(request, url, write);
  if (denied) return denied;
  if (env !== cfg.env) return fail(403, "environment_disabled", `this site only connects to ${cfg.label}`);
  if (path.includes("..") || path.includes("//")) return fail(400, "invalid_path", "invalid path");
  const route = matchRoute(method === "HEAD" ? "GET" : method, path);
  if (!route) return fail(404, "not_found", "not found");

  let body: ArrayBuffer | undefined;
  if (write) {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "too_large", "payload too large");
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return fail(413, "too_large", "payload too large");
  }

  const cookies: string[] = [];
  let session = readSession(request, url, cfg.env);
  let refreshed = false;
  if (session && session.x !== undefined && session.x - REFRESH_SKEW_MS <= now) {
    session = await refreshSession(cfg, session, doFetch, now);
    refreshed = true;
    cookies.push(sessionCookie(url, session));
  }
  if (!session && !route.public) return fail(401, "signed_out", "sign in to continue", cookies);

  const send = (s: StoredSession | null): Promise<Response> => {
    const headers = new Headers();
    for (const k of FORWARD_REQUEST_HEADERS) {
      const v = request.headers.get(k);
      if (v) headers.set(k, v);
    }
    // Region detection: the API reads the visitor's IP from this header when it's present.
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) headers.set("x-terminal-ip", ip);
    if (s) headers.set("authorization", `Bearer ${s.a}`);
    return doFetch(`${cfg.api}${path}${url.search}`, { method, headers, body, redirect: "manual" });
  };

  let upstream: Response;
  try {
    upstream = await send(session);
    if (upstream.status === 401 && session && !refreshed) {
      const next = await refreshSession(cfg, session, doFetch, now);
      cookies.push(sessionCookie(url, next));
      if (!next) return fail(401, "signed_out", "your terminal session ended, sign in again", cookies);
      upstream = await send(next);
    }
  } catch {
    return fail(502, "unreachable", `couldn't reach ${new URL(cfg.api).host}`, cookies);
  }
  const headers = new Headers(NO_STORE);
  const type = upstream.headers.get("content-type");
  if (type) headers.set("content-type", type);
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

/** Entry point for both Pages Functions (`/api/terminal/*` and `/terminal/callback`). */
export async function handleTerminal(request: Request, config: SessionConfig, options: SessionOptions = {}): Promise<Response> {
  const url = new URL(request.url);
  const cfg = resolveConfig(config, url);
  const doFetch: Fetch = options.fetch ?? ((input, init) => fetch(input, init));
  const now = (options.now ?? Date.now)();
  const method = request.method.toUpperCase();
  const path = url.pathname;
  try {
    if (path === CALLBACK_PATH) return method === "GET" ? await callback(request, url, cfg, doFetch, now) : fail(405, "method_not_allowed", "method not allowed");
    if (path !== API_PREFIX && !path.startsWith(`${API_PREFIX}/`)) return fail(404, "not_found", "not found");
    const sub = path.slice(API_PREFIX.length);
    if (sub === "/_status") return method === "GET" ? status(request, url, cfg, now) : fail(405, "method_not_allowed", "method not allowed");
    if (sub === "/login") return method === "GET" ? await login(request, url, cfg) : fail(405, "method_not_allowed", "method not allowed");
    if (sub === "/logout") {
      if (method !== "POST") return fail(405, "method_not_allowed", "method not allowed");
      return guard(request, url, true) ?? json({ ok: true }, 200, [sessionCookie(url, null)]);
    }
    const m = /^\/(dev|prod)\/api(\/.*)$/.exec(sub);
    if (!m) return fail(404, "not_found", "not found");
    return await proxy(request, url, cfg, m[1] as string, m[2] as string, doFetch, now);
  } catch {
    return fail(500, "internal", "something went wrong");
  }
}
