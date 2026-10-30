import { VERSION } from "@textjs/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { flattenRoutes, matchAppRoutes } from "../src/routing";
import { generateRoutesModule, isRouteFile, listApiRoutes, matchApiRoute, scanApp, toApiManifest, toStaticManifest } from "../src/server/scan";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { applyRewrites, compileRewrite, isAllowedHost, isLoopbackUrl, isValidHostHeader, normalizeRequestTarget, proxyRequest, readRequestBody, requestOrigin, requestUrl, runRouteHandler, sendWebResponse, toWebRequest } from "../src/server/http";
import { createEntryModule, createIndexHtml, generateApiModule, textjsVitePlugin } from "../src/vite-plugin";
import { parseArgs } from "../src/cli/index";
import { LEGEND, routeTable, stripAnsi, summarize } from "../src/cli/ui";
import { defineConfig, normalizeBasePath, toClientConfig } from "../src/config";

let root = "";
const touch = (rel: string, body = "export default function X() { return null }\n"): void => {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "textjs-scan-"));
  touch("app/layout.tsx");
  touch("app/page.tsx");
  touch("app/not-found.tsx");
  touch("app/loading.tsx");
  touch("app/logs/page.tsx");
  touch("app/deployments/page.tsx");
  touch("app/deployments/error.tsx");
  touch("app/deployments/layout.tsx");
  touch("app/deployments/[id]/page.tsx");
  touch("app/docs/[...slug]/page.tsx");
  touch("app/(marketing)/pricing/page.tsx");
  touch("app/live/page.tsx", 'export const dynamic = "force-dynamic";\nexport default function Live() { return null }\n');
  touch("app/_components/Card.tsx");
  touch("app/components/Card.tsx");
  touch("app/api/health/route.ts", "export function GET() { return Response.json({ ok: true }) }\n");
  touch("app/api/deployments/[id]/route.ts", "export function GET() { return new Response('x') }\n");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("app/ scanner", () => {
  test("discovers layouts, pages, boundaries, dynamic segments and route groups", () => {
    const scan = scanApp(root);
    const manifest = toStaticManifest(scan);
    expect(manifest.files).toEqual({ layout: "app/layout.tsx", page: "app/page.tsx", loading: "app/loading.tsx", "not-found": "app/not-found.tsx" });
    const flat = flattenRoutes(manifest).map((r) => `${r.dynamic ? "ƒ" : "○"} ${r.pattern}`);
    expect(flat).toContain("○ /");
    expect(flat).toContain("○ /logs");
    expect(flat).toContain("○ /deployments");
    expect(flat).toContain("ƒ /deployments/[id]");
    expect(flat).toContain("ƒ /docs/[...slug]");
    expect(flat).toContain("○ /pricing");
    expect(flat).toContain("ƒ /live");
    expect(flat.some((r) => r.includes("_components") || r.includes("components"))).toBe(false);
    const dep = matchAppRoutes(manifest, "/deployments/dpl_1");
    expect(dep?.chain.map((n) => n.files?.layout).filter(Boolean)).toEqual(["app/layout.tsx", "app/deployments/layout.tsx"]);
    expect(dep?.chain[1]?.files?.error).toBe("app/deployments/error.tsx");
  });

  test("API route handlers", () => {
    const scan = scanApp(root);
    expect(listApiRoutes(scan).map((r) => r.pattern)).toEqual(["/api/deployments/[id]", "/api/health"]);
    const api = toApiManifest(scan);
    const m = matchApiRoute(api, "/api/deployments/dpl_9");
    expect(m?.params).toEqual({ id: "dpl_9" });
    expect(m?.file.endsWith("app/api/deployments/[id]/route.ts")).toBe(true);
    expect(matchApiRoute(api, "/api/nope")).toBeNull();
  });

  test("isRouteFile", () => {
    const app = join(root, "app");
    expect(isRouteFile(join(app, "logs/page.tsx"), app)).toBe(true);
    expect(isRouteFile(join(app, "api/health/route.ts"), app)).toBe(true);
    expect(isRouteFile(join(app, "components/Card.tsx"), app)).toBe(false);
    expect(isRouteFile(join(root, "page.tsx"), app)).toBe(false);
  });

  test("generates valid virtual modules", () => {
    const scan = scanApp(root);
    const transpiler = new Bun.Transpiler({ loader: "js" });
    const routes = generateRoutesModule(scan, { hmr: true });
    expect(() => transpiler.transformSync(routes)).not.toThrow();
    expect(routes).toContain('segment: "[id]"');
    expect(routes).toContain("notFound: m");
    expect(routes).toContain("import.meta.hot.accept");
    const lazy = generateRoutesModule(scan, { lazyPages: true });
    expect(lazy).toContain("page: () => import(");
    const api = generateApiModule(scan);
    expect(() => transpiler.transformSync(api)).not.toThrow();
    expect(api).toContain("export const handlers");
    expect(() => transpiler.transformSync(createEntryModule())).not.toThrow();
    expect(createEntryModule()).toContain("bootTextApp");
  });

  test("missing app/ directory yields an empty manifest", () => {
    const scan = scanApp(join(root, "nowhere"));
    expect(flattenRoutes(toStaticManifest(scan))).toEqual([]);
  });
});

describe("vite plugin", () => {
  test("bundles @vitejs/plugin-react and the textjs plugin", () => {
    const plugins = textjsVitePlugin({ root });
    const names = plugins.map((p) => p.name);
    expect(names).toContain("@textjs/next");
    expect(names.some((n) => n.startsWith("vite:react"))).toBe(true);
  });

  test("index.html has the ▼ favicon, dark body and FocusPad mount", () => {
    const html = createIndexHtml("Edge <Console>");
    expect(html).toContain("<title>Edge &lt;Console&gt;</title>");
    expect(html).toContain("#0a0a0a");
    expect(html).toContain('id="__textjs"');
    expect(html).toContain('src="/@textjs/entry"');
    expect(html).toContain('rel="icon" href="data:image/svg+xml,');
    expect(html).toContain(`Text.js ${VERSION} (Turbolog)`);
  });

  test("config helpers", () => {
    expect(defineConfig({ outDir: "out" })).toEqual({ outDir: "out" });
    expect(normalizeBasePath("console/")).toBe("/console");
    expect(normalizeBasePath("/")).toBe("");
    expect(toClientConfig({ viewport: { width: 80 } })).toEqual({ viewport: { width: 80 }, devIndicators: true, showMirrorDefault: false, basePath: "", title: "" });
  });
});

describe("route handlers & rewrites", () => {
  const mod = {
    GET: (req: Request, ctx: { params: Record<string, string | string[]> }) => Response.json({ url: new URL(req.url).pathname, params: ctx.params }),
    POST: async (req: Request) => new Response(await req.text(), { status: 201 }),
  };

  test("dispatches by method, HEAD falls back to GET, OPTIONS and 405", async () => {
    const get = await runRouteHandler(mod, new Request("http://x/api/a"), { id: "1" });
    expect(await get.json()).toEqual({ url: "/api/a", params: { id: "1" } });
    const post = await runRouteHandler(mod, new Request("http://x/api/a", { method: "POST", body: "hi" }), {});
    expect(post.status).toBe(201);
    expect(await post.text()).toBe("hi");
    expect((await runRouteHandler(mod, new Request("http://x/", { method: "HEAD" }), {})).status).toBe(200);
    const options = await runRouteHandler(mod, new Request("http://x/", { method: "OPTIONS" }), {});
    expect(options.status).toBe(204);
    expect(options.headers.get("allow")).toBe("GET, POST, HEAD, OPTIONS");
    const del = await runRouteHandler(mod, new Request("http://x/", { method: "DELETE" }), {});
    expect(del.status).toBe(405);
  });

  test("rewrites with params and splats", () => {
    const rules = [
      compileRewrite({ source: "/docs/:slug", destination: "/guides/:slug" }),
      compileRewrite({ source: "/opencode/:path*", destination: "http://localhost:4096/:path*" }),
    ];
    expect(applyRewrites(rules, "/docs/intro?x=1")).toBe("/guides/intro?x=1");
    expect(applyRewrites(rules, "/opencode/session/abc")).toBe("http://localhost:4096/session/abc");
    expect(applyRewrites(rules, "/opencode")).toBe("http://localhost:4096/");
    expect(applyRewrites(rules, "/other")).toBeNull();
  });
});

describe("CLI", () => {
  test("parses commands, ports, hosts and directories", () => {
    expect(parseArgs(["dev"])).toMatchObject({ command: "dev", dir: "." });
    expect(parseArgs(["dev", "--port", "4000", "--host", "examples/dashboard"])).toMatchObject({ command: "dev", port: 4000, host: true, dir: "examples/dashboard" });
    expect(parseArgs(["start", "-p", "5000", "-H", "0.0.0.0"])).toMatchObject({ command: "start", port: 5000, host: "0.0.0.0" });
    expect(parseArgs(["build", "my-app"])).toMatchObject({ command: "build", dir: "my-app" });
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  test("prints the Next.js-style route table", () => {
    const table = stripAnsi(
      routeTable(
        summarize(
          [
            { pattern: "/", dynamic: false, layouts: [] },
            { pattern: "/deployments/[id]", dynamic: true, layouts: [] },
            { pattern: "/logs", dynamic: false, layouts: [] },
          ],
          [{ pattern: "/api/health" }],
        ),
      ),
    );
    expect(table.split("\n")).toEqual([
      "Route (app)                              Type       Target",
      "┌ ○ /                                    Static     console.log (%c)",
      "├ ○ /_not-found                          Static     console.log (%c)",
      "├ ƒ /deployments/[id]                    Dynamic    console.log (%c)",
      "├ ○ /logs                                Static     console.log (%c)",
      "└ ƒ /api/health                          Dynamic    Route Handler",
    ]);
    const live = stripAnsi(routeTable(summarize([{ pattern: "/ops", dynamic: false, layouts: [] }], [], new Set(["/ops"]))));
    expect(live).toContain("◇ /ops");
    expect(live).toContain("Server     frame player (SSE)");
    expect(LEGEND).toBe("○  (Static)   prerendered as static console cells\nƒ  (Dynamic)  on-demand console reconciliation");
  });
});

describe("node http bridge", () => {
  const listen = async (server: Server): Promise<string> => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  };
  const close = (server: Server): Promise<void> => new Promise((r) => server.close(() => r()));

  test("streaming responses are cancelled and request signals abort when the client disconnects", async () => {
    let cancelled = false;
    let aborted = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const server = createServer((req, res) => {
      const request = toWebRequest(req, "http://127.0.0.1", res);
      request.signal.addEventListener("abort", () => {
        aborted = true;
      });
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          timer = setInterval(() => controller.enqueue(new TextEncoder().encode("data: tick\n\n")), 5);
        },
        cancel() {
          cancelled = true;
          if (timer) clearInterval(timer);
        },
      });
      void sendWebResponse(res, new Response(body, { headers: { "content-type": "text/event-stream" } }));
    });
    const origin = await listen(server);
    try {
      const abort = new AbortController();
      const res = await fetch(`${origin}/api/event`, { signal: abort.signal });
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      await reader.read();
      abort.abort();
      const deadline = Date.now() + 2000;
      while ((!cancelled || !aborted) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
      expect(cancelled).toBe(true);
      expect(aborted).toBe(true);
    } finally {
      if (timer) clearInterval(timer);
      await close(server);
    }
  });

  test("proxying strips cookies and credentials for non-loopback origins only", async () => {
    expect(isLoopbackUrl("http://localhost:4096/x")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1/")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:3000/")).toBe(true);
    expect(isLoopbackUrl("https://api.example.com/")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);

    const seen: Array<{ cookie?: string; authorization?: string }> = [];
    const upstream = createServer((req, res) => {
      seen.push({ cookie: req.headers.cookie, authorization: req.headers.authorization });
      res.end("ok");
    });
    const upstreamOrigin = await listen(upstream);
    let target = upstreamOrigin;
    const front = createServer((req, res) => void proxyRequest(req, res, `${target}/echo`, "http://127.0.0.1"));
    const frontOrigin = await listen(front);
    try {
      const headers = { cookie: "session=secret", authorization: "Bearer secret" };
      expect(await (await fetch(frontOrigin, { headers })).text()).toBe("ok");
      expect(seen[0]).toEqual({ cookie: "session=secret", authorization: "Bearer secret" });
      // A non-loopback upstream: stub the proxy's outgoing fetch and inspect what it would send.
      target = "https://api.example.com";
      const originalFetch = globalThis.fetch;
      let forwarded: Headers | null = null;
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).startsWith(frontOrigin)) return originalFetch(input, init);
        forwarded = new Headers(init?.headers);
        return new Response("remote");
      }) as typeof fetch;
      try {
        expect(await (await fetch(frontOrigin, { headers })).text()).toBe("remote");
      } finally {
        globalThis.fetch = originalFetch;
      }
      const sent = forwarded as Headers | null;
      expect(sent?.get("cookie") ?? null).toBeNull();
      expect(sent?.get("authorization") ?? null).toBeNull();
    } finally {
      await close(front);
      await close(upstream);
    }
  });
});


describe("request targets, origins and hosts", () => {
  test("request targets keep one leading slash and never change the origin", () => {
    expect(normalizeRequestTarget("//evil.com/x?y=1")).toBe("/evil.com/x?y=1");
    expect(normalizeRequestTarget("/\\evil.com/x")).toBe("/evil.com/x");
    expect(normalizeRequestTarget("http://evil.com/x?q")).toBe("/x?q");
    expect(normalizeRequestTarget("*")).toBe("/");
    expect(normalizeRequestTarget(undefined)).toBe("/");
    expect(requestUrl("//evil.com/login", "http://localhost:3000").href).toBe("http://localhost:3000/evil.com/login");
    expect(new URL("/login", requestUrl("/\\evil.com/a", "https://app.dev").href).host).toBe("app.dev");
  });

  test("origins come from validated headers; X-Forwarded-* only when trusted", () => {
    const req = (headers: Record<string, string>) => ({ headers }) as never;
    expect(requestOrigin(req({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(requestOrigin(req({ host: "evil.com/x" }))).toBe("http://localhost");
    expect(requestOrigin(req({ host: "app.dev", "x-forwarded-host": "evil.com", "x-forwarded-proto": "https" }))).toBe("http://app.dev");
    expect(requestOrigin(req({ host: "internal:8080", "x-forwarded-host": "app.dev, proxy.local", "x-forwarded-proto": "https,http" }), { trustProxy: true })).toBe("https://app.dev");
    expect(requestOrigin(req({ host: "x" }), { origin: "https://console.example.com/ignored" })).toBe("https://console.example.com");
    expect(isAllowedHost("localhost:3000")).toBe(true);
    expect(isAllowedHost("127.0.0.1")).toBe(true);
    expect(isAllowedHost("[::1]:3000")).toBe(true);
    expect(isAllowedHost("app.localhost")).toBe(true);
    expect(isAllowedHost("attacker.example")).toBe(false);
    expect(isAllowedHost("a.example.com", [".example.com"])).toBe(true);
    expect(isAllowedHost("bad host")).toBe(false);
    expect(isValidHostHeader("evil.com@x")).toBe(false);
  });

  test("Node request bodies: cancelling mid-upload is safe, readRequestBody caps size", async () => {
    let seen = 0;
    const errors: unknown[] = [];
    const onError = (e: unknown): void => {
      errors.push(e);
    };
    process.on("uncaughtException", onError);
    const server = createServer((req, res) => {
      void (async () => {
        if (req.url === "/cap") {
          const body = await readRequestBody(req, 10);
          res.end(body === null ? "too large" : body);
          return;
        }
        const request = toWebRequest(req, "http://127.0.0.1", res);
        const reader = (request.body as ReadableStream<Uint8Array>).getReader();
        seen = ((await reader.read()).value?.byteLength ?? 0) > 0 ? 1 : 0;
        await reader.cancel();
        res.end("cancelled");
      })();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const res = await fetch(`${origin}/upload`, { method: "POST", body: new Uint8Array(4 * 1024 * 1024) });
      expect(await res.text()).toBe("cancelled");
      expect(seen).toBe(1);
      expect(await (await fetch(`${origin}/cap`, { method: "POST", body: "0123456789abc" })).text()).toBe("too large");
      expect(await (await fetch(`${origin}/cap`, { method: "POST", body: "short ▼" })).text()).toBe("short ▼");
      await new Promise((r) => setTimeout(r, 50));
      expect(errors).toEqual([]);
    } finally {
      process.off("uncaughtException", onError);
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
