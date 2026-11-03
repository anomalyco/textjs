# Doom social clip

A ~29 second clip of textjs.org/doom in three cuts: A (16:9, the whole window), B (1:1, DevTools alone) and C (9:16,
DevTools under a strip of the page). The gameplay is the WAD's own DEMO1 (E1M5) from the attract loop, so every run
plays the same tics.

```bash
bun install && (cd media/doom-video && bun install)   # once
bun media/doom-video/preview.ts                     # optional: the attract loop offline, to pick a segment
bun media/doom-video/capture.ts a                   # film each cut on the Mac (~45 s each, real time)
bun media/doom-video/prepare.ts a                   # job bundle: frames, sync offset, synthesized sound
V="bun ~/.config/opencode/skills/exe-video/scripts/video-vm.ts"
${=V} run media/doom-video --include out/job -- 'bun produce.ts a && bun produce.ts b && bun produce.ts c'
${=V} pull media/doom-video out/final/ media/doom-video/out/final/
${=V} stop --name video-doom-video
```

## How it works

1. **Capture** (`capture.ts`, on the Mac). A production build of `apps/web` is served locally and opened in Chrome for
   Testing (headless, `--force-device-scale-factor` 2 or 3) with the real DevTools frontend attached as a second page,
   as `media/learn` does, so DevTools' UI and fonts are the Mac's. The page is told DevTools is docked beside it (A, B)
   or below it (C), and Text.js sizes the frame from that. A click on the page starts Doom and its audio, as a
   visitor's first click does. Both pages are recorded with CDP screencasts at full device resolution. An init script
   wraps doom.wasm's imports to log every `startSound`, `updateSound` and `stopSound` call and every frame draw, with
   epoch timestamps. Nothing is printed to the console. It also names the page's hidden Text.js textarea and the
   "Console size" select, which otherwise show as two DevTools Issues.
2. **Prepare** (`prepare.ts`, on the Mac). Picks the frames for `CLIP` (`lib/layouts.ts`), drops the one-frame empty
   console that DevTools paints between Text.js's periodic `console.clear()` and the next frame, and finds how far the
   console picture trails the engine by correlating frame brightness (65–75 ms). The sound track is mixed from the log
   by `lib/synth.ts` with `sound.ts`'s own `decodeDmx`, `gainFor` and `panFor`: each sound plays at its native rate on its
   channel with Web Audio's equal-power pan, shifted by that lag so sounds land on the frames that show them.
3. **Produce** (`produce.ts`, on an exe.dev VM). Renders the window frame, title and end card in Geist, composites the
   streams at 60 fps, normalises the audio to −16 LUFS (−1.5 dBTP), and encodes H.264 High (CRF 17, max 12 Mbit/s) with
   AAC 192k. Writes `out/final/doom-<cut>-<ratio>.mp4`, a poster and `out/review/<cut>/` (contact sheet and stills).

Geometry for each cut is in `lib/geometry.ts`; the window sizes each cut films are in `lib/layouts.ts`.
