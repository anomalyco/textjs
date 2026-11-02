import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startDevServer } from "../src/cli/dev";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "textjs-dev-close-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const page = (text: string): string => `import { Text } from "@textjs/app";\nexport default function Page() { return <Text>${text}</Text>; }\n`;

test("text dev closes while Vite is optimizing dependencies it discovered after a page load", async () => {
  mkdirSync(join(dir, "app"), { recursive: true });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(dir, "node_modules/@textjs/app"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "dev-close-fixture", type: "module", private: true }));
  writeFileSync(join(dir, "app/page.tsx"), page("home"));

  // No optimizer cache, as on a first run: loading the entry and adding a route make Vite
  // discover more dependencies and re-run the optimizer, which is still running at close.
  const server = await startDevServer({ root: dir, port: 0, log: false });
  const base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  await (await fetch(`${base}/`, { headers: { accept: "text/html" } })).text();
  await (await fetch(`${base}/@textjs/entry`)).text();
  mkdirSync(join(dir, "app/logs"), { recursive: true });
  writeFileSync(join(dir, "app/logs/page.tsx"), page("logs"));
  for (let i = 0; i < 40 && !((await server.transformRequest("virtual:textjs/routes"))?.code ?? "").includes("/app/logs/page.tsx"); i++) await Bun.sleep(100);

  // Vite 6.4 alone never finishes this close (vitejs/vite#22934): optimized-dep loads wait on the canceled run.
  const closed = await Promise.race([server.close().then(() => true), Bun.sleep(12_000).then(() => false)]);
  expect(closed).toBe(true);
}, 30_000);
