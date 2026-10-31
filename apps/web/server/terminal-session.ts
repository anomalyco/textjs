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
 * httpOnly cookie and page JavaScript never sees one.
 *
 * Cookies are `__Host-` (no `Domain`, `Path=/`, `Secure`), so no other *.textjs.org host can
 * plant or shadow them, and their values are sealed with AES-256-GCM (key from
 * `TERMINAL_COOKIE_SECRET`, cookie name in the AAD), so they can't be read or forged.
 *
 * Terminal's OpenAuth issuer takes public clients: the token endpoint checks `client_id`,
 * `redirect_uri` and the PKCE verifier, never a client secret, so there is no secret here.
 * Nothing in this module logs; tokens never appear in URLs, logs or response bodies.
 */

import { safeEntryPath, type SigninError } from "@textjs/terminal-shop/entry";

export type TerminalEnv = "dev" | "prod";

export interface SessionConfig {
  /** Client id of the registered Terminal OAuth app (`ssh terminal.shop -t apps`). */
  TERMINAL_CLIENT_ID?: string;
  /** At least 32 random bytes (e.g. `openssl rand -base64 32`). Seals the cookies. Required off localhost. */
  TERMINAL_COOKIE_SECRET?: string;
  /** Which Terminal to talk to: `prod` (default) or `dev` (the sandbox, for previews). Anything else fails closed. */
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
/** Browsers drop a `Set-Cookie` larger than this (name, value and attributes). */
export const MAX_COOKIE_BYTES = 4096;
export const MIN_SECRET_LENGTH = 32;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE = 60 * 10;
/** Refresh this long before the access token expires. */
const REFRESH_SKEW_MS = 60_000;

const ID = "[A-Za-z0-9_-]{1,64}";
/**
 * The Terminal API routes the shop uses (`apps/terminal-shop/lib/api.ts`), and nothing else.
 * Nothing that mints a long-lived credential (`POST /token`, `POST /app`) is reachable from
 * the page: those stay in the ssh shop.
 */
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
  { method: "DELETE", path: new RegExp(`^/token/${ID}$`) },
  { method: "GET", path: /^\/app$/ },
  { method: "DELETE", path: new RegExp(`^/app/${ID}$`) },
];

export function matchRoute(method: string, path: string): { public: boolean } | null {
  for (const r of ROUTES) if (r.method === method && r.path.test(path)) return { public: !!r.public };
  return null;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK.has(hostname.toLowerCase());
}

// ── encoding, PKCE ──────────────────────────────────────────────────────────

export function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** RFC 7636 S256: `BASE64URL(SHA256(ASCII(verifier)))`. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── sealed cookies (AES-256-GCM) ────────────────────────────────────────────

const keys = new Map<string, Promise<CryptoKey>>();
/** Local dev/preview/tests without a configured secret: a random key per isolate. */
const EPHEMERAL_SECRET = randomToken(32);

/** HKDF-SHA-256 → AES-256-GCM, so any ≥32-character high-entropy secret works. */
function cookieKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle
      .importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveKey"])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("textjs.org/terminal"), info: new TextEncoder().encode("cookie v1") },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
    keys.set(secret, key);
  }
  return key;
}

const aad = (name: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(`textjs-terminal:${name}`);

/** `v1.` + base64url(iv ‖ ciphertext ‖ tag), with the cookie name as additional data. */
export async function seal(secret: string, name: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(name) }, await cookieKey(secret), new TextEncoder().encode(JSON.stringify(value))));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return `v1.${base64url(out)}`;
}

export async function unseal<T>(secret: string, name: string, raw: string): Promise<T | null> {
  if (!raw.startsWith("v1.") || raw.length > MAX_COOKIE_BYTES) return null;
  try {
    const bytes = fromBase64url(raw.slice(3));
    if (bytes.length < 12 + 16) return null;
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: aad(name) }, await cookieKey(secret), bytes.slice(12));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}

export interface StoredSession {
  /** Access token. */
  a: string;
  /** Refresh token. */
  r?: string;
  /** Access token expiry, epoch ms. */
  x?: number;
  e: TerminalEnv;
  /** When you signed in, epoch ms. */
  i: number;
}

export interface PendingSignIn {
  /** PKCE verifier. */
  v: string;
  /** State. */
  s: string;
  /** In-app path to return to. */
  r: string;
  e: TerminalEnv;
  /** Started at, epoch ms. */
  i: number;
}

/** `__Host-` names on https (no Domain, Path=/, Secure); plain names on http://localhost. */
export function cookieNames(url: URL): { session: string; oauth: string } {
  const p = url.protocol === "https:" ? "__Host-" : "";
  return { session: `${p}trm_session`, oauth: `${p}trm_oauth` };
}

function serializeCookie(url: URL, name: string, value: string, maxAge: number): string {
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "HttpOnly", "SameSite=Lax"];
  if (url.protocol === "https:") parts.push("Secure");
  return parts.join("; ");
}

/** Every value sent under `name` (a planted duplicate must not shadow the real one). */
export function readCookies(request: Request, name: string): string[] {
  const header = request.headers.get("cookie");
  if (!header) return [];
  const out: string[] = [];
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i >= 0 && part.slice(0, i).trim() === name) out.push(part.slice(i + 1).trim());
  }
  return out;
}

/** The first value under `name` that unseals and passes `valid`. */
async function openCookie<T>(request: Request, secret: string, name: string, valid: (v: T) => boolean): Promise<T | null> {
  for (const raw of readCookies(request, name).slice(0, 8)) {
    const v = await unseal<T>(secret, name, raw);
    if (v && valid(v)) return v;
  }
  return null;
}

// ── config ──────────────────────────────────────────────────────────────────

export interface ResolvedConfig {
  env: TerminalEnv;
  api: string;
  auth: string;
  label: string;
  clientId: string | null;
  /** Seals cookies; `null` off localhost without `TERMINAL_COOKIE_SECRET` (sessions disabled). */
  secret: string | null;
  /** `TERMINAL_ENVIRONMENT` was set to something unknown: refuse to proxy. */
  misconfigured: boolean;
}

export function resolveConfig(config: SessionConfig, url: URL): ResolvedConfig {
  const raw = config.TERMINAL_ENVIRONMENT?.trim() ?? "";
  const misconfigured = raw !== "" && raw !== "prod" && raw !== "dev";
  const env: TerminalEnv = raw === "dev" ? "dev" : "prod";
  const up = UPSTREAMS[env];
  const trim = (v: string | undefined): string | undefined => (v && v.trim() ? v.trim().replace(/\/+$/, "") : undefined);
  const local = isLoopbackHost(url.hostname);
  const id = config.TERMINAL_CLIENT_ID?.trim();
  const secret = config.TERMINAL_COOKIE_SECRET?.trim();
  return {
    env,
    api: trim(config.TERMINAL_API_URL) ?? up.api,
    auth: trim(config.TERMINAL_AUTH_URL) ?? up.auth,
    label: up.label,
    clientId: misconfigured ? null : id ? id : local ? LOCAL_CLIENT_ID : null,
    secret: secret && secret.length >= MIN_SECRET_LENGTH ? secret : local ? EPHEMERAL_SECRET : null,
    misconfigured,
  };
}

/** Sign in works only with a client id and a cookie key. */
const canSignIn = (cfg: ResolvedConfig): boolean => !!cfg.clientId && !!cfg.secret;

// ── responses ───────────────────────────────────────────────────────────────

/** On every response from these Functions. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "cache-control": "private, no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
};

function headersWith(cookies: string[], extra: Record<string, string> = {}): Headers {
  const headers = new Headers({ ...SECURITY_HEADERS, ...extra });
  for (const c of cookies) headers.append("set-cookie", c);
  return headers;
}

function json(body: unknown, status = 200, cookies: string[] = []): Response {
  return new Response(JSON.stringify(body), { status, headers: headersWith(cookies, { "content-type": "application/json; charset=utf-8" }) });
}

function redirect(location: string, cookies: string[] = []): Response {
  return new Response(null, { status: 302, headers: headersWith(cookies, { location }) });
}

const fail = (status: number, code: string, message: string, cookies: string[] = []): Response => json({ type: "error", code, message }, status, cookies);

/** Where the page opens after the callback: `/terminal`, plus `?at=` / `?signin_error=<code>`. */
function pageUrl(params: Record<string, string> = {}): string {
  const q = new URLSearchParams(params).toString();
  return q ? `${PAGE_PATH}?${q}` : PAGE_PATH;
}

const signinFailed = (code: SigninError, cookies: string[] = []): Response => redirect(pageUrl({ signin_error: code }), cookies);

/** Cross-site requests are refused; writes also need our Origin and client header (CSRF). */
function guard(request: Request, url: URL, write: boolean): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return fail(403, "cross_site", "cross-site requests are not allowed");
  if (write) {
    if (request.headers.get("origin") !== url.origin) return fail(403, "bad_origin", "origin not allowed");
    if (request.headers.get("x-terminal-client") !== "1") return fail(403, "missing_client_header", "missing x-terminal-client header");
  }
  return null;
}

/** Reads at most `max` bytes, whatever `content-length` says (chunked bodies included). */
export async function readBounded(request: Request, max = MAX_BODY_BYTES): Promise<ArrayBuffer | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out.buffer;
}

// ── sessions ────────────────────────────────────────────────────────────────

async function readSession(request: Request, url: URL, cfg: ResolvedConfig, now: number): Promise<StoredSession | null> {
  if (!cfg.secret) return null;
  return openCookie<StoredSession>(request, cfg.secret, cookieNames(url).session, (s) => typeof s.a === "string" && !!s.a && s.e === cfg.env && typeof s.i === "number" && now - s.i < SESSION_MAX_AGE * 1000);
}

/** The `Set-Cookie` for `session`, or `null` if a browser would drop it for size. */
export async function sessionCookie(url: URL, cfg: ResolvedConfig, session: StoredSession): Promise<string | null> {
  if (!cfg.secret) return null;
  const name = cookieNames(url).session;
  const cookie = serializeCookie(url, name, await seal(cfg.secret, name, session), SESSION_MAX_AGE);
  return new TextEncoder().encode(cookie).byteLength <= MAX_COOKIE_BYTES ? cookie : null;
}

const clearSession = (url: URL): string => serializeCookie(url, cookieNames(url).session, "", 0);
const clearOAuth = (url: URL): string => serializeCookie(url, cookieNames(url).oauth, "", 0);

// ── token endpoint ──────────────────────────────────────────────────────────

interface TokenReply {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

type TokenResult = { ok: true; session: StoredSession } | { ok: false; permanent: boolean };

/** `permanent`: Terminal refused the grant (4xx other than 429). Network errors, 5xx and 429 are transient. */
async function tokenRequest(cfg: ResolvedConfig, form: Record<string, string>, doFetch: Fetch, now: number, signedInAt: number): Promise<TokenResult> {
  let res: Response;
  try {
    res = await doFetch(`${cfg.auth}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(form).toString(),
      redirect: "manual",
    });
  } catch {
    return { ok: false, permanent: false };
  }
  const reply = (await res.json().catch(() => ({}))) as TokenReply;
  if (!res.ok || typeof reply.access_token !== "string" || !reply.access_token) {
    return { ok: false, permanent: res.status >= 400 && res.status < 500 && res.status !== 429 };
  }
  return {
    ok: true,
    session: {
      a: reply.access_token,
      r: typeof reply.refresh_token === "string" ? reply.refresh_token : undefined,
      x: typeof reply.expires_in === "number" ? now + reply.expires_in * 1000 : undefined,
      e: cfg.env,
      i: signedInAt,
    },
  };
}

/** One refresh per refresh token at a time in this isolate (parallel requests share it). */
const inflight = new Map<string, Promise<TokenResult>>();

function refreshSession(cfg: ResolvedConfig, session: StoredSession, doFetch: Fetch, now: number): Promise<TokenResult> {
  const refresh = session.r;
  if (!refresh || !cfg.clientId) return Promise.resolve({ ok: false, permanent: true });
  const clientId = cfg.clientId;
  let pending = inflight.get(refresh);
  if (!pending) {
    pending = tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refresh, client_id: clientId }, doFetch, now, session.i)
      .then((r): TokenResult => (r.ok ? { ok: true, session: { ...r.session, r: r.session.r ?? refresh } } : r))
      .finally(() => inflight.delete(refresh));
    inflight.set(refresh, pending);
  }
  return pending;
}

// ── handlers ────────────────────────────────────────────────────────────────

async function login(request: Request, url: URL, cfg: ResolvedConfig, now: number): Promise<Response> {
  const denied = guard(request, url, false);
  if (denied) return denied;
  if (!canSignIn(cfg) || !cfg.secret || !cfg.clientId) return signinFailed("unconfigured");
  const verifier = randomToken(32);
  const state = randomToken(16);
  const pending: PendingSignIn = { v: verifier, s: state, r: safeEntryPath(url.searchParams.get("return")), e: cfg.env, i: now };
  const authorize = new URL(`${cfg.auth}/authorize`);
  authorize.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: `${url.origin}${CALLBACK_PATH}`,
    response_type: "code",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  const name = cookieNames(url).oauth;
  return redirect(authorize.toString(), [serializeCookie(url, name, await seal(cfg.secret, name, pending), OAUTH_MAX_AGE)]);
}

/** OpenAuth's `error` → one of our fixed codes. */
export function authErrorCode(error: string): SigninError {
  if (error === "unauthorized_client") return "unauthorized_client";
  if (error === "access_denied") return "cancelled";
  return "exchange_failed";
}

async function callback(request: Request, url: URL, cfg: ResolvedConfig, doFetch: Fetch, now: number): Promise<Response> {
  if (!canSignIn(cfg) || !cfg.secret || !cfg.clientId) return signinFailed("unconfigured", [clearOAuth(url)]);
  const pending = await openCookie<PendingSignIn>(
    request,
    cfg.secret,
    cookieNames(url).oauth,
    (p) => typeof p.v === "string" && typeof p.s === "string" && typeof p.i === "number" && now - p.i <= OAUTH_MAX_AGE * 1000,
  );
  const state = url.searchParams.get("state") ?? "";
  const stateOk = !!pending && safeEqual(state, pending.s);
  // A request without our state (anyone can link here) may show a fixed message, but
  // never cancels a sign in that's in progress.
  const clear = stateOk ? [clearOAuth(url)] : [];
  const error = url.searchParams.get("error");
  if (error) return signinFailed(authErrorCode(error), clear);
  if (!pending) return signinFailed("expired", [clearOAuth(url)]);
  if (!stateOk) return signinFailed("state_mismatch");
  if (pending.e !== cfg.env) return signinFailed("expired", clear);
  const code = url.searchParams.get("code");
  if (!code) return signinFailed("exchange_failed", clear);
  const result = await tokenRequest(
    cfg,
    { grant_type: "authorization_code", code, redirect_uri: `${url.origin}${CALLBACK_PATH}`, client_id: cfg.clientId, code_verifier: pending.v },
    doFetch,
    now,
    now,
  );
  if (!result.ok) return signinFailed(result.permanent ? "exchange_failed" : "unreachable", clear);
  const cookie = await sessionCookie(url, cfg, result.session);
  if (!cookie) return signinFailed("session_too_large", clear);
  const back = safeEntryPath(pending.r);
  return redirect(pageUrl(back === "/shop" ? {} : { at: back }), [...clear, cookie]);
}

async function status(request: Request, url: URL, cfg: ResolvedConfig, now: number): Promise<Response> {
  const denied = guard(request, url, false);
  if (denied) return denied;
  const session = await readSession(request, url, cfg, now);
  const signedIn = !!session && (!!session.r || !session.x || session.x > now);
  const environment = (e: TerminalEnv) => ({ label: UPSTREAMS[e].label, api: e === cfg.env ? cfg.api : UPSTREAMS[e].api, enabled: e === cfg.env && !cfg.misconfigured, serverToken: false });
  return json({
    mode: "site",
    defaultEnv: cfg.env,
    environments: { prod: environment("prod"), dev: environment("dev") },
    session: { signedIn, configured: canSignIn(cfg), signInUrl: `${API_PREFIX}/login`, signOutUrl: `${API_PREFIX}/logout` },
  });
}

/** Loopback, private, reserved and documentation addresses make the API's region lookup return no products. */
export function isPublicIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  const v4 = (s: string): number[] | null => {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
    if (!m) return null;
    const o = m.slice(1).map(Number);
    return o.every((n) => n <= 255) ? o : null;
  };
  const public4 = ([a, b, c]: number[]): boolean =>
    !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a! >= 224 ||
      (a === 100 && b! >= 64 && b! <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  const four = v4(v);
  if (four) return public4(four);
  if (!/^[0-9a-f:.]+$/.test(v) || !v.includes(":") || (v.match(/::/g) ?? []).length > 1) return false;
  // IPv4-mapped (::ffff:a.b.c.d or ::ffff:7f00:1) is judged as IPv4.
  const mapped = /^::ffff:(.+)$/.exec(v);
  if (mapped) {
    const dotted = v4(mapped[1] as string);
    if (dotted) return public4(dotted);
    const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(mapped[1] as string);
    if (!hex) return false;
    const hi = parseInt(hex[1] as string, 16);
    const lo = parseInt(hex[2] as string, 16);
    return public4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  }
  const groups = v.split(":");
  if (groups.some((g) => g.length > 4) || groups.length > 8) return false;
  if (groups.length < 8 && !v.includes("::")) return false;
  const first = parseInt(groups[0] || "0", 16);
  // Global unicast is 2000::/3; 2001:db8::/32 is documentation.
  if ((first & 0xe000) !== 0x2000) return false;
  return !(first === 0x2001 && parseInt(groups[1] || "0", 16) === 0x0db8);
}

const JSON_TYPE = /^application\/([a-z0-9.+-]*\+)?json(\s*;.*)?$/i;

/** Forwarded request headers, validated (anything else is dropped). */
function upstreamHeaders(request: Request, write: boolean): Headers {
  const headers = new Headers({ accept: "application/json" });
  if (write) headers.set("content-type", "application/json");
  const region = request.headers.get("x-terminal-region");
  if (region && /^(na|eu|global)$/.test(region)) headers.set("x-terminal-region", region);
  const key = request.headers.get("idempotency-key");
  if (key && /^[A-Za-z0-9_-]{1,128}$/.test(key)) headers.set("idempotency-key", key);
  // Region detection: the API reads the visitor's IP from this header when it's present.
  const ip = request.headers.get("cf-connecting-ip");
  if (ip && isPublicIp(ip)) headers.set("x-terminal-ip", ip);
  return headers;
}

async function proxy(request: Request, url: URL, cfg: ResolvedConfig, env: string, path: string, doFetch: Fetch, now: number): Promise<Response> {
  const method = request.method.toUpperCase();
  const write = method !== "GET" && method !== "HEAD";
  const denied = guard(request, url, write);
  if (denied) return denied;
  if (cfg.misconfigured) return fail(503, "misconfigured", "this deployment's terminal environment is misconfigured");
  if (env !== cfg.env) return fail(403, "environment_disabled", `this site only connects to ${cfg.label}`);
  if (path.includes("..") || path.includes("//")) return fail(400, "invalid_path", "invalid path");
  const route = matchRoute(method === "HEAD" ? "GET" : method, path);
  if (!route) return fail(404, "not_found", "not found");
  if (write && request.headers.has("content-type") && !JSON_TYPE.test(request.headers.get("content-type") ?? "")) return fail(415, "unsupported_media_type", "send json");

  let body: ArrayBuffer | undefined;
  if (write) {
    const read = await readBounded(request);
    if (!read) return fail(413, "too_large", "payload too large");
    body = read.byteLength ? read : undefined;
  }

  const cookies: string[] = [];
  let session = await readSession(request, url, cfg, now);
  let refreshed = false;
  const unreachable = (): Response => fail(503, "auth_unreachable", "couldn't reach terminal's sign in server, try again", cookies);

  const applyRefresh = async (result: TokenResult): Promise<"ok" | "gone" | "transient"> => {
    if (result.ok) {
      const cookie = await sessionCookie(url, cfg, result.session);
      if (!cookie) {
        cookies.push(clearSession(url));
        session = null;
        return "gone";
      }
      cookies.push(cookie);
      session = result.session;
      refreshed = true;
      return "ok";
    }
    if (result.permanent) {
      cookies.push(clearSession(url));
      session = null;
      return "gone";
    }
    return "transient";
  };

  if (session?.r && session.x !== undefined && session.x - REFRESH_SKEW_MS <= now) {
    const outcome = await applyRefresh(await refreshSession(cfg, session, doFetch, now));
    // Transient trouble: keep the cookie, and use the access token while it's still good.
    if (outcome === "transient" && session.x <= now) return unreachable();
  }
  if (!session && !route.public) return fail(401, "signed_out", "sign in to continue", cookies);

  const send = (s: StoredSession | null): Promise<Response> => {
    const headers = upstreamHeaders(request, write);
    if (s) headers.set("authorization", `Bearer ${s.a}`);
    return doFetch(`${cfg.api}${path}`, { method, headers, body, redirect: "manual" });
  };

  let upstream: Response;
  try {
    upstream = await send(session);
    if (upstream.status === 401 && session && !refreshed) {
      const outcome = session.r ? await applyRefresh(await refreshSession(cfg, session, doFetch, now)) : "gone";
      if (outcome === "gone") {
        if (!cookies.length) cookies.push(clearSession(url));
        return fail(401, "signed_out", "your terminal session ended, sign in again", cookies);
      }
      if (outcome === "transient") return unreachable();
      upstream = await send(session);
    }
  } catch {
    return fail(502, "unreachable", `couldn't reach ${new URL(cfg.api).host}`, cookies);
  }
  const type = upstream.headers.get("content-type") ?? "";
  const headers = headersWith(cookies, { "content-type": JSON_TYPE.test(type) ? type : "text/plain; charset=utf-8" });
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
    if (sub === "/_status") return method === "GET" ? await status(request, url, cfg, now) : fail(405, "method_not_allowed", "method not allowed");
    if (sub === "/login") return method === "GET" ? await login(request, url, cfg, now) : fail(405, "method_not_allowed", "method not allowed");
    if (sub === "/logout") {
      if (method !== "POST") return fail(405, "method_not_allowed", "method not allowed");
      return guard(request, url, true) ?? json({ ok: true }, 200, [clearSession(url)]);
    }
    const m = /^\/(dev|prod)\/api(\/.*)$/.exec(sub);
    if (!m) return fail(404, "not_found", "not found");
    return await proxy(request, url, cfg, m[1] as string, m[2] as string, doFetch, now);
  } catch {
    return fail(500, "internal", "something went wrong");
  }
}
