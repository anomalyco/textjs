import { beforeAll, describe, expect, test } from "bun:test";
import { CellBuffer, CssConsoleDriver, initYoga, paintScene, type SceneNode } from "../src/index";
import { buildDashboard, FakeConsole } from "./fixtures";

const COLS = 100;
const ROWS = 32;
const WARMUP = 200;
const ITERATIONS = 1000;

beforeAll(async () => {
  await initYoga();
});

function textLeaves(node: SceneNode, out: SceneNode[] = []): SceneNode[] {
  if (node.type !== "box" && node.yoga !== null) out.push(node);
  for (const c of node.children) textLeaves(c, out);
  return out;
}

function bench(fn: (i: number) => void): { mean: number; p50: number; p95: number } {
  for (let i = 0; i < WARMUP; i++) fn(i);
  const samples = new Float64Array(ITERATIONS);
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    fn(WARMUP + i);
    samples[i] = performance.now() - t0;
  }
  const sorted = Array.from(samples).sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { mean, p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0 };
}

function fmt(r: { mean: number; p50: number; p95: number }): string {
  return `mean ${r.mean.toFixed(3)}ms · p50 ${r.p50.toFixed(3)}ms · p95 ${r.p95.toFixed(3)}ms`;
}

describe("performance (100×32 dashboard)", () => {
  test("full frame render (layout + paint + RLE) re-encodes every row, one log per frame", () => {
    const { root } = buildDashboard();
    const leaves = textLeaves(root);
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con });
    const buf = new CellBuffer(COLS, ROWS);
    let spans = 0;
    const r = bench(() => {
      for (const n of leaves) n.yoga?.markDirty();
      root.calculateLayout(COLS, ROWS, true);
      paintScene(root, buf);
      driver.invalidate();
      const res = driver.render(buf);
      spans = res.spanCount;
      if (res.dirtyRows !== ROWS) throw new Error("expected a full re-encode");
    });
    console.info(`[bench] full frame (${leaves.length} text nodes, ${root.countYogaNodes()} yoga nodes, ${spans} %c spans): ${fmt(r)}`);
    expect(con.clears).toBe(WARMUP + ITERATIONS);
    expect(con.logs.length).toBe(WARMUP + ITERATIONS);
  });

  test("cold relayout (viewport width changes every frame) for reference", () => {
    const { root } = buildDashboard();
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con });
    const buf = new CellBuffer(COLS, ROWS);
    const r = bench((i) => {
      const w = i % 2 === 0 ? COLS : COLS - 1;
      buf.resize(w, ROWS);
      root.calculateLayout(w, ROWS, true);
      paintScene(root, buf);
      driver.render(buf);
    });
    console.info(`[bench] cold relayout + resize + full encode: ${fmt(r)}`);
  });

  test("1-row partial edit (typing) re-encodes only that row", () => {
    const { root, input } = buildDashboard();
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con });
    const buf = new CellBuffer(COLS, ROWS);
    root.calculateLayout(COLS, ROWS);
    paintScene(root, buf);
    driver.render(buf);
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let typed = "";
    let maxDirty = 0;
    const r = bench((i) => {
      typed = typed.length > 60 ? "" : typed + (alphabet[i % 26] ?? "x");
      input.setText(`> ${typed}`);
      root.calculateLayout(COLS, ROWS);
      paintScene(root, buf);
      const res = driver.render(buf);
      if (res.dirtyRows > maxDirty) maxDirty = res.dirtyRows;
    });
    console.info(`[bench] 1-row partial edit: ${fmt(r)} (max dirty rows ${maxDirty})`);
    expect(maxDirty).toBe(1);
  });

  test("whitespace coalescing cuts %c spans and CSS bytes with identical text", () => {
    const { root } = buildDashboard();
    const buf = new CellBuffer(COLS, ROWS);
    root.calculateLayout(COLS, ROWS);
    paintScene(root, buf);
    const measure = (coalesceWhitespace: boolean) => {
      const con = new FakeConsole();
      new CssConsoleDriver({ console: con, coalesceWhitespace }).render(buf);
      const { format, args } = con.last;
      return { spans: args.length, cssBytes: args.reduce((n, a) => n + a.length, 0), text: format.replaceAll("%c", "") };
    };
    const legacyCss = 'font-family:ui-monospace,"SF Mono",Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:14px;margin:-1px 0;font-variant-ligatures:none;padding:1px 0;';
    const compactCss = 'font:12px/14px ui-monospace,"SF Mono",Menlo,Monaco,Consolas,monospace;margin:-1px 0;padding:1px 0;';
    const off = measure(false);
    const on = measure(true);
    const legacyBytes = off.cssBytes + off.spans * (legacyCss.length - compactCss.length);
    const cut = 1 - on.spans / off.spans;
    console.info(
      `[bench] %c spans ${off.spans} → ${on.spans} (−${(cut * 100).toFixed(0)}%) · css ${(legacyBytes / 1024).toFixed(1)}KB → ${(on.cssBytes / 1024).toFixed(1)}KB (−${((1 - on.cssBytes / legacyBytes) * 100).toFixed(0)}%)`,
    );
    expect(on.text).toBe(off.text);
    expect(cut).toBeGreaterThan(0.25);
  });

  test("unchanged frame makes zero console calls", () => {
    const { root } = buildDashboard();
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con });
    const buf = new CellBuffer(COLS, ROWS);
    root.calculateLayout(COLS, ROWS);
    paintScene(root, buf);
    driver.render(buf);
    con.clears = 0;
    con.logs = [];
    const r = bench(() => {
      root.calculateLayout(COLS, ROWS);
      paintScene(root, buf);
      const res = driver.render(buf);
      if (!res.skipped) throw new Error("idle frame was not skipped");
    });
    console.info(`[bench] idle frame (skipped): ${fmt(r)}`);
    expect(con.clears).toBe(0);
    expect(con.logs.length).toBe(0);
  });

  test("LTR frames never enter the bidi path; RTL frames isolate their runs", () => {
    const { root } = buildDashboard();
    const leaves = textLeaves(root);
    root.calculateLayout(COLS, ROWS);
    for (const n of leaves) expect(n.getTextModel().needsBidi).toBe(false);
    const ltr = new FakeConsole();
    const buf = new CellBuffer(COLS, ROWS);
    paintScene(root, buf);
    new CssConsoleDriver({ console: ltr }).render(buf);
    expect(ltr.last.format).not.toContain("\u202D");

    // Same scene with every text leaf in Hebrew/Arabic: full layout + bidi + paint + encode.
    const words = ["שלום עולם (בדיקה) 42", "مرحبا بالعالم ١٢٣", "abc שלום def"];
    leaves.forEach((n, i) => {
      const raw = n.children[0];
      if (raw !== undefined && raw.type === "raw-text") raw.setText(words[i % words.length] as string);
    });
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con });
    const r = bench((i) => {
      // Alternate the text so every frame re-segments, re-resolves and re-reorders every leaf.
      leaves.forEach((n, j) => {
        const raw = n.children[0];
        if (raw !== undefined && raw.type === "raw-text") raw.setText(`${words[j % words.length] as string}${i % 2 === 0 ? "" : "!"}`);
      });
      root.calculateLayout(COLS, ROWS, true);
      paintScene(root, buf);
      driver.invalidate();
      driver.render(buf);
    });
    console.info(`[bench] RTL full frame (${leaves.length} bidi text nodes): ${fmt(r)}`);
    expect(con.last.format).toContain("\u202D");
  });
});
