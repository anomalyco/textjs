---
title: "Turbolog: eliminating the flash"
date: 2026-10-31
author: Adam
summary: Clearing the console before every frame left it visibly blank in 70–81% of DevTools paints. Appending frames brought that to 1%, all of it on the first frame.
---

Every Text.js frame is one `console.log` call. Until 0.4, every frame was also preceded by `console.clear()`. It looked correct in a screenshot and wrong on a screen: under load the console flashed empty between frames.

This post is about why, and the four lines of DevTools behavior we now design around.

## Measuring a flash

You can't fix what a screenshot can't see, so we built `bench/devtools`. It launches Chrome for Testing, opens the real DevTools frontend as a page and instruments it:

- On every `requestAnimationFrame` in the DevTools frontend, it checks whether a complete 32-row frame is in the console viewport. Paints without one are blank paints.
- It decodes `Page.startScreencast` frames afterwards to confirm the result in pixels.
- Every frame carries `FRAME:<id> · T:<epochMs>` in row 0, so the frontend can tell which frame it is showing and how late it is.

With `console.clear()` before each frame, a 100×32 dashboard at 15fps was blank in **70.6%** of DevTools paints. At 60fps, **81.1%**.

## Why

The answer is in DevTools' `ConsoleView`:

1. `console.clear()` calls `consoleCleared()`, which invalidates the viewport **synchronously**. Every message disappears in the same task.
2. `console.log()` calls `addConsoleMessage()`, which only schedules a refresh through `viewportThrottler`, a `Throttler` with a **50ms** timeout.

So each frame removes the old frame now and paints the new one later. At 15fps, roughly 50 of every 66ms show nothing.

## Append, don't clear

Turbolog now appends frames. DevTools sticks to the bottom of the console, so the new frame replaces the old one inside a single paint. A leading zero-width span with `margin-top:100vh` (the curtain) pushes earlier frames out of view, and it ends its own line so the DevTools source link never narrows row 0.

The console still has to be emptied eventually. A clear happens only on the first frame, after `invalidate()`, at idle once 100 frames have stacked up, and at a hard cap of 300.

## Pace to the throttler

Sending frames faster than DevTools can paint them doesn't make anything faster. A log that arrives while the throttler is pending restarts it, so frames are dropped: at 60fps DevTools painted 67 of 295 emitted frames. Turbolog paces frames at least **66ms** apart, about 15fps, and still renders discrete input synchronously when the interval allows.

## Break the phase lock

One more detail cost us 50ms per frame. After a clear, DevTools inserts a synthetic `Console was cleared` row. It takes the throttler's immediate slot and pushes the next frame onto the 50ms timer, and at a steady 66ms cadence every later frame stays locked to that timer.

The renderer now waits **110ms** once after any clear. After that, each frame arrives more than 50ms after the previous refresh completed and takes DevTools' immediate path. Median display lag went from **63ms to 10ms**.

## Results

`bun bench/devtools/run.ts --strategy=native,clear --fps=15,60 --seconds=5`, 100×32 dashboard, real DevTools frontend:

| Driver | FPS | Blank paints | Painted / emitted | Lag p50 |
| :-- | --: | --: | --: | --: |
| Clear per frame | 15 | 70.6% | 70 / 75 | 60.4ms |
| **Append (1.0)** | **15** | **1.0%** | **74 / 75** | **10.4ms** |
| Clear per frame | 60 | 81.1% | 45 / 300 | 9.8ms |
| Append, unpaced | 60 | 0.8% | 67 / 295 | 31.2ms |

The remaining 1% is the very first frame, which clears on purpose. Its blank paints are the `Console was cleared` row, not an empty console.

## Fewer properties per span

While we were in DevTools' source we found one more cost. DevTools copies every *longhand* of a `%c` style onto every line wrapper, so `font:` and `margin:` shorthands expanded to about 33 properties per span. Spans now use longhands only, about 7 each, with hex colors.

None of this changes your code. Upgrade, and the console stops blinking.
