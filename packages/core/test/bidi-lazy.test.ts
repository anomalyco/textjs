/**
 * The bidi engine loads with `@textjs/core` by default, and on the first
 * right-to-left text under the `@textjs/wasm-asset` condition (Text.js client
 * builds), where renderers repaint once it lands.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsoleRenderer, initYoga, type RendererScheduler } from "../src/index";
import { bidiLoading } from "../src/internal";
import { box, FakeConsole, text } from "./fixtures";

const CORE = join(import.meta.dir, "..");
const CONDITION = "@textjs/wasm-asset";
/** The first characters of `BIDI_CLASS_RANGES`, which only the bidi chunk carries. */
const BIDI_DATA = "0J9L1K1L";

class ManualScheduler implements RendererScheduler {
  queue: Array<() => void> = [];
  request(cb: () => void): unknown {
    this.queue.push(cb);
    return this.queue.length;
  }
  cancel(): void {
    this.queue = [];
  }
  flush(): void {
    const q = this.queue;
    this.queue = [];
    for (const cb of q) cb();
  }
}

beforeAll(async () => {
  await initYoga();
});

test("by default the engine ships with the package: the first paint of right-to-left text is in visual order", () => {
  const scheduler = new ManualScheduler();
  const root = box({ width: 8, height: 3, border: "single", title: "עב" }, text({}, "שלום"));
  const r = new ConsoleRenderer({ root, console: new FakeConsole(), scheduler, viewport: { width: 8, height: 3 }, input: false, registerGlobal: false });
  r.renderNow();
  expect(r.buffer.toPlainString(true).split("\n").slice(0, 2)).toEqual(["┌─ בע ─┐", "│םולש  │"]);
  expect(bidiLoading()).toBeNull();
  expect(scheduler.queue.length).toBe(0);
  r.dispose();
});

describe(`under the ${CONDITION} condition`, () => {
  let dir = "";
  beforeAll(() => {
    dir = realpathSync.native(mkdtempSync(join(tmpdir(), "textjs-lazy-bidi-")));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("left-to-right text never loads the engine; right-to-left text paints in logical order, then repaints once it lands", async () => {
    const src = (p: string): string => JSON.stringify(join(CORE, p));
    const script = join(dir, "lazy.ts");
    writeFileSync(
      script,
      `import { readFileSync } from "node:fs";
import { ConsoleRenderer, initYoga } from ${src("src/index.ts")};
import { bidiLoading } from ${src("src/internal.ts")};
import { box, FakeConsole, text } from ${src("test/fixtures.ts")};
await initYoga({ wasm: readFileSync(${src("yoga.wasm")}) });
const queue = [];
const scheduler = { request: (cb) => queue.push(cb), cancel() { queue.length = 0; } };
const flush = () => { for (const cb of queue.splice(0)) cb(); };
const label = text({}, "abc");
const root = box({ width: 8, height: 3, border: "single", title: "ab" }, label);
const r = new ConsoleRenderer({ root, console: new FakeConsole(), scheduler, viewport: { width: 8, height: 3 }, input: false, registerGlobal: false });
const row = () => r.buffer.toPlainString(true).split("\\n").slice(0, 2).join("\\n");
const out = {};
r.renderNow();
out.ltr = { row: row(), loading: bidiLoading() !== null };
label.children[0].setText("שלום");
root.updateProps({ ...root.props, title: "עב" });
r.renderNow();
const pending = bidiLoading();
out.before = { row: row(), loading: pending !== null, queued: queue.length };
await pending;
out.queuedAfterLoad = queue.length;
flush();
out.after = { row: row(), loading: bidiLoading() !== null };
console.log(JSON.stringify(out));
r.dispose();
`,
    );
    const proc = Bun.spawnSync([process.execPath, `--conditions=${CONDITION}`, script], { cwd: dir, stderr: "pipe" });
    expect(proc.stderr.toString()).toBe("");
    expect(JSON.parse(proc.stdout.toString())).toEqual({
      ltr: { row: "┌─ ab ─┐\n│abc   │", loading: false },
      before: { row: "┌─ עב ─┐\n│שלום  │", loading: true, queued: 0 },
      queuedAfterLoad: 1,
      after: { row: "┌─ בע ─┐\n│םולש  │", loading: false },
    });
  }, 30_000);

  test("loadBidi() before the first render: right-to-left text paints in display order from the first frame", () => {
    const src = (p: string): string => JSON.stringify(join(CORE, p));
    const script = join(dir, "preload.ts");
    writeFileSync(
      script,
      `import { readFileSync } from "node:fs";
import { ConsoleRenderer, initYoga, loadBidi } from ${src("src/index.ts")};
import { bidiLoading } from ${src("src/internal.ts")};
import { box, FakeConsole, text } from ${src("test/fixtures.ts")};
await Promise.all([initYoga({ wasm: readFileSync(${src("yoga.wasm")}) }), loadBidi()]);
const queue = [];
const r = new ConsoleRenderer({ root: box({ width: 8, height: 1 }, text({}, "שלום")), console: new FakeConsole(), scheduler: { request: (cb) => queue.push(cb), cancel() {} }, viewport: { width: 8, height: 1 }, input: false, registerGlobal: false });
r.renderNow();
console.log(JSON.stringify({ row: r.buffer.toPlainString(true), loading: bidiLoading() !== null, queued: queue.length }));
r.dispose();
`,
    );
    const proc = Bun.spawnSync([process.execPath, `--conditions=${CONDITION}`, script], { cwd: dir, stderr: "pipe" });
    expect(proc.stderr.toString()).toBe("");
    expect(JSON.parse(proc.stdout.toString())).toEqual({ row: "םולש", loading: false, queued: 0 });
  }, 30_000);

  test("vite build splits the bidi engine and its tables into their own chunk", async () => {
    mkdirSync(join(dir, "app/node_modules/@textjs"), { recursive: true });
    symlinkSync(CORE, join(dir, "app/node_modules/@textjs/core"));
    writeFileSync(join(dir, "app/index.html"), `<!doctype html><script type="module" src="/main.ts"></script>`);
    writeFileSync(
      join(dir, "app/main.ts"),
      `import { CellBuffer, computeLayout, createNode, createRawText, initYoga, paintScene } from "@textjs/core";
initYoga().then(() => {
  const t = createNode("text");
  t.appendChild(createRawText("hello"));
  computeLayout(t, 10, 1);
  const b = new CellBuffer(10, 1);
  paintScene(t, b);
  console.log(b.toPlainString());
});
`,
    );
    const { build, defaultClientConditions } = await import("vite");
    const chunks = async (conditions: string[]): Promise<Array<{ name: string; code: string }>> => {
      const root = join(dir, "app");
      rmSync(join(root, "dist"), { recursive: true, force: true });
      await build({ root, configFile: false, logLevel: "silent", build: { target: "es2022" }, resolve: { conditions: [...conditions, ...defaultClientConditions] } });
      const assets = join(root, "dist/assets");
      return readdirSync(assets)
        .filter((f) => f.endsWith(".js"))
        .map((name) => ({ name, code: readFileSync(join(assets, name), "utf8") }));
    };
    const eager = await chunks([]);
    expect(eager.length).toBe(1);
    expect(eager[0]?.code).toContain(BIDI_DATA);
    const lazy = await chunks([CONDITION]);
    const entry = lazy.find((c) => c.name.startsWith("index-"));
    const bidi = lazy.find((c) => c.name.startsWith("bidi-"));
    expect(entry?.code).not.toContain(BIDI_DATA);
    expect(entry?.code).toContain(`import("./${bidi?.name}")`);
    expect(bidi?.code).toContain(BIDI_DATA);
  }, 60_000);
});
