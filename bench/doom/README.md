# Doom in the console: feasibility numbers

Shareware `DOOM1.WAD` v1.9 attract demos and E1M1, rendered with `paintHalfBlocks` (`▀`, two pixels
per cell) and logged by the shipping `CssConsoleDriver` (append mode, curtain).

- `encode.ts <frames.bin>`: offline encode time, `%c` spans and `console.log` payload per grid and palette.
- `../devtools/run.ts --scenario=doom`: the real DevTools frontend (two-context protocol). Query knobs via
  `BENCH_QUERY`: `palette=32|64`, `sample=average`, `maxFrames=N`, `levels=N` (posterize), `extraCss=…`.
  `BENCH_GC=1` forces GC before heap readings.
- `matrix.sh`, `heap.sh`: the same on an exe.dev VM under Xvfb (software rendering, so slower than a Mac).
- `capture.mjs`: plays `/playground/doom` in DevTools (menu, new game, walk, turn, fire, use, run, automap) and saves screenshots, a WebM and stats.
- `palette.ts <iwad> <K>`: median-cut K colors from the WAD's PLAYPAL into `apps/web/src/demos/doom/palette.ts`.

## DevTools on an M5 Pro Mac (Chrome for Testing 151, headed, 10 s runs, default 300-frame clear)

| Grid (cells) | Colors | Target fps | Painted fps | Lag p50 / p95 | DevTools main thread | `console.log` p50 | Spans |
|---|---|---:|---:|---:|---:|---:|---:|
| 80×25 | 256 | 15 | 10.4 | 356 / 1357 ms | 78% | 3.0 ms | 1,535 |
| 80×25 | 256 | 10 | 9.9 | 85 / 138 ms | 62% | 3.0 ms | 1,507 |
| 80×25 | avg + 32 | 15 | 9.3 | 87 / 129 ms | 55% | 2.2 ms | 1,124 |
| 80×25 | avg + 32 | 10 | 9.9 | 76 / 86 ms | 45% | 2.2 ms | 1,099 |
| 80×25 | avg + 32, clear every 30 | 10 | 9.8 | 78 / 82 ms | 31% | 2.4 ms | 1,124 |
| 120×40 | 256 | 15 | 6.6 | 685 / 3433 ms | 92% | 6.6 ms | 3,186 |
| 120×40 | 256 | 10 | 8.1 | 129 / 751 ms | 85% | 6.6 ms | 3,270 |
| 120×40 | avg + 32, clear every 30 | 10 | 9.3 | 97 / 147 ms | 54% | 5.2 ms | 2,656 |
| 160×50 | 256 | 15 | 5.9 | 1875 / 4904 ms | 96% | 10.7 ms | 5,544 |
| 160×50 | 256 | 10 | 6.2 | 786 / 2720 ms | 93% | 10.6 ms | 5,085 |

(The 32-color rows used an earlier frame-histogram palette; the shipped preset uses 64 PLAYPAL colors, ~855 spans at 80 columns.)

Turbolog encode is 0.1–0.9 ms a frame at every size; the page-side cost is `console.log` serializing the
args (~170 bytes of CSS per span). Every Doom frame repaints ~85% of rows, so the row-hash diff saves little.

## Memory (DevTools frontend heap after forced GC, 80×25, clear every 30 frames, VM)

30 s: +58 MB, 180 s: +305 MB. It keeps growing at ~1.7 MB/s. The page's own heap stays at ~3.5 MB.
The 100×32 dashboard scenario grows too (+42 MB in 60 s on the Mac), so it's general, scaled by bytes logged.
