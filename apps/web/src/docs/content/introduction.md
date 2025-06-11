Welcome to the Text.js documentation.

Text.js is a React framework for building full-stack, interactive web applications that render entirely inside `console.log`. You write React 19 components, use a file-system App Router, and ship to any static host. Your users open DevTools.

```tsx#counter
import { useState } from "react";
import { Box, Text, useInput } from "textjs";

export default function Page() {
  const [count, setCount] = useState(0);
  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });
  return (
    <Box className="flex-col p-1 border rounded">
      <Text bold>count = {count}</Text>
    </Box>
  );
}
```

> **Good to know:** The preview above is not a screenshot. It is a real console root running the code you see, encoded by the same Turbolog driver that writes to your DevTools. Click it and press `↑`.

## What is Text.js?

Text.js is a framework for building console applications. It provides the building blocks the DOM never could:

- **React 19, fully.** A custom reconciler (`react-reconciler@0.34`) with concurrent rendering, transitions, Suspense and error boundaries — committing into a scene graph instead of `HTMLElement`s.
- **App Router.** `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, dynamic `[id]` segments and `route.ts` handlers, synchronized with `window.history`.
- **Real layout.** Yoga 3.2 compiled to WebAssembly, snapped to integer cells.
- **Turbolog.** A run-length-encoded `%c` compiler that ships every frame as exactly **one** `console.log` call.
- **Zero DOM.** Your application creates no visible DOM nodes. There is nothing to hydrate, nothing to shift, and nothing to style.

## Why console.log?

For two decades, web frameworks have rendered *up* into the Document Object Model: a mutable tree of ~1,500 node types, a cascade with specificity, and a layout engine you do not control. Each generation of tooling has added more machinery to make the DOM behave.

Text.js takes a different position. Every browser already ships a high-performance, monospace, append-only rendering surface with built-in history, filtering and copy support. It is called the console, and it has been sitting in DevTools the whole time.

| | DOM frameworks | Text.js |
| :-- | :-- | :-- |
| Render target | `document.body` | `console.log()` |
| Layout unit | CSS pixel (fractional) | Cell (integer) |
| Styles | Cascading | `%c`, one per span |
| Hydration | Required | Not applicable |
| CLS | Measured | Structurally `0.000` |

## The Inverted Architecture (▼)

Most frameworks point up. Text.js points down.

The `▼` mark is not decoration; it is the data flow. React state flows *down* through the component tree, into a scene graph, through Yoga, into a typed-array cell buffer, and finally *down* into the DevTools console drawer at the bottom of your window.

```text
React 19 Fiber
   ▼  commitUpdate()
SceneNode graph
   ▼  calculateLayout(cols, rows)
Yoga WASM (pointScaleFactor = 1)
   ▼  paintScene()
CellBuffer  (Uint32Array chars · fg · bg · Uint16Array attrs)
   ▼  computeRowHashes()
Row-hash dirty gate ── nothing changed? ──▶ 0 calls
   ▼
RLE %c compiler (cross-newline span merging)
   ▼
console.clear(); console.log(format, ...css)
```

## How to use these docs

The docs are organized into four sections:

- **Getting Started** — [Installation](/docs/installation) and [Project Structure](/docs/project-structure).
- **Building Your Application** — [Routing](/docs/routing), [Loading & Errors](/docs/loading-and-errors), [Route Handlers](/docs/route-handlers) and [Styling](/docs/styling).
- **Components & API Reference** — every PascalCase component and hook, with live previews.
- **Architecture** — [the Turbolog engine](/docs/turbolog-engine) and [OpenCode in the console](/docs/opencode).

> **Good to know:** This documentation is also available inside your console. Press `⌘⌥J`, then `4`, then `/` to search.

## Pre-requisite knowledge

These docs assume familiarity with React and TypeScript. No knowledge of HTML or CSS is required, and none will be used.
