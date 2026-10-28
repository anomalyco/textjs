/**
 * The Status page's live benchmark: the real @textjs/core pipeline (Yoga layout, paint, RLE
 * encode) on the 100×32 dashboard from `packages/core/test/fixtures.ts`, in the visitor's
 * browser. Frames go to an in-memory console, so nothing is logged to DevTools.
 */

import type { ConsoleTarget, SceneNode, SceneNodeProps } from "@textjs/core";

export const BENCH_COLS = 100;
export const BENCH_ROWS = 32;

export interface Summary {
  mean: number;
  p50: number;
  p95: number;
}

export interface BenchResult {
  fullFrame: Summary;
  typing: Summary;
  idle: Summary;
  spans: number;
  idleConsoleCalls: number;
  frames: number;
}

/** Frames timed together per sample: browsers coarsen `performance.now()` to as much as 100µs. */
const BATCH = 10;
const WARMUP_BATCHES = 20;
const SAMPLES = 100;

class MemoryConsole implements ConsoleTarget {
  calls = 0;
  clear(): void {
    this.calls++;
  }
  log(): void {
    this.calls++;
  }
}

function summarize(samples: number[]): Summary {
  const sorted = samples.slice().sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
  return { mean, p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0 };
}

const yieldToBrowser = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export async function runPipelineBench(onProgress?: (done: number) => void): Promise<BenchResult> {
  const core = await import("@textjs/core");
  await core.initYoga();
  const { CellBuffer, CssConsoleDriver, createNode, createRawText, paintScene } = core;

  const box = (props: SceneNodeProps = {}, ...children: SceneNode[]): SceneNode => {
    const n = createNode("box", props);
    for (const c of children) n.appendChild(c);
    return n;
  };
  const text = (props: SceneNodeProps, ...content: Array<string | SceneNode>): SceneNode => {
    const n = createNode("text", props);
    for (const c of content) n.appendChild(typeof c === "string" ? createRawText(c) : c);
    return n;
  };

  const sessions: SceneNode[] = [];
  for (let i = 0; i < 24; i++) {
    sessions.push(
      text(
        { wrap: "truncate-end", fg: i === 3 ? "#fafafa" : "#a1a1aa", bg: i === 3 ? "#27272a" : undefined, bold: i === 3 },
        `${i === 3 ? "▶" : " "} session-${i.toString().padStart(2, "0")} · refactor the renderer pipeline`,
      ),
    );
  }
  const messages: SceneNode[] = [];
  for (let i = 0; i < 18; i++) {
    messages.push(
      text(
        { fg: "#d4d4d8" },
        text({ fg: i % 2 ? "#22c55e" : "#3b82f6", bold: true }, i % 2 ? "assistant " : "user "),
        `Message ${i}: Updated packages/core/src/scene.ts — 100% of frames now render in one console.log call `,
        text({ fg: "#f59e0b", italic: true }, "(+42 −7)"),
        " 你好 🚀",
      ),
    );
  }
  const input = createRawText("> type here");
  const root = box(
    { flexDirection: "column", width: "100%", height: "100%", bg: "#09090b" },
    box(
      { height: 1, flexDirection: "row", justifyContent: "space-between", bg: "#18181b", paddingX: 1 },
      text({ bold: true, fg: "#fafafa" }, "▼ OpenCode Lite"),
      text({ fg: "#71717a" }, "anthropic/claude · 42.1k tokens · $0.12"),
    ),
    box(
      { flexGrow: 1, flexBasis: 0, flexDirection: "row" },
      box({ width: 30, flexDirection: "column", border: "rounded", borderColor: "#3f3f46", title: "Sessions", titleColor: "#a1a1aa", overflow: "hidden" }, ...sessions),
      box({ flexGrow: 1, flexDirection: "column", border: "single", borderColor: "#3f3f46", title: "Conversation", overflow: "scroll", scrollY: 4, paddingX: 1 }, ...messages),
    ),
    box({ height: 3, border: "rounded", borderColor: "#22c55e", paddingX: 1 }, text({ fg: "#fafafa" }, input)),
    box({ height: 1, bg: "#27272a", paddingX: 1 }, text({ fg: "#a1a1aa" }, "▼ Text.js 0.4.0 (Turbolog)  ·  ready")),
  );

  const leaves: SceneNode[] = [];
  const collect = (n: SceneNode): void => {
    if (n.type !== "box" && n.yoga !== null) leaves.push(n);
    for (const c of n.children) collect(c);
  };
  collect(root);

  const con = new MemoryConsole();
  const driver = new CssConsoleDriver({ console: con });
  const buf = new CellBuffer(BENCH_COLS, BENCH_ROWS);
  let spans = 0;
  let frames = 0;
  const total = 3 * (WARMUP_BATCHES + SAMPLES);
  let done = 0;

  const measure = async (frame: (i: number) => void): Promise<Summary> => {
    const samples: number[] = [];
    let i = 0;
    for (let s = 0; s < WARMUP_BATCHES + SAMPLES; s++) {
      const t0 = performance.now();
      for (let b = 0; b < BATCH; b++) frame(i++);
      const dt = (performance.now() - t0) / BATCH;
      frames += BATCH;
      if (s >= WARMUP_BATCHES) samples.push(dt);
      done++;
      if (s % 5 === 4) {
        onProgress?.(done / total);
        await yieldToBrowser();
      }
    }
    return summarize(samples);
  };

  // Full frame: force relayout of every text node, repaint, re-encode all 32 rows.
  const fullFrame = await measure(() => {
    for (const n of leaves) n.yoga?.markDirty();
    root.calculateLayout(BENCH_COLS, BENCH_ROWS, true);
    paintScene(root, buf);
    driver.invalidate();
    spans = driver.render(buf).spanCount;
  });

  // Typing: one character changes in the input row.
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let typed = "";
  const typing = await measure((i) => {
    typed = typed.length > 60 ? "" : typed + (alphabet[i % 26] ?? "x");
    input.setText(`> ${typed}`);
    root.calculateLayout(BENCH_COLS, BENCH_ROWS);
    paintScene(root, buf);
    driver.render(buf);
  });

  // Idle: nothing changed, so the driver must not call the console.
  root.calculateLayout(BENCH_COLS, BENCH_ROWS);
  paintScene(root, buf);
  driver.render(buf);
  con.calls = 0;
  const idle = await measure(() => {
    root.calculateLayout(BENCH_COLS, BENCH_ROWS);
    paintScene(root, buf);
    driver.render(buf);
  });

  onProgress?.(1);
  return { fullFrame, typing, idle, spans, idleConsoleCalls: con.calls, frames };
}
