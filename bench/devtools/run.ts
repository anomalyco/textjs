import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { chromium } from "playwright-core";
import { parseStrategy, type MetricSummary, type PageStreamResult } from "./client";
import {
  analyzeScreencastFrames,
  runFrontendProbe,
  summarizeNumbers,
  waitForWarmupFrameInDevTools,
  type ScreencastAnalysis,
  type ScreencastCapture,
} from "./frontend-probe";
import { startBenchServer } from "./server";

export interface CliOptions {
  strategies: string[];
  fpsList: number[];
  seconds: number;
  headed: boolean;
  all: boolean;
  screencast: boolean;
  scheduler: "timer" | "raf";
  dirtyMode: "all" | "partial";
  cols: number;
  rows: number;
  executablePath?: string;
  json: boolean;
}

export interface BenchmarkRunMetrics {
  strategy: string;
  targetFps: number;
  durationSec: number;
  page: {
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
  };
  frontend: {
    totalRafPaints: number;
    validPaints: number;
    blankPaints: number;
    emptyDomPaints: number;
    clearedOnlyPaints: number;
    incompletePaints: number;
    blankPaintPct: number;
    distinctFramesPainted: number;
    droppedFrames: number;
    droppedFramePct: number;
    effectiveConsoleFps: number;
    lagFrames: MetricSummary;
    lagMs: MetricSummary;
    rafIntervalMs: MetricSummary;
    rafJankOver34Ms: number;
    rafJankOver50Ms: number;
    longTaskCount: number;
    longTaskTotalMs: number;
    longTaskMaxMs: number;
    mountedWrappersEnd: number;
    mountedWrappersMax: number;
    mountedWrappersMean: number;
    consoleScrollHeightEnd: number;
    screencast: ScreencastAnalysis;
  };
  cdpCpu: {
    taskDurationMs: number;
    taskBusyPct: number;
    scriptDurationMs: number;
    scriptBusyPct: number;
    layoutDurationMs: number;
    layoutCount: number;
    recalcStyleDurationMs: number;
    recalcStyleCount: number;
    domNodesDelta: number;
    jsHeapDeltaMB: number;
  };
}

function printHelp(): void {
  console.log(`
Text.js DevTools Console Flicker & CPU Benchmark Harness

Usage:
  bun bench/devtools/run.ts [options]

Options:
  --strategy=<name>      Strategy: clear | noclear | clearEvery=N (e.g. clearEvery=60)
                         Can also be comma-separated (default: clear)
  --fps=<n>              Target FPS, e.g. 30, 60, 120 (can be comma-separated, default: 60)
  --seconds=<n>          Measurement duration per run in seconds (default: 5)
  --all                  Run the full comparison matrix (2fps sanity + 30/60/120fps × strategies)
  --headed               Launch Chromium with a visible GUI window
  --screencast           Enable CDP Page.startScreencast visual pixel confirmation (default: true)
  --no-screencast        Disable CDP Page.startScreencast pixel confirmation
  --scheduler=timer|raf  Page frame scheduler (default: timer)
  --dirty=all|partial    Scene dirty-row pattern per frame (default: all)
  --executable=<path>    Custom Chrome/Chromium executable path
  --json                 Emit raw JSON results at the end
  --help, -h             Show this help message
`);
}

function parseCliArgs(argv: string[]): CliOptions {
  let strategyArg = "clear";
  let fpsArg = "60";
  let seconds = 5;
  let headed = false;
  let all = false;
  let screencast = true;
  let scheduler: "timer" | "raf" = "timer";
  let dirtyMode: "all" | "partial" = "all";
  let cols = 100;
  let rows = 32;
  let executablePath: string | undefined;
  let json = false;
  let hasExplicitStrategy = false;
  let hasExplicitFps = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--headed") {
      headed = true;
      continue;
    }
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (arg === "--screencast") {
      screencast = true;
      continue;
    }
    if (arg === "--no-screencast") {
      screencast = false;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }

    const eq = arg.indexOf("=");
    const key = eq >= 0 ? arg.slice(0, eq) : arg;
    const val = eq >= 0 ? arg.slice(eq + 1) : argv[++i] ?? "";

    switch (key) {
      case "--strategy":
      case "--strategies":
        strategyArg = val;
        hasExplicitStrategy = true;
        break;
      case "--fps":
        fpsArg = val;
        hasExplicitFps = true;
        break;
      case "--seconds":
      case "--duration":
        seconds = Math.max(0.5, Number.parseFloat(val) || 5);
        break;
      case "--scheduler":
        scheduler = val === "raf" ? "raf" : "timer";
        break;
      case "--dirty":
        dirtyMode = val === "partial" ? "partial" : "all";
        break;
      case "--cols":
        cols = Math.max(40, Number.parseInt(val, 10) || 100);
        break;
      case "--rows":
        rows = Math.max(12, Number.parseInt(val, 10) || 32);
        break;
      case "--executable":
        executablePath = val;
        break;
    }
  }

  const strategies = all && !hasExplicitStrategy
    ? ["clear", "noclear", "clearEvery=30", "clearEvery=60", "clearEvery=120"]
    : strategyArg
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const fpsList = all && !hasExplicitFps
    ? [30, 60, 120]
    : fpsArg
        .split(",")
        .map((s) => Number.parseFloat(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

  return {
    strategies,
    fpsList,
    seconds,
    headed,
    all,
    screencast,
    scheduler,
    dirtyMode,
    cols,
    rows,
    executablePath,
    json,
  };
}

function findChromiumExecutable(customPath?: string): string {
  if (customPath && existsSync(customPath)) return customPath;

  const cacheDir = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cacheDir)) {
    const entries = readdirSync(cacheDir)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort((a, b) => {
        const ra = Number.parseInt(a.replace("chromium-", ""), 10);
        const rb = Number.parseInt(b.replace("chromium-", ""), 10);
        return rb - ra;
      });

    for (const dir of entries) {
      const candidates = [
        join(
          cacheDir,
          dir,
          "chrome-mac-arm64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing",
        ),
        join(
          cacheDir,
          dir,
          "chrome-mac",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing",
        ),
        join(cacheDir, dir, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium"),
        join(cacheDir, dir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
      ];
      for (const c of candidates) {
        if (existsSync(c)) return c;
      }
    }
  }

  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(systemChrome)) return systemChrome;

  throw new Error(
    "Could not locate full Chromium or Google Chrome executable. Pass --executable=/path/to/chrome.",
  );
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
    srv.on("error", reject);
  });
}

function latestEmittedFrameAt(frameEmitEpochs: number[], sampleEpochMs: number): number {
  // frameEmitEpochs[0] is warmup frame 0; frameEmitEpochs[k] is frame k (1..emittedFrames)
  let lo = 0;
  let hi = frameEmitEpochs.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if ((frameEmitEpochs[mid] ?? Infinity) <= sampleEpochMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

async function runSingleBenchmark(
  browser: import("playwright-core").Browser,
  debugPort: number,
  serverUrl: string,
  opts: {
    strategy: string;
    fps: number;
    seconds: number;
    screencast: boolean;
    scheduler: "timer" | "raf";
    dirtyMode: "all" | "partial";
    cols: number;
    rows: number;
  },
): Promise<BenchmarkRunMetrics> {
  const parsedStrategy = parseStrategy(opts.strategy);
  const durationMs = opts.seconds * 1000;

  const pageCtx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await pageCtx.newPage();

  const dtCtx = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const dtPage = await dtCtx.newPage();

  try {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const testPageUrl =
      `${serverUrl}/?strategy=${encodeURIComponent(parsedStrategy.raw)}` +
      `&fps=${opts.fps}&seconds=${opts.seconds}&scheduler=${opts.scheduler}` +
      `&dirty=${opts.dirtyMode}&cols=${opts.cols}&rows=${opts.rows}&runId=${runId}`;

    await page.goto(testPageUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__benchReady === true, { timeout: 10_000 });

    // Locate the page's CDP target ID
    const targets = (await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json())) as Array<{
      id: string;
      url: string;
      type: string;
    }>;
    const target = targets.find((t) => t.type === "page" && t.url.includes(`runId=${runId}`));
    if (!target) {
      throw new Error(`Could not find CDP target for ${testPageUrl}`);
    }

    // Configure DevTools frontend to open directly on the Console panel
    await dtPage.addInitScript(() => {
      try {
        localStorage.setItem("panel-selectedTab", JSON.stringify("console"));
      } catch {
        // Ignore storage errors on devtools:// scheme
      }
    });

    const httpInspectorUrl = `http://127.0.0.1:${debugPort}/devtools/inspector.html?ws=127.0.0.1:${debugPort}/devtools/page/${target.id}&panel=console`;
    const bundledInspectorUrl = `devtools://devtools/bundled/inspector.html?ws=127.0.0.1:${debugPort}/devtools/page/${target.id}&panel=console`;

    let loaded = false;
    for (const url of [httpInspectorUrl, bundledInspectorUrl]) {
      try {
        const resp = await dtPage.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
        if (!resp || resp.status() === 200) {
          loaded = true;
          break;
        }
      } catch {
        // Try fallback
      }
    }
    if (!loaded) {
      throw new Error("Failed to load DevTools frontend inspector.html");
    }

    // Select Console tab & disable target screencast split view so Console has the full 1000x600 window
    await dtPage.locator("#tab-console").click({ timeout: 10_000 });
    const screencastToggle = dtPage.locator('button[aria-label="Toggle screencast"].toggled');
    if ((await screencastToggle.count()) > 0) {
      await screencastToggle.click().catch(() => {});
    }

    await dtPage.waitForSelector("#console-messages", { timeout: 10_000 });

    // Emit warmup frame 0 and wait until DevTools Console has rendered it
    await page.evaluate(() => window.__emitWarmupFrame!());
    await waitForWarmupFrameInDevTools(dtPage, 10_000);
    // Let DevTools 50ms viewportThrottler settle completely before t=0
    await dtPage.waitForTimeout(150);

    const dtCdp = await dtCtx.newCDPSession(dtPage);
    await dtCdp.send("Performance.enable", { timeDomain: "timeTicks" });

    const screencastFrames: ScreencastCapture[] = [];
    if (opts.screencast) {
      dtCdp.on("Page.screencastFrame", (ev: { data: string; sessionId: number; metadata?: { timestamp?: number } }) => {
        const epochMs = ev.metadata?.timestamp ? ev.metadata.timestamp * 1000 : Date.now();
        screencastFrames.push({ data: ev.data, epochMs });
        void dtCdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
      });
      await dtCdp.send("Page.startScreencast", {
        format: "jpeg",
        quality: 75,
        everyNthFrame: 1,
      });
    }

    const perfBefore = await dtCdp.send("Performance.getMetrics");
    const profileDir = process.env.BENCH_PROFILE_DIR;
    if (profileDir) {
      await dtCdp.send("Profiler.enable");
      await dtCdp.send("Profiler.setSamplingInterval", { interval: 200 });
      await dtCdp.send("Profiler.start");
    }
    const runStartEpochMs = Date.now();

    const [frontendRaw, pageRes] = await Promise.all([
      runFrontendProbe(dtPage, { durationMs, expectedRows: opts.rows }),
      page.evaluate(
        (streamOpts) => window.__runStream!(streamOpts),
        {
          strategy: parsedStrategy.raw,
          fps: opts.fps,
          durationMs,
          cols: opts.cols,
          rows: opts.rows,
          scheduler: opts.scheduler,
          dirtyMode: opts.dirtyMode,
        },
      ) as Promise<PageStreamResult>,
    ]);

    const runEndEpochMs = Date.now();
    const perfAfter = await dtCdp.send("Performance.getMetrics");
    if (profileDir) {
      const { profile } = (await dtCdp.send("Profiler.stop")) as { profile: unknown };
      await Bun.write(`${profileDir}/devtools-${parsedStrategy.raw.replace(/\W+/g, "_")}-${opts.fps}fps.cpuprofile`, JSON.stringify(profile));
    }
    const shotDir = process.env.BENCH_SHOT_DIR;
    if (shotDir) {
      await dtPage.screenshot({ path: `${shotDir}/devtools-${parsedStrategy.raw.replace(/\W+/g, "_")}-${opts.fps}fps.png` });
    }
    if (opts.screencast) {
      await dtCdp.send("Page.stopScreencast").catch(() => {});
    }

    const screencastAnalysis = opts.screencast
      ? await analyzeScreencastFrames(
          page,
          screencastFrames,
          frontendRaw.consoleViewportRect,
          runStartEpochMs,
          runEndEpochMs,
        )
      : {
          framesCaptured: 0,
          blankFrames: 0,
          renderedFrames: 0,
          blankFramePct: 0,
          timeWeightedBlankPct: 0,
        };

    // Compute frame lag (across all valid rAFs) and end-to-end frame paint latency (ms from emit to first paint)
    const lagFrameSamples: number[] = [];
    const lagMsSamples: number[] = [];
    const seenForLatency = new Set<number>();
    for (const s of frontendRaw.samples) {
      if (s.state === "valid" && s.frameId !== null) {
        const latestEmitted = latestEmittedFrameAt(pageRes.frameEmitEpochs, s.epochMs);
        const lagF = Math.max(0, latestEmitted - s.frameId);
        lagFrameSamples.push(lagF);
        if (s.frameId > 0 && !seenForLatency.has(s.frameId) && s.emitEpochMs !== null) {
          seenForLatency.add(s.frameId);
          lagMsSamples.push(Math.max(0, s.epochMs - s.emitEpochMs));
        }
      }
    }

    const metricDelta = (name: string): number => {
      const v0 = perfBefore.metrics.find((m) => m.name === name)?.value ?? 0;
      const v1 = perfAfter.metrics.find((m) => m.name === name)?.value ?? 0;
      return v1 - v0;
    };

    const actualSec = pageRes.actualDurationMs / 1000;
    const taskDurationMs = Math.max(0, metricDelta("TaskDuration") * 1000);
    const scriptDurationMs = Math.max(0, metricDelta("ScriptDuration") * 1000);
    const layoutDurationMs = Math.max(0, metricDelta("LayoutDuration") * 1000);
    const recalcStyleDurationMs = Math.max(0, metricDelta("RecalcStyleDuration") * 1000);
    const layoutCount = Math.max(0, metricDelta("LayoutCount"));
    const recalcStyleCount = Math.max(0, metricDelta("RecalcStyleCount"));
    const domNodesDelta = metricDelta("Nodes");
    const jsHeapDeltaMB = metricDelta("JSHeapUsedSize") / (1024 * 1024);

    const distinctFramesPainted = Math.min(pageRes.emittedFrames, frontendRaw.distinctFramesPainted);
    const droppedFrames = Math.max(0, pageRes.emittedFrames - distinctFramesPainted);
    const droppedFramePct = pageRes.emittedFrames > 0 ? (droppedFrames / pageRes.emittedFrames) * 100 : 0;
    const blankPaintPct =
      frontendRaw.totalPaints > 0 ? (frontendRaw.blankPaints / frontendRaw.totalPaints) * 100 : 0;

    return {
      strategy: parsedStrategy.raw,
      targetFps: opts.fps,
      durationSec: opts.seconds,
      page: {
        emittedFrames: pageRes.emittedFrames,
        actualFps: pageRes.actualFps,
        clearsCalled: pageRes.clearsCalled,
        logsCalled: pageRes.logsCalled,
        dirtyRowsMean: pageRes.dirtyRowsMean,
        spanCountMean: pageRes.spanCountMean,
        cssBytesMean: pageRes.cssBytesMean,
        layoutPaintMs: pageRes.layoutPaintMs,
        encodeMs: pageRes.encodeMs,
        consoleCallMs: pageRes.consoleCallMs,
        totalFrameMs: pageRes.totalFrameMs,
      },
      frontend: {
        totalRafPaints: frontendRaw.totalPaints,
        validPaints: frontendRaw.validPaints,
        blankPaints: frontendRaw.blankPaints,
        emptyDomPaints: frontendRaw.emptyDomPaints,
        clearedOnlyPaints: frontendRaw.clearedOnlyPaints,
        incompletePaints: frontendRaw.incompletePaints,
        blankPaintPct,
        distinctFramesPainted,
        droppedFrames,
        droppedFramePct,
        effectiveConsoleFps: distinctFramesPainted / Math.max(0.001, actualSec),
        lagFrames: summarizeNumbers(lagFrameSamples),
        lagMs: summarizeNumbers(lagMsSamples),
        rafIntervalMs: summarizeNumbers(frontendRaw.rafIntervalsMs),
        rafJankOver34Ms: frontendRaw.rafJankOver34Ms,
        rafJankOver50Ms: frontendRaw.rafJankOver50Ms,
        longTaskCount: frontendRaw.longTaskCount,
        longTaskTotalMs: frontendRaw.longTaskTotalMs,
        longTaskMaxMs: frontendRaw.longTaskMaxMs,
        mountedWrappersEnd: frontendRaw.mountedWrappersEnd,
        mountedWrappersMax: frontendRaw.mountedWrappersMax,
        mountedWrappersMean: frontendRaw.mountedWrappersMean,
        consoleScrollHeightEnd: frontendRaw.consoleScrollHeightEnd,
        screencast: screencastAnalysis,
      },
      cdpCpu: {
        taskDurationMs,
        taskBusyPct: (taskDurationMs / pageRes.actualDurationMs) * 100,
        scriptDurationMs,
        scriptBusyPct: (scriptDurationMs / pageRes.actualDurationMs) * 100,
        layoutDurationMs,
        layoutCount,
        recalcStyleDurationMs,
        recalcStyleCount,
        domNodesDelta,
        jsHeapDeltaMB,
      },
    };
  } finally {
    await dtCtx.close().catch(() => {});
    await pageCtx.close().catch(() => {});
  }
}

function padRight(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

function padLeft(s: string, w: number): string {
  return s.length >= w ? s : " ".repeat(w - s.length) + s;
}

function renderTable(headers: string[], rows: string[][], alignRight: boolean[]): string {
  const widths = headers.map((h, colIdx) => {
    let maxW = h.length;
    for (const r of rows) {
      const cell = r[colIdx] ?? "";
      if (cell.length > maxW) maxW = cell.length;
    }
    return maxW;
  });

  const fmtRow = (cells: string[]): string =>
    "| " +
    cells
      .map((c, i) => (alignRight[i] ? padLeft(c, widths[i]!) : padRight(c, widths[i]!)))
      .join(" | ") +
    " |";

  const sep =
    "|-" +
    widths.map((w, i) => (alignRight[i] ? "-".repeat(Math.max(1, w - 1)) + ":" : "-".repeat(w))).join("-|-") +
    "-|";

  return [fmtRow(headers), sep, ...rows.map(fmtRow)].join("\n");
}

function printComparisonTables(results: BenchmarkRunMetrics[], showScreencast: boolean): void {
  console.log("\n=== 1. Flicker, Frame Delivery & Lag (DevTools Console Frontend) ===\n");
  const flickerHeaders = [
    "Strategy",
    "FPS (tgt/act)",
    "Blank Paints (rAF)",
    "Empty / Cleared",
    ...(showScreencast ? ["Pixel Blank (TW%)"] : []),
    "Painted / Emitted",
    "Dropped %",
    "Eff. FPS",
    "Lag (frames p50/p95)",
    "Lag (ms p50/p95)",
  ];
  const flickerAlign = [
    false,
    true,
    true,
    true,
    ...(showScreencast ? [true] : []),
    true,
    true,
    true,
    true,
    true,
  ];
  const flickerRows = results.map((r) => [
    r.strategy,
    `${r.targetFps} / ${r.page.actualFps.toFixed(1)}`,
    `${r.frontend.blankPaints}/${r.frontend.totalRafPaints} (${r.frontend.blankPaintPct.toFixed(1)}%)`,
    `${r.frontend.emptyDomPaints} / ${r.frontend.clearedOnlyPaints}`,
    ...(showScreencast
      ? [
          `${r.frontend.screencast.timeWeightedBlankPct.toFixed(1)}% (${r.frontend.screencast.blankFrames}/${r.frontend.screencast.framesCaptured})`,
        ]
      : []),
    `${r.frontend.distinctFramesPainted} / ${r.page.emittedFrames}`,
    `${r.frontend.droppedFramePct.toFixed(1)}%`,
    `${r.frontend.effectiveConsoleFps.toFixed(1)}`,
    `${r.frontend.lagFrames.p50.toFixed(0)} / ${r.frontend.lagFrames.p95.toFixed(0)}`,
    `${r.frontend.lagMs.p50.toFixed(1)} / ${r.frontend.lagMs.p95.toFixed(1)}ms`,
  ]);
  console.log(renderTable(flickerHeaders, flickerRows, flickerAlign));

  console.log("\n=== 2. DevTools Frontend Main-Thread CPU & Page-Side Cost ===\n");
  const cpuHeaders = [
    "Strategy",
    "FPS",
    "DT Task Busy",
    "DT Script",
    "DT Layout (#)",
    "DT Style (#)",
    "LongTasks",
    "DOM msgs (max/end)",
    "DT Heap Δ",
    "Page console() p50/p95",
    "Page encode p50/p95",
  ];
  const cpuAlign = [false, true, true, true, true, true, true, true, true, true, true];
  const cpuRows = results.map((r) => [
    r.strategy,
    `${r.targetFps}`,
    `${r.cdpCpu.taskDurationMs.toFixed(0)}ms (${r.cdpCpu.taskBusyPct.toFixed(1)}%)`,
    `${r.cdpCpu.scriptDurationMs.toFixed(0)}ms`,
    `${r.cdpCpu.layoutDurationMs.toFixed(0)}ms (${r.cdpCpu.layoutCount})`,
    `${r.cdpCpu.recalcStyleDurationMs.toFixed(0)}ms (${r.cdpCpu.recalcStyleCount})`,
    `${r.frontend.longTaskCount} (${r.frontend.longTaskTotalMs.toFixed(0)}ms)`,
    `${r.frontend.mountedWrappersMax} / ${r.frontend.mountedWrappersEnd}`,
    `${r.cdpCpu.jsHeapDeltaMB >= 0 ? "+" : ""}${r.cdpCpu.jsHeapDeltaMB.toFixed(1)}MB`,
    `${r.page.consoleCallMs.p50.toFixed(2)} / ${r.page.consoleCallMs.p95.toFixed(2)}ms`,
    `${r.page.encodeMs.p50.toFixed(2)} / ${r.page.encodeMs.p95.toFixed(2)}ms`,
  ]);
  console.log(renderTable(cpuHeaders, cpuRows, cpuAlign));
  console.log("");
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2));
  const executablePath = findChromiumExecutable(cli.executablePath);
  const debugPort = await getFreePort();
  const server = await startBenchServer(0);

  console.log(`[bench/devtools] Test server: ${server.url}`);
  console.log(`[bench/devtools] Chromium:    ${executablePath}`);
  console.log(
    `[bench/devtools] Mode:        ${cli.headed ? "headed" : "headless (--headless=new)"} · duration=${cli.seconds}s/run · screencast=${cli.screencast}`,
  );

  const launchArgs = [
    ...(cli.headed ? [] : ["--headless=new"]),
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-ipc-flooding-protection",
    "--window-size=1000,700",
  ];

  const browser = await chromium.launch({
    executablePath,
    headless: false, // Managed explicitly via --headless=new so Playwright uses the full Chromium binary
    args: launchArgs,
  });

  try {
    const allResults: BenchmarkRunMetrics[] = [];

    if (cli.all) {
      console.log(`\n[bench/devtools] Running 2 FPS sanity check (clear vs noclear)...`);
      for (const strat of ["clear", "noclear"]) {
        process.stdout.write(`  → sanity: strategy=${strat} @ 2fps (${cli.seconds}s)... `);
        const res = await runSingleBenchmark(browser, debugPort, server.url, {
          strategy: strat,
          fps: 2,
          seconds: cli.seconds,
          screencast: cli.screencast,
          scheduler: cli.scheduler,
          dirtyMode: cli.dirtyMode,
          cols: cli.cols,
          rows: cli.rows,
        });
        console.log(
          `blank=${res.frontend.blankPaintPct.toFixed(1)}% (${res.frontend.blankPaints}/${res.frontend.totalRafPaints}), painted=${res.frontend.distinctFramesPainted}/${res.page.emittedFrames}`,
        );
        allResults.push(res);
      }
    }

    console.log(
      `\n[bench/devtools] Running benchmark (${cli.strategies.length} strategies × ${cli.fpsList.length} FPS rates)...`,
    );

    for (const fps of cli.fpsList) {
      for (const strategy of cli.strategies) {
        process.stdout.write(`  → strategy=${strategy} @ ${fps}fps (${cli.seconds}s)... `);
        const res = await runSingleBenchmark(browser, debugPort, server.url, {
          strategy,
          fps,
          seconds: cli.seconds,
          screencast: cli.screencast,
          scheduler: cli.scheduler,
          dirtyMode: cli.dirtyMode,
          cols: cli.cols,
          rows: cli.rows,
        });
        console.log(
          `blank=${res.frontend.blankPaintPct.toFixed(1)}% (${res.frontend.blankPaints}/${res.frontend.totalRafPaints}), painted=${res.frontend.distinctFramesPainted}/${res.page.emittedFrames}, DT busy=${res.cdpCpu.taskBusyPct.toFixed(1)}%`,
        );
        allResults.push(res);
      }
    }

    printComparisonTables(allResults, cli.screencast);

    if (cli.json) {
      console.log(JSON.stringify(allResults, null, 2));
    }
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

void main();
