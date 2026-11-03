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

test("apps that only use Box and Text don't bundle the sprite PNG encoder; <Image> does", async () => {
  const boxText = await bundle("./fixtures/bundle/box-text.tsx");
  expect(boxText).toContain("tx-box");
  expect(boxText).not.toContain("IHDR");
  expect(boxText).not.toContain("function drawPixels");
  const image = await bundle("./fixtures/bundle/image.tsx");
  expect(image).toContain("IHDR");
  expect(image).toContain("function drawPixels");
}, 30_000);
