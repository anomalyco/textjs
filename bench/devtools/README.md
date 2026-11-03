# Text.js DevTools Console Flicker & CPU Benchmark

Automated, objective benchmark harness for measuring Chrome DevTools Console **flicker (blank paints)**, **dropped frames**, **display lag**, **DevTools frontend main-thread CPU cost**, and **page-side `console.log` cost** when rendering real-time TUI frames with `@textjs/core`'s `CssConsoleDriver`.

---

## Quick Start

Run the shipping driver (append mode + curtain) at the renderer's paced rate against the legacy clear-per-frame mode:

```bash
bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5
```

Run a single configuration:

```bash
bun bench/devtools/run.ts --strategy=clear --fps=60 --seconds=5
bun bench/devtools/run.ts --strategy=noclear --fps=60 --seconds=5
bun bench/devtools/run.ts --strategy=clearEvery=60 --fps=60 --seconds=5
```

Compare multiple strategies or frame rates in one run:

```bash
bun bench/devtools/run.ts --strategy=clear,noclear,clearEvery=30,clearEvery=60 --fps=30,60,120 --seconds=5
```

Run the full benchmark matrix (includes the 2 FPS sanity check + 30/60/120 FPS matrix):

```bash
bun bench/devtools/run.ts --all --seconds=5
```

Run with a visible Chromium GUI window:

```bash
bun bench/devtools/run.ts --strategy=clear,noclear,clearEvery=60 --fps=60 --seconds=5 --headed
```

Environment hooks: `BENCH_SHOT_DIR=<dir>` saves a DevTools screenshot after each run; `BENCH_PROFILE_DIR=<dir>` saves a `.cpuprofile` of the DevTools frontend for each run.

Bidirectional text in the real DevTools frontend (Hebrew, Arabic, mixed lines; see `/docs/internationalization`):

```bash
bun bench/devtools/bidi-shot.ts --out=/tmp/bidi-shots
```

It logs the same 64×21 frame four ways (cells without pinning, pinned without width fitting, an all-Latin control with every RTL glyph replaced by `x`, and the shipping driver), saves `bidi-*.png`, and reports each frame's right-edge drift across rows, each row's offset from the top border (`rowOffsets`) and the rows where console background shows through between spans (hairlines). The shipping frame should match the Latin control, except on the emoji-in-Hebrew row, where it should do better (only right-to-left spans are fitted).

Chart glyphs (eighth blocks, quadrants, braille, ▶, ✓) in the real DevTools frontend, in the default font stack and in Consolas alone (Windows 10's console font), with and without stand-ins. Reports every row's right-edge drift and the fonts DevTools drew it with; CI runs it on Windows with `--check`:

```bash
bun bench/devtools/glyph-shot.ts --out=/tmp/glyph-shots [--browser=chrome|edge] [--check]
```

Any page's console frame in the real DevTools frontend, at several device pixel ratios, with the rows where console background shows through between spans:

```bash
bun bench/devtools/page-shot.ts --url=http://localhost:4173/coffee --dpr=1,1.25,1.5,2
```

> The results matrix below was recorded before the driver switched to append mode and longhand CSS; `clear` rows there use the old shorthand CSS.

---

## How It Works

1. **Test Page & Real Driver (`server.ts`, `client.ts`)**
   - Bundles `bench/devtools/client.ts` (which imports `CellBuffer`, `CssConsoleDriver`, `initYoga`, `paintScene`, and scene primitives directly from `packages/core/src/index.ts`) for the browser using `Bun.build({ target: "browser", format: "esm" })` and serves it via `Bun.serve`.
   - Renders a live 100×32 coding-agent dashboard scene (modeled on `buildDashboard` in `packages/core/test/fixtures.ts`, ~180–240 `%c` spans per frame) where every frame updates header metrics, sidebar session selection, streaming conversation tokens/diffs, input prompt, and status bar.
   - Embeds `FRAME:<6-digit-id> · T:<epochMs>` in Row 0 of every frame so the DevTools frontend can identify the exact displayed frame and compute end-to-end latency.
   - Injects the rendering strategy without modifying `CssConsoleDriver` by wrapping the `ConsoleTarget` passed to `new CssConsoleDriver({ console: target, clear })`:
     - `native`: the driver's default `clear: "append"` mode with the curtain span (what apps ship). `native-nocurtain` skips the curtain.
     - `clear`: legacy `clear: "frame"`, `console.clear()` + `console.log(format, ...args)` every frame.
     - `noclear`: `clear: false` (append-only `console.log`, relying on Console's sticky bottom scroll).
     - `clearEvery=N`: calls `console.clear()` once every `N` frames (e.g. `clearEvery=30`, `clearEvery=60`, `clearEvery=120`) and `console.log` every frame.
     - Additional query-string variants: `group`, `info`, `debug`, `dirty=all|partial`, `coalesce=0|1`, `scheduler=timer|raf`.

2. **Two-Window Chromium + Bundled DevTools Frontend (`run.ts`)**
   - Launches full Chromium (`Google Chrome for Testing` from `~/Library/Caches/ms-playwright/chromium-*` or `/Applications/Google Chrome.app`) with `--remote-debugging-port=<ephemeralPort>` and `--remote-allow-origins=*`.
   - Opens the test page in one browser context and opens the bundled DevTools frontend (`http://127.0.0.1:<port>/devtools/inspector.html?ws=127.0.0.1:<port>/devtools/page/<targetId>&panel=console`) as a regular `1000×600` page in a second browser context so neither window is background-throttled.
   - Selects the Console panel (`#tab-console`), closes the DevTools target screencast split pane so `#console-messages` gets the full `1000×546` viewport, emits warmup `FRAME:000000`, and waits until it is rendered in `#console-messages` before starting the timed run.

3. **DevTools Frontend Instrumentation (`frontend-probe.ts`)**
   - **DOM `requestAnimationFrame` Flash Detector**: On every `rAF` tick in the DevTools frontend page, walks `.console-message-wrapper` elements inside `.console-group-messages` from the bottom up (shadow-DOM-aware and virtualization-safe), checks intersection with `#console-messages`'s viewport rectangle, and classifies each paint as:
     - `valid`: A complete 32-row TUI frame (`31 <br>` line breaks, visible height ≥ 150px) with `FRAME:xxxxxx` is displayed in the viewport.
     - `empty-dom`: `.console-group-messages` has zero visible messages in the viewport.
     - `cleared-only`: Only the `"Console was cleared"` info row is visible.
     - `incomplete`: A frame message is present but has fewer than 32 rows or is clipped.
   - **Visual Pixel Confirmation (`Page.startScreencast`)**: Captures compositor frames from the DevTools frontend page via CDP `Page.startScreencast` during the run, then decodes them afterward via `OffscreenCanvas` and samples 4 horizontal scanlines across the `#console-messages` viewport to compute time-weighted visual blank percentage (`Pixel Blank (TW%)`).
   - **Main-Thread CPU & Long Tasks**: Collects CDP `Performance.getMetrics` (`TaskDuration`, `ScriptDuration`, `LayoutDuration`, `RecalcStyleDuration`, `LayoutCount`, `RecalcStyleCount`, `Nodes`, `JSHeapUsedSize`) before and after the run, plus `PerformanceObserver({ entryTypes: ["longtask"] })` in the DevTools frontend.

---

## Root Cause of the Console Flicker (Found via DevTools Source & Probe)

Inspecting Chrome DevTools' bundled `panels/console/console.js` (`ConsoleView` and `ConsoleViewport`) alongside our probe reveals why `console.clear() + console.log()` flashes badly:

1. **Asymmetric synchronous clear vs. 50ms throttled log**:
   - When `console.clear()` arrives over CDP, `ConsoleView.consoleCleared()` calls `this.updateMessageList()` → `this.viewport.invalidate()` **synchronously**, immediately removing all `.console-message-wrapper` nodes from `.console-group-messages`.
   - When `console.log(format, ...args)` arrives immediately afterward, `ConsoleView.addConsoleMessage()` does **not** refresh the viewport synchronously. Instead, it calls `this.scheduleViewportRefresh()`, which schedules `this.invalidateViewport()` through `this.viewportThrottler = new Throttler(50)` (**50ms throttle timeout**).
   - At ≥ 20 FPS (e.g. 30/60/120 FPS, frame interval 33.3ms / 16.7ms / 8.3ms), the next `console.clear()` arrives **before** or right after the 50ms throttler fires, keeping the Console DOM empty for **70%–95% of all DevTools frontend paints**!
2. **Why pure `noclear` spikes DevTools CPU & lag**:
   - With `noclear`, `consoleCleared()` is never called, so `Blank Paints` drops to **0.0%**.
   - However, `ConsoleViewport.refresh()` computes its active virtualized window at sticky-bottom as `Math.ceil((visibleHeight * 2) / provider.minimumRowHeight())`, where `minimumRowHeight = 18px` (assuming 1-line console logs). Because each 32-row TUI frame is ~455px tall with ~180 `%c` `<span>`s, `ConsoleViewport` keeps **69 full TUI frames (~12,500+ DOM nodes)** mounted in `.console-group-messages` simultaneously. Re-measuring and shifting 69 mounted frames on every refresh drives DevTools main-thread `TaskDuration` up to **48%–73% busy** with multi-frame lag and `>50ms` LongTasks at 120 FPS.
3. **Why `clearEvery=N` (e.g. `clearEvery=30` or `clearEvery=60`) balances both**:
   - Clearing only once every `N` frames reduces blank paints from **~80% → ~3.7%–9.7%** at 60 FPS (and **~70.5% → ~1.0%–1.5%** at 30 FPS) while bounding the number of mounted `.console-message-wrapper` elements in `.console-group-messages` and cutting style/layout cost and LongTasks.

---

## Metrics Reference

### Table 1: Flicker, Frame Delivery & Lag
- **FPS (tgt/act)**: Configured target FPS vs. actual page emission FPS.
- **Blank Paints (rAF)**: `blankPaints / totalRafPaints (%)` observed on every `requestAnimationFrame` in the DevTools frontend.
- **Empty / Cleared**: Breakdown of blank paints into completely empty DOM (`0` visible wrappers) vs. `"Console was cleared"` only.
- **Pixel Blank (TW%)**: Time-weighted percentage of the run where captured CDP `Page.startScreencast` compositor frames were visually blank in pixel space (`blankFrames / capturedFrames`).
- **Painted / Emitted**: Number of distinct page frames actually rendered in the DevTools Console DOM vs. total frames emitted by the page.
- **Dropped %**: Percentage of emitted frames that were coalesced/dropped by DevTools before ever being painted.
- **Eff. FPS**: Effective distinct TUI frames per second displayed to the user (`distinctFramesPainted / durationSec`).
- **Lag (frames p50/p95)**: How many frames behind the page's latest emitted frame the DevTools display is on valid paints (`latestEmittedFrame - displayedFrame`).
- **Lag (ms p50/p95)**: End-to-end latency in milliseconds from the page emitting frame `F` (`T:<epochMs>`) to the DevTools frontend first painting frame `F`.

### Table 2: DevTools Frontend Main-Thread CPU & Page-Side Cost
- **DT Task Busy**: Total DevTools frontend main-thread `TaskDuration` (ms and % of run duration) from CDP `Performance.getMetrics`.
- **DT Script**: DevTools frontend JS `ScriptDuration` (ms).
- **DT Layout (#)**: DevTools frontend `LayoutDuration` (ms) and layout count.
- **DT Style (#)**: DevTools frontend `RecalcStyleDuration` (ms) and style recalculation count.
- **LongTasks**: Count and total duration of DevTools frontend main-thread tasks `> 50ms` via `PerformanceObserver`.
- **DOM msgs (max/end)**: Peak and end-of-run count of `.console-message-wrapper` elements mounted in `.console-group-messages`.
- **DT Heap Δ**: Change in DevTools frontend `JSHeapUsedSize` over the run.
- **Page console() p50/p95**: Synchronous page-side duration of `console.clear() + console.log(format, ...args)` per frame with DevTools attached.
- **Page encode p50/p95**: Pure page-side duration of `CssConsoleDriver.encode()` per frame.

---

## Measured Results Matrix (5s per run, 100×32 Dashboard)

### 1. Flicker, Frame Delivery & Lag

| Strategy       | FPS (tgt/act) | Blank Paints (rAF) | Empty / Cleared | Pixel Blank (TW%) | Painted / Emitted | Dropped % | Eff. FPS | Lag (frames p50/p95) | Lag (ms p50/p95) |
|----------------|-------------:-|------------------:-|---------------:-|-----------------:-|-----------------:-|---------:-|--------:-|--------------------:-|----------------:-|
| clear          |       2 / 2.0 |     39/368 (10.6%) |          0 / 39 |     11.5% (10/21) |           10 / 10 |      0.0% |      2.0 |                0 / 0 |    67.5 / 72.6ms |
| noclear        |       2 / 2.0 |       0/386 (0.0%) |           0 / 0 |       0.0% (0/11) |           10 / 10 |      0.0% |      2.0 |                0 / 0 |    15.9 / 18.1ms |
| clear          |     30 / 30.0 |    280/397 (70.5%) |         277 / 3 |    75.7% (75/145) |          69 / 150 |     54.0% |     13.8 |                0 / 1 |    27.8 / 32.5ms |
| noclear        |     30 / 30.0 |       0/383 (0.0%) |           0 / 0 |       0.0% (0/70) |          70 / 150 |     53.3% |     14.0 |                1 / 2 |    38.7 / 54.7ms |
| clearEvery=30  |     30 / 30.0 |       6/395 (1.5%) |           6 / 0 |       1.8% (4/80) |          75 / 150 |     50.0% |     15.0 |                1 / 2 |    32.9 / 38.1ms |
| clearEvery=60  |     30 / 30.0 |       4/382 (1.0%) |           4 / 0 |       1.0% (2/77) |          74 / 150 |     50.7% |     14.8 |                1 / 2 |    37.2 / 49.4ms |
| clearEvery=120 |     30 / 30.0 |       3/385 (0.8%) |           3 / 0 |       0.7% (1/73) |          71 / 150 |     52.7% |     14.2 |                1 / 2 |    39.9 / 51.0ms |
| clear          |     60 / 60.0 |    306/385 (79.5%) |        263 / 43 |   84.5% (110/161) |          50 / 300 |     83.3% |     10.0 |                0 / 1 |    11.3 / 16.5ms |
| noclear        |     60 / 60.0 |       0/326 (0.0%) |           0 / 0 |       0.0% (0/57) |          57 / 300 |     81.0% |     11.4 |                3 / 5 |    45.7 / 57.0ms |
| clearEvery=30  |     60 / 60.0 |      36/370 (9.7%) |          30 / 6 |      10.4% (9/73) |          64 / 300 |     78.7% |     12.8 |                2 / 5 |    33.7 / 40.5ms |
| clearEvery=60  |     60 / 60.0 |      15/374 (4.0%) |          15 / 0 |       3.2% (3/66) |          62 / 300 |     79.3% |     12.4 |                2 / 5 |    35.0 / 43.4ms |
| clearEvery=120 |     60 / 60.0 |       6/345 (1.7%) |           6 / 0 |       1.5% (1/60) |          59 / 300 |     80.3% |     11.8 |                3 / 5 |    36.0 / 60.2ms |
| clear          |   120 / 120.0 |    371/392 (94.6%) |         364 / 7 |    96.9% (94/114) |          19 / 600 |     96.8% |      3.8 |                1 / 1 |    11.3 / 13.8ms |
| noclear        |   120 / 120.0 |       0/193 (0.0%) |           0 / 0 |       0.0% (0/34) |          33 / 600 |     94.5% |      6.6 |              14 / 19 |  109.0 / 117.7ms |
| clearEvery=30  |   120 / 120.0 |     50/301 (16.6%) |          50 / 0 |     19.6% (18/73) |          54 / 600 |     91.0% |     10.8 |               7 / 11 |    49.1 / 66.3ms |
| clearEvery=60  |   120 / 120.0 |      20/268 (7.5%) |          20 / 0 |       8.7% (8/57) |          48 / 600 |     92.0% |      9.6 |               8 / 13 |    63.4 / 74.2ms |
| clearEvery=120 |   120 / 120.0 |      15/211 (7.1%) |          15 / 0 |       7.7% (4/42) |          38 / 600 |     93.7% |      7.6 |              12 / 17 |   86.2 / 115.6ms |

### 2. DevTools Frontend Main-Thread CPU & Page-Side Cost

| Strategy       | FPS |   DT Task Busy | DT Script | DT Layout (#) | DT Style (#) |   LongTasks | DOM msgs (max/end) | DT Heap Δ | Page console() p50/p95 | Page encode p50/p95 |
|----------------|---:-|--------------:-|---------:-|-------------:-|------------:-|-----------:-|------------------:-|---------:-|----------------------:-|-------------------:-|
| clear          |   2 |   244ms (4.9%) |      35ms |     16ms (50) |   12ms (110) |     0 (0ms) |              2 / 2 |    -4.5MB |          0.90 / 1.00ms |       0.20 / 0.30ms |
| noclear        |   2 |   217ms (4.3%) |      27ms |     10ms (20) |     6ms (60) |     0 (0ms) |            12 / 12 |    -3.2MB |          0.80 / 1.00ms |       0.20 / 0.40ms |
| clear          |  30 |  743ms (14.9%) |      93ms |    74ms (302) |   45ms (490) |     0 (0ms) |              2 / 2 |   +10.4MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| noclear        |  30 | 1627ms (32.5%) |      62ms |   102ms (140) |  153ms (389) |     0 (0ms) |            69 / 69 |   +15.6MB |          0.50 / 0.50ms |       0.10 / 0.20ms |
| clearEvery=30  |  30 | 1228ms (24.6%) |      71ms |   102ms (154) |   53ms (414) |     0 (0ms) |            31 / 30 |    +6.4MB |          0.50 / 0.60ms |       0.10 / 0.20ms |
| clearEvery=60  |  30 | 1346ms (26.9%) |      68ms |   108ms (150) |   54ms (410) |     0 (0ms) |            61 / 30 |   +15.8MB |          0.50 / 0.60ms |       0.10 / 0.20ms |
| clearEvery=120 |  30 | 1546ms (30.9%) |      64ms |   107ms (143) |  128ms (395) |     0 (0ms) |            69 / 30 |    +3.6MB |          0.50 / 0.60ms |       0.10 / 0.20ms |
| clear          |  60 |  735ms (14.7%) |     128ms |    71ms (466) |   46ms (673) |     0 (0ms) |              2 / 0 |   +13.7MB |          0.50 / 0.60ms |       0.10 / 0.20ms |
| noclear        |  60 | 2383ms (47.6%) |      63ms |   167ms (114) |  235ms (327) |    1 (50ms) |            69 / 69 |   +18.5MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| clearEvery=30  |  60 | 1936ms (38.7%) |      89ms |   165ms (139) |   77ms (377) |     0 (0ms) |            31 / 30 |   +16.9MB |          0.40 / 0.60ms |       0.10 / 0.20ms |
| clearEvery=60  |  60 | 2010ms (40.2%) |      86ms |   170ms (130) |   78ms (360) |     0 (0ms) |            61 / 59 |   +32.3MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| clearEvery=120 |  60 | 2229ms (44.6%) |      75ms |   170ms (120) |  181ms (340) |   2 (101ms) |            69 / 60 |   +19.2MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| clear          | 120 |  903ms (18.0%) |     139ms |    93ms (774) |   49ms (935) |     0 (0ms) |              2 / 0 |   +18.1MB |          0.50 / 0.60ms |       0.10 / 0.20ms |
| noclear        | 120 | 3538ms (70.7%) |      61ms |    306ms (66) |  356ms (198) | 31 (2852ms) |            69 / 69 |   +32.6MB |          0.40 / 0.50ms |       0.10 / 0.10ms |
| clearEvery=30  | 120 | 2575ms (51.5%) |     113ms |   235ms (127) |  102ms (333) |  11 (586ms) |            29 / 19 |   +30.5MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| clearEvery=60  | 120 | 2866ms (57.3%) |     109ms |   265ms (105) |  112ms (291) | 30 (1759ms) |            59 / 53 |   +24.3MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
| clearEvery=120 | 120 | 3381ms (67.6%) |      97ms |    302ms (80) |  296ms (237) | 32 (2541ms) |            69 / 69 |   +37.2MB |          0.40 / 0.50ms |       0.10 / 0.20ms |
