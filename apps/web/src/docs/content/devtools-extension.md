The Text.js DevTools extension adds a **Text.js** panel next to Console. It inspects the app that is rendering in the console.

- **Components:** the React tree of every console root, with props, hooks, keys, and the `tx-box` / `tx-text` scene nodes behind them, laid out in cells.
- **Frame:** the current frame as a cell grid. Hover a cell to see which component painted it. Click to select the node. It is highlighted in the live console.
- **Timeline:** per-frame React, layout, paint and encode times, skipped versus emitted frames, frame pacing and `%c` spans.
- **Controls:** pause and resume output, toggle the layout wireframe, pin or fit the grid size, copy the frame as text.

## Install

The extension is built from `packages/devtools-extension` and loaded unpacked:

```bash
bun run --cwd packages/devtools-extension build
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick `packages/devtools-extension/dist`.
3. Reload your app and open DevTools. The **Text.js** panel appears once the page creates a console root.

The build also writes `release/textjs-devtools-<version>.zip`, ready for the Chrome Web Store.

## Components

Select a component to see its props, its hooks in call order (`State`, `Ref`, `Memo`, `Effect` and so on, with current values) and the scene node it renders, with position, size and box insets in cells. Hovering a row highlights the node in the console. **Host nodes** shows or hides the `tx-box` and `tx-text` elements between components.

The tree refreshes after commits while the panel is open. Values are summaries for display, not live objects.

## Frame

The frame inspector draws the renderer's cell buffer: every glyph, foreground, background and attribute. Hovering a cell reports its character and colors, the scene node on top of it in paint order (respecting `overflow`, scroll offsets and `zIndex`), and the components that rendered that node. Clicking selects the node in **Components** and highlights it in the live console with the renderer's own highlight overlay.

## Timeline

Each bar is one renderer frame:

| Phase | Measures |
| --- | --- |
| React | Synchronous React work flushed at the start of the frame |
| Layout | Yoga layout |
| Paint | Rasterizing the scene into the cell buffer |
| Encode | Building the `%c` format string and calling `console.log()` |

Skipped frames are drawn faded: nothing changed, so nothing was logged. The pacing chart shows the gap between emitted frames against the 66ms minimum interval.

Times stop at `console.log()`. Formatting and painting the message happen inside DevTools and can't be observed from the page, so the timeline does not show them. Concurrent renders that commit between frames are counted as commits, not timed.

## How it works

Like React DevTools, the extension installs a global hook before the page runs:

```ts
globalThis.__TEXTJS_DEVTOOLS_HOOK__
```

Every console root registers with it. The first root on a page loads the code that talks to the panel (about 5 KB gzip) and registers once it arrives. Later roots register as they're created. Without the extension the hook does not exist, so a root checks for it once, loads nothing and does no per-frame work. With the extension installed but the panel closed, frames cost one property read. Trees and frames are only computed when the panel asks for them.

Messages flow page → content script → service worker → panel. The content scripts run on every page so the hook exists before your app boots. That is the only access the extension asks for. It loads no remote code and sends nothing off the machine.

## Privacy

The extension collects no data. It makes no network requests, stores nothing, and has no analytics. Component trees, frames and timings travel only between the page and the DevTools panel in the same browser, and are discarded when you close DevTools. **Copy frame** writes the frame's text to your clipboard when you click it.

## Limitations

- Chrome and Chromium-based browsers, version 111 or later.
- Apps that started before the extension was installed need a reload.
- Only the top frame of a tab is inspected.
- The timeline records frames once the panel is attached.
- Times come from `performance.now()`, which browsers coarsen to about 0.1ms.
