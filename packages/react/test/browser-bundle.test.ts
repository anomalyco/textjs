import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

async function bundle(entry: string): Promise<string> {
  const path = fileURLToPath(new URL(entry, import.meta.url));
  const result = await Bun.build({ entrypoints: [path], target: "browser", format: "esm", minify: false });
  if (!result.success) throw new AggregateError(result.logs, `bundle failed: ${entry}`);
  const out = result.outputs[0];
  return (await out?.text()) ?? "";
}

function expectBrowserSafe(code: string): void {
  expect(code).not.toMatch(/from\s*["']node:/);
  expect(code).not.toMatch(/require\(["'](node:)?(fs|path|module|os|child_process|url|util|crypto)["']\)/);
  expect(code).not.toMatch(/\bprocess\.binding\b/);
}

test("@textjs/react bundles for the browser with no Node built-ins", async () => {
  const code = await bundle("../src/index.ts");
  expectBrowserSafe(code);
  expect(code).toContain("tx-box");
  expect(code).toContain("loadYoga");
  expect(code.length).toBeGreaterThan(100_000);
}, 30_000);

test("@textjs/react/dom bundles for the browser with no Node built-ins", async () => {
  const code = await bundle("../src/dom/index.ts");
  expectBrowserSafe(code);
  expect(code).toContain("Preview Console Inline");
  expect(code).toContain("text://viewport:1");
}, 30_000);
