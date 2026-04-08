/**
 * A throwaway app exercising middleware, caching and route handlers, shared by
 * the dev / start / adapter tests.
 */

import { expect } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../../..", import.meta.url));

export const EDGE_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/next";
export default defineConfig({ title: "Edge Fixture", rewrites: [{ source: "/legacy/:path*", destination: "/api/:path*" }] });
`,
  "app/page.tsx": `import { Text } from "@textjs/next";
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
  "app/api/counter/route.ts": `import { unstable_cache } from "@textjs/next/cache";
export const revalidate = 60;
let n = 0;
const read = unstable_cache(async () => ({ n: ++n }), ["counter"], { tags: ["counter"] });
export async function GET() { return Response.json(await read()); }
`,
  "app/api/revalidate/route.ts": `import { revalidateTag } from "@textjs/next/cache";
export async function POST() { await revalidateTag("counter"); return Response.json({ revalidated: true }); }
`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/next/server";
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/secret") return NextResponse.redirect(new URL("/login", request.url));
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

export const STATIC_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/next";
export default defineConfig({ title: "Static Fixture" });
`,
  "app/page.tsx": `import { Text } from "@textjs/next";
export default function Page() { return <Text>static</Text>; }
`,
  "app/api/feed.json/route.ts": `export const dynamic = "force-static";
export function GET(req: Request) { return Response.json({ items: [1, 2], query: new URL(req.url).search }); }
`,
};

/** Write `files` into a fresh temp project with `@textjs/next`, React and React DOM linked in. */
export function createFixture(files: Record<string, string>, prefix = "textjs-fixture-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/@textjs/next"));
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
}
