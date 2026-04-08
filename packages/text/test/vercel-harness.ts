/**
 * A minimal local emulation of Vercel's Build Output API v3 router, enough to
 * exercise `.vercel/output` from `text build --adapter vercel` without a
 * deploy: `config.json` routes (`src`, `dest`, `headers`, `continue`,
 * `middlewarePath`, `handle: "filesystem"`), static files, Node.js functions
 * (`launcherType: "Nodejs"`) and Edge middleware speaking `x-middleware-*`.
 *
 * Functions see the *original* request URL with `dest` query parameters
 * merged in (the stricter of Vercel's behaviors for the Text.js adapter).
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

interface Route {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  continue?: boolean;
  middlewarePath?: string;
  handle?: string;
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
  close(): Promise<void>;
}

export async function startVercelHarness(outputDir: string): Promise<VercelHarness> {
  const config = JSON.parse(readFileSync(join(outputDir, "config.json"), "utf8")) as { version: number; routes: Route[] };
  if (config.version !== 3) throw new Error("expected Build Output API v3");
  const functionUrls = new Map<string, string>();
  const servers: Server[] = [];
  const edge = new Map<string, EdgeHandler>();
  const middlewareCalls: string[] = [];

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

  const staticFile = (pathname: string): string | null => {
    for (const candidate of [pathname, join(pathname, "index.html")]) {
      const p = join(outputDir, "static", decodeURIComponent(candidate));
      if (p.startsWith(join(outputDir, "static")) && existsSync(p) && statSync(p).isFile()) return p;
    }
    return null;
  };

  const router = createServer((req, res) => {
    void (async () => {
      const original = new URL(req.url ?? "/", "http://vercel.local");
      let pathname = original.pathname;
      const query = new URLSearchParams(original.search);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const out = new Headers();
      let phase: "main" | "filesystem" = "main";

      const send = async (response: Response): Promise<void> => {
        res.statusCode = response.status;
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
          const target = new URL(original.pathname, fn);
          target.search = query.toString();
          const response = await fetch(target, { method: req.method, headers, body, redirect: "manual" });
          return send(response);
        }
        if (await serveStatic()) return;
        await send(new Response("NOT_FOUND", { status: 404 }));
      };

      for (const route of config.routes) {
        if (route.handle) {
          if (route.handle === "filesystem") {
            phase = "filesystem";
            if (await serveStatic()) return;
          }
          continue;
        }
        const m = new RegExp(route.src ?? "^$").exec(pathname);
        if (!m) continue;
        if (route.headers) for (const [k, v] of Object.entries(route.headers)) out.set(k, v);
        if (route.middlewarePath) {
          const fn = edge.get(route.middlewarePath) as EdgeHandler;
          middlewareCalls.push(pathname);
          const url = new URL(pathname, "http://vercel.local");
          url.search = query.toString();
          const result = await fn(new Request(url, { method: req.method, headers, body }), { waitUntil: () => undefined });
          const rewrite = result.headers.get("x-middleware-rewrite");
          if (!rewrite && result.headers.get("x-middleware-next") !== "1") return send(result);
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
          const dest = route.dest.replace(/\$(\d+)/g, (_, i: string) => m[Number(i)] ?? "");
          const u = new URL(dest, "http://vercel.local");
          pathname = u.pathname;
          u.searchParams.forEach((v, k) => query.set(k, v));
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
    close: async () => {
      for (const s of servers) {
        s.closeAllConnections();
        await new Promise<void>((r) => s.close(() => r()));
      }
    },
  };
}
