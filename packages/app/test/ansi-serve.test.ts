/**
 * Terminal clients (curl, Wget, HTTPie, xh) get a page's first frame as ANSI
 * on `text dev`, `text start` and every adapter that has a server, after
 * middleware and route handlers, never for files.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer } from "../src/cli/start";
import type { LiveManifest } from "../src/server/live-manifest";
import { VERCEL_ANSI_DIR, vercelAnsiRoute } from "../src/server/adapters/vercel";
import { staticFile } from "../src/server/static-file";
import { adapt, waitForLine } from "./adapter-helpers";
import { createFixture, rawRequest } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

const CURL = { "user-agent": "curl/8.7.1", accept: "*/*" };
const CHROME = { "user-agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36", accept: "text/html,application/xhtml+xml,*/*;q=0.8" };

const page = (text: string, extra = ""): string => `import { Text } from "@textjs/app";
${extra}
export default function Page() { return <Text>${text}</Text>; }
`;

const CURL_APP: Record<string, string> = {
  "text.config.ts": `import { defineConfig } from "@textjs/app";
export default defineConfig({ title: "Curl Fixture" });
`,
  "app/page.tsx": page("home frame"),
  "app/about/page.tsx": page("about frame", "export const ansi = { cols: 40, rows: 5 };"),
  "app/quiet/page.tsx": page("quiet page", "export const ansi = false;"),
  "app/admin/page.tsx": page("admin page"),
  "app/not-found.tsx": page("custom not found"),
  "app/posts/[id]/page.tsx": `import { Text } from "@textjs/app";
export default function Post({ params }: { params: { id: string } }) { return <Text>post {params.id}</Text>; }
`,
  "app/gone/page.tsx": `import { notFound } from "@textjs/app/navigation";
export default function Gone() { notFound(); }
`,
  "app/moved/page.tsx": `import { redirect } from "@textjs/app/navigation";
export default function Moved() { redirect("/"); }
`,
  "app/api/health/route.ts": `export function GET() { return Response.json({ status: "ok" }); }
`,
  "public/robots.txt": "robots file\n",
  "public/notes": "notes file\n",
  NOTICE: "notice file\n",
  "public/manual/index.html": "<p>manual file</p>\n",
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/en/")) return NextResponse.rewrite(new URL(pathname.slice(3), request.url));
  if (request.cookies.get("auth")?.value === "1") return NextResponse.next({ headers: { "x-mw": "1" } });
  return new Response("denied " + pathname, { status: 401 });
}
export const config = { matcher: ["/admin/:path*", "/en/:path*"] };
`,
};

async function get(base: string, path: string, headers: Record<string, string> = CURL, method = "GET"): Promise<Response> {
  return fetch(base + path, { headers, method, redirect: "manual" });
}

/** What every host with a server answers. */
async function exerciseFrames(base: string, options: { dev?: boolean } = {}): Promise<void> {
  const home = await get(base, "/");
  expect(home.status).toBe(200);
  expect(home.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(home.headers.get("vary")).toBe("User-Agent, Accept");
  expect(home.headers.get("cache-control")).toBe("private, no-cache, no-store, max-age=0, must-revalidate");
  expect(home.headers.get("x-content-type-options")).toBe("nosniff");
  const body = await home.text();
  expect(body).toContain("home frame");
  expect(body.endsWith("\u001b[0m\n")).toBe(true);
  expect(body.slice(0, -1).split("\n")).toHaveLength(24);

  const head = await get(base, "/", CURL, "HEAD");
  expect(head.status).toBe(200);
  expect(head.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(await head.text()).toBe("");

  // Browsers and `Accept: text/html` get the page.
  for (const headers of [CHROME, { ...CURL, accept: "text/html" }, { ...CURL, accept: "TEXT/HTML,*/*" }]) {
    const html = await get(base, "/", headers);
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(await html.text()).toContain("<html");
  }

  // The HTML at a path with a frame says it depends on User-Agent and Accept; files don't.
  const page = await get(base, "/", CHROME);
  expect(page.headers.get("vary") ?? "").toContain("User-Agent, Accept");
  await page.arrayBuffer();
  const file = await get(base, "/robots.txt", CHROME);
  expect(file.headers.get("vary") ?? "").not.toContain("User-Agent");
  await file.arrayBuffer();

  // A page's own size, and its opt-out.
  const about = await (await get(base, "/about")).text();
  expect(about).toContain("about frame");
  expect(about.slice(0, -1).split("\n")).toHaveLength(5);
  const quiet = await get(base, "/quiet");
  expect(quiet.headers.get("content-type")).toContain("text/html");
  await quiet.arrayBuffer();

  // Route handlers and files win.
  const health = await get(base, "/api/health");
  expect(health.headers.get("content-type")).toContain("application/json");
  expect(await health.json()).toEqual({ status: "ok" });
  const robots = await get(base, "/robots.txt");
  expect(await robots.text()).toBe("robots file\n");
  const notes = await get(base, "/notes");
  // `text dev` answers extensionless paths with the HTML page before Vite's public files (as for browsers).
  if (options.dev) expect(notes.headers.get("vary")).not.toBe("User-Agent, Accept");
  else expect(notes.headers.get("content-type")).not.toBe("text/plain; charset=utf-8");
  if (!options.dev) expect(await notes.text()).toBe("notes file\n");
  else await notes.arrayBuffer();

  // Middleware runs first: its responses, headers and rewrites apply.
  const denied = await get(base, "/admin");
  expect(denied.status).toBe(401);
  expect(await denied.text()).toBe("denied /admin");
  for (const path of ["/ad%6din", "//admin", "/x/../admin", "/admin/"]) {
    const res = await rawRequest(base, path, { headers: CURL });
    expect({ path, status: res.status, leaked: res.body.includes("admin page") }).toEqual({ path, status: 401, leaked: false });
  }
  const admin = await get(base, "/admin", { ...CURL, cookie: "auth=1" });
  expect(admin.status).toBe(200);
  expect(admin.headers.get("x-mw")).toBe("1");
  expect(await admin.text()).toContain("admin page");
  const rewritten = await get(base, "/en/about");
  expect(await rewritten.text()).toContain("about frame");
  const upper = await rawRequest(base, "/ADMIN", { headers: CURL });
  expect(upper.body).not.toContain("admin page");
}

/** `text start` and bun: every page path is negotiated, and `public/` directory indexes are files. */
async function exerciseServerVary(base: string, options: { directoryIndexes: boolean }): Promise<void> {
  // curl getting HTML at a negotiated URL (here the page opted out; also: over budget, failed): never in a shared cache.
  for (const path of ["/quiet", "/moved"]) {
    const curl = await get(base, path);
    expect({ path, type: curl.headers.get("content-type"), cache: curl.headers.get("cache-control") }).toEqual({ path, type: "text/html; charset=utf-8", cache: "private, no-cache, no-store, max-age=0, must-revalidate" });
    await curl.arrayBuffer();
    const browser = await get(base, path, CHROME);
    expect({ path, cache: browser.headers.get("cache-control") }).toEqual({ path, cache: "public, max-age=0, must-revalidate" });
    await browser.arrayBuffer();
  }
  const post = await get(base, "/posts/42", CHROME);
  expect(post.headers.get("content-type")).toContain("text/html");
  expect(post.headers.get("vary") ?? "").toContain("User-Agent, Accept");
  await post.arrayBuffer();
  const manual = await get(base, "/manual");
  expect(manual.headers.get("content-type")).toContain("text/html");
  const body = await manual.text();
  if (options.directoryIndexes) expect(body).toBe("<p>manual file</p>\n");
}

/** Hosts without a renderer: dynamic pages get plain HTML, which needs no `Vary`. */
async function exercisePrebuiltOnly(base: string): Promise<void> {
  const post = await get(base, "/posts/42");
  expect(post.headers.get("content-type")).toContain("text/html");
  await post.arrayBuffer();
  const html = await get(base, "/posts/42", CHROME);
  expect(html.headers.get("vary") ?? "").not.toContain("User-Agent");
  await html.arrayBuffer();
}

/** Hosts that render on request: dynamic routes, not-found pages and `notFound()`. */
async function exerciseOnRequest(base: string): Promise<void> {
  const post = await get(base, "/posts/42");
  expect(post.status).toBe(200);
  expect(await post.text()).toContain("post 42");
  for (const path of ["/nope", "/gone"]) {
    const res = await get(base, path);
    expect({ path, status: res.status, type: res.headers.get("content-type") }).toEqual({ path, status: 404, type: "text/plain; charset=utf-8" });
    expect(await res.text()).toContain("custom not found");
  }
  // A page that redirects while rendering has no frame of its own: the client follows the redirect.
  const moved = await get(base, "/moved");
  expect(moved.headers.get("content-type")).toContain("text/html");
  await moved.arrayBuffer();
}

describe("curl gets ANSI", () => {
  let dir = "";
  beforeAll(async () => {
    dir = createFixture(CURL_APP, "textjs-curl-");
    await buildApp({ root: dir, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("text build prerenders frames for static pages that want one", () => {
    const manifest = JSON.parse(readFileSync(join(dir, "dist/.text/live-manifest.json"), "utf8")) as LiveManifest;
    expect(manifest.ansi).toEqual({
      cols: 80,
      rows: 24,
      frames: { "/": ".text/ansi/index.txt", "/about": ".text/ansi/about/index.txt", "/admin": ".text/ansi/admin/index.txt" },
      onRequest: true,
    });
    expect(readFileSync(join(dir, "dist/.text/ansi/index.txt"), "utf8")).toContain("home frame");
  });

  test("text start", async () => {
    const server = await startProductionServer({ root: dir, port: 0, log: false });
    try {
      const base = new URL(server.url).origin;
      await exerciseFrames(base);
      await exerciseOnRequest(base);
      await exerciseServerVary(base, { directoryIndexes: false });
      expect((await rawRequest(base, "/.text/ansi/index.txt", { headers: CURL })).status).toBe(404);
    } finally {
      await server.close();
    }
  }, 60_000);

  test("text dev renders every page on request", async () => {
    const server: ViteDevServer = await startDevServer({ root: dir, port: 36000 + Math.floor(Math.random() * 2000), log: false });
    try {
      const base = new URL(server.resolvedUrls?.local[0] ?? "").origin;
      await exerciseFrames(base, { dev: true });
      await exerciseOnRequest(base);
      // Files in the project root never render a route.
      const notice = await get(base, "/NOTICE");
      expect(notice.headers.get("content-type")).not.toBe("text/plain; charset=utf-8");
      await notice.arrayBuffer();
      // Vite's own URLs are left alone.
      const client = await get(base, "/@vite/client");
      expect(client.headers.get("content-type")).toContain("javascript");
      await client.arrayBuffer();
    } finally {
      await server.waitForRequestsIdle();
      await server.close();
    }
  }, 60_000);

  test("bun adapter", async () => {
    await adapt(dir, "bun");
    const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
    try {
      const base = new URL(await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000)).origin;
      await exerciseFrames(base);
      await exerciseOnRequest(base);
      await exerciseServerVary(base, { directoryIndexes: true });
      expect((await rawRequest(base, "/.text/ansi/index.txt", { headers: CURL })).status).toBe(404);
    } finally {
      proc.kill();
      await proc.exited;
    }
  }, 60_000);

  test("vercel adapter: case-sensitive routes to frames at the static root", async () => {
    const result = await adapt(dir, "vercel");
    const out = result.output;
    expect(readFileSync(join(out, "static", VERCEL_ANSI_DIR, "index.txt"), "utf8")).toContain("home frame");
    expect(existsSync(join(out, "static", VERCEL_ANSI_DIR, "about/index.txt"))).toBe(true);
    const config = JSON.parse(readFileSync(join(out, "config.json"), "utf8")) as { routes: Array<Record<string, unknown>> };
    const index = (pred: (r: Record<string, unknown>) => boolean): number => config.routes.findIndex(pred);
    const firstAnsi = index((r) => typeof r.dest === "string" && r.dest.startsWith(`/${VERCEL_ANSI_DIR}/`));
    expect(firstAnsi).toBeGreaterThan(index((r) => r.dest === "/_textjs/server"));
    expect(firstAnsi).toBeLessThan(index((r) => r.handle === "filesystem"));
    expect(config.routes[firstAnsi]).toMatchObject({ caseSensitive: true, methods: ["GET", "HEAD"], headers: { "x-content-type-options": "nosniff" } });

    const harness = await startVercelHarness(out);
    try {
      await exerciseFrames(harness.url);
      // Frames aren't reachable at their own URL, in any spelling.
      for (const path of [`/${VERCEL_ANSI_DIR}/admin/index.txt`, `/_TEXTJS/ansi/admin/index.txt`, `/_%74extjs/ansi/admin/index.txt`]) {
        const res = await rawRequest(harness.url, path, { headers: CURL });
        expect({ path, leaked: res.body.includes("admin page") }).toEqual({ path, leaked: false });
      }
      await exercisePrebuiltOnly(harness.url);
      const notAllowed = await get(harness.url, "/", CURL, "POST");
      expect(notAllowed.headers.get("content-type") ?? "").not.toContain("text/plain");
      await notAllowed.arrayBuffer();
    } finally {
      await harness.close();
    }
  }, 60_000);

  test("cloudflare adapter: frames inlined into the worker", async () => {
    await adapt(dir, "cloudflare");
    const dist = join(dir, "dist");
    expect(existsSync(join(dist, ".text"))).toBe(false);
    const worker = readFileSync(join(dist, "_worker.js"), "utf8");
    expect(worker).toContain("home frame");
    const mod = (await import(`${join(dist, "_worker.js")}?t=${Date.now()}`)) as { default: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } };
    const env = {
      ASSETS: {
        fetch: async (req: Request) => {
          // Pages-like: exact files, and a directory's index.html at its slash-less path.
          const p = decodeURIComponent(new URL(req.url).pathname);
          const file = staticFile(dist, p === "/" ? "/index.html" : p) ?? staticFile(dist, join(p, "index.html"));
          if (!file) return new Response("nf", { status: 404 });
          return new Response(readFileSync(file), { headers: { "content-type": file.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain" } });
        },
      },
    };
    const local = Bun.serve({ port: 0, fetch: (r) => mod.default.fetch(r, env, { waitUntil: () => undefined }) });
    try {
      const base = `http://127.0.0.1:${local.port}`;
      await exerciseFrames(base);
      // No renderer in the worker: dynamic pages serve HTML.
      await exercisePrebuiltOnly(base);
    } finally {
      local.stop(true);
    }
  }, 60_000);

  test("static adapter: no frames, a note instead", async () => {
    const plain = createFixture({ "app/page.tsx": page("static home") }, "textjs-curl-static-");
    try {
      await buildApp({ root: plain, log: false, adapter: "static" });
      expect(existsSync(join(plain, "dist/.text"))).toBe(false);
      const result = await adapt(plain, "static");
      expect(result.notes.join("\n")).toContain("Static hosts serve curl the HTML page. To serve curl frames, use --adapter bun, vercel or cloudflare. Set `ansi: false` to hide this note.");
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("vercelAnsiRoute", () => {
  test("encodes the destination and lives at the root under basePath", () => {
    const route = vercelAnsiRoute("/café", "/console");
    expect(route.dest).toBe(`/${VERCEL_ANSI_DIR}/caf%C3%A9/index.txt`);
    expect(route.src).toBe("^(\\/console\\/caf%C3%A9)\\/?$");
    expect(vercelAnsiRoute("/").dest).toBe(`/${VERCEL_ANSI_DIR}/index.txt`);
    const accept = (route.missing as Array<{ value: { re: string } }>)[0]?.value.re as string;
    for (const v of ["text/html", "TEXT/HTML", "Text/Html;q=0.9"]) expect(new RegExp(accept).test(v)).toBe(true);
  });
});

describe("config switches", () => {
  test("`ansi: false` turns frames off app-wide, page exports included", async () => {
    const dir = createFixture(
      {
        "text.config.ts": `import { defineConfig } from "@textjs/app";\nexport default defineConfig({ ansi: false, ppr: false });\n`,
        "app/page.tsx": page("home", "export const ansi = { cols: 10, rows: 2 };"),
      },
      "textjs-curl-off-",
    );
    try {
      await buildApp({ root: dir, log: false });
      expect(existsSync(join(dir, "dist/.text/live-manifest.json"))).toBe(false);
      expect((await adapt(dir, "static")).notes.join("\n")).not.toContain("curl");
      await buildApp({ root: dir, log: false });
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        const res = await get(new URL(server.url).origin, "/");
        expect(res.headers.get("content-type")).toContain("text/html");
        await res.arrayBuffer();
      } finally {
        await server.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("`ppr: false` still prerenders frames, without shells", async () => {
    const dir = createFixture({ "text.config.ts": `import { defineConfig } from "@textjs/app";\nexport default defineConfig({ ppr: false });\n`, "app/page.tsx": page("no shell") }, "textjs-curl-noppr-");
    try {
      await buildApp({ root: dir, log: false });
      const manifest = JSON.parse(readFileSync(join(dir, "dist/.text/live-manifest.json"), "utf8")) as LiveManifest;
      expect(manifest.pages).toEqual({});
      expect(Object.keys(manifest.ansi?.frames ?? {})).toEqual(["/"]);
      expect(readFileSync(join(dir, "dist/index.html"), "utf8")).not.toContain("data-textjs-shell");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("server-rendered routes", () => {
  test("async server components never run: the frame shows their fallback", async () => {
    const dir = createFixture(
      {
        "app/page.tsx": page("home"),
        "app/ops/loading.tsx": page("loading ops"),
        "app/ops/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default async function Ops() {
  (globalThis as { __opsRan?: number }).__opsRan = ((globalThis as { __opsRan?: number }).__opsRan ?? 0) + 1;
  await new Promise((r) => setTimeout(r, 10));
  return <Text>ops data</Text>;
}
`,
        "app/ops/[id]/page.tsx": `import { Text } from "@textjs/app";
export const runtime = "server";
export default async function Op({ params }: { params: { id: string } }) {
  (globalThis as { __opsRan?: number }).__opsRan = ((globalThis as { __opsRan?: number }).__opsRan ?? 0) + 1;
  return <Text>op {params.id}</Text>;
}
`,
      },
      "textjs-curl-server-",
    );
    try {
      await buildApp({ root: dir, log: false });
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        const base = new URL(server.url).origin;
        const ops = await (await get(base, "/ops")).text();
        expect(ops).toContain("loading ops");
        expect(ops).not.toContain("ops data");
        const op = await (await get(base, "/ops/7")).text();
        expect(op).toContain("loading ops");
        expect((globalThis as { __opsRan?: number }).__opsRan).toBeUndefined();
      } finally {
        await server.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
