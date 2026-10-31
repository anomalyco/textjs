/**
 * `vite dev` / `vite preview` adapter for the Terminal Pages Functions: the same handler,
 * configured from the environment. Loopback `Host`s only (no DNS rebinding onto a dev
 * server), bodies capped while reading, and `cf-connecting-ip` dropped (only Cloudflare sets it).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { API_PREFIX, CALLBACK_PATH, handleTerminal, isLoopbackHost, MAX_BODY_BYTES, type SessionConfig } from "./terminal-session";

type Next = (err?: unknown) => void;

export function hostnameOf(host: string): string {
  const h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  return h.replace(/:\d*$/, "");
}

function send(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
}

/** Resolves `null` once more than `limit` bytes arrive (and stops buffering). */
function readBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    req.on("data", (c: Buffer) => {
      if (over) return;
      size += c.byteLength;
      if (size > limit) {
        over = true;
        chunks.length = 0;
        req.pause();
        resolve(null);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!over) resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

export function terminalDevMiddleware(config: () => SessionConfig = () => process.env as SessionConfig): (req: IncomingMessage, res: ServerResponse, next: Next) => void {
  return (req, res, next) => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    if (path !== CALLBACK_PATH && path !== API_PREFIX && !path.startsWith(`${API_PREFIX}/`)) return next();
    const host = req.headers.host ?? "";
    if (!isLoopbackHost(hostnameOf(host))) {
      req.resume();
      return send(res, 403, JSON.stringify({ type: "error", code: "forbidden_host", message: "Forbidden host" }));
    }
    void (async () => {
      const method = (req.method ?? "GET").toUpperCase();
      const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req, MAX_BODY_BYTES);
      if (body === null) return send(res, 413, JSON.stringify({ type: "error", code: "too_large", message: "payload too large" }));
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string" && k !== "cf-connecting-ip") headers.set(k, v);
      const response = await handleTerminal(new Request(`http://${host}${req.url ?? "/"}`, { method, headers, body: body ? new Uint8Array(body) : undefined }), config());
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("set-cookie", cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    })().catch(next);
  };
}
