# Doom in the console: feasibility & v2 sprite numbers

Shareware `DOOM1.WAD` v1.9 attract demos and E1M1, rendered through `<Pixels>` (`@textjs/react/experimental` / `@textjs/core/experimental` `drawPixels`) and
logged by `CssConsoleDriver` (append mode, curtain).

- `encode.ts <frames.bin>`: offline half-block encode time, `%c` spans and `console.log` payload per grid and palette.
- `../devtools/run.ts --scenario=doom`: the real DevTools frontend (two-context protocol). Query knobs via
  `BENCH_QUERY`: `mode=auto|halfblock`, `palette=32|64|256`, `sample=average`, `maxFrames=N`, `levels=N`.
  `BENCH_GC=1` forces GC before heap readings.
- `matrix.sh`, `heap.sh`: the same on an exe.dev VM under Xvfb (software rendering, so slower than a Mac).
- `capture.mjs`: plays `/playground/doom` in DevTools (menu, new game, walk, turn, fire, use, run, automap) and saves screenshots, a WebM and stats.
- `palette.ts <iwad> <K>`: median-cut K colors from the WAD's PLAYPAL into `apps/web/src/demos/doom/palette.ts`.

## Sprite mode (`mode=auto`, v2 default) vs half-blocks on an M5 Pro Mac (Chrome for Testing 151, headed, 10 s runs)

In sprite mode (`drawPixels` → `encodeIndexedPng` + `encodeSpriteSvgDataUrl`), Chromium, and Firefox per its console's
style rules (not benchmarked), render the full `320×200` framebuffer at 4:3 inside a single `%c` span
(`image-rendering: pixelated` inside an inline SVG `data:` URI). On Chromium, 2 temporal keyframes are batched per
~57 ms log call so every `console.log` lands on `ConsoleView.viewportThrottler`'s 0 ms fast path while the browser
compositor steps frames at Doom's native 35 Hz. Safari Web Inspector strips `url(...)` in `%c` styles and falls back
automatically to `▀` half-blocks at up to 30 fps.

| Mode & Grid (cells) | Resolution (px) | Target fps | Visual fps | Lag p50 / p95 | DevTools main thread | DevTools ms / frame | Payload / frame | DOM spans |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Half-block 80×25 (64c) | 80×50 (4K px) | 10 | 9.8 | 75.9 / 81.9 ms | 27.8% | 28.0 ms | 154.7 KB | 997 |
| Half-block 80×25 (256c) | 80×50 (4K px) | 15 | 10.4 | 356 / 1357 ms | 78.0% | 75.0 ms | ~246 KB | 1,535 |
| Half-block 120×40 (256c) | 120×80 (9.6K px) | 15 | 6.6 | 685 / 3433 ms | 92.0% | 139.4 ms | ~510 KB | 3,186 |
| Half-block 160×50 (256c) | 160×100 (16K px) | 15 | 5.7 | 159.3 / 215.4 ms* | 73.6% | 129.4 ms | 857.4 KB | 5,264 |
| **Sprite 80×25** | **320×200 (64K px)** | **35** | **33.6** | **21.1 / 29.2 ms** | **8.3%** | **2.36 ms** | **16.8 KB** | **3** |
| **Sprite 120×40** | **320×200 (64K px)** | **35** | **33.6** | **18.4 / 28.9 ms** | **8.0%** | **2.29 ms** | **16.8 KB** | **3** |
| **Sprite 160×50** | **320×200 (64K px)** | **35** | **33.6** | **19.7 / 29.8 ms** | **8.1%** | **2.32 ms** | **16.9 KB** | **3** |

(\*Measured with the 4 MB sprite budget (`SPRITE_MAX_BYTES`); without byte compaction, 160×50 hit 96% DevTools busy and 1,875 / 4,904 ms lag.)

## Memory root cause & 60 s heap delta (`BENCH_GC=1`, M5 Pro Mac)

Heap snapshots of the DevTools frontend traced retained memory across all Text.js apps to two mechanisms:
1. Between `console.clear()` calls, `SDK.ConsoleModel` retains every `ConsoleMessage` and `ConsoleViewport` keeps up to ~69 messages mounted in the live DOM (`minimumRowHeight = 16px`). `CssConsoleDriver` enforces the 4 MB sprite budget (`SPRITE_MAX_BYTES`) while sprites are active and compacts after 100 frames on a 1 s idle pause (text-only apps stay unlimited up to `maxFrames = 300`).
2. Upstream Chromium 151's `ConsoleViewMessage.buildMessageHelper` mounts a `StackTracePreviewContent` root widget on every rendered console message whose `IgnoreListManager` listener is never detached when `ConsoleViewport` or `console.clear()` removes the row, leaking the detached `<div class="console-message-stack-trace-wrapper">` subtree per rendered message. Collapsing 1,000–5,264 `<span>`s into 1 sprite `<span>` (and halving DOM messages/sec via 2-frame SVG batching) produces about 99% fewer DOM nodes per frame:
   - Half-block 80×25 @ 15 fps (60 s, 557 frames painted): **+161.4 MB** (`+1,478,742` DOM nodes, ~297 KB/frame).
   - Half-block 160×50 @ 15 fps (extrapolated from 10 s `+112 MB`): **~+672 MB/min** (`+6.77M` DOM nodes/min).
   - **Sprite 120×40 @ 35 fps (60 s, 2,100 frames emitted):** **+39.9 MB** (`+37,161` DOM nodes, ~19 KB/frame, 15.2× less heap per frame and 243× less heap per pixel).
