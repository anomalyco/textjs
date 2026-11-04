import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("bundles for browser ESM with no Node built-ins, fetching yoga.wasm as an asset", async () => {
  const entry = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: false });
  expect(result.success).toBe(true);
  const output = result.outputs[0];
  expect(output).toBeDefined();
  const code = (await output?.text()) ?? "";
  expect(code).not.toMatch(/from\s+["']node:/);
  expect(code).not.toMatch(/\brequire\(["'](fs|path|module)["']\)/);
  expect(code).toContain('new URL("@textjs/core/yoga.wasm", import.meta.url)');
  // "\0asm" in base64: no inlined copy of the WebAssembly.
  expect(code).not.toContain("AGFzbQ");
  expect(code).not.toContain("@keyframes s");
  expect(code).not.toMatch(/0xedb88320|3988292384/);
  expect(code.length).toBeGreaterThan(50_000);
  expect(code.length).toBeLessThan(400_000);
});

test("the frame player's imports check for RTL text without the Bidi_Class table", async () => {
  const dir = mkdtempSync(join(tmpdir(), "textjs-player-bundle-"));
  const src = (p: string): string => JSON.stringify(fileURLToPath(new URL(p, import.meta.url)));
  const entry = join(dir, "player.ts");
  writeFileSync(
    entry,
    `import { CssConsoleDriver, InputEngine, ViewportController } from ${src("../src/index.ts")};\n` +
      `import { CellGrid } from ${src("../src/internal.ts")};\n` +
      "console.log(CssConsoleDriver, InputEngine, ViewportController, CellGrid);\n",
  );
  try {
    const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: false });
    expect(result.success).toBe(true);
    const code = (await result.outputs[0]?.text()) ?? "";
    expect(code).toContain("RTL_RANGES");
    expect(code).not.toContain("BIDI_CLASS_RANGES");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
