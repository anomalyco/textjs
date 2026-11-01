# Changelog

All notable changes to Text.js are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Versions before 1.0.0 are milestones reconstructed from the commit history; they were never published as separate releases.

## [Unreleased]

### Added

- Stable `TX###` error codes. Every framework error carries a code and a link to `https://textjs.org/errors/<code>`.
- textjs.org: Changelog, Blog (with an RSS feed at `/blog/rss.xml`), Enterprise and Status pages. The Status page runs the real Turbolog pipeline in your browser.
- textjs.org: a Learn chapter video that's playing moves to a mini player in the corner when you scroll past it. The Captions button under each video turns captions on or off and remembers the choice.
- `<TextDevOverlay>` takes `pill`, `shortcut` and `shell` props, so apps without the App Router can mount the inspector with their own keys and theme controls.

### Fixed

- Text that is the last item in a row now keeps its place when it gets shorter. After a `<Spacer>`, it stayed where the longest text had left it, and siblings shrunk to fit an overflowing row stayed shrunk.
- `@textjs/react/testing` loads Yoga when it's imported, so a test can stub `fetch` before its first `render()`.
- textjs.org: file tabs, code blocks and prose tables scroll horizontally only, so iOS Safari never steals vertical page swipes.
- textjs.org: `scrollbar-gutter: stable` applies to mouse devices only. On iOS Safari it made the first scroll jump.

## [1.0.0] - 2026-10-31

The first stable release. `▼ Text.js 1.0.0 (Turbolog)`.

### Changed

- **Breaking:** the framework and CLI package is now `@textjs/next` (`textjs` is taken on npm). Update imports from `textjs` to `@textjs/next`.
- The OpenCode bridge is `bunx @textjs/next proxy` and runs from any directory.
- The console fits the docked DevTools panel by default (bottom, left or right dock, page zoom, toolbar wrap). Undocked DevTools fall back to `120×36`. The pads gained a size control.

### Added

- `useKeymap` with an automatic `?` help screen, key hints and a `Ctrl+K` command palette.
- Data components: `List` (virtualized), `Table`, `Tree`.
- Charts: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, plus `Gradient` and `Image`.
- Controls: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` and toasts.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks for timers, animation, measurement, breakpoints, storage and the clipboard.
- `@textjs/react/testing` for rendering components to text in tests.
- `@textjs/react/terminal` and `text run`, which renders an App Router app in a real terminal.
- `apps/terminal-shop`: the terminal.shop storefront in the console, against the real API (dev sandbox by default, production double-locked).
- textjs.org: build-time prerendering with hydration, self-hosted metric-matched fonts, a pinned docs sidebar, slash-less `.html` routes and seven new docs pages with live previews.

### Performance

- Broke the post-clear DevTools throttle phase lock. After a frame that clears, the renderer waits 110ms once so later frames land on DevTools' immediate path. Display lag p50 went from 63ms to 10ms.
- Damage-band partial paint: only the row bands touched by a mutation are repainted.
- Cached per-row hashes, integer style ids and zero-allocation idle frames.
- Zero idle timers while the page is hidden or unfocused.

### Fixed

- No phantom empty paint-layer spans at row breaks, and no doubled curtain.
- The curtain sits on its own line, so the DevTools source link (`VM12:1`) never wraps row 0.
- The default spinner is cell-exact (Menlo has no braille glyphs). The `braille` variant is opt-in.
- textjs.org: cumulative layout shift is 0 on every route.

## [0.4.0] - 2026-10-31

Zero-flash frames.

### Changed

- Frames are appended instead of `console.clear()` + `console.log()` per frame. DevTools applies a clear synchronously but paints new messages on a 50ms throttle, so clearing flashed an empty console in 70–95% of DevTools paints at 30–120fps. A leading zero-width curtain span hides earlier frames. The console is cleared only on the first frame, after `invalidate()`, at idle once 100 frames are stacked, or at 300.
- Emitted frames are paced to at least 66ms apart (about 15fps). Faster frames restart the DevTools throttle and are dropped: at 30fps DevTools painted fewer distinct frames than at 15fps.
- The Showcase was folded into the Playground (`/showcase` redirects).
- Playground and OpenCode are full-screen focus pads.

### Performance

- Longhand-only span CSS, which cuts the properties DevTools copies onto each line from about 33 to about 7. Hex colors, and blank runs keyed by background only.
- Incremental Markdown parsing and memoized `Markdown`, `Code` and `Diff` rows.
- Single-pass host props, sparse prop updates and no Yoga relayout when text size can't change.
- A streaming frame went from 0.79ms to 0.14ms, a spinner tick from 0.90ms to 0.056ms. Output is bit-identical.

### Added

- `bench/devtools`: a harness that drives the real DevTools frontend and measures blank paints, dropped frames, display lag and DevTools CPU.

### Fixed

- `path:line`, `host:port` and `data:` text is no longer linkified by DevTools.
- The OpenCode bridge finds the managed daemon (ephemeral port, basic auth), sends the CSRF header on writes and reports failures in one line.

## [0.3.0] - 2026-10-31

### Changed

- Discrete input (a keypress, a paste) renders synchronously in the same task, making input about 10× more responsive.
- A pared-back OpenCode TUI that matches the real one.
- A complete mobile and responsive pass over textjs.org.

### Added

- `text proxy`: a local CORS bridge so textjs.org can talk to your OpenCode server.

## [0.2.0] - 2026-10-31

### Added

- `apps/opencode-console`: a connected OpenCode client rendered in `console.log`, with a demo fallback when no server is running.
- textjs.org: landing page, live console companion, Playground, OpenCode page and documentation.
- A GitHub Pages deployment workflow with static route generation.

## [0.1.0] - 2026-10-31

The first milestone.

### Added

- `@textjs/core`: `CellBuffer` on flat typed arrays, Yoga WASM layout, `Intl.Segmenter` text measurement, and the `%c` run-length encoding driver. One `console.log` per dirty frame and none when idle.
- `@textjs/react`: a React 19 reconciler, PascalCase components (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` and more), cell-level Tailwind-style `className` utilities, themes and the DOM `FocusPad`.
- `@textjs/next`: the file-system App Router (`layout`, `page`, `loading`, `error`, `not-found`, dynamic segments, route handlers), `text dev`, `text build`, `text start` and the in-console `[▼]` inspector.
- `create-text-app` with `starter`, `dashboard` and `opencode` templates.
