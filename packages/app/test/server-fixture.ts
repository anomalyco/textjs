/**
 * A throwaway app exercising middleware, caching and route handlers, shared by
 * the dev / start / adapter tests.
 */

import { expect } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../../..", import.meta.url));

export const EDGE_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Edge Fixture", rewrites: [{ source: "/legacy/:path*", destination: "/api/:path*" }] });
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>edge</Text>; }
`,
  "app/api/health/route.ts": `export function GET() { return Response.json({ status: "ok" }); }
`,
  "app/api/echo/[id]/route.ts": `export function GET(req: Request, { params }: { params: { id: string } }) {
  const u = new URL(req.url);
  return Response.json({ id: params.id, user: req.headers.get("x-user"), cookie: req.headers.get("cookie"), url: u.pathname + u.search });
}
export async function POST(req: Request) {
  return Response.json({ body: await req.text(), user: req.headers.get("x-user") });
}
`,
  "app/api/counter/route.ts": `import { unstable_cache } from "@textjs/app/cache";
export const revalidate = 60;
let n = 0;
const read = unstable_cache(async () => ({ n: ++n }), ["counter"], { tags: ["counter"] });
export async function GET() { return Response.json(await read()); }
`,
  "app/api/revalidate/route.ts": `import { revalidateTag } from "@textjs/app/cache";
export async function POST() { await revalidateTag("counter"); return Response.json({ revalidated: true }); }
`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.endsWith("/secret")) return NextResponse.redirect(new URL("/login", request.url));
  if (pathname === "/blocked") return new Response("blocked by middleware", { status: 401 });
  if (pathname === "/status") return NextResponse.rewrite(new URL("/api/health", request.url));
  if (pathname.startsWith("/api/echo")) {
    const headers = new Headers(request.headers);
    headers.set("x-user", "ada");
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-mw", "1");
    res.cookies.set("seen", "1");
    return res;
  }
  return NextResponse.next({ headers: { "x-powered-by-mw": "text" } });
}
export const config = { matcher: ["/((?!assets/|favicon.ico).*)"] };
`,
};

/**
 * Middleware scoped to a few paths (`config.matcher`), cached handlers that
 * must not be stored, and a large-upload endpoint middleware rejects: the
 * security contract every host must satisfy.
 */
export const SCOPED_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Scoped Fixture" });
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>scoped</Text>; }
`,
  "app/api/admin/secret/route.ts": `export function GET() { return Response.json({ secret: "admin-only" }); }
`,
  "app/api/public/route.ts": `export function GET(req: Request) { return Response.json({ public: true, url: req.url }); }
`,
  "app/api/upload/route.ts": `export async function POST(req: Request) { return Response.json({ bytes: (await req.arrayBuffer()).byteLength }); }
`,
  "app/api/echo/route.ts": `export async function POST(req: Request) { return Response.json({ body: await req.text() }); }
`,
  "app/api/cancel/route.ts": `export async function POST(req: Request) {
  const reader = (req.body as ReadableStream<Uint8Array>).getReader();
  await reader.read();
  await reader.cancel();
  return Response.json({ cancelled: true });
}
`,
  "app/api/cookie/route.ts": `export const revalidate = 60;
let n = 0;
export function GET() { return new Response(JSON.stringify({ n: ++n }), { headers: { "content-type": "application/json", "set-cookie": "sid=" + n + "; Path=/" } }); }
`,
  "app/api/private/route.ts": `export const revalidate = 60;
let n = 0;
export function GET() { return Response.json({ n: ++n }, { headers: { "cache-control": "private, max-age=0" } }); }
`,
  "app/api/tracked/route.ts": `export const revalidate = 60;
let n = 0;
export function GET() { return Response.json({ n: ++n }); }
`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/admin")) return new Response("denied", { status: 401 });
  if (pathname === "/api/upload") return new Response("upload denied", { status: 401 });
  if (pathname === "/api/tracked") {
    const res = NextResponse.next();
    res.cookies.set("tracked", "1");
    return res;
  }
  if (pathname === "/api/teapot") return NextResponse.rewrite(new URL("/api/public", request.url), { status: 418 });
  if (pathname === "/api/proxied") {
    // A Response that merely carries x-middleware-* headers (an upstream fetch) must not steer routing.
    return new Response("as-is", { headers: { "x-middleware-rewrite": new URL("/api/admin/secret", request.url).href } });
  }
}
export const config = { matcher: ["/api/admin/:path*", "/api/upload", "/api/tracked", "/api/teapot", "/api/proxied"] };
`,
};

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Send an HTTP/1.1 request with an arbitrary request target (`//evil.com/x`, absolute-form) that `fetch()` would normalize away. */
export function rawRequest(base: string, target: string, init: { method?: string; headers?: Record<string, string> } = {}): Promise<RawResponse> {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const socket = connect(Number(u.port || 80), u.hostname, () => {
      const headers = { host: u.host, connection: "close", ...init.headers };
      socket.write(`${init.method ?? "GET"} ${target} HTTP/1.1\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`);
    });
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      data += chunk;
    });
    socket.on("error", reject);
    socket.on("end", () => {
      const [head = "", ...rest] = data.split("\r\n\r\n");
      const [statusLine = "", ...lines] = head.split("\r\n");
      const out: Record<string, string> = {};
      for (const line of lines) {
        const i = line.indexOf(":");
        if (i > 0) out[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
      }
      resolve({ status: Number(statusLine.split(" ")[1]), headers: out, body: rest.join("\r\n\r\n") });
    });
  });
}

/** Request targets that would resolve to another origin if a server fed them to `new URL(target, origin)`. */
export const HOSTILE_TARGETS = ["//evil.example/secret", "/\\evil.example/secret", "http://evil.example/secret"];

/** Open-redirect regression (EDGE_APP): every redirect stays on the server's own host. */
export async function exerciseHostileTargets(base: string, targets: readonly string[] = HOSTILE_TARGETS): Promise<void> {
  const host = new URL(base).host;
  for (const target of targets) {
    const res = await rawRequest(base, target);
    expect(res.status).toBeLessThan(500);
    const location = res.headers.location;
    if (location !== undefined) expect({ target, host: new URL(location, base).host }).toEqual({ target, host });
    expect(res.headers.location ?? "").not.toContain("evil.example");
  }
}

export interface ScopedOptions {
  /** Full-route caching is active (production hosts). */
  cache: boolean;
  /** The host merges middleware cookies into cached responses itself (not a CDN in front, e.g. Vercel's router). */
  privateDowngrade?: boolean;
}

/** The security contract for SCOPED_APP. */
export async function exerciseScopedApp(base: string, options: ScopedOptions): Promise<void> {
  // Path-scoped middleware protects /api/admin/*, however the path is spelled.
  for (const path of ["/api/admin/secret", "/api/admin/secret/", "/api/public/../admin/secret"]) {
    const res = await fetch(`${base}${path}`);
    expect({ path, status: res.status }).toEqual({ path, status: 401 });
    await res.arrayBuffer();
  }
  for (const target of ["//api/admin/secret", "/api/public?__textjs_path=/api/admin/secret"]) {
    const res = await rawRequest(base, target);
    expect(res.body).not.toContain("admin-only");
  }
  const pub = await fetch(`${base}/api/public`);
  expect(pub.status).toBe(200);
  expect(new URL(((await pub.json()) as { url: string }).url).host).toBe(new URL(base).host);

  // A Response carrying x-middleware-rewrite is returned as-is, not followed.
  const proxied = await fetch(`${base}/api/proxied`);
  expect(await proxied.text()).toBe("as-is");
  expect(proxied.headers.has("x-middleware-rewrite")).toBe(false);

  // rewrite(url, { status }) keeps the status.
  const teapot = await fetch(`${base}/api/teapot`);
  expect(teapot.status).toBe(418);
  expect(((await teapot.json()) as { public: boolean }).public).toBe(true);

  // Middleware rejecting a large upload mid-stream must not crash the server.
  const big = new Uint8Array(8 * 1024 * 1024);
  const upload = await fetch(`${base}/api/upload`, { method: "POST", body: big });
  expect(upload.status).toBe(401);
  await upload.arrayBuffer();
  // A handler cancelling the body early.
  const cancelled = await fetch(`${base}/api/cancel`, { method: "POST", body: big });
  expect(await cancelled.json()).toEqual({ cancelled: true });
  // Unmatched requests keep their body.
  const echo = await fetch(`${base}/api/echo`, { method: "POST", body: "still here ▼" });
  expect(await echo.json()).toEqual({ body: "still here ▼" });

  // Cached handlers never store Set-Cookie or private responses.
  for (const path of ["/api/cookie", "/api/private"]) {
    const a = (await (await fetch(`${base}${path}`)).json()) as { n: number };
    const res = await fetch(`${base}${path}`);
    const b = (await res.json()) as { n: number };
    expect({ path, next: b.n }).toEqual({ path, next: a.n + 1 });
    if (options.cache) expect(res.headers.get("x-textjs-cache")).not.toBe("HIT");
    if (path === "/api/private") expect(res.headers.get("cache-control")).toBe("private, max-age=0");
  }
  if (options.cache) expect((await fetch(`${base}/api/cookie`)).headers.get("cache-control")).toContain("private");

  // Middleware cookies on a cached route: shared caches must not store the response.
  const tracked = await fetch(`${base}/api/tracked`);
  await tracked.arrayBuffer();
  expect(tracked.headers.getSetCookie().some((c) => c.startsWith("tracked=1"))).toBe(true);
  if (options.cache && options.privateDowngrade !== false) {
    expect(tracked.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
  }

  const alive = await fetch(`${base}/api/public`);
  expect(alive.status).toBe(200);
  await alive.arrayBuffer();
}

/** A client home page and a server-rendered `/ops` route. */
export const LIVE_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Live Adapter Fixture" });
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>client home</Text>; }
`,
  "app/ops/page.tsx": `import { Text, useInput } from "@textjs/app";
import { useState } from "react";
export const runtime = "server";
export default function Ops() {
  const [n, setN] = useState(0);
  useInput((e) => { if (e.input === "+") setN((v) => v + 1); });
  return <Text>{"ops on the server " + n}</Text>;
}
`,
};

/** Server routes behind async middleware (`/ops` needs the `auth=1` cookie). */
export const LIVE_AUTH_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Live Auth Fixture" });
`,
  "app/page.tsx": `import { Text, useInput } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import { useState } from "react";
export const runtime = "server";
export default function Home() {
  const router = useRouter();
  const [n, setN] = useState(0);
  useInput((e) => {
    if (e.input === "o") router.push("/ops");
    if (e.input === "+") setN((v) => v + 1);
  });
  return <Text>{"home " + n}</Text>;
}
`,
  "app/ops/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default function Ops() { return <Text>ops secret</Text>; }
`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export async function middleware(request: NextRequest) {
  await new Promise((r) => setTimeout(r, 1));
  if (request.nextUrl.pathname.startsWith("/ops") && request.cookies.get("auth")?.value !== "1") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!assets/).*)"] };
`,
};

export interface LiveStream {
  messages: Array<Record<string, unknown>>;
  /** Concatenated text of every frame's cells (good enough for `toContain`). */
  status: number;
  close(): void;
}

/** Open a live session (`GET /__textjs/live`) and collect its server-sent events. */
export async function openLiveStream(base: string, query: string, headers: Record<string, string> = {}): Promise<LiveStream> {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/__textjs/live?${query}`, { signal: ctrl.signal, headers });
  const messages: Array<Record<string, unknown>> = [];
  if (res.body) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    void (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            for (const line of buf.slice(0, i).split("\n")) if (line.startsWith("data: ")) messages.push(JSON.parse(line.slice(6)) as Record<string, unknown>);
            buf = buf.slice(i + 2);
          }
        }
      } catch {
        // aborted
      }
    })();
  }
  return { messages, status: res.status, close: () => ctrl.abort() };
}

export async function until(fn: () => boolean | Promise<boolean>, timeout = 10_000): Promise<void> {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

/** `basePath: "/console"`, middleware, a cache handler and module side effects the build must not run. */
export const BASE_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Base Fixture", basePath: "/console", cacheHandler: "./cache-handler.ts" });
`,
  "cache-handler.ts": `import { MemoryCacheStore } from "@textjs/app/cache";
(globalThis as Record<string, unknown>).__textjsCacheHandlerLoads = ((globalThis as Record<string, number>).__textjsCacheHandlerLoads ?? 0) + 1;
export default new MemoryCacheStore();
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>base</Text>; }
`,
  "app/api/health/route.ts": `export function GET(req: Request) { return Response.json({ ok: true, path: new URL(req.url).pathname }); }
`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
(globalThis as Record<string, unknown>).__textjsMiddlewareLoads = ((globalThis as Record<string, number>).__textjsMiddlewareLoads ?? 0) + 1;
// A handle the build must not wait on.
setInterval(() => undefined, 60_000);
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/go") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/health";
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ headers: { "x-mw": "1" } });
}
export const config = { matcher: ["/((?!assets/).*)"] };
`,
};

/** basePath boundaries: inside works, outside 404s, missing assets 404, hashed assets are immutable. */
export async function exerciseBasePath(origin: string, options: { immutable: boolean }): Promise<void> {
  const health = await fetch(`${origin}/console/api/health`);
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ ok: true, path: "/api/health" });
  expect(health.headers.get("x-mw")).toBe("1");
  for (const outside of ["/api/health", "/consolex/api/health"]) {
    const res = await fetch(`${origin}${outside}`, { headers: { accept: "text/html" } });
    expect({ outside, status: res.status }).toEqual({ outside, status: 404 });
    await res.arrayBuffer();
  }
  const go = await fetch(`${origin}/console/go`, { redirect: "manual" });
  expect(go.status).toBe(307);
  expect(new URL(go.headers.get("location") ?? "", origin).pathname).toBe("/console/api/health");
  await go.arrayBuffer();
  const doc = await fetch(`${origin}/console/deep/link`, { headers: { accept: "text/html" } });
  expect(doc.status).toBe(200);
  const html = await doc.text();
  const asset = /src="(\/console\/assets\/[^"]+\.js)"/.exec(html)?.[1] as string;
  expect(asset).toBeDefined();
  const js = await fetch(`${origin}${asset}`);
  expect(js.status).toBe(200);
  if (options.immutable) expect(js.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  await js.arrayBuffer();
  const missing = await fetch(`${origin}/console/assets/missing-abc123.js`);
  expect(missing.status).toBe(404);
  await missing.arrayBuffer();
  const meta = await fetch(`${origin}/console/.text/routes-manifest.json`);
  expect(meta.status).toBe(404);
  await meta.arrayBuffer();
}

export const STATIC_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Static Fixture" });
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>static</Text>; }
`,
  "app/api/feed.json/route.ts": `export const dynamic = "force-static";
export function GET(req: Request) { return Response.json({ items: [1, 2], query: new URL(req.url).search }); }
`,
};

/** Write `files` into a fresh temp project with `@textjs/app`, React and React DOM linked in. */
export function createFixture(files: Record<string, string>, prefix = "textjs-fixture-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(dir, "node_modules/@textjs/app"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "edge-fixture", type: "module", private: true }));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  return dir;
}

export interface ExerciseOptions {
  /** Full-route caching is active (production hosts). */
  cache: boolean;
}

/** The shared behavioral contract every host (dev, start, adapters) must satisfy for EDGE_APP. */
export async function exerciseEdgeApp(base: string, options: ExerciseOptions): Promise<void> {
  const secret = await fetch(`${base}/secret`, { redirect: "manual" });
  expect(secret.status).toBe(307);
  expect(new URL(secret.headers.get("location") ?? "", base).pathname).toBe("/login");
  await secret.arrayBuffer();

  const blocked = await fetch(`${base}/blocked`);
  expect(blocked.status).toBe(401);
  expect(await blocked.text()).toBe("blocked by middleware");

  const status = await fetch(`${base}/status`);
  expect(status.status).toBe(200);
  expect(await status.json()).toEqual({ status: "ok" });

  const echo = await fetch(`${base}/api/echo/42?q=1`, { headers: { cookie: "a=1" } });
  expect(echo.status).toBe(200);
  const body = (await echo.json()) as { id: string; user: string; cookie: string; url: string };
  expect(body.id).toBe("42");
  expect(body.user).toBe("ada");
  expect(body.cookie).toBe("a=1; seen=1");
  expect(body.url).toBe("/api/echo/42?q=1");
  expect(echo.headers.get("x-mw")).toBe("1");
  expect(echo.headers.getSetCookie()).toContain("seen=1; Path=/");

  const post = await fetch(`${base}/api/echo/7`, { method: "POST", body: "hi ▼" });
  expect(await post.json()).toEqual({ body: "hi ▼", user: "ada" });

  const legacy = await fetch(`${base}/legacy/health`);
  expect(await legacy.json()).toEqual({ status: "ok" });

  const home = await fetch(`${base}/`, { headers: { accept: "text/html" } });
  expect(home.status).toBe(200);
  expect(home.headers.get("x-powered-by-mw")).toBe("text");
  expect(await home.text()).toContain("<title>Edge Fixture</title>");

  const deep = await fetch(`${base}/deployments/abc`, { headers: { accept: "text/html" } });
  expect(deep.status).toBe(200);
  expect(deep.headers.get("content-type")).toContain("text/html");
  await deep.arrayBuffer();

  const c1 = await fetch(`${base}/api/counter`);
  const n1 = ((await c1.json()) as { n: number }).n;
  const c2 = await fetch(`${base}/api/counter`);
  expect(((await c2.json()) as { n: number }).n).toBe(n1);
  if (options.cache) {
    expect(c1.headers.get("x-textjs-cache")).toBe("MISS");
    expect(c2.headers.get("x-textjs-cache")).toBe("HIT");
    expect(c2.headers.get("cache-control")).toBe("s-maxage=60, stale-while-revalidate=31535940");
  }
  const reval = await fetch(`${base}/api/revalidate`, { method: "POST" });
  expect(await reval.json()).toEqual({ revalidated: true });
  const c3 = await fetch(`${base}/api/counter`);
  expect(((await c3.json()) as { n: number }).n).toBe(n1 + 1);
  if (options.cache) expect(c3.headers.get("x-textjs-cache")).toBe("MISS");

  await exerciseHostileTargets(base);
}

const BYPASS_MIDDLEWARE = `import { NextResponse, type NextRequest } from "@textjs/app/server";
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Deny by rewrite: the visitor gets the login page at the restricted URL.
  if (pathname === "/restricted") return NextResponse.rewrite(new URL("/login", request.url));
  if (request.cookies.get("auth")?.value === "1") {
    // User code forwarding a routed-path header must not steer the Vercel handler function.
    if (request.headers.get("x-spoof")) {
      const headers = new Headers(request.headers);
      headers.set("x-textjs-path", "/api/admin");
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }
  return new Response("denied " + pathname, { status: 401 });
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/ops/:path*", "/restricted/", "/café/:path*", "/api/café/:path*", "/legacy/:path*", "/api/{x}/:path*"] };
`;

/** Middleware-bypass fixture (`middleware-bypass.test.ts`): guarded pages, handlers and a public file, optionally server-rendered routes. */
export const bypassApp = (basePath: string, server: boolean): Record<string, string> => ({
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Bypass Fixture"${basePath ? `, basePath: ${JSON.stringify(basePath)}` : ""}, rewrites: [{ source: "/legacy/:path*", destination: "/api/admin/:path*" }] });
`,
  "app/api/café/route.ts": `export function GET() { return Response.json({ secret: "admin-only café" }); }
`,
  "public/café/report.txt": "admin-only café report\n",
  "app/api/{x}/route.ts": `export function GET() { return Response.json({ secret: "admin-only {x}" }); }
`,
  "app/page.tsx": `import { Text } from "@textjs/app";
export default function Page() { return <Text>home</Text>; }
`,
  "app/admin/page.tsx": `import { Text } from "@textjs/app";
export default function Admin() { return <Text>admin page</Text>; }
`,
  "app/api/admin/route.ts": `export function GET() { return Response.json({ secret: "admin-only" }); }
`,
  "app/api/admin/[id]/route.ts": `export function GET() { return Response.json({ secret: "admin-only" }); }
`,
  "public/admin/report.txt": "admin-only report\n",
  "app/api/[...rest]/route.ts": `export function GET(_req: Request, { params }: { params: { rest: string[] } }) { return Response.json({ rest: params.rest }); }
`,
  "app/api/public/route.ts": `export function GET(req: Request) { return Response.json({ url: req.url }); }
`,
  ...(server
    ? {
        "app/ops/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default function Ops() { return <Text>ops secret</Text>; }
`,
        "app/restricted/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default function Restricted() { return <Text>restricted secret</Text>; }
`,
        "app/login/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default function Login() { return <Text>login page</Text>; }
`,
      }
    : {}),
  "middleware.ts": BYPASS_MIDDLEWARE,
});
