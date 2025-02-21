import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("bundles for browser ESM with inlined Yoga WASM and no Node built-ins", async () => {
  const entry = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: false });
  expect(result.success).toBe(true);
  const output = result.outputs[0];
  expect(output).toBeDefined();
  const code = (await output?.text()) ?? "";
  expect(code).not.toMatch(/from\s+["']node:/);
  expect(code).not.toMatch(/\brequire\(["'](fs|path|module)["']\)/);
  expect(code).toContain("loadYoga");
  expect(code.length).toBeGreaterThan(50_000);
});
