/**
 * Middleware can't be skipped by spelling a protected path differently
 * (percent-encoding, doubled slashes, dot segments, encoded slashes, case,
 * trailing slashes, basePath variants). Every host canonicalizes the pathname
 * once and uses it for both the middleware match and the route lookup.
 *
 * Set `TEXTJS_BYPASS_REPORT=1` to print the full matrix.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer } from "../src/cli/start";
import { NON_CANONICAL_PATH, vercelConfig } from "../src/server/adapters/vercel";
import { __configureCache } from "../src/server/cache";
import { canonicalPathname } from "../src/server/http";
import { NextResponse, type NextRequest } from "../src/server/middleware";
import { authorizeWithMiddleware, runMiddleware } from "../src/server/middleware-runtime";
import { staticFile } from "../src/server/static-file";
import { adapt, waitForLine } from "./adapter-helpers";
import { bypassApp, createFixture, openLiveStream, rawRequest, until } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

/** `protected`: the path names a page or handler the middleware guards (it must answer 401, or 400 for an invalid path). */
interface Variant {
  path: string;
  protected: boolean;
}

function variants(prefix: string): Variant[] {
  const p = prefix;
  const guarded = [
    `${p}/admin`,
    `${p}/ad%6din`,
    `${p}/%61dmin`,
    `${p}/%61%64%6d%69%6e`,
    `/${p}/admin`,
    `${p}//admin`,
    `${p}/admin//x`,
    `${p}/admin%2fx`,
    `${p}/admin%2Fx`,
    `${p}/admin%5cx`,
    `${p}/./admin`,
    `${p}/%2e/admin`,
    `${p}/admin/../admin`,
    `${p}/x/../admin`,
    `${p}/x/%2e%2e/admin`,
    `${p}/x/%2E%2E/admin/x`,
    `${p}/admin/`,
    `${p}/admin/.`,
    `${p}/admin/x/`,
    `${p}/admin%`,
    `${p}/admin/%E0%A4%A`,
  ];
  // Different paths: they must never reach the guarded handler (no double decoding, case-sensitive routes).
  const other = [
    `${p}/ADMIN`,
    `${p}/Admin`,
    `${p}/ad%256din`,
    `${p}/%2561dmin`,
    `${p}/admin.`,
    // A `&` or a twice-encoded `..` must not turn into another path on the way to the handler (Vercel's query captures).
    `${p}/admin&download`,
    `${p}/x/%252e%252e/admin`,
    `${p}/%252e%252e/admin`,
  ];
  return [...guarded.map((path) => ({ path, protected: true })), ...other.map((path) => ({ path, protected: false }))];
}

const API = (base: string): Variant[] => variants(`${base}/api`);
const PAGES = (base: string): Variant[] => [
  ...variants(base),
  // A public file under the guarded prefix: case-insensitive file systems must not serve it under another spelling.
  { path: `${base}/admin/report.txt`, protected: true },
  { path: `${base}/ad%6din/report%2etxt`, protected: true },
  { path: `${base}/ADMIN/report.txt`, protected: false },
  { path: `${base}/admin/REPORT.txt`, protected: false },
  // URL-based asset backends (Cloudflare's ASSETS) must not decode the path again.
  { path: `${base}/x/%252e%252e/admin/report.txt`, protected: false },
  { path: `${base}/public/%252e%252e/admin/report.txt`, protected: false },
];

function baseVariants(): Variant[] {
  return [
    { path: "/cons%6fle/admin", protected: true },
    { path: "/cons%6fle/api/admin", protected: true },
    { path: "//console/admin", protected: true },
    { path: "/console//admin", protected: true },
    { path: "/console/./api/admin", protected: true },
    { path: "/x/../console/api/admin", protected: true },
    { path: "/console/x/%2e%2e/api/admin", protected: true },
    { path: "/console%2fapi/admin", protected: true },
    { path: "/CONSOLE/api/admin", protected: false },
    // Outside basePath: no app routes, no files (text dev used to dispatch handlers here; Pages used to serve dist/ directly).
    { path: "/api/admin", protected: false },
    { path: "/api/admin/x", protected: false },
    { path: "/admin/report.txt", protected: false },
  ];
}

interface Row {
  host: string;
  path: string;
  status: number;
  ok: boolean;
}

const rows: Row[] = [];

async function probe(host: string, base: string, list: Variant[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const v of list) {
    const res = await rawRequest(base, v.path, { headers: { accept: "text/html,*/*" } });
    const leaked = res.body.includes("admin-only");
    const ok = v.protected ? (res.status === 401 || res.status === 400) && !leaked : !leaked;
    out.push({ host, path: v.path, status: res.status, ok });
  }
  rows.push(...out);
  return out;
}

function failures(list: Row[]): string[] {
  return list.filter((r) => !r.ok).map((r) => `${r.path} → ${r.status}`);
}

async function controlChecks(base: string, basePath: string): Promise<void> {
  // The guard lets authenticated requests through, and handlers see the canonical URL.
  const allowed = await fetch(`${base}${basePath}/api/ad%6din`, { headers: { cookie: "auth=1" } });
  expect(allowed.status).toBe(200);
  expect(await allowed.json()).toEqual({ secret: "admin-only" });
  const pub = await rawRequest(base, `${basePath}//api/./pub%6cic/`);
  expect(pub.status).toBe(200);
  const seen = new URL(/"url":"([^"]+)"/.exec(pub.body)?.[1] ?? "http://x/").pathname;
  expect([`${basePath}/api/public`, "/api/public"]).toContain(seen);
  // Prerendered pages live at dist/<page>/index.html: served once, never a redirect to the slash form.
  for (const path of ["/admin", "/admin/"]) {
    const page = await fetch(`${base}${basePath}${path}`, { headers: { cookie: "auth=1", accept: "text/html" }, redirect: "manual" });
    expect({ path, status: page.status }).toEqual({ path, status: 200 });
    expect(await page.text()).toContain("<html");
  }
  // Middleware sees the canonical pathname too.
  const denied = await rawRequest(base, `${basePath}/api/x/../ad%6din//y/`);
  expect(denied.status).toBe(401);
  expect(denied.body).toContain("denied /api/admin/y");
}

const frames = (s: { messages: Array<Record<string, unknown>> }) => JSON.stringify(s.messages.filter((m) => m.t === "f"));

/** Server-rendered routes: neither the HTTP document nor a live session renders `/ops` past the guard. */
async function exerciseLive(host: string, base: string): Promise<void> {
  const list: Variant[] = ["/ops", "/op%73", "//ops", "/./ops", "/x/../ops", "/ops/", "/%6fps"].map((path) => ({ path, protected: true }));
  const http = await probe(`${host} (server route)`, base, list);
  for (const path of ["/ops", "/op%73", "/%6fps", "/x/../ops", "/x/%2e%2e/ops", "/ops/", "/ops/."]) {
    const s = await openLiveStream(base, `path=${encodeURIComponent(path)}&cols=40&rows=4`);
    try {
      await until(() => s.messages.some((m) => m.t === "load" || m.t === "f"), 10_000);
      await new Promise((r) => setTimeout(r, 150));
      const leaked = frames(s).includes("secret");
      rows.push({ host: `${host} (live session)`, path, status: leaked ? 200 : 0, ok: !leaked });
    } finally {
      s.close();
    }
  }
  // Deny by rewrite: a session asked to render /restricted must not render it.
  for (const path of ["/restricted", "/restricte%64", "/restricted/", "/x/../restricted"]) {
    const s = await openLiveStream(base, `path=${encodeURIComponent(path)}&cols=40&rows=4`);
    try {
      await until(() => s.messages.some((m) => m.t === "load" || m.t === "f"), 10_000);
      await new Promise((r) => setTimeout(r, 150));
      const leaked = frames(s).includes("restricted secret");
      rows.push({ host: `${host} (live rewrite)`, path, status: leaked ? 200 : 0, ok: !leaked });
    } finally {
      s.close();
    }
  }
  expect(failures(http)).toEqual([]);
  expect(failures(rows.filter((r) => r.host === `${host} (live session)` || r.host === `${host} (live rewrite)`))).toEqual([]);
}

/**
 * Pages-like `env.ASSETS`: case-sensitive, `dir/index.html` served at `dir/`
 * with `dir` and `dir/index.html` redirecting there (Pages' default HTML handling).
 */
function pagesAssets(dist: string) {
  return {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const p = decodeURIComponent(url.pathname);
      const redirect = (to: string) => new Response(null, { status: 308, headers: { location: to } });
      if (p.endsWith("/index.html")) return redirect(p.slice(0, -"index.html".length));
      const index = staticFile(dist, join(p, "index.html"));
      if (index && !p.endsWith("/")) return redirect(`${url.pathname}/`);
      const file = p.endsWith("/") ? index : staticFile(dist, p);
      if (file) return new Response(readFileSync(file));
      return new Response(readFileSync(join(dist, "404.html")), { status: 404 });
    },
  };
}

/** Pages in front of the worker: `_routes.json` decides which requests the worker sees; the rest are static. */
function pagesFront(dist: string, worker: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> }) {
  const routes = JSON.parse(readFileSync(join(dist, "_routes.json"), "utf8")) as { include: string[]; exclude: string[] };
  const hit = (rule: string, p: string) => (rule.endsWith("/*") ? p.startsWith(rule.slice(0, -1)) || p === rule.slice(0, -2) : p === rule);
  const env = { ASSETS: pagesAssets(dist) };
  return (req: Request): Promise<Response> => {
    const p = new URL(req.url).pathname;
    const viaWorker = routes.include.some((r) => hit(r, p)) && !routes.exclude.some((r) => hit(r, p));
    return viaWorker ? worker.fetch(req, env, { waitUntil: () => undefined }) : env.ASSETS.fetch(req);
  };
}

describe("canonicalPathname", () => {
  test("decodes once, resolves dot segments, drops repeated and trailing slashes", () => {
    const cases: Array<[string, string | null]> = [
      ["/", "/"],
      ["//", "/"],
      ["/admin", "/admin"],
      ["/ad%6din", "/admin"],
      ["/%61%64%6D%69%6E/", "/admin"],
      ["//admin//x///", "/admin/x"],
      ["/./admin/.", "/admin"],
      ["/x/../admin", "/admin"],
      ["/x/%2e%2E/admin", "/admin"],
      ["/../../admin", "/admin"],
      ["/ad%256din", "/ad%256din"],
      ["/a%20b/%C3%A9/a b", "/a%20b/%C3%A9/a%20b"],
      ["/a^b/{x}/`q`/<y>/\"z\"", "/a%5Eb/%7Bx%7D/%60q%60/%3Cy%3E/%22z%22"],
      ["/a%3Fb%23c", "/a%3Fb%23c"],
      ["/a[b]/c|d/@e:f;g=h/$&+,!*'()~", "/a[b]/c|d/@e:f;g=h/$&+,!*'()~"],
      ["/a%2fb", null],
      ["/a%2Fb", null],
      ["/a%5cb", null],
      ["/a\\b", null],
      ["/a%00b", null],
      ["/a%0Ab", null],
      ["/a%", null],
      ["/%E0%A4%A", null],
    ];
    for (const [input, expected] of cases) expect({ input, out: canonicalPathname(input) }).toEqual({ input, out: expected });
  });

  test("is idempotent and matches what new URL() serializes", () => {
    for (const p of ["/a%20b", "/%C3%A9", "/a%5Eb", "/a[b]", "/ad%256din", "/x/%7B%7D"]) {
      const once = canonicalPathname(p) as string;
      expect(canonicalPathname(once)).toBe(once);
      expect(new URL(once, "http://x").pathname).toBe(once);
    }
  });
});

describe("matchers with a trailing slash", () => {
  const deny = { middleware: () => new Response("no", { status: 401 }) };
  test("`/admin/` matches the canonical `/admin`, and `/` the root", async () => {
    for (const [matcher, path] of [["/admin/", "/admin"], ["/admin/", "/admin/"], ["/admin//", "/admin"], ["/", "/"], ["/", ""]] as const) {
      const out = await runMiddleware({ ...deny, config: { matcher } }, new Request(`http://x.dev${path}`));
      expect({ matcher, path, type: out.type }).toEqual({ matcher, path, type: "response" });
    }
    const other = await runMiddleware({ ...deny, config: { matcher: "/admin/" } }, new Request("http://x.dev/admin/x"));
    expect(other.type).toBe("next");
  });

  test("the generated Vercel route matches them under basePath", () => {
    const src = (matcher: string, basePath: string) => {
      const ctx = { basePath, rewrites: [], api: [] } as never;
      const route = vercelConfig(ctx, { middleware: () => undefined, config: { matcher } }).routes.find((r) => r.middlewarePath);
      return new RegExp(route?.src ?? "^$");
    };
    expect(src("/admin/", "").test("/admin")).toBe(true);
    expect(src("/admin/", "/console").test("/console/admin")).toBe(true);
    expect(src("/", "/console").test("/console")).toBe(true);
    expect(src("/", "/console").test("/console/")).toBe(true);
    expect(src("/", "/console").test("/console/x")).toBe(false);
    expect(src("/", "").test("/")).toBe(true);
  });
});

describe("live sessions and middleware rewrites", () => {
  test("a rewrite to another path denies the session; a rewrite onto the same canonical path allows it", async () => {
    const mod = {
      middleware: (req: NextRequest) => {
        if (req.nextUrl.pathname === "/restricted") return NextResponse.rewrite(new URL("/login", req.url));
        if (req.nextUrl.pathname === "/same") return NextResponse.rewrite(new URL("/s%61me/", req.url));
      },
    };
    const init = { origin: "http://x.dev", headers: new Headers() };
    expect(await authorizeWithMiddleware(mod, "/restricted", init)).toBe(false);
    expect(await authorizeWithMiddleware(mod, "/restricte%64/", init)).toBe(false);
    expect(await authorizeWithMiddleware(mod, "/same", init)).toBe(true);
    expect(await authorizeWithMiddleware(mod, "/other", init)).toBe(true);
  });
});

describe("vercel config", () => {
  test("handler routes carry the path in a header, never a query capture", () => {
    const ctx = { basePath: "", rewrites: [], api: [{ pattern: "/api/[...rest]", file: "x" }] } as never;
    const route = vercelConfig(ctx, null).routes.find((r) => r.dest?.startsWith("/_textjs/"));
    expect(route?.dest).toBe("/_textjs/server");
    expect(route?.transforms).toEqual([{ type: "request.headers", op: "set", target: { key: "x-textjs-path" }, args: "$1" }]);
  });

  test("one middleware route covers the matchers and every non-canonical path", () => {
    const re = new RegExp(NON_CANONICAL_PATH);
    for (const p of ["/ad%6din", "//admin", "/admin//x", "/./admin", "/x/../admin", "/admin/", "/a\\b"]) expect({ p, hit: re.test(p) }).toEqual({ p, hit: true });
    for (const p of ["/", "/admin", "/a.b/c", "/.well-known/x", "/assets/app-1a2b.js"]) expect({ p, hit: re.test(p) }).toEqual({ p, hit: false });
  });
});

afterAll(() => {
  if (process.env.TEXTJS_BYPASS_REPORT !== "1") return;
  const lines = rows.map((r) => `${r.ok ? "ok    " : "BYPASS"}  ${String(r.status).padEnd(4)} ${r.host.padEnd(36)} ${r.path}`);
  console.log(`\n${lines.join("\n")}\n`);
});

for (const basePath of ["", "/console"]) {
  describe(`middleware bypass (basePath ${JSON.stringify(basePath)})`, () => {
    let dir = "";
    let live = "";
    const list = (): Variant[] => [...PAGES(basePath), ...API(basePath), ...(basePath ? baseVariants() : [])];
    beforeAll(() => {
      __configureCache({ reset: true });
      dir = createFixture(bypassApp(basePath, false), "textjs-bypass-");
      live = basePath ? "" : createFixture(bypassApp("", true), "textjs-bypass-live-");
    });
    afterAll(() => {
      rmSync(dir, { recursive: true, force: true });
      if (live) rmSync(live, { recursive: true, force: true });
    });

    test(
      "text dev",
      async () => {
        const server: ViteDevServer = await startDevServer({ root: dir, port: 38000 + Math.floor(Math.random() * 2000), log: false });
        try {
          const origin = new URL(server.resolvedUrls?.local[0] ?? "").origin;
          const out = await probe(`text dev ${basePath}`, origin, list());
          expect(failures(out)).toEqual([]);
          await controlChecks(origin, basePath);
        } finally {
          await server.waitForRequestsIdle();
          await server.close();
        }
      },
      60_000,
    );

    test(
      "text start",
      async () => {
        await buildApp({ root: dir, log: false });
        __configureCache({ reset: true });
        const server = await startProductionServer({ root: dir, port: 0, log: false });
        try {
          const origin = new URL(server.url).origin;
          const out = await probe(`text start ${basePath}`, origin, list());
          expect(failures(out)).toEqual([]);
          await controlChecks(origin, basePath);
        } finally {
          await server.close();
        }
      },
      120_000,
    );

    test(
      "bun adapter",
      async () => {
        await adapt(dir, "bun");
        __configureCache({ reset: true });
        const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
        try {
          const url = await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000);
          const origin = new URL(url).origin;
          const out = await probe(`bun ${basePath}`, origin, list());
          expect(failures(out)).toEqual([]);
          await controlChecks(origin, basePath);
        } finally {
          proc.kill();
          await proc.exited;
        }
      },
      120_000,
    );

    test(
      "vercel adapter (local Build Output router)",
      async () => {
        const result = await adapt(dir, "vercel");
        __configureCache({ reset: true });
        const harness = await startVercelHarness(result.output);
        try {
          const out = await probe(`vercel ${basePath}`, harness.url, list());
          expect(failures(out)).toEqual([]);
          await controlChecks(harness.url, basePath);
        } finally {
          await harness.close();
        }
      },
      120_000,
    );

    test(
      "cloudflare adapter (worker entry)",
      async () => {
        await adapt(dir, "cloudflare");
        const dist = join(dir, "dist");
        const mod = (await import(`${join(dist, "_worker.js")}?t=${Date.now()}`)) as { default: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } };
        __configureCache({ reset: true });
        const local = Bun.serve({ port: 0, fetch: pagesFront(dist, mod.default) });
        try {
          const origin = `http://127.0.0.1:${local.port}`;
          const out = await probe(`cloudflare ${basePath}`, origin, list());
          expect(failures(out)).toEqual([]);
          await controlChecks(origin, basePath);
        } finally {
          local.stop(true);
        }
      },
      120_000,
    );

    test("static export refuses middleware (no server to run it)", async () => {
      await expect(adapt(dir, "static")).rejects.toThrow(/middleware\.ts needs a server/);
    }, 120_000);

    if (!basePath) {
      test(
        "server-rendered routes: text dev, text start and bun",
        async () => {
          const dev: ViteDevServer = await startDevServer({ root: live, port: 40000 + Math.floor(Math.random() * 2000), log: false });
          try {
            await exerciseLive("text dev", new URL(dev.resolvedUrls?.local[0] ?? "").origin);
          } finally {
            await dev.waitForRequestsIdle();
            await dev.close();
          }
          await buildApp({ root: live, log: false });
          const server = await startProductionServer({ root: live, port: 0, log: false });
          try {
            await exerciseLive("text start", new URL(server.url).origin);
          } finally {
            await server.close();
          }
          await adapt(live, "bun");
          const proc = Bun.spawn(["bun", join(live, "dist/server.js")], { cwd: live, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
          try {
            const url = await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000);
            await exerciseLive("bun", new URL(url).origin);
          } finally {
            proc.kill();
            await proc.exited;
          }
        },
        240_000,
      );
    }
  });
}
