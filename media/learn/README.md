# Learn Text.js — chapter videos

Narrated, motion-designed video versions of the `/learn` chapters. One command renders a chapter:

```bash
bun install && bun run build:packages           # once, at the repo root
(cd media/learn && bun install)                 # once: playwright-core
bun media/learn/render.ts getting-started --vm  # → media/learn/out/learn/getting-started/
```

**Render on a VM (`--vm`), not on the Mac.** A render has two halves:

1. **On the Mac** (`render.ts`): narration (ElevenLabs; the key never leaves the Mac), the timeline, and filming the
   live scenes in real Chrome + real DevTools (Mac fonts). Both are cached, so this is quick after the first run.
   It then writes a self-contained job bundle to `out/job/<slug>/`: timeline, footage, the narration clips used, Geist.
2. **On an exe.dev VM** (`produce.ts`, via the `exe-video` skill's `video-vm`): `--vm` syncs `media/learn` plus the
   job bundle (`--include out/job/<slug>`), renders frames, mixes and encodes, writes poster, 720p and review sheets,
   runs `check-holds.ts`, pulls `out/learn/<slug>/` and `out/review/<slug>/` back, and pauses the VM. The VM is
   `video-<worktree>` unless `--vm-name video-…` picks another (one per chapter to render chapters in parallel).
   `--keep-vm` leaves it running. `--still` and `--scene` work on the VM too (results land in `out/work/<slug>/vm/`).

Without `--vm` the same `produce.ts` runs locally. `bun media/learn/produce.ts <slug>` re-produces an existing job
bundle without touching narration or footage.

Output (`out/` is gitignored; the folder layout matches the R2 bucket at `media.textjs.org`):

| File | |
| --- | --- |
| `out/learn/<slug>/<slug>-1080p.mp4` | 1920×1080, 60 fps, H.264 High (CRF 17) + AAC 192k, `+faststart` |
| `out/learn/<slug>/<slug>-720p.mp4` | Smaller variant for narrow screens |
| `out/learn/<slug>/<slug>-poster.jpg` | The cover, fully revealed |
| `out/learn/<slug>/<slug>.vtt` | WebVTT captions, timed to the narration's words |
| `out/learn/<slug>/manifest.json` | Duration, scenes, voice/model, loudness |
| `out/review/<slug>/` | Contact sheet, settled frames for every scene and cue, transition strips, last frame |
| `out/job/<slug>/` | The job bundle produce.ts reads (timeline, filmed footage + its cache key, clips, fonts) |
| `out/work/<slug>/` | Timeline, segments, audio stems, stills (scratch) |

Then review (see [Review](#review)) and run `bun media/learn/check-holds.ts <slug>`.

## Options

```
bun media/learn/render.ts <slug> [options]

  --vm                       Produce on an exe.dev VM (sync, render, pull, pause); see above
  --vm-name video-…          VM to use (default video-<worktree>); --keep-vm to leave it running
  --provider elevenlabs|say  Narration voice (default: elevenlabs when a key is configured, else macOS `say`)
  --fps 60                   Output frame rate (30 also works; rendering runs at ~90 frames/s)
  --workers N                Parallel headless pages rendering frames (default: CPUs − 1, at most 8)
  --subtitles                Burn lower-third subtitles in (default: off; the .vtt track is the captions)
  --music                    Add the synthesized ambient pad, ducked under the voice (default: off)
  --scene <id>               Render one scene (plus its transitions) to out/work/<slug>/<slug>-<id>-preview.mp4
  --still <t|scene:id[+s]>   Write single PNG frames (repeatable), e.g. --still scene:try+12
  --timeline-only            Narration + timeline + .vtt only (cheap pacing check)
  --recapture                Refilm live scenes even when the cached footage still matches
  --no-film                  Skip live scenes (placeholders) to preview everything else quickly
  --no-720p, --no-review
```

## How it works

```
chapters/<slug>.tsx ──► narration (TTS, cached) ──► timeline (scene lengths + cue times)
                                                        │
                       live scenes ◄── capture.ts ◄─────┤  real site / starter app + real DevTools, filmed at cue times
                                                        │
stage/ (HTML/CSS/SVG on a 1920×1080 canvas) ◄── seek(t) ┘  deterministic frames, screenshotted by N headless pages
        │
        └─► H.264 segments ─► concat ─► mux with loudness-normalized narration ─► 1080p, 720p, poster, .vtt, review
```

1. **Narration drives time.** Each scene's narration is synthesized once (cached by a hash of text, voice, model and
   settings in `.cache/tts/`; editing one scene re-bills only that scene). A scene lasts `lead + speech + tail`
   (default 0.6 s and 0.9 s; `min` for silent beats). Character-level timestamps turn `{cue}` markers into scene
   times, and words into captions.
2. **Live scenes are filmed for real** (`lib/capture.ts`). The app runs in Chrome for Testing; the real DevTools
   frontend (`/devtools/inspector.html?ws=…`, as in `bench/devtools`) is opened as a second page attached to it, so
   the Console panel is genuine. The app is told DevTools is docked below it (so pads and responsive sizing behave as
   in the video). Keys, clicks and file writes fire at their cue times; every visual change is grabbed as a
   full-resolution screenshot (DevTools at 3×, the page at 2×), so close-ups stay crisp. Footage is cached by
   (spec, scene length, cue times) and reused until those change.
   - `server: "site"` films a production build of `apps/web` (no dev-only React warnings in the console).
   - `server: "starter"` scaffolds a real `create-text-app --template starter` project linked to this checkout's
     packages and runs the real `text dev`.
3. **The stage** (`stage/`) lays every scene on one large canvas with a 120 px grid; a camera glides from scene to
   scene (1.5 s, ease-in-out, a slight pull-back on long moves). Nothing animates by wall-clock: `window.stage.seek(t)`
   computes every value from `t`, so frames are exact and render in parallel.
4. **Audio**: narration clips are placed on the timeline and normalized to −16 LUFS integrated, −1.5 dBTP
   (two-pass `loudnorm`). `--music` adds a soft pad synthesized by ffmpeg (license-clean), ~21 dB under the voice and
   side-chain ducked.

## Writing a chapter

Copy `chapters/getting-started.tsx`. A chapter exports `{ slug, scenes, pronounce? }`; read titles, summaries, code
steps and quizzes from the course (`lib/course.ts` imports `apps/web/src/learn/course.ts` and the chapter markdown), so
the video can't drift from the lesson.

Narration markup (`lib/narration.ts`):

- `{name}` — a cue at the start of the next word: `"Press Enter {enter1}and the count goes up."`
- `[display|spoken]` — subtitles show `display`, the voice says `spoken`: `"[r|R]"`.
- `{+1.5}` — a 1.5 s pause (each stretch between pauses is synthesized and cached separately). Use before quiz answers.
- Common terms are pronounced automatically (`PRONOUNCE`: Text.js, console.log, %c, ⌘⌥J, @textjs/next, page.tsx,
  useInput…); add chapter-specific ones with `pronounce`.

Cue references in props: `"name"`, `"name+0.4"`, `"name-0.2"`, a number of seconds, or `start` / `voice` /
`voiceEnd` / `end`.

Scene kinds (`stage/scenes/*`, props documented at the top of each file):

| kind | use |
| --- | --- |
| `title` | `variant: "cover" \| "section" \| "outro"` — chapter opener, a part of the chapter (`move: "down"`), up next |
| `course` | headline + the ten chapters, current one highlighted |
| `pipeline` | cards on a line with flowing dots (code, real Text.js frames, a mini console) |
| `terminal` | commands type at cues, followed by their real output |
| `editor` | `mode: "write"` (with `replaces` for the previous file) or `"diff"` (hunks apply at cues); highlight sweeps with optional camera lean-in (`focus`, or `zoom: 1.22` for long files); `preview` shows the rendered frame; `maxSize` caps the font for long lines |
| `live` | real page + real DevTools in a floating browser; `shots` (camera), `spots` (highlight), `keys` (keycaps), `clicks` (cursor), `open` (DevTools slides up) |
| `logs` | console.log calls over time: one frame per key press, nothing while idle |
| `quiz` | a course quiz question; the answer lights at a cue |
| `frames` | real Text.js frames (`renderFrame`) in a console panel, swapped at cues: a layout reflowing by width, a theme change, focus moving; captions and keycaps |

Helpers: `lib/script.ts` (`fileLines`, `diffLines`, `lineOf`, `tokenize` — the site's own highlighter), `lib/tui.ts`
(`renderFrame(<Box>…</Box>, { cols, rows, keys, theme })` renders a real Text.js frame offscreen for motion graphics),
`lib/servers.ts` (`starterTranscript()` for real CLI output).

Typecheck with `node_modules/.bin/tsc -p media/learn` (from the repo root). New scene kinds go in `stage/scenes/` and
the registry in `stage/main.ts`. Keep the language: black canvas, Geist /
Geist Mono, 1 px lines with crosshairs, one accent (`#3291ff`), `easeOut` for entrances and `easeInOut` for travel,
no bounce, generous space, and nothing that moves while it's meant to be read.

## Review

Every render writes `out/review/<slug>/`. Before calling a chapter done:

- **Contact sheet** for flow; then the full-size `scenes/*.jpg` (one after each cue settles): facts match the lesson,
  highlights sit on the right lines/rows, nothing clipped or orphaned, DevTools clearly shows the app.
- **Transitions** (`transitions/*.jpg`, 8 fps strips): every move goes scene → canvas → scene, no loading pages.
- `bun media/learn/check-holds.ts <slug>`: every title holds still once revealed (exit code 0).
- The render log: loudness ≈ −16 LUFS, true peak ≤ −1.5 dBTP; no `capture: … not found` lines (a missed measurement
  means a spotlight or camera target fell back).
- Listen once with captions on: cues land on the words, pauses before quiz answers feel natural.

## Narration providers

- **ElevenLabs** (`lib/tts.ts`): `POST /v1/text-to-speech/{voice}/with-timestamps`, PCM 44.1 kHz, per-character
  alignment. The key is read from `ELEVENLABS_API_KEY` or `~/.config/textjs/elevenlabs.env` and never printed.
  The course narrator is **Eric** (premade "Eric – Smooth, Trustworthy", `cjVigY5qzO86Huf0OWal`, Adam's pick), set
  as `DEFAULT_VOICE` in `lib/tts.ts` so every chapter inherits it; don't override it per chapter.
  Text.js is spoken as "TextJS", and `ELEVENLABS_IPA` sends "textjs" (any case) as inline IPA, `/ˌtɛkstdʒeɪˈɛs/`,
  so Eric says it as one word rather than "text… J… S". Captions still read "Text.js": the alignment is mapped back
  onto the spoken text.
  `ELEVENLABS_VOICE_ID` (an id or a shortlist name: `eric`, `brian`, `sarah`, `daniel`, `river`, `alice`) and
  `ELEVENLABS_MODEL_ID` (default `eleven_v4`) override the defaults. Only premade voices are used; never a voice
  cloned from a real person. `bun media/learn/voices.ts` renders the same paragraph in each shortlisted voice to
  `out/voice-samples/` (`--list` shows the account's premade voices).
- **say** (macOS): free, offline drafts for pacing. Sentence timings are exact, word timings within a sentence are
  estimated. Swap with `--provider`; nothing else changes.

A chapter of ~4 minutes is ~2,800 characters of narration.
