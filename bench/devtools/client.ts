import {
  CellBuffer,
  CssConsoleDriver,
  createNode,
  createRawText,
  initYoga,
  paintScene,
  type ConsoleTarget,
  type SceneNode,
  type SceneNodeProps,
} from "../../packages/core/src/index";

export interface StreamOptions {
  strategy: string;
  fps: number;
  durationMs: number;
  cols: number;
  rows: number;
  scheduler: "timer" | "raf";
  coalesce: boolean;
  dirtyMode: "all" | "partial";
}

export interface PageStreamResult {
  strategy: string;
  targetFps: number;
  durationMs: number;
  actualDurationMs: number;
  emittedFrames: number;
  actualFps: number;
  clearsCalled: number;
  logsCalled: number;
  dirtyRowsMean: number;
  spanCountMean: number;
  cssBytesMean: number;
  layoutPaintMs: MetricSummary;
  encodeMs: MetricSummary;
  consoleCallMs: MetricSummary;
  totalFrameMs: MetricSummary;
  frameEmitEpochs: number[];
}

export interface MetricSummary {
  mean: number;
  p50: number;
  p95: number;
  max: number;
}

function summarize(samples: number[]): MetricSummary {
  if (samples.length === 0) return { mean: 0, p50: 0, p95: 0, max: 0 };
  const sorted = samples.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    mean: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function box(props: SceneNodeProps = {}, ...children: SceneNode[]): SceneNode {
  const n = createNode("box", props);
  for (const c of children) n.appendChild(c);
  return n;
}

function text(props: SceneNodeProps, ...content: Array<string | SceneNode>): SceneNode {
  const n = createNode("text", props);
  for (const c of content) n.appendChild(typeof c === "string" ? createRawText(c) : c);
  return n;
}

interface DynamicDashboard {
  root: SceneNode;
  headerLeft: SceneNode;
  headerRight: SceneNode;
  sidebarRows: Array<{ node: SceneNode; label: SceneNode }>;
  messageRows: Array<{ body: SceneNode; diff: SceneNode }>;
  conversationBox: SceneNode;
  inputBox: SceneNode;
  inputText: SceneNode;
  statusText: SceneNode;
  updateFrame(frameId: number, epochMs: number, strategy: string, fps: number, dirtyMode: "all" | "partial"): void;
}

const PALETTE_FG = ["#fafafa", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#a855f7", "#06b6d4", "#eab308"];
const PALETTE_BG = ["#18181b", "#27272a", "#1e1b4b", "#052e16", "#172554", "#3b0764"];
const SPINNERS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function buildDynamicDashboard(): DynamicDashboard {
  const headerLeft = createRawText("▼ OpenCode Lite · FRAME:000000 · T:0.0");
  const headerRight = createRawText("claude-sonnet · 42.1k tok · $0.12");

  const sidebarRows: Array<{ node: SceneNode; label: SceneNode }> = [];
  for (let i = 0; i < 24; i++) {
    const label = createRawText(
      `${i === 3 ? "▶" : " "} session-${i.toString().padStart(2, "0")} · refactor renderer #000`,
    );
    const node = text(
      {
        wrap: "truncate-end",
        fg: i === 3 ? "#fafafa" : "#a1a1aa",
        bg: i === 3 ? "#27272a" : undefined,
        bold: i === 3,
      },
      label,
    );
    sidebarRows.push({ node, label });
  }

  const messageRows: Array<{ body: SceneNode; diff: SceneNode }> = [];
  const messages: SceneNode[] = [];
  for (let i = 0; i < 18; i++) {
    const body = createRawText(
      `Message ${i.toString().padStart(2, "0")}: Streaming token chunk #0000 — CssConsoleDriver RLE pipeline `,
    );
    const diff = createRawText("(+42 −7)");
    messages.push(
      text(
        { fg: "#d4d4d8", wrap: "truncate-end" },
        text({ fg: i % 2 ? "#22c55e" : "#3b82f6", bold: true }, i % 2 ? "assistant " : "user      "),
        body,
        text({ fg: "#f59e0b", italic: true }, diff),
        " 🚀",
      ),
    );
    messageRows.push({ body, diff });
  }

  const inputText = createRawText("> benchmark ready");
  const statusText = createRawText("▼ Text.js 0.4.0 (Turbolog) · ready");

  const conversationBox = box(
    {
      flexGrow: 1,
      flexDirection: "column",
      border: "single",
      borderColor: "#3f3f46",
      title: "Conversation",
      overflow: "scroll",
      scrollY: 0,
      paddingX: 1,
    },
    ...messages,
  );

  const inputBox = box(
    { height: 3, border: "rounded", borderColor: "#22c55e", paddingX: 1 },
    text({ fg: "#fafafa", wrap: "truncate-end" }, inputText),
  );

  const root = box(
    { flexDirection: "column", width: "100%", height: "100%", bg: "#09090b" },
    box(
      { height: 1, flexDirection: "row", justifyContent: "space-between", bg: "#18181b", paddingX: 1 },
      text({ bold: true, fg: "#fafafa", wrap: "nowrap" }, headerLeft),
      text({ fg: "#a1a1aa", wrap: "nowrap" }, headerRight),
    ),
    box(
      { flexGrow: 1, flexBasis: 0, flexDirection: "row" },
      box(
        {
          width: 32,
          flexDirection: "column",
          border: "rounded",
          borderColor: "#3f3f46",
          title: "Sessions",
          titleColor: "#a1a1aa",
          overflow: "hidden",
        },
        ...sidebarRows.map((r) => r.node),
      ),
      conversationBox,
    ),
    inputBox,
    box({ height: 1, bg: "#27272a", paddingX: 1 }, text({ fg: "#a1a1aa", wrap: "truncate-end" }, statusText)),
  );

  const updateFrame = (
    frameId: number,
    epochMs: number,
    strategy: string,
    fps: number,
    dirtyMode: "all" | "partial",
  ): void => {
    const fStr = String(frameId).padStart(6, "0");
    const tStr = epochMs.toFixed(1);
    const spin = SPINNERS[frameId % SPINNERS.length] ?? "⠋";
    headerLeft.setText(`▼ OpenCode Lite · FRAME:${fStr} · T:${tStr}`);
    const tokens = (42.1 + frameId * 0.13).toFixed(1);
    const cost = (0.12 + frameId * 0.0004).toFixed(3);
    headerRight.setText(`${spin} ${tokens}k tok · $${cost}`);

    inputText.setText(
      `> [${spin}] streaming frame #${fStr} (${strategy} @ ${fps}fps) ${"█".repeat((frameId % 8) + 1)}`,
    );
    statusText.setText(
      `▼ Text.js 0.4.0 (Turbolog) · FRAME:${fStr} · strategy=${strategy} · target=${fps}fps`,
    );

    if (dirtyMode === "all") {
      const activeIdx = frameId % sidebarRows.length;
      for (let i = 0; i < sidebarRows.length; i++) {
        const s = sidebarRows[i]!;
        const isAct = i === activeIdx;
        const metric = ((frameId * 7 + i * 13) % 999).toString().padStart(3, "0");
        s.label.setText(`${isAct ? "▶" : " "} session-${i.toString().padStart(2, "0")} · ${metric}ms`);
        s.node.updateProps({
          wrap: "truncate-end",
          fg: isAct ? "#fafafa" : PALETTE_FG[(i + frameId) % PALETTE_FG.length],
          bg: isAct ? PALETTE_BG[frameId % PALETTE_BG.length] : undefined,
          bold: isAct,
        });
      }
      for (let i = 0; i < messageRows.length; i++) {
        const m = messageRows[i]!;
        const tok = ((frameId * 19 + i * 31) % 9999).toString().padStart(4, "0");
        m.body.setText(`Msg ${i.toString().padStart(2, "0")}: chunk #${tok} · latency ${(frameId + i) % 17}ms `);
        m.diff.setText(`(+${(frameId + i * 3) % 99} −${(frameId + i) % 29})`);
      }
      inputBox.updateProps({
        height: 3,
        border: "rounded",
        borderColor: PALETTE_FG[(frameId % (PALETTE_FG.length - 1)) + 1],
        paddingX: 1,
      });
    }
  };

  return {
    root,
    headerLeft,
    headerRight,
    sidebarRows,
    messageRows,
    conversationBox,
    inputBox,
    inputText,
    statusText,
    updateFrame,
  };
}

export interface ParsedStrategy {
  raw: string;
  mode: "clear" | "noclear" | "clearEvery" | "group" | "info" | "debug" | "native";
  everyN: number;
  /** Passed to the driver; `"append"` (with curtain) for the native strategy. */
  driverClearOption: boolean | "append";
}

export function parseStrategy(raw: string): ParsedStrategy {
  const trimmed = (raw || "clear").trim();
  const lower = trimmed.toLowerCase();
  if (lower === "clear" || lower === "clear+log") {
    return { raw: trimmed, mode: "clear", everyN: 1, driverClearOption: true };
  }
  if (lower === "native" || lower === "native-nocurtain") {
    return { raw: lower, mode: "native", everyN: 0, driverClearOption: "append" };
  }
  if (lower === "noclear" || lower === "log-only" || lower === "log" || lower === "append") {
    return { raw: trimmed, mode: "noclear", everyN: 0, driverClearOption: false };
  }
  const everyMatch = lower.match(/^clearevery(?:[=:_]?(\d+))?$/);
  if (everyMatch) {
    const n = Math.max(1, Number.parseInt(everyMatch[1] || "60", 10) || 60);
    return { raw: `clearEvery=${n}`, mode: "clearEvery", everyN: n, driverClearOption: true };
  }
  if (lower === "group") {
    return { raw: "group", mode: "group", everyN: 0, driverClearOption: true };
  }
  if (lower === "info") {
    return { raw: "info", mode: "info", everyN: 1, driverClearOption: true };
  }
  if (lower === "debug") {
    return { raw: "debug", mode: "debug", everyN: 1, driverClearOption: true };
  }
  return { raw: trimmed, mode: "clear", everyN: 1, driverClearOption: true };
}

class InstrumentedConsoleTarget implements ConsoleTarget {
  private readonly parsed: ParsedStrategy;
  private frameCounter = 0;
  clearsCalled = 0;
  logsCalled = 0;
  lastCallMs = 0;
  private pendingClearMs = 0;

  constructor(parsed: ParsedStrategy) {
    this.parsed = parsed;
  }

  resetStats(): void {
    this.frameCounter = 0;
    this.clearsCalled = 0;
    this.logsCalled = 0;
    this.lastCallMs = 0;
    this.pendingClearMs = 0;
  }

  clear(): void {
    const nextFrame = this.frameCounter + 1;
    const mode = this.parsed.mode;
    let shouldClear = false;
    if (mode === "clear" || mode === "info" || mode === "debug" || mode === "group" || mode === "native") {
      shouldClear = true;
    } else if (mode === "clearEvery") {
      shouldClear = this.parsed.everyN <= 1 ? true : nextFrame > 1 && (nextFrame - 1) % this.parsed.everyN === 0;
    } else if (mode === "noclear") {
      shouldClear = false;
    }

    if (!shouldClear) {
      this.pendingClearMs = 0;
      return;
    }
    const t0 = performance.now();
    console.clear();
    this.pendingClearMs = performance.now() - t0;
    this.clearsCalled++;
  }

  log(...args: unknown[]): void {
    this.frameCounter++;
    const t0 = performance.now();
    const mode = this.parsed.mode;
    if (mode === "group") {
      console.group("frame");
      console.log(...args);
      console.groupEnd();
    } else if (mode === "info") {
      console.info(...args);
    } else if (mode === "debug") {
      console.debug(...args);
    } else {
      console.log(...args);
    }
    const logMs = performance.now() - t0;
    this.lastCallMs = this.pendingClearMs + logMs;
    this.pendingClearMs = 0;
    this.logsCalled++;
  }
}

function readQueryOptions(): StreamOptions & { autostart: boolean } {
  const params = new URLSearchParams(window.location.search);
  let strategy = params.get("strategy") || "clear";
  const explicitEvery = params.get("clearEvery") || params.get("n");
  if (strategy.toLowerCase() === "clearevery" && explicitEvery) {
    strategy = `clearEvery=${explicitEvery}`;
  }
  const fps = Math.max(1, Number.parseFloat(params.get("fps") || "60") || 60);
  const seconds = Math.max(0.5, Number.parseFloat(params.get("seconds") || "5") || 5);
  const cols = Math.max(40, Number.parseInt(params.get("cols") || "100", 10) || 100);
  const rows = Math.max(12, Number.parseInt(params.get("rows") || "32", 10) || 32);
  const scheduler = (params.get("scheduler") === "raf" ? "raf" : "timer") as "timer" | "raf";
  const coalesce = params.get("coalesce") !== "0" && params.get("coalesce") !== "false";
  const dirtyMode = (params.get("dirty") === "partial" ? "partial" : "all") as "all" | "partial";
  const autostart = params.get("autostart") === "1" || params.get("autostart") === "true";

  return {
    strategy,
    fps,
    durationMs: seconds * 1000,
    cols,
    rows,
    scheduler,
    coalesce,
    dirtyMode,
    autostart,
  };
}

declare global {
  interface Window {
    __benchReady?: boolean;
    __latestEmittedFrame?: number;
    __emitWarmupFrame?: (overrides?: Partial<StreamOptions>) => { frameId: number; epochMs: number; spanCount: number };
    __runStream?: (overrides?: Partial<StreamOptions>) => Promise<PageStreamResult>;
  }
}

async function boot(): Promise<void> {
  await initYoga();
  const dashboard = buildDynamicDashboard();
  const defaults = readQueryOptions();
  const statusEl = document.getElementById("status");

  window.__latestEmittedFrame = 0;

  window.__emitWarmupFrame = (overrides: Partial<StreamOptions> = {}) => {
    const opts = { ...defaults, ...overrides };
    const buf = new CellBuffer(opts.cols, opts.rows);
    const epochMs = performance.timeOrigin + performance.now();
    dashboard.updateFrame(0, epochMs, opts.strategy, opts.fps, opts.dirtyMode);
    dashboard.root.calculateLayout(opts.cols, opts.rows);
    paintScene(dashboard.root, buf);
    console.clear();
    const driver = new CssConsoleDriver({
      console: {
        clear: () => {},
        log: (...args: unknown[]) => console.log(...args),
      },
      clear: false,
      coalesceWhitespace: opts.coalesce,
    });
    const res = driver.render(buf, { force: true });
    window.__latestEmittedFrame = 0;
    if (statusEl) {
      statusEl.textContent = `Warmup frame emitted (${res.spanCount} %c spans, ${opts.cols}×${opts.rows})`;
    }
    return { frameId: 0, epochMs, spanCount: res.spanCount };
  };

  window.__runStream = (overrides: Partial<StreamOptions> = {}) => {
    const opts = { ...defaults, ...overrides };
    const parsed = parseStrategy(opts.strategy);
    const target = new InstrumentedConsoleTarget(parsed);
    const driver = new CssConsoleDriver({
      console: target,
      clear: parsed.driverClearOption,
      curtain: parsed.raw === "native",
      coalesceWhitespace: opts.coalesce,
    });
    const buf = new CellBuffer(opts.cols, opts.rows);

    const layoutPaintSamples: number[] = [];
    const encodeSamples: number[] = [];
    const consoleCallSamples: number[] = [];
    const totalFrameSamples: number[] = [];
    const frameEmitEpochs: number[] = [performance.timeOrigin + performance.now()];
    let totalDirtyRows = 0;
    let totalSpans = 0;
    let totalCssBytes = 0;
    let frameId = 0;

    // Prime driver's row cache with warmup frame 0 without emitting to console
    dashboard.updateFrame(0, frameEmitEpochs[0]!, parsed.raw, opts.fps, opts.dirtyMode);
    dashboard.root.calculateLayout(opts.cols, opts.rows);
    paintScene(dashboard.root, buf);
    driver.encode(buf, { force: true });
    target.resetStats();

    return new Promise<PageStreamResult>((resolve) => {
      const startPerf = performance.now();
      const intervalMs = 1000 / opts.fps;

      const emitOneFrame = (): void => {
        frameId++;
        const f0 = performance.now();
        const emitEpoch = performance.timeOrigin + f0;

        dashboard.updateFrame(frameId, emitEpoch, parsed.raw, opts.fps, opts.dirtyMode);
        dashboard.root.calculateLayout(opts.cols, opts.rows);
        paintScene(dashboard.root, buf);
        const afterPaint = performance.now();

        const res = driver.render(buf, { force: true });
        const afterRender = performance.now();

        const lpMs = afterPaint - f0;
        const callMs = target.lastCallMs;
        const pureEncodeMs = Math.max(0, res.encodeMs - callMs);
        const totalMs = afterRender - f0;

        layoutPaintSamples.push(lpMs);
        encodeSamples.push(pureEncodeMs);
        consoleCallSamples.push(callMs);
        totalFrameSamples.push(totalMs);
        frameEmitEpochs.push(emitEpoch);

        totalDirtyRows += res.dirtyRows;
        totalSpans += res.spanCount;
        if (res.frame) {
          let bytes = res.frame.format.length;
          for (let i = 0; i < res.frame.args.length; i++) bytes += res.frame.args[i]!.length;
          totalCssBytes += bytes;
        }
        window.__latestEmittedFrame = frameId;
      };

      const finish = (): void => {
        const actualDurationMs = performance.now() - startPerf;
        const n = Math.max(1, frameId);
        const result: PageStreamResult = {
          strategy: parsed.raw,
          targetFps: opts.fps,
          durationMs: opts.durationMs,
          actualDurationMs,
          emittedFrames: frameId,
          actualFps: (frameId / actualDurationMs) * 1000,
          clearsCalled: target.clearsCalled,
          logsCalled: target.logsCalled,
          dirtyRowsMean: totalDirtyRows / n,
          spanCountMean: totalSpans / n,
          cssBytesMean: totalCssBytes / n,
          layoutPaintMs: summarize(layoutPaintSamples),
          encodeMs: summarize(encodeSamples),
          consoleCallMs: summarize(consoleCallSamples),
          totalFrameMs: summarize(totalFrameSamples),
          frameEmitEpochs,
        };
        if (statusEl) {
          statusEl.textContent = `Done: ${result.emittedFrames} frames (${result.actualFps.toFixed(1)} fps), clears=${result.clearsCalled}, logs=${result.logsCalled}`;
        }
        resolve(result);
      };

      if (opts.scheduler === "raf") {
        const onRaf = (): void => {
          if (performance.now() - startPerf >= opts.durationMs) {
            finish();
            return;
          }
          emitOneFrame();
          requestAnimationFrame(onRaf);
        };
        requestAnimationFrame(onRaf);
      } else {
        const onTick = (): void => {
          const elapsed = performance.now() - startPerf;
          if (elapsed >= opts.durationMs) {
            finish();
            return;
          }
          emitOneFrame();
          const nextTarget = startPerf + frameId * intervalMs;
          const waitMs = Math.max(0, nextTarget - performance.now());
          setTimeout(onTick, waitMs);
        };
        onTick();
      }
    });
  };

  window.__benchReady = true;
  if (statusEl) {
    statusEl.textContent = `Ready (strategy=${defaults.strategy}, fps=${defaults.fps}, duration=${defaults.durationMs}ms)`;
  }

  if (defaults.autostart) {
    window.__emitWarmupFrame();
    setTimeout(() => {
      void window.__runStream?.();
    }, 200);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void boot();
}
