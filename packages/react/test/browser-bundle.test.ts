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
  expect(code).toContain("Open the console");
  expect(code).toContain("text://viewport:1");
}, 30_000);

test("@textjs/react keeps the terminal runner and testing kit out of the main bundle", async () => {
  const code = await bundle("../src/index.ts");
  expect(code).not.toContain("TerminalInputParser");
  expect(code).not.toContain("waitForText");
  const terminal = await bundle("../src/terminal.tsx");
  expectBrowserSafe(terminal);
  expect(terminal).toContain("TerminalInputParser");
}, 30_000);

test("the DevTools connection code is its own chunk, inlined in single-file bundles", async () => {
  const path = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  const result = await Bun.build({ entrypoints: [path], target: "browser", format: "esm", splitting: true, minify: false });
  if (!result.success) throw new AggregateError(result.logs, "bundle failed");
  const outputs = await Promise.all(result.outputs.map(async (o) => ({ kind: o.kind, code: await o.text() })));
  const entry = outputs.find((o) => o.kind === "entry-point")!.code;
  expect(entry).not.toContain("class FiberIds");
  expect(outputs.some((o) => o.kind === "chunk" && o.code.includes("class FiberIds"))).toBe(true);
  expect(await bundle("../src/index.ts")).toContain("class FiberIds");
}, 30_000);

test("<ConsoleMirror> checks for RTL text without bundling the bidi tables or grapheme segmenter", async () => {
  const code = await bundle("./fixtures/bundle/mirror.tsx");
  expect(code).toContain("bidi-override");
  expect(code).toContain("RTL_RANGES");
  expect(code).not.toContain("BIDI_CLASS_RANGES");
  expect(code).not.toContain("BIDI_UNICODE_VERSION");
  expect(code).not.toContain("Segmenter");
}, 30_000);

test("apps that only use Box and Text don't bundle the sprite PNG encoder; <Image> does", async () => {
  const boxText = await bundle("./fixtures/bundle/box-text.tsx");
  expect(boxText).toContain("tx-box");
  expect(boxText).not.toContain("IHDR");
  expect(boxText).not.toContain("function drawPixels");
  const image = await bundle("./fixtures/bundle/image.tsx");
  expect(image).toContain("IHDR");
  expect(image).toContain("function drawPixels");
}, 30_000);
