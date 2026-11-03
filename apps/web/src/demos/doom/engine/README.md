# doom.wasm engine (GPL-2.0)

`out/doom.wasm` is [jacobenget/doom.wasm](https://github.com/jacobenget/doom.wasm) at `31cc1af`
(doomgeneric, from Chocolate Doom and id's 1997 source), licensed GPL-2.0 (see `LICENSE`). It's
loaded at runtime as its own asset and never imported into `packages/`.

`build.sh` rebuilds it on Linux x86_64 with wasi-sdk 24 and Binaryen version_119, with two
changes from upstream: the embedded shareware WAD is replaced by an empty stub (the IWAD is served
separately), and the melt screen wipe is off (it spins the main thread for about a second).

- Size: 329,012 bytes, about 150 KB gzipped
- SHA-256: see `out/SHA256SUMS`
- Interface: 10 imports and 19 exports: `memory`, 4 functions (`initGame`, `tickGame`, `reportKeyDown`, `reportKeyUp`) and 14 `KEY_*` codes; host glue in `../host.ts`
