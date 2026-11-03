# Doom in the console: feasibility & v2 sprite numbers

Shareware `DOOM1.WAD` v1.9 attract demos and E1M1, rendered through `<Pixels>` (`@textjs/react/experimental` / `@textjs/core/experimental` `drawPixels`) and
logged by `CssConsoleDriver` (append mode, curtain).

- `encode.ts <frames.bin>`: offline half-block encode time, `%c` spans and `console.log` payload per grid and palette.
- `../devtools/run.ts --scenario=doom`: the real DevTools frontend (two-context protocol). Query knobs via
  `BENCH_QUERY`: `mode=auto|halfblock`, `palette=32|64|256`, `sample=average`, `maxFrames=N`, `levels=N`.
  `BENCH_GC=1` forces GC before heap readings.
- `matrix.sh`, `heap.sh`: the same on an exe.dev VM under Xvfb (software rendering, so slower than a Mac).
- `capture.mjs`: plays `/doom` in DevTools (menu, new game, walk, turn, fire, use, run, automap) and saves screenshots, a WebM and stats.
- `palette.ts <iwad> <K>`: median-cut K colors from the WAD's PLAYPAL into `apps/web/src/demos/doom/palette.ts`.
- `record-frames.ts <out.bin> [seconds]`: records the attract demos as 320×200 frames on a virtual 35Hz clock, so every run sees the same frames.
- `frame-size.ts <frames.bin> [site|64|32]`: those frames through `drawPixels` and `CssConsoleDriver`, paced like `ConsoleRenderer`. Reports characters per log call and per visual frame, clears and encode time.
- `encode-matrix.ts`, `batch-matrix.ts <frames.bin>`: PNG bytes and encode time for DEFLATE levels, PNG filters and batched keyframe layouts on the same frames.
- `site-clears.mjs`: clears per 30 s and characters per log call on a local build of `/doom` in headless Chromium.
- `devtools-heap.mjs`: page and DevTools frontend heap after a forced GC, against the characters logged since the last clear.

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

"Payload / frame" here is `cssBytesMean`: characters logged divided by every emitted frame, staged keyframes included, with the bench's default `DOOM_PALETTE_64`. textjs.org/doom draws Doom's own 256 colors, and each log call carries about 2.2 keyframes, so the site logs about 3.5× more per call. `cssBytesPerLog` reports the per-call figure.

## Frame size on textjs.org/doom (M5 Pro Mac, Chromium 151 headless, 120×40, attract demos)

| Run | Characters / log call | Characters / visual frame | Keyframes / log | Clears / 30 s |
|---|---:|---:|---:|---:|
| `run.ts --scenario=doom`, `palette=64` | 35,142 | 16,567 | 2.12 | |
| `run.ts --scenario=doom`, `palette=256` | 57,704 | 24,401 | 2.36 | |
| `site-clears.mjs` on a local build of `/doom` | 58,757 | 26,602 | 2.21 | 7 |
| `frame-size.ts site` (offline) | 46,736 | 26,181 | 1.79 | 5.3 |

On the site, the sprite is 95% of each log call (55,767 characters). The rest is the header, credit and key-hint rows. Each call logs one sprite URL. The first keyframe is a full PNG (28.9K base64 characters) and each later one is a delta (21.8K), because Doom's camera changes most pixels between tics. Deltas save 22%, almost all of it from cropping the unchanged status bar rows.

`encodeIndexedPng` is close to the floor for lossless 8-bit PNG on these frames (600 frames, IDAT bytes):

| Encoder | Bytes / frame | Encode p50 |
|---|---:|---:|
| `deflateZlib`, filter 0 (shipping) | 21,599 | 0.98 ms |
| zlib level 6, filter 0 | 21,374 | 0.56 ms |
| zlib level 9, filter 0 | 20,790 | 2.02 ms |
| `deflateZlib`, Sub / Up / Paeth filters | 25,097 / 27,238 / 26,188 | ~1.1 ms |
| Chromium canvas lossless WebP (`toDataURL("image/webp", 1)`) | 29,902 base64 chars (shipping PNG: 29,412) | 3.3 ms |

Packing a log's 2 or 3 keyframes side by side in one PNG saves 5 to 7%. Longer hash chains in `deflateZlib` (8 → 32 steps) save 2% for 40% more encode time. Raising the transparent-run threshold for deltas from 4 to 16 pixels saves 3% of delta bytes.

`devtools-heap.mjs`: the page's V8 heap holds 0.98 bytes per character logged since the last clear (r² 0.97), which `console.clear()` frees. The DevTools frontend heap grew about 1.1 bytes per character logged (about 1 MB/s during Doom) and didn't drop on `console.clear()`.

## Memory root cause & 60 s heap delta (`BENCH_GC=1`, M5 Pro Mac)

Heap snapshots of the DevTools frontend traced retained memory across all Text.js apps to two mechanisms:
1. Between `console.clear()` calls, `SDK.ConsoleModel` retains every `ConsoleMessage` and `ConsoleViewport` keeps up to ~69 messages mounted in the live DOM (`minimumRowHeight = 16px`). `CssConsoleDriver` enforces the 4 MB sprite budget (`SPRITE_MAX_BYTES`) while sprites are active and compacts after 100 frames on a 1 s idle pause (text-only apps stay unlimited up to `maxFrames = 300`).
2. Upstream Chromium 151's `ConsoleViewMessage.buildMessageHelper` mounts a `StackTracePreviewContent` root widget on every rendered console message whose `IgnoreListManager` listener is never detached when `ConsoleViewport` or `console.clear()` removes the row, leaking the detached `<div class="console-message-stack-trace-wrapper">` subtree per rendered message. Collapsing 1,000–5,264 `<span>`s into 1 sprite `<span>` (and halving DOM messages/sec via 2-frame SVG batching) produces about 99% fewer DOM nodes per frame:
   - Half-block 80×25 @ 15 fps (60 s, 557 frames painted): **+161.4 MB** (`+1,478,742` DOM nodes, ~297 KB/frame).
   - Half-block 160×50 @ 15 fps (extrapolated from 10 s `+112 MB`): **~+672 MB/min** (`+6.77M` DOM nodes/min).
   - **Sprite 120×40 @ 35 fps (60 s, 2,100 frames emitted):** **+39.9 MB** (`+37,161` DOM nodes, ~19 KB/frame, 15.2× less heap per frame and 243× less heap per pixel).
