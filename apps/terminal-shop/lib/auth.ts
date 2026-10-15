/**
 * Credentials live in this browser's localStorage, per environment. They are only
 * ever sent to the same-origin proxy, never logged, and never put in a URL.
 */

import type { Env } from "./types";

export const OAUTH_CLIENT_ID = "textjs-terminal-shop";
export const AUTH_URLS: Record<Env, string> = {
  dev: "https://auth.dev.terminal.shop",
  prod: "https://auth.terminal.shop",
};

export interface Credentials {
  kind: "token" | "oauth";
  access: string;
  refresh?: string;
  /** Epoch ms when `access` expires (OAuth only). */
  expires?: number;
}

interface PendingOAuth {
  env: Env;
  verifier: string;
  state: string;
  redirect: string;
  returnTo: string;
}

const ENV_KEY = "terminal-shop:env";
const CREDS_KEY = (env: Env): string => `terminal-shop:auth:${env}`;
const OAUTH_KEY = "terminal-shop:oauth";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function safe(get: () => KeyValueStorage | undefined): KeyValueStorage {
  try {
    const s = get();
    if (s) {
      s.getItem("terminal-shop:probe");
      return s;
    }
  } catch {
    // storage blocked
  }
  return memoryStorage();
}

export const browserStorage = (): KeyValueStorage => safe(() => (typeof window === "undefined" ? undefined : window.localStorage));
const sessionStore = (): KeyValueStorage => safe(() => (typeof window === "undefined" ? undefined : window.sessionStorage));

export function loadEnv(storage: KeyValueStorage): Env {
  return storage.getItem(ENV_KEY) === "prod" ? "prod" : "dev";
}

export function saveEnv(storage: KeyValueStorage, env: Env): void {
  storage.setItem(ENV_KEY, env);
}

export function loadCredentials(storage: KeyValueStorage, env: Env): Credentials | null {
  const raw = storage.getItem(CREDS_KEY(env));
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Credentials;
    return typeof c?.access === "string" && c.access ? c : null;
  } catch {
    return null;
  }
}

export function saveCredentials(storage: KeyValueStorage, env: Env, creds: Credentials | null): void {
  if (creds) storage.setItem(CREDS_KEY(env), JSON.stringify(creds));
  else storage.removeItem(CREDS_KEY(env));
}

/** Accepts a pasted token with or without a `Bearer ` prefix. */
export function normalizeToken(input: string): string | null {
  const t = input.trim().replace(/^bearer\s+/i, "").trim();
  if (!t || /\s/.test(t) || t.length < 8 || t.length > 4096) return null;
  return t;
}

/** `trm_test_…` tokens belong to the dev sandbox; production tokens start with `trm_live_`. */
export function tokenEnvMismatch(token: string, env: Env): string | null {
  if (env === "prod" && token.startsWith("trm_test_")) return "that's a dev sandbox token (trm_test_), switch to dev with e";
  if (env === "dev" && token.startsWith("trm_live_")) return "that's a production token (trm_live_), it won't work in the dev sandbox";
  return null;
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: base64url(digest) };
}

/** Start the OpenAuth authorization-code + PKCE flow. Returns the URL to open. */
export async function beginOAuth(env: Env, origin: string, returnTo = "/shop"): Promise<string> {
  const { verifier, challenge } = await pkce();
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const redirect = `${origin}/auth/callback`;
  const pending: PendingOAuth = { env, verifier, state, redirect, returnTo };
  sessionStore().setItem(OAUTH_KEY, JSON.stringify(pending));
  const q = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URLS[env]}/authorize?${q}`;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(base: string, env: Env, form: Record<string, string>, doFetch: typeof fetch = fetch): Promise<Credentials> {
  const res = await doFetch(`${base}/${env}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-terminal-client": "1" },
    body: new URLSearchParams(form).toString(),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || `sign in failed (${res.status})`);
  return {
    kind: "oauth",
    access: json.access_token,
    refresh: json.refresh_token,
    expires: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  };
}

/** Finish the flow on `/auth/callback`. */
export async function completeOAuth(base: string, params: URLSearchParams, doFetch?: typeof fetch): Promise<{ env: Env; creds: Credentials; returnTo: string }> {
  const s = sessionStore();
  const raw = s.getItem(OAUTH_KEY);
  s.removeItem(OAUTH_KEY);
  if (!raw) throw new Error("no sign in in progress, try again");
  const pending = JSON.parse(raw) as PendingOAuth;
  const error = params.get("error");
  if (error) throw new Error(params.get("error_description") || error);
  if (params.get("state") !== pending.state) throw new Error("sign in state mismatch, try again");
  const code = params.get("code");
  if (!code) throw new Error("missing authorization code");
  const creds = await tokenRequest(
    base,
    pending.env,
    { grant_type: "authorization_code", code, redirect_uri: pending.redirect, client_id: OAUTH_CLIENT_ID, code_verifier: pending.verifier },
    doFetch,
  );
  return { env: pending.env, creds, returnTo: pending.returnTo };
}

export function refreshOAuth(base: string, env: Env, refresh: string, doFetch?: typeof fetch): Promise<Credentials> {
  return tokenRequest(base, env, { grant_type: "refresh_token", refresh_token: refresh, client_id: OAUTH_CLIENT_ID }, doFetch);
}
