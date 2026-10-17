/**
 * Server-only Terminal API proxy shared by the `text dev` middleware (`/__terminal/*`)
 * and the `app/api/terminal/[...path]` route handler (`text start`).
 *
 *   /_status                    which environments are available (never any token)
 *   /{env}/api/<path>           → https://api(.dev).terminal.shop/<path>
 *   /{env}/auth/token           → https://auth(.dev).terminal.shop/token (OAuth code exchange / refresh)
 *
 * Why a proxy: the Terminal API answers CORS with `Access-Control-Allow-Headers: *`,
 * which browsers never extend to `Authorization`, so bearer requests can't be sent
 * from the page directly.
 *
 * Safety:
 * - `dev` (the sandbox: Stripe test mode, nothing ships) is the default.
 * - `prod` is refused unless the server was started with `TERMINAL_ENABLE_PRODUCTION=1`.
 * - Tokens come from the browser (`x-terminal-token`, kept in localStorage) or from
 *   `TERMINAL_DEV_TOKEN` / `TERMINAL_PROD_TOKEN` in the server environment. They are
 *   never logged, echoed back or written anywhere by this module.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export type Env = "dev" | "prod";

export const ENVIRONMENTS: Record<Env, { api: string; auth: string; label: string }> = {
  dev: { api: "https://api.dev.terminal.shop", auth: "https://auth.dev.terminal.shop", label: "dev sandbox" },
  prod: { api: "https://api.terminal.shop", auth: "https://auth.terminal.shop", label: "production" },
};

export const CLIENT_HEADER = "x-terminal-client";
export const TOKEN_HEADER = "x-terminal-token";
export const MAX_BODY_BYTES = 1024 * 1024;

const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "idempotency-key", "x-terminal-region"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "x-amzn-requestid"];
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface ProxyOptions {
  /** Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  /** Override upstream URLs (tests point these at a mock server). */
  environments?: Partial<Record<Env, { api: string; auth: string; label?: string }>>;
}

export interface ProxyStatus {
  defaultEnv: Env;
  environments: Record<Env, { label: string; api: string; enabled: boolean; serverToken: boolean }>;
}

export interface TerminalProxy {
  handle(request: Request, subpath: string): Promise<Response>;
  status(): ProxyStatus;
}

export function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  return h.replace(/:\d*$/, "");
}

/** Loopback `Host` only (DNS rebinding), same-origin only (cross-site reads), client header on writes (CSRF). */
export function guardRequest(request: Request): Response | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!LOOPBACK_HOSTNAMES.has(hostnameOf(host))) return Response.json({ message: "Forbidden host" }, { status: 403 });
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return Response.json({ message: "Cross-site requests are not allowed" }, { status: 403 });
  if (!SAFE_METHODS.has(request.method.toUpperCase()) && request.headers.get(CLIENT_HEADER) !== "1") {
    return Response.json({ message: `Missing ${CLIENT_HEADER} header` }, { status: 403 });
  }
  return null;
}

function truthy(v: string | undefined): boolean {
  return v !== undefined && /^(1|true|yes|on)$/i.test(v.trim());
}

export function createTerminalProxy(options: ProxyOptions = {}): TerminalProxy {
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});
  const doFetch = options.fetch ?? fetch;
  // `TERMINAL_DEV_API_URL` points the sandbox at a local mock (e2e). Production can't be redirected.
  const devOverride = env.TERMINAL_DEV_API_URL ? { api: env.TERMINAL_DEV_API_URL.replace(/\/+$/, ""), auth: (env.TERMINAL_DEV_AUTH_URL ?? env.TERMINAL_DEV_API_URL).replace(/\/+$/, "") } : {};
  const targets: Record<Env, { api: string; auth: string; label: string }> = {
    dev: { ...ENVIRONMENTS.dev, ...devOverride, ...options.environments?.dev },
    prod: { ...ENVIRONMENTS.prod, ...options.environments?.prod },
  };
  const serverToken = (e: Env): string | undefined => {
    const v = e === "dev" ? env.TERMINAL_DEV_TOKEN : (env.TERMINAL_PROD_TOKEN ?? env.TERMINAL_TOKEN);
    return v && v.trim() ? v.trim() : undefined;
  };
  const enabled = (e: Env): boolean => e === "dev" || truthy(env.TERMINAL_ENABLE_PRODUCTION);

  const status = (): ProxyStatus => ({
    defaultEnv: "dev",
    environments: {
      dev: { label: targets.dev.label, api: targets.dev.api, enabled: true, serverToken: !!serverToken("dev") },
      prod: { label: targets.prod.label, api: targets.prod.api, enabled: enabled("prod"), serverToken: enabled("prod") && !!serverToken("prod") },
    },
  });

  const handle = async (request: Request, subpath: string): Promise<Response> => {
    const denied = guardRequest(request);
    if (denied) return denied;
    if (subpath === "/_status" || subpath === "/_status/") return Response.json(status(), { headers: { "cache-control": "no-store" } });

    const m = /^\/(dev|prod)\/(api|auth)(\/.*)?$/.exec(subpath);
    if (!m) return Response.json({ message: "Not found" }, { status: 404 });
    const e = m[1] as Env;
    const kind = m[2] as "api" | "auth";
    const rest = m[3] ?? "/";
    if (!enabled(e)) {
      return Response.json(
        { type: "forbidden", code: "production_disabled", message: "production is disabled; restart the dev server with TERMINAL_ENABLE_PRODUCTION=1" },
        { status: 403 },
      );
    }
    if (kind === "auth" && rest !== "/token") return Response.json({ message: "Not found" }, { status: 404 });
    if (rest.includes("..")) return Response.json({ message: "Invalid path" }, { status: 400 });

    const method = request.method.toUpperCase();
    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ message: "Payload Too Large" }, { status: 413 });
      body = await request.arrayBuffer();
      if (body.byteLength > MAX_BODY_BYTES) return Response.json({ message: "Payload Too Large" }, { status: 413 });
    }

    const headers = new Headers();
    for (const k of FORWARD_REQUEST_HEADERS) {
      const v = request.headers.get(k);
      if (v) headers.set(k, v);
    }
    if (kind === "api") {
      const token = request.headers.get(TOKEN_HEADER)?.trim() || serverToken(e);
      if (token) headers.set("authorization", `Bearer ${token}`);
    }

    const search = new URL(request.url).search;
    const url = `${kind === "api" ? targets[e].api : targets[e].auth}${rest}${kind === "api" ? search : ""}`;
    let upstream: Response;
    try {
      upstream = await doFetch(url, { method, headers, body, redirect: "manual", signal: request.signal });
    } catch {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      return Response.json({ type: "internal", code: "unreachable", message: `could not reach ${new URL(url).host}` }, { status: 502 });
    }
    const out = new Headers({ "cache-control": "no-store" });
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  };

  return { handle, status };
}

let shared: TerminalProxy | null = null;

export function getTerminalProxy(): TerminalProxy {
  shared ??= createTerminalProxy();
  return shared;
}

type Next = (error?: unknown) => void;

/** Connect middleware for Vite: serves `${prefix}/*`. */
export function terminalDevMiddleware(prefix = "/__terminal", proxy?: TerminalProxy): (req: IncomingMessage, res: ServerResponse, next: Next) => void {
  return (req, res, next) => {
    const url = req.url ?? "/";
    if (url !== prefix && !url.startsWith(`${prefix}/`)) return next();
    void serveNode(proxy ?? getTerminalProxy(), req, res, url.slice(prefix.length) || "/").catch(() => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
      }
      res.end(JSON.stringify({ message: "proxy error" }));
    });
  };
}

async function serveNode(proxy: TerminalProxy, req: IncomingMessage, res: ServerResponse, rest: string): Promise<void> {
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const method = (req.method ?? "GET").toUpperCase();
  const href = `http://${req.headers.host ?? "localhost"}${rest.startsWith("/") ? rest : `/${rest}`}`;
  const denied = guardRequest(new Request(href, { method, headers }));
  if (denied) {
    req.resume();
    await send(res, denied);
    return;
  }
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  if (body === null) {
    await send(res, Response.json({ message: "Payload Too Large" }, { status: 413 }));
    return;
  }
  const q = rest.indexOf("?");
  const response = await proxy.handle(new Request(href, { method, headers, body, signal: abort.signal }), q >= 0 ? rest.slice(0, q) : rest);
  await send(res, response);
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on("data", (c: Buffer) => {
      if (failed) return;
      size += c.byteLength;
      if (size > limit) {
        failed = true;
        chunks.length = 0;
        req.pause();
        resolve(null);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (failed) return;
      const b = Buffer.concat(chunks);
      resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    });
    req.on("error", reject);
  });
}
