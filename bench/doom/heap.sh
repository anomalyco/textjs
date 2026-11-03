#!/usr/bin/env bash
# Does DevTools' heap keep growing? Same config, 30s vs 180s, GC before each measurement.
set -u
cd "$(dirname "$0")/../.."
export DOOM_WASM=${DOOM_WASM:-apps/web/src/demos/doom/engine/out/doom.wasm} DOOM_WAD=${DOOM_WAD:-apps/web/public/doom/DOOM1.WAD} BENCH_GC=1
OUT=bench/doom/out; mkdir -p $OUT
CH=${CHROME:-$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1)}
for secs in 30 180; do
  BENCH_QUERY="levels=4&maxFrames=30" bun bench/devtools/run.ts --executable=$CH --scenario=doom --strategy=native --fps=15 --seconds=$secs --cols=80 --rows=26 --headed --no-screencast > $OUT/heap-$secs.txt 2>&1
  echo "heap-$secs: $(grep -A3 '^| Strategy' $OUT/heap-$secs.txt | grep native | tail -1)"
done
