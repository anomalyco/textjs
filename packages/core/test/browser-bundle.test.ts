import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  expect(code).not.toContain("@keyframes s");
  expect(code).not.toMatch(/0xedb88320|3988292384/);
  expect(code.length).toBeGreaterThan(50_000);
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

test("onConsoleIntent code-split from a ViewportController chunk keeps the renderer's modules out of the intent chunk", async () => {
  const { build } = await import("vite");
  const dir = mkdtempSync(join(tmpdir(), "textjs-intent-split-"));
  const src = (p: string): string => JSON.stringify(fileURLToPath(new URL(p, import.meta.url)));
  writeFileSync(join(dir, "entry.ts"), `import { onConsoleIntent } from ${src("../src/console-intent.ts")};\nonConsoleIntent(() => void import("./app"));\n`);
  writeFileSync(join(dir, "app.ts"), `import { ViewportController } from ${src("../src/viewport.ts")};\nconsole.log(new ViewportController());\n`);
  try {
    const out = (await build({
      configFile: false,
      root: dir,
      logLevel: "silent",
      build: { write: false, minify: false, modulePreload: false, rollupOptions: { input: join(dir, "entry.ts"), preserveEntrySignatures: false } },
    })) as { output: Array<{ type: string; isEntry?: boolean; code?: string }> };
    const chunks = out.output.filter((c) => c.type === "chunk");
    const entry = chunks.find((c) => c.isEntry)?.code ?? "";
    expect(entry).toContain("analyzeDock");
    for (const heavy of ["class CellGrid", "function segmentGraphemes", "class ViewportController"]) expect(entry).not.toContain(heavy);
    expect(chunks.some((c) => !c.isEntry && c.code?.includes("class ViewportController"))).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
