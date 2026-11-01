/**
 * `bunx @textjs/opencode proxy` (and `text proxy`): a loopback bridge that lets
 * https://textjs.org (and local dev origins) talk to the OpenCode server running
 * on this machine.
 *
 * Browsers block a public page from reading `http://127.0.0.1` unless the
 * server answers CORS and Private Network Access preflights, and the desktop
 * daemon additionally requires Basic auth. The bridge adds both, while
 * rejecting every other origin. The daemon password is read into memory only:
 * it is never logged, never returned to the browser and never written to disk.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { color } from "./color";
import { txError } from "./errors";

export const DEFAULT_PROXY_PORT = 4096;
export const BRIDGE_HEADER = "x-textjs-bridge";
export const CLIENT_HEADER = "x-opencode-client";
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = [
  "https://textjs.org",
  "https://www.textjs.org",
  "https://textjs-avg.pages.dev",
  "https://*.textjs-avg.pages.dev",
  "http://localhost:*",
  "http://127.0.0.1:*",
  "http://[::1]:*",
];

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "last-event-id", "x-opencode-directory"];
const FORWARD_RESPONSE_HEADERS = ["content-type", "location", "x-request-id"];

export interface BridgeTarget {
  url: string;
  /** How the target was found. */
  source: "service" | "flag" | "env";
  /** `Basic …` header value; memory only. */
  authorization?: string;
}

export interface BridgeOptions {
  port?: number;
  host?: string;
  /** Explicit OpenCode server URL (skips daemon discovery). */
  target?: string;
  /** Extra allowed browser origins (`https://example.com`, `http://localhost:*`). */
  allowOrigins?: readonly string[];
  /** Override discovery (tests). */
  discover?: () => Promise<BridgeTarget | null>;
  /** Re-run discovery after this long (default 30s). */
  cacheMs?: number;
  log?: boolean;
}

/** Strip the port from a `Host` header: `localhost:4096` → `localhost`, `[::1]:4096` → `[::1]`. */
export function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  return h.replace(/:\d*$/, "");
}

function matchOrigin(origin: string, pattern: string): boolean {
  if (pattern === origin) return true;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  const m = /^(https?):\/\/(\*\.)?(\[[^\]]+\]|[^:/]+)(?::(\*|\d+))?$/.exec(pattern);
  if (!m) return false;
  const [, scheme, wildcard, host, port] = m;
  if (o.protocol !== `${scheme}:`) return false;
  if (wildcard ? !o.hostname.endsWith(`.${host}`) : o.hostname !== host) return false;
  if (port === "*") return true;
  return o.port === (port ?? "");
}

/** Whether a browser `Origin` may use the bridge. */
export function isAllowedOrigin(origin: string, extra: readonly string[] = []): boolean {
  if (origin === "null") return false;
  for (const p of DEFAULT_ALLOWED_ORIGINS) if (matchOrigin(origin, p)) return true;
  for (const p of extra) if (matchOrigin(origin, p)) return true;
  return false;
}

/** CORS + Private Network Access headers for an allowed origin. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-private-network": "true",
    "access-control-allow-methods": "GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": `Content-Type, Accept, Last-Event-ID, x-opencode-directory, ${CLIENT_HEADER}`,
    "access-control-expose-headers": BRIDGE_HEADER,
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

/** `http://0.0.0.0:49374` → `http://127.0.0.1:49374`; picks the first URL in CLI output. */
export function normalizeTargetUrl(raw: string): string | null {
  const word = raw.split(/\s+/).find((s) => /^https?:\/\//i.test(s));
  if (!word) return null;
  try {
    const u = new URL(word);
    if (u.hostname === "0.0.0.0" || u.hostname === "[::]") u.hostname = "127.0.0.1";
    return u.origin;
  } catch {
    return null;
  }
}

function opencodeFallbacks(): string[] {
  try {
    const home = homedir();
    return [join(home, ".bun", "bin", "opencode"), join(home, ".opencode", "bin", "opencode"), "/opt/homebrew/bin/opencode", "/usr/local/bin/opencode"];
  } catch {
    return ["/opt/homebrew/bin/opencode", "/usr/local/bin/opencode"];
  }
}

function execOpencode(bin: string, args: string[]): Promise<{ ok: boolean; enoent: boolean; stdout: string }> {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: 4000, windowsHide: true }, (error, stdout) => {
      const enoent = Boolean(error && (error as NodeJS.ErrnoException).code === "ENOENT");
      resolve({ ok: !error, enoent, stdout: error ? "" : String(stdout).trim() });
    });
  });
}

async function run(args: string[]): Promise<string> {
  const first = await execOpencode("opencode", args);
  if (!first.enoent) return first.stdout;
  for (const candidate of opencodeFallbacks()) {
    if (!existsSync(candidate)) continue;
    const res = await execOpencode(candidate, args);
    if (!res.enoent) return res.stdout;
  }
  return "";
}

/** Loopback aliases (`localhost`, `127.0.0.1`, `[::1]`) with the same port select the trusted target, while requests still go to `trusted`. */
export function selectsTarget(origin: string, trusted: string): boolean {
  if (origin === trusted) return true;
  const a = new URL(origin);
  const b = new URL(trusted);
  return LOOPBACK_HOSTNAMES.has(a.hostname) && LOOPBACK_HOSTNAMES.has(b.hostname) && a.port === b.port && a.protocol === b.protocol;
}

/** An explicit target wins. Never apply a foreground server's password to a browser-selected URL. */
export async function discoverOpencode(target?: string): Promise<BridgeTarget | null> {
  const configured = (target ?? process.env.OPENCODE_SERVER_URL ?? "").trim();
  let explicit: string | undefined;
  if (configured) {
    const u = new URL(configured.includes("://") ? configured : `http://${configured}`);
    if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.pathname !== "/" || u.search || u.hash) {
      throw txError("TX021");
    }
    explicit = normalizeTargetUrl(u.origin) ?? undefined;
  }
  const service = normalizeTargetUrl(await run(["service", "status"]));
  if (service && (!explicit || selectsTarget(explicit, service))) {
    const password = await run(["service", "get", "password"]);
    return { url: service, source: "service", authorization: password ? `Basic ${Buffer.from(`opencode:${password}`).toString("base64")}` : undefined };
  }
  if (!explicit) return null;
  const password = LOOPBACK_HOSTNAMES.has(new URL(explicit).hostname) ? process.env.OPENCODE_PASSWORD ?? process.env.OPENCODE_SERVER_PASSWORD : undefined;
  const username = process.env.OPENCODE_PASSWORD ? "opencode" : process.env.OPENCODE_SERVER_USERNAME || "opencode";
  return { url: explicit, source: target ? "flag" : "env", authorization: password ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` : undefined };
}

/** A Vite/SPA fallback can return 200 HTML for *every* path. Verify the API, not just the status. */
export async function probeOpenCode(t: { url: string; authorization?: string }): Promise<number> {
  const headers = new Headers({ accept: "application/json" });
  if (t.authorization) headers.set("authorization", t.authorization);
  try {
    for (const path of ["/api/info", "/session?limit=1"]) {
      const res = await fetch(`${t.url}${path}`, { headers, signal: AbortSignal.timeout(5000), redirect: "manual" });
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        if (path === "/api/info" ? typeof data?.version === "string" : Array.isArray(data)) return res.status;
      } else {
        await res.body?.cancel();
        if (!res.ok && res.status !== 404 && res.status !== 405) return res.status;
      }
    }
    return 415;
  } catch {
    return 0;
  }
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

async function readBody(request: Request, limit = MAX_BODY_BYTES): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out.buffer;
}

export interface BridgeHandler {
  (request: Request): Promise<Response>;
  /** The current (cached) target, discovering it if needed. */
  target(force?: boolean): Promise<BridgeTarget | null>;
}

/** The bridge as a Web `Request → Response` handler. */
export function createBridgeHandler(options: BridgeOptions = {}): BridgeHandler {
  const discover = options.discover ?? (() => discoverOpencode(options.target));
  const cacheMs = options.cacheMs ?? 30_000;
  const extra = options.allowOrigins ?? [];
  let cached: { target: BridgeTarget | null; at: number } | null = null;

  const target = async (force = false): Promise<BridgeTarget | null> => {
    if (!force && cached && Date.now() - cached.at < cacheMs) return cached.target;
    cached = { target: await discover(), at: Date.now() };
    return cached.target;
  };

  const handler = (async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    if (!LOOPBACK_HOSTNAMES.has(hostnameOf(host))) return json(403, { error: "Forbidden host" });
    const origin = request.headers.get("origin");
    if (origin !== null && !isAllowedOrigin(origin, extra)) return json(403, { error: "Origin not allowed" });
    const cors: Record<string, string> = { [BRIDGE_HEADER]: "1", ...(origin !== null ? corsHeaders(origin) : {}) };
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname === "/__bridge") {
      const wasCached = cached !== null && Date.now() - cached.at < cacheMs;
      let t = await target();
      let code = t ? await probeOpenCode(t) : 0;
      if (wasCached && t?.source === "service" && (code === 0 || code === 401)) {
        t = await target(true);
        code = t ? await probeOpenCode(t) : 0;
      }
      return json(200, { bridge: "textjs", target: t?.url ?? null, connected: code >= 200 && code < 300 }, cors);
    }
    if (!SAFE_METHODS.has(method) && request.headers.get(CLIENT_HEADER) !== "1") return json(403, { error: `Missing ${CLIENT_HEADER} header` }, cors);

    const wasCached = cached !== null && Date.now() - cached.at < cacheMs;
    let t = await target();
    if (t === null) t = await target(true);
    if (t === null) return json(502, { error: "No OpenCode server found. Start `opencode` or pass --target." }, cors);

    const buildHeaders = (auth?: string): Headers => {
      const h = new Headers();
      for (const k of FORWARD_REQUEST_HEADERS) {
        const v = request.headers.get(k);
        if (v) h.set(k, v);
      }
      if (auth) h.set("authorization", auth);
      return h;
    };
    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json(413, { error: "Payload Too Large" }, cors);
      const read = await readBody(request);
      if (read === null) return json(413, { error: "Payload Too Large" }, cors);
      body = read;
    }

    const canRetry = wasCached && t.source === "service" && SAFE_METHODS.has(method);
    let upstream: Response;
    try {
      upstream = await fetch(`${t.url}${url.pathname}${url.search}`, { method, headers: buildHeaders(t.authorization), body, signal: request.signal, redirect: "manual" });
    } catch (error) {
      if (request.signal.aborted) return new Response(null, { status: 499, headers: cors });
      cached = null;
      if (canRetry) {
        const refreshed = await target(true);
        if (refreshed) {
          try {
            upstream = await fetch(`${refreshed.url}${url.pathname}${url.search}`, { method, headers: buildHeaders(refreshed.authorization), body, signal: request.signal, redirect: "manual" });
          } catch (retryError) {
            if (request.signal.aborted) return new Response(null, { status: 499, headers: cors });
            cached = null;
            return json(502, { error: "OpenCode server unreachable", detail: retryError instanceof Error ? retryError.message : String(retryError) }, cors);
          }
        } else {
          return json(502, { error: "OpenCode server unreachable", detail: error instanceof Error ? error.message : String(error) }, cors);
        }
      } else {
        return json(502, { error: "OpenCode server unreachable", detail: error instanceof Error ? error.message : String(error) }, cors);
      }
    }
    // The daemon may have restarted with a new port or password.
    if (upstream.status === 401) {
      cached = null;
      if (canRetry) {
        const refreshed = await target(true);
        if (refreshed && (refreshed.url !== t.url || refreshed.authorization !== t.authorization)) {
          await upstream.body?.cancel().catch(() => undefined);
          try {
            upstream = await fetch(`${refreshed.url}${url.pathname}${url.search}`, { method, headers: buildHeaders(refreshed.authorization), body, signal: request.signal, redirect: "manual" });
          } catch (retryError) {
            if (request.signal.aborted) return new Response(null, { status: 499, headers: cors });
            cached = null;
            return json(502, { error: "OpenCode server unreachable", detail: retryError instanceof Error ? retryError.message : String(retryError) }, cors);
          }
        }
      }
    }

    const out = new Headers(cors);
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    out.set("cache-control", "no-cache");
    if ((upstream.headers.get("content-type") ?? "").includes("text/event-stream")) {
      out.set("connection", "keep-alive");
      out.set("x-accel-buffering", "no");
    }
    return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  }) as BridgeHandler;
  handler.target = target;
  return handler;
}

async function serveNode(handler: BridgeHandler, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const method = (req.method ?? "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const body = hasBody
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          req.on("data", (c: Buffer) => controller.enqueue(new Uint8Array(c)));
          req.on("end", () => controller.close());
          req.on("error", (e) => controller.error(e));
        },
        cancel() {
          req.destroy();
        },
      })
    : undefined;
  const request = new Request(`http://${req.headers.host ?? "127.0.0.1"}${req.url ?? "/"}`, {
    method,
    headers,
    body,
    signal: abort.signal,
    ...(body ? { duplex: "half" } : {}),
  } as RequestInit);
  const response = await handler(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  res.flushHeaders();
  const reader = response.body.getReader();
  const cancel = (): void => {
    reader.cancel().catch(() => undefined);
  };
  res.on("close", cancel);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || res.writableEnded || res.destroyed) break;
      res.write(value);
    }
  } catch {
    // client disconnected mid-stream
  } finally {
    res.off("close", cancel);
  }
  res.end();
}

export interface StartedBridge {
  server: Server;
  url: string;
  target: BridgeTarget | null;
  close(): Promise<void>;
}

/** Start the bridge on `127.0.0.1:<port>`. */
export async function startProxy(options: BridgeOptions = {}): Promise<StartedBridge> {
  const handler = createBridgeHandler(options);
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? DEFAULT_PROXY_PORT;
  const target = await handler.target();
  if (target) {
    const t = new URL(target.url);
    if (LOOPBACK_HOSTNAMES.has(t.hostname) && Number(t.port) === port) {
      throw txError("TX022", port);
    }
  }
  const server = createServer((req, res) => {
    serveNode(handler, req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
      }
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (port > 0 && ((err as NodeJS.ErrnoException)?.code === "EADDRINUSE" || /in use/i.test(msg))) {
      const probeHost = host === "::1" ? "[::1]" : host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
      const existing = await fetch(`http://${probeHost}:${port}/__bridge`, { signal: AbortSignal.timeout(1000) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (existing && typeof existing === "object" && (existing as { bridge?: unknown }).bridge === "textjs") {
        const dest = typeof (existing as { target?: unknown }).target === "string" ? ` → ${(existing as { target: string }).target}` : "";
        throw txError("TX023", `http://${probeHost}:${port}${dest}`, `http://${probeHost}:${port}`, port + 1);
      }
      throw txError("TX024", port, port + 1, `http://${probeHost}:${port + 1}`);
    }
    throw err;
  }
  const addr = server.address() as AddressInfo;
  const url = `http://${host === "::1" ? "[::1]" : host}:${addr.port}`;
  if (options.log !== false) {
    const dest = target ? `${target.url}${target.source === "service" ? color.dim(" (opencode service)") : ""}` : color.yellow("no OpenCode server yet. Start opencode.");
    console.log(`\n   ${color.bold("▼ Text.js OpenCode Bridge")}\n\n   ${url} ${color.dim("→")} ${dest}\n   ${color.dim("Open https://textjs.org/opencode to connect.")}\n`);
  }
  return {
    server,
    url,
    target,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
