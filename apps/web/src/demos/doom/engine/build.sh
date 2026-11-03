#!/usr/bin/env bash
# Reproducible build of doom.wasm (GPL-2.0) without the embedded shareware DOOM1.WAD, with sound effects.
# Pinned: jacobenget/doom.wasm @ 31cc1af (v0.1.0 + docs), wasi-sdk 24, Binaryen version_119.
# Linux x86_64 only (run it on a VM). Output: ./out/doom.wasm and ./out/SHA256SUMS
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/out"
COMMIT=31cc1af9656a8184830090c4e9f268383f5d7e15
WORK="$(mktemp -d)"
cd "$WORK"
curl -fsSL https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-24/wasi-sdk-24.0-x86_64-linux.tar.gz | tar xz
curl -fsSL https://github.com/WebAssembly/binaryen/releases/download/version_119/binaryen-version_119-x86_64-linux.tar.gz | tar xz
git clone -q https://github.com/jacobenget/doom.wasm src
cd src
git checkout -q "$COMMIT"
# Skip the melt wipe: it spins the main thread for ~1s inside one tickGame() call.
sed -i 's/  if (gamestate != wipegamestate) {/  if (0 \&\& gamestate != wipegamestate) {/' doomgeneric/src/d_main.c
grep -q '0 && gamestate != wipegamestate' doomgeneric/src/d_main.c
# Sound effects: i_wasmsound.c hands each sound to the host through 4 `sound` imports. No music module.
cp "$HERE/i_wasmsound.c" doomgeneric/src/
sed -i 's/^\(SRC_DOOM = .*\) doomgeneric\.c$/\1 doomgeneric.c i_wasmsound.c/' Makefile
grep -q ' i_wasmsound.c$' Makefile
sed -i 's/^static sound_module_t \*sound_modules\[\] = {$/extern sound_module_t sound_wasm_module;\nstatic sound_module_t *sound_modules[] = {\n    \&sound_wasm_module,/' doomgeneric/src/i_sound.c
grep -q '&sound_wasm_module,' doomgeneric/src/i_sound.c
# A zero-lump IWAD stands in for the embedded shareware WAD; the IWAD (DOOM1.WAD) is loaded at runtime as its own asset.
mkdir -p build/file_embedded_in_code .dev_virtualenvs/python_virtualenv
printf 'IWAD\0\0\0\0\x0c\0\0\0' > build/DOOM1.WAD
python3 utils/generate_code_for_embedded_file.py --input build/DOOM1.WAD --destination-folder build/file_embedded_in_code
B="$WORK/binaryen-version_119/bin"
make -j"$(nproc)" build/doom.wasm CC="$WORK/wasi-sdk-24.0-x86_64-linux/bin/clang" WASM_AS="$B/wasm-as" WASM_MERGE="$B/wasm-merge" WASM_METADCE="$B/wasm-metadce"
"$B/wasm-opt" -Oz --enable-bulk-memory --strip-debug build/doom.wasm -o build/doom.opt.wasm
mkdir -p "$OUT"
cp build/doom.opt.wasm "$OUT/doom.wasm"
cd "$OUT"
sha256sum doom.wasm > SHA256SUMS
ls -l doom.wasm
echo "gzip: $(gzip -9c doom.wasm | wc -c) bytes"
