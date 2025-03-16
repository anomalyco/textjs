import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteDevServer } from "vite";
import { startDevServer } from "../src/cli/dev";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

let dir = "";
let server: ViteDevServer;
let base = "";

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "textjs-dev-"));
  mkdirSync(join(dir, "app/api/echo/[name]"), { recursive: true });
  mkdirSync(join(dir, "node_modules"), { recursive: true });
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/textjs"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "dev-fixture", type: "module", private: true }));
  writeFileSync(join(dir, "text.config.ts"), 'import { defineConfig } from "textjs";\nexport default defineConfig({ title: "Fixture", viewport: { width: 90 } });\n');
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "textjs";\nexport const metadata = { title: "Home" };\nexport default function Page() { return <Text>hello</Text>; }\n');
  writeFileSync(join(dir, "app/api/echo/[name]/route.ts"), "export async function POST(req: Request, { params }: { params: { name: string } }) { return Response.json({ name: params.name, body: await req.text() }); }\n");
  server = await startDevServer({ root: dir, port: 34000 + Math.floor(Math.random() * 2000), log: false });
  base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
}, 30_000);

afterAll(async () => {
  await server?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("text dev", () => {
  test("serves the virtual index.html with the React Refresh preamble and Vite client", async () => {
    const res = await fetch(`${base}/deployments/abc`, { headers: { accept: "text/html" } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>Fixture</title>");
    expect(html).toContain("/@vite/client");
    expect(html).toContain("/@react-refresh");
    expect(html).toContain('src="/@textjs/entry"');
  });

  test("serves the client entry, route manifest and config as modules", async () => {
    const entry = await (await fetch(`${base}/@textjs/entry`)).text();
    expect(entry).toContain("bootTextApp");
    expect(entry).toContain("import.meta.hot");
    const routes = await server.transformRequest("virtual:textjs/routes");
    expect(routes?.code).toContain('/app/page.tsx"');
    const config = await server.transformRequest("virtual:textjs/config");
    expect(config?.code).toContain('"width":90');
    const page = await (await fetch(`${base}/app/page.tsx`)).text();
    expect(page).toContain("$RefreshReg$");
  });

  test("route handlers run through Vite's SSR module loader", async () => {
    const res = await fetch(`${base}/api/echo/turbolog`, { method: "POST", body: "%c" });
    expect(await res.json()).toEqual({ name: "turbolog", body: "%c" });
    expect((await fetch(`${base}/api/echo/x`)).status).toBe(405);
  });

  test("adding app/ route files refreshes the route manifest", async () => {
    mkdirSync(join(dir, "app/logs"), { recursive: true });
    writeFileSync(join(dir, "app/logs/page.tsx"), 'import { Text } from "textjs";\nexport default function Logs() { return <Text>logs</Text>; }\n');
    let code = "";
    for (let i = 0; i < 40 && !code.includes("/app/logs/page.tsx"); i++) {
      await new Promise((r) => setTimeout(r, 100));
      code = (await server.transformRequest("virtual:textjs/routes"))?.code ?? "";
    }
    expect(code).toContain('segment: "logs"');
  }, 10_000);
});

