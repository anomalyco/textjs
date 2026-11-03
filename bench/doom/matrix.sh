#!/usr/bin/env bash
# DevTools matrix for Doom half-block frames. Run on a VM: xvfb-run -a bash bench/doom/matrix.sh
set -u
cd "$(dirname "$0")/../.."
export DOOM_WASM=${DOOM_WASM:-apps/web/src/demos/doom/engine/out/doom.wasm} DOOM_WAD=${DOOM_WAD:-apps/web/public/doom/DOOM1.WAD}
OUT=bench/doom/out; mkdir -p $OUT
SECS=${SECS:-10}
run() { # name cols rows fps [query]
  BENCH_QUERY="${5:-}" BENCH_SHOT_DIR=$OUT/shots-$1 bun bench/devtools/run.ts --executable=${CHROME:-$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1)} --scenario=doom --strategy=native --fps=$4 --seconds=$SECS --cols=$2 --rows=$3 --headed --no-screencast --json > $OUT/$1.txt 2>&1
  echo "$1 done: $(grep -o 'blank=.*' $OUT/$1.txt | head -1)"
}
for fps in 15 10; do
  run g80x25-$fps 80 26 $fps
  run g120x40-$fps 120 41 $fps
  run g160x50-$fps 160 51 $fps
done
run g120x40-15-c64 120 41 15 levels=4
run g80x25-15-c64 80 26 15 levels=4
SECS=60 run long-g80x25-15 80 26 15
SECS=60 run long-g120x40-15 120 41 15
