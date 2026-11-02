/**
 * A minimal local emulation of Vercel's Build Output API v3 router, enough to
 * exercise `.vercel/output` from `text build --adapter vercel` without a
 * deploy: `config.json` routes (`src`, `dest`, `headers`, `continue`,
 * `middlewarePath`, `has` / `missing`, `status`, `transforms`, `handle: "filesystem"`,
 * external `dest` proxying), static files, Node.js functions
 * (`launcherType: "Nodejs"`) and Edge middleware speaking `x-middleware-*`.
 * Functions are part of the filesystem: a request for a function's path
 * invokes it directly (as on Vercel) unless a route stops it first.
 *
 * Functions see the *original* request URL with `dest` query parameters
 * merged in (the stricter of Vercel's behaviors for the Text.js adapter).
 * As on Vercel (checked on a deployment, Nov 2026), `src` matches the path as
 * sent, `$n` in a `dest` query is the decoded capture, re-encoded, and
 * `transforms` request headers get the capture as sent.
 */

import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { staticFile as exactFile } from "../src/server/static-file";

interface Condition {
  type: "header" | "cookie" | "query" | "host";
  key?: string;
  value?: string;
}

interface Route {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  continue?: boolean;
  status?: number;
  middlewarePath?: string;
  has?: Condition[];
  missing?: Condition[];
  handle?: string;
  caseSensitive?: boolean;
  transforms?: Array<{ type: string; op: string; target: { key: string }; args?: string }>;
}

function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function holds(c: Condition, headers: Headers, query: URLSearchParams): boolean {
  let actual: string | null | undefined;
  if (c.type === "header") actual = headers.get(c.key ?? "");
  else if (c.type === "cookie") actual = cookieValue(headers.get("cookie"), c.key ?? "");
  else if (c.type === "query") actual = query.get(c.key ?? "");
  else actual = (headers.get("host") ?? "").replace(/:\d+$/, "");
  if (actual === null || actual === undefined) return false;
  return c.value === undefined || new RegExp(`^(?:${c.value})$`).test(actual);
}

/** The raw request target's path, as sent (route `src` sees it before any URL parser re-encodes it), and its query. */
function routerTarget(raw: string | undefined): { pathname: string; search: string } {
  let target = raw ?? "/";
  if (!target.startsWith("/")) {
    const u = new URL(target);
    target = `${u.pathname}${u.search}`;
  }
  const q = target.indexOf("?");
  return q < 0 ? { pathname: target, search: "" } : { pathname: target.slice(0, q), search: target.slice(q) };
}

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => unknown;
type EdgeHandler = (request: Request, context: { waitUntil(p: Promise<unknown>): void }) => Promise<Response>;

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json" };

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

async function readBody(req: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return new Uint8Array(Buffer.concat(chunks));
}

export interface VercelHarness {
  url: string;
  /** Edge middleware invocations (for assertions). */
  middlewareCalls: string[];
  /** Node.js function invocations, by routed path. */
  functionCalls: string[];
  close(): Promise<void>;
}

export async function startVercelHarness(outputDir: string): Promise<VercelHarness> {
  const config = JSON.parse(readFileSync(join(outputDir, "config.json"), "utf8")) as { version: number; routes: Route[] };
  if (config.version !== 3) throw new Error("expected Build Output API v3");
  const functionUrls = new Map<string, string>();
  const servers: Server[] = [];
  const edge = new Map<string, EdgeHandler>();
  const middlewareCalls: string[] = [];
  const functionCalls: string[] = [];

  async function loadFunction(name: string): Promise<void> {
    const dir = join(outputDir, "functions", `${name}.func`);
    const vc = JSON.parse(readFileSync(join(dir, ".vc-config.json"), "utf8")) as { runtime: string; handler?: string; entrypoint?: string; launcherType?: string };
    if (vc.runtime === "edge") {
      edge.set(name, ((await import(pathToFileURL(join(dir, vc.entrypoint as string)).href)) as { default: EdgeHandler }).default);
      return;
    }
    if (vc.launcherType !== "Nodejs" || !vc.runtime.startsWith("nodejs")) throw new Error(`unsupported function config ${JSON.stringify(vc)}`);
    const handler = ((await import(pathToFileURL(join(dir, vc.handler as string)).href)) as { default: NodeHandler }).default;
    const s = createServer((req, res) => void handler(req, res));
    servers.push(s);
    functionUrls.set(`/${name}`, await listen(s));
  }
  for (const route of config.routes) if (route.middlewarePath && !edge.has(route.middlewarePath)) await loadFunction(route.middlewarePath);
  for (const route of config.routes) {
    const dest = route.dest?.split("?")[0];
    if (dest && existsSync(join(outputDir, "functions", `${dest.slice(1)}.func`)) && !functionUrls.has(dest)) await loadFunction(dest.slice(1));
  }

  // Vercel's file system is case-sensitive.
  const staticFile = (pathname: string): string | null => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    return exactFile(join(outputDir, "static"), decoded, { index: true });
  };

  const router = createServer((req, res) => {
    void (async () => {
      // Node hands over the request line as latin1: recover the UTF-8 bytes the client sent.
      const original = routerTarget(Buffer.from(req.url ?? "/", "latin1").toString("utf8"));
      let pathname = original.pathname;
      const query = new URLSearchParams(original.search);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const out = new Headers();
      let phase: "main" | "filesystem" = "main";

      // `NextResponse.next({ status })` / `rewrite(url, { status })`.
      let middlewareStatus: number | undefined;
      const send = async (response: Response): Promise<void> => {
        res.statusCode = middlewareStatus ?? response.status;
        response.headers.forEach((v, k) => {
          if (k !== "set-cookie") res.setHeader(k, v);
        });
        out.forEach((v, k) => {
          if (k !== "set-cookie" && !res.hasHeader(k)) res.setHeader(k, v);
        });
        const cookies = [...out.getSetCookie(), ...response.headers.getSetCookie()];
        if (cookies.length) res.setHeader("set-cookie", cookies);
        res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
      };
      const serveStatic = async (): Promise<boolean> => {
        const file = staticFile(pathname);
        if (!file) return false;
        await send(new Response(readFileSync(file), { headers: { "content-type": MIME[extname(file)] ?? "application/octet-stream" } }));
        return true;
      };
      const resolve = async (): Promise<void> => {
        const fn = functionUrls.get(pathname);
        if (fn) {
          functionCalls.push(pathname);
          const target = new URL(`${fn}${new URL(original.pathname, "http://x").pathname}`);
          target.search = query.toString();
          const forwarded = new Headers(headers);
          forwarded.set("x-forwarded-host", req.headers.host ?? "vercel.local");
          forwarded.set("x-forwarded-proto", "http");
          const response = await fetch(target, { method: req.method, headers: forwarded, body, redirect: "manual" });
          return send(response);
        }
        if (await serveStatic()) return;
        await send(new Response("NOT_FOUND", { status: 404 }));
      };

      for (const route of config.routes) {
        if (route.handle) {
          if (route.handle === "filesystem") {
            phase = "filesystem";
            if (functionUrls.has(pathname)) return resolve();
            if (await serveStatic()) return;
          }
          continue;
        }
        // Vercel matches `src` case-insensitively unless the route says `caseSensitive: true`.
        const m = new RegExp(route.src ?? "^$", route.caseSensitive ? "" : "i").exec(pathname);
        if (!m) continue;
        if (route.has && !route.has.every((c) => holds(c, headers, query))) continue;
        if (route.missing && route.missing.some((c) => holds(c, headers, query))) continue;
        // As on Vercel, `status` without `dest` only sets the status: the path still resolves (a function runs).
        if (route.status !== undefined && route.dest) middlewareStatus = route.status;
        if (route.status !== undefined && !route.dest) {
          middlewareStatus = route.status;
          if (!route.continue) return resolve();
          continue;
        }
        // Request-header transforms get the capture as sent.
        for (const t of route.transforms ?? []) {
          if (t.type !== "request.headers") continue;
          if (t.op === "set") headers.set(t.target.key, (t.args ?? "").replace(/\$(\d+)/g, (_, i: string) => m[Number(i)] ?? ""));
          else if (t.op === "delete") headers.delete(t.target.key);
        }
        if (route.headers) for (const [k, v] of Object.entries(route.headers)) out.set(k, v);
        if (route.middlewarePath) {
          const fn = edge.get(route.middlewarePath) as EdgeHandler;
          middlewareCalls.push(pathname);
          // The edge sees the public host, as on Vercel.
          const url = new URL(`http://${req.headers.host ?? "vercel.local"}${pathname}`);
          url.search = query.toString();
          const result = await fn(new Request(url, { method: req.method, headers, body }), { waitUntil: () => undefined });
          const rewrite = result.headers.get("x-middleware-rewrite");
          if (!rewrite && result.headers.get("x-middleware-next") !== "1") return send(result);
          if (result.status !== 200) middlewareStatus = result.status;
          const override = result.headers.get("x-middleware-override-headers");
          if (override !== null) {
            for (const k of [...headers.keys()]) if (!override.split(",").includes(k)) headers.delete(k);
            for (const k of override.split(",").filter(Boolean)) headers.set(k, result.headers.get(`x-middleware-request-${k}`) ?? "");
          }
          result.headers.forEach((v, k) => {
            if (!k.startsWith("x-middleware-") && k !== "set-cookie") out.set(k, v);
          });
          for (const c of result.headers.getSetCookie()) out.append("set-cookie", c);
          if (rewrite) {
            const u = new URL(rewrite);
            pathname = u.pathname;
            u.searchParams.forEach((v, k) => query.set(k, v));
          }
          continue;
        }
        if (route.dest) {
          // Vercel substitutes captures decoded, and encodes them when they land in the query.
          const [destPath = "", destQuery] = route.dest.split("?");
          const capture = (i: string, encode: boolean): string => {
            const raw = m[Number(i)] ?? "";
            let v = raw;
            try {
              v = decodeURIComponent(raw);
            } catch {
              // keep raw
            }
            return encode ? encodeURIComponent(v) : raw;
          };
          const dest = destPath.replace(/\$(\d+)/g, (_, i: string) => capture(i, false)) + (destQuery === undefined ? "" : `?${destQuery.replace(/\$(\d+)/g, (_, i: string) => capture(i, true))}`);
          if (/^[a-z]+:\/\//i.test(dest)) {
            const upstream = new URL(dest);
            query.forEach((v, k) => {
              if (!upstream.searchParams.has(k)) upstream.searchParams.set(k, v);
            });
            const forwarded = new Headers(headers);
            forwarded.delete("host");
            return send(await fetch(upstream, { method: req.method, headers: forwarded, body, redirect: "manual" }));
          }
          const u = new URL(`http://vercel.local${dest.startsWith("/") ? "" : "/"}${dest}`);
          pathname = u.pathname;
          // Vercel appends the dest's query to the request's (the first value of a repeated key wins).
          u.searchParams.forEach((v, k) => query.append(k, v));
          if (!route.continue) return resolve();
        }
        if (!route.continue && phase === "main") return resolve();
      }
      await resolve();
    })().catch((error: unknown) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  });
  servers.push(router);
  const url = await listen(router);
  return {
    url,
    middlewareCalls,
    functionCalls,
    close: async () => {
      for (const s of servers) {
        s.closeAllConnections();
        await new Promise<void>((r) => s.close(() => r()));
      }
    },
  };
}
