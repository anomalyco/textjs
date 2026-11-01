---
title: Rendering React into console.log
date: 2025-02-12
author: Adam
summary: Text.js draws a React app in the DevTools console as one styled console.log call per frame. How a frame is built, and why it is one call.
---

Text.js renders React apps in the Chrome DevTools console. Apart from a hidden input, the page has no UI. Each frame of the app is a single `console.log` call.

## The console as a display

`console.log` accepts a format string. Each `%c` applies the CSS in the next argument to the text that follows it, up to the next `%c`:

```js
console.log("%c▼ Text.js%c ready", "color:#ededed;font-weight:700", "color:#45a557");
```

These styles can set colors, backgrounds, bold, italic and underline, and the console font is monospace (Menlo on macOS). With a monospace font, and colors that can change on every run of characters, the console works as a grid of styled character cells. Borders, panels, inputs and charts can all be drawn on it.

## A frame is a grid of cells

The renderer keeps each frame in a `CellBuffer`. Characters live in one typed array, foreground and background colors in two more, and attributes such as bold and underline in a fourth. The arrays are allocated once for a given size and reused for every frame.

To log a frame, the driver walks each row and groups neighboring cells that share a style into runs. Each run becomes one `%c` span, and rows are joined with `\n`. Our 100×32 test dashboard, 3,200 cells, encodes to about 200 spans.

## One call per frame

Logging each row as its own message doesn't work. Every message gets its own border and source link in DevTools, and DevTools collapses identical consecutive messages behind a repeat counter, so two identical rows of a table would merge into one. A frame logged as a single message stays in one piece.

Two things in the text need escaping first. A literal `%` is written as `%%`, so text like `100%` can't consume a style argument. DevTools also turns URLs into links and repaints them in its own colors, so `://` and `www.` get a word joiner (U+2060), which has no width:

```ts
export function escapeConsoleText(text: string, allowLink = false): string {
  let s = text;
  if (s.includes("%")) s = s.replaceAll("%", "%%");
  if (!allowLink) {
    if (s.includes(LINK_SCHEME)) s = s.replaceAll(LINK_SCHEME, LINK_SCHEME_SAFE);
    if (s.includes(WWW) || s.includes("WWW.")) s = s.replace(/www\./gi, (m) => `${m.slice(0, 3)}\u2060.`);
  }
  return s;
}
```

## Idle frames log nothing

Every row of the buffer is hashed. If no hash changed since the last frame, the driver returns before it builds a string and never touches the console. An app that is waiting for input makes no calls.

When a row did change, the driver clears the console and logs the new frame:

```ts
const { frame, dirtyRows } = this.encode(buffer, options);
if (frame === null) return SKIPPED;
if (this.clearEachFrame) target.clear();
target.log(frame.format, ...frame.args);
```

Only rows whose hash changed are re-encoded. The others reuse the spans from the previous frame.

## Input

The console doesn't receive keystrokes, so the page collects them. A hidden `<textarea>` takes key presses, paste and IME composition and turns them into key events for the app. Clicking the page focuses it.

## Next

The `@textjs/core` 0.0.x prototypes on npm hold everything in one package. Text.js 0.1 moves the renderer described here into `@textjs/core`, the React reconciler into `@textjs/react`, and adds an App Router.
