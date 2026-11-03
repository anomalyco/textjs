# Changelog

All notable changes to Text.js are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Releases 0.1.0 through 0.4.0 were tagged in git and not published to npm.

## [Unreleased]

### Added

- Console roots cover the frame's last row with "Click the page to use the keyboard" while DevTools or another window has focus, so a visitor who clicks the app in the console knows why keys stopped working. It shows only when the input engine reads keys from the page, never during server rendering, in tests or in a terminal. Turn it off with `focusHint: false` in `createConsoleRoot` options or `text.config.ts`.
- `@textjs/react`: `usePageFocus()` returns whether the page has focus. `<FocusHint active={…}>` draws the bar yourself, for apps that want the keyboard only some of the time.

## [1.2.0] - 2026-11-02

### Added

- `@textjs/core`: `bindTextSink(element, onText)` reads text committed by an IME or a dead key from a hidden textarea or input, once per commit and never mid-composition. `engine.bindTextSink(element)` connects a textarea you render yourself to an `InputEngine`. Both return a function that removes the listeners.
- `@textjs/app`: `POST /__textjs/input` accepts `{ type: "text", text }` for IME and dead-key text. `InputMessage` and `parseInputMessage` in `@textjs/app/frame-protocol` include it.

### Changed

- `@textjs/app`: middleware and route handlers get the canonical path. `/docs/` and `/docs//intro` arrive as `/docs` and `/docs/intro`, so middleware that redirects to add a trailing slash now redirects forever. Remove that redirect. A dynamic segment can't contain an encoded slash: `/files/a%2Fb` returns `400`.
- `@textjs/app`: with middleware, `--adapter cloudflare` sends every request to the worker, including hashed assets, and with a `basePath` it also sends requests outside the base path. Each request that runs the worker is one Functions invocation and counts toward your Workers request quota. On the Workers Free plan, set the Pages project to fail closed (Settings → Runtime → Fail open / closed), or Pages serves your files without middleware once the daily quota runs out.

### Fixed

- Chinese, Japanese and Korean IMEs and dead keys work in textjs.org's inline consoles. The consoles cleared the textarea mid-composition, so the app got the raw letters or the wrong character.
- `<FocusPad>` keeps keyboard focus on the app after a click. It used to drop focus right away, so Chinese, Japanese and Korean IMEs couldn't compose text.
- Dead keys that don't compose (Windows, and Linux without an IME) reach the app with the hidden textarea focused. On US-International, `'` then `e` gives `é` and `'` then `t` gives `'t`. `InputEngine` blocked the keydown that completes a dead key, so the browser inserted nothing. `DeadKeyTracker` in `@textjs/core` lets that keydown through, and the VS Code preview uses it too.
- The VS Code preview delivers IME and dead-key text, which it used to drop, and no longer forwards dead keys or IME composition keystrokes to the app. With a `text dev` server from `@textjs/app` 1.1.0 or earlier, it sends the text as key presses or a paste.
- `@textjs/core`: `InputEngine.handleTextInput` ignores text while `shouldCapture` returns `false`, as key and paste input already did.
- `text dev` pre-bundles `@textjs/app/live-stub` and `@textjs/app/live-player`. An app with a `runtime = "server"` page found them only after the first page load, so Vite bundled them again mid-load, which caused 404s for stale chunks and an "Invalid hook call" from two copies of React.
- Charts and spinners fit the frame on Windows. Consolas has no ▁▂▃▅▆▇ blocks, quadrants, braille, ▶ or ✓, so Windows drew them in fallback fonts up to 1.8 cells wide and chart rows ran past the frame's right edge. The console font stack is now `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`, and Windows 11 draws the whole frame in Cascadia Mono. `<ConsoleMirror>`, the VS Code preview and the DevTools extension's frame view also put Cascadia Mono before Consolas.
- `@textjs/opencode`: under Node on Windows, the bridge finds an OpenCode installed with `npm i -g opencode-ai`. Node can't start npm's `opencode.cmd` shim by name, so the bridge behaved as if OpenCode wasn't installed. It now searches `PATH` with each `PATHEXT` extension and runs `.cmd` shims through `cmd.exe`. Under Bun (`bunx`) it already worked.
- `text build` works on Windows. It failed for every template, with `Could not resolve entry module "virtual:textjs/api"` or with no error message.
- `text build` prints the error when prerendering console shells or building server-rendered routes fails. Before, it exited with code 1 after Vite's "Build failed" line, without the reason.
- `text dev` on Windows re-renders server-rendered routes when you edit a file, and reloads the browser when a page changes its `runtime` export.
- `text dev` on Windows no longer runs `middleware.ts` for source files Vite serves as modules, such as `/app/page.tsx`, so an auth redirect no longer breaks the dev client.
- `text run` and `text mcp` work when the project path contains a Windows 8.3 short name, such as `C:\Users\RUNNER~1`. They showed "Application error" because the CLI and the app loaded `@textjs/app` twice.
- A `dist/` built on Windows serves its prerendered pages on Linux and macOS. The live route manifest stored its paths with backslashes.
- `text build` works when the `vite` option in `text.config.ts` sets `build.rollupOptions.input`. The input replaced the entries of the API, server-rendered route and adapter bundles, and the build failed.
- `text dev` exits when you stop it in the first seconds after a page load, and `server.close()` resolves. Closing Vite while it optimized newly discovered dependencies never finished (vitejs/vite#22934).

### Security

- `@textjs/app` 1.1.0 and earlier let a request skip `middleware.ts` by writing a protected path another way, such as `/ad%6din`, `/api//admin` or `/admin%2Fx`. Middleware matched the path as sent, while pages, route handlers and static files were looked up after decoding it (twice for route handlers). This affected `text dev`, `text start` and `--adapter bun`, `vercel` and `cloudflare` builds. Static builds can't use middleware and aren't affected. Upgrade to 1.2.0, then rebuild and redeploy: `.vercel/output` for Vercel, `dist/` for Cloudflare Pages, and the whole `dist/` for Bun (restart the server). Delete old deployments that are still reachable at their own URLs, or protect them.
- Every host now works out one canonical pathname per request and uses it for the matcher, `request.nextUrl` and every lookup. It decodes percent-escapes and re-encodes the path the way `new URL()` writes it, resolves `.` and `..` segments, and removes repeated and trailing slashes. Paths with `%2F`, `%5C` or invalid percent-encoding get a `400`. `text dev`, `text start` and the Bun adapter serve static files only under their exact name, so on macOS and Windows `/ADMIN/report.txt` no longer serves `public/admin/report.txt`.
- Matchers, rewrite sources, route segments and `basePath` are compared in the same encoded form as request paths, so `matcher: "/café/:path*"` and `"/caf%c3%a9/:path*"` guard `/caf%C3%A9`, and `"/ops%40corp/:path*"` guards `/ops@corp`. Middleware without a matcher doesn't run outside `basePath`. A matcher with a trailing slash, such as `/admin/`, matches `/admin`, and a `host` condition ignores a trailing dot in the host name.
- A live session for a `runtime = "server"` route doesn't render a page that middleware rewrote to another path or query, such as a rewrite from `/restricted` to `/login`, or answered with an error status such as `NextResponse.next({ status: 403 })`.
- `--adapter vercel`: the route handler function gets its path in a request header that only the generated routes set, so `/api/x/%252e%252e/admin` no longer reaches `/api/admin`, and no spelling of `/_textjs/*` runs the function. Generated routes match case-sensitively, so `/LEGACY/x` no longer hits a rewrite for `/legacy/:path*` that middleware never checked. Every path that may not be canonical, including raw characters such as `{`, goes through the edge middleware, which now ships with every Vercel build and rewrites the request to its canonical path.
- `--adapter cloudflare`: static files are looked up with the encoded path, so `/x/%252e%252e/admin/report.txt` no longer serves `/admin/report.txt`. With a `basePath`, files outside it are no longer served without the worker.
- `text dev` doesn't serve `public/` files under `/public/…` or `/@fs/…`, server-only sources such as `middleware.ts` and `text.config.ts` in another case, under an encoded `/@fs/` path, as extensionless module requests (`/text.config?import`) or through a config rewrite, or route handlers outside `basePath`.

## [1.1.0] - 2026-11-02

### Added

- Text.js renders in the Firefox and Safari consoles. `CssConsoleDriver` detects the browser with CSS feature checks. Where `%c` spans stay inline, it writes 14px line heights without margins, turns off soft wrapping and uses a `line-height: 100vh` curtain.
- Responsive sizing leaves room for Firefox's source link column. Safari puts Menlo first in the font stack: its pages can't use a user-installed SF Mono, which Web Inspector may draw with.
- Pass `browser: "chromium" | "firefox" | "safari"` to `createConsoleRoot`, `ConsoleRenderer` or `CssConsoleDriver` to choose a console.
- Prerendered shells carry the CSS for both kinds of console.
- `<FocusPad>` shows the console shortcut for the visitor's browser: ⌘⌥K or Ctrl+Shift+K in Firefox, and ⌘⌥C in Safari with a note to turn on "Show features for web developers".
- A prerendered `<FocusPad>` renders every browser's shortcut. Set `data-browser` (`firefox` or `safari`) and `data-os` (`mac`) on `<html>` before first paint to show only the visitor's; without them it shows Chrome's Windows and Linux shortcut until it hydrates.

### Fixed

- ⌘⌥K and Ctrl+Shift+K (Firefox's console shortcut) pass through to the browser instead of reaching the app.
- Responsive sizing learns browser toolbars under 60px tall (Safari's and Firefox's) while DevTools is closed, so a console docked at the bottom gets every row it fits. `<FocusPad>` uses the learned height to tell whether DevTools is docked.
- `<FocusPad>` writes Windows and Linux shortcuts in its click state as `Ctrl+Shift+J`.

### Security

- `@textjs/opencode`: the bridge prints a pairing code when it starts, and textjs.org/opencode asks for it on the first connect. Until a page sends the code, the bridge answers `428` and forwards nothing to OpenCode, even for allowed origins. Each code is good for one bridge run, the token it returns works only from the origin that paired, and ten wrong codes lock pairing until the bridge restarts.
- `@textjs/opencode`: Cloudflare Pages preview deployments of textjs.org are no longer allowed by default. Pass `--allow-origin` to use one.
- textjs.org/opencode refuses bridges from `@textjs/opencode` 1.0.x. Run `bunx @textjs/opencode@latest proxy`.
- textjs.org sends a Content-Security-Policy, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`. The OpenCode page connects only to servers on `127.0.0.1` or `localhost`.

## [1.0.4] - 2026-11-01

### Added

- OpenCode Lite: review per-file diffs, browse prompt history, configure leader shortcuts and manage provider accounts and MCP servers. The sandbox includes a scripted terminal pane.
- OpenCode Lite: type `/` to search commands or `@` to attach a project file. Tab opens a directory in the file menu. Connected sessions search the server's project; the sandbox searches its example repository.
- textjs.org/coffee: the terminal.shop demo follows the console size like the SSH app, with its small, medium and large layouts and "your terminal is too small" under 20 × 10. The account adds payment methods, a profile with an editable name and weekly schedule changes for subscriptions. Signed out, the cart and the account's faq, about and debug info open without signing in.

## [1.0.3] - 2026-11-01

### Performance

- `@textjs/react`: `Box` and `Text` pass pre-stripped scene props to the reconciler instead of copying prop objects on mount and update.
- `@textjs/core`: `SceneNode.getTextModel()` skips inline tree walks on single-string `<Text>` leaves and reuses cached zeroed `Uint16Array` `runOf` buffers. `CssConsoleDriver` scans consecutive BMP cells with matching style in an inner loop, and `ConsoleRenderer` skips `countYogaNodes()` on unchanged frames.
- textjs.org: routes and console companion tabs split into per-route JS and CSS chunks. Store photos are re-encoded from the `photos/final` masters, and secondary product shots load on hover or slide change.

### Fixed

- `<ViewportControl>` uses a pixel `minWidth` instead of `20ch` and lists the metric-matched fallback fonts alongside `<FocusPad>`, so the size picker keeps its width when `Geist Mono` loads.

## [1.0.2] - 2026-11-01

### Added

- `@textjs/opencode`: the textjs.org/opencode bridge as its own package with no dependencies. Run `bunx @textjs/opencode proxy` (or `npx`) to start it without installing Vite, React and the MCP SDK. `text proxy` still works and runs the same bridge.

### Changed

- The framework and CLI package is now `@textjs/app`, renamed from `@textjs/next` so the name doesn't suggest an official Next.js integration. `@textjs/next` is deprecated in favour of `@textjs/app` and gets no new releases. To switch, run `bun remove @textjs/next && bun add @textjs/app` and replace `@textjs/next` with `@textjs/app` in imports, including subpaths such as `@textjs/app/link`. The CLI is still `text`, and create-text-app templates depend on `@textjs/app`.
- The in-console `[▼]` pill and inspector are called the Dev Overlay, and the inspector's title reads `▼ Dev Overlay · Turbolog`. Text.js DevTools is the name of the Chrome extension only. `<TextDevOverlay>` and its props are unchanged.
- Route handlers that export `dynamic = "error"` fail with `TX031`. Text.js treated it as `"force-static"` without checking whether the handler reads the request, which is what the value means in Next.js. Use `"force-static"`.

### Fixed

- `text start` answers a blocked `Host` with `TX028`, like `text dev`. Each server names the setting it reads: `vite.server.allowedHosts` for `text dev` and `server.allowedHosts` for `text start`.
- textjs.org: the Learn Shipping chapter no longer tells you to add a `vercel.json` rewrite. On Vercel and Cloudflare Pages, `text build` writes the `index.html` fallback itself. The rewrite example now uses Netlify's `_redirects`.
- `eslint-plugin-textjs`: `route-handler-exports` allows the `dynamic` and `revalidate` exports in `route.ts`, and `valid-route-module` checks `dynamic` values there.

## [1.0.1] - 2026-11-01

### Added

- textjs.org: a Learn chapter video that's playing moves to a mini player in the corner when you scroll past it. The Captions button under each video turns captions on or off and remembers the choice.
- `<TextDevOverlay>` takes `pill`, `shortcut` and `shell` props, so apps without the App Router can mount the inspector with their own keys and theme controls.
- `<FocusPad>` takes a `banner`, shown as the first row of the message (for example an app's wordmark) and above the notice on touch devices.

### Changed

- textjs.org: the Playground picker lists Dashboard, Streaming, Snake, OpenCode and Coffee (terminal.shop). Each demo has its own URL: OpenCode is at `/opencode` and terminal.shop at `/coffee`, and their wordmarks head the message. Counter and Form moved out of the Playground; the docs still run both as live examples.
- `<FocusPad>` has a new layout. Each state shows a three-part progress bar, a headline, one large element and a line of text. Before the console is open, the large element is the DevTools shortcut. Waiting for a click, it's a pointer. Once live, it's the app's `hints` as keycaps that light up as keys arrive, and keys without a hint are echoed below. The step labels, the separate "Live" badge and the "Watch the console." line are gone. Rows fade in on state changes, never on first paint, and motion is off under `prefers-reduced-motion`. Secondary text meets WCAG AA contrast in both appearances, and the console size picker shows a focus ring when it's reached with the keyboard.
- textjs.org: the Playground uses the new `<FocusPad>` layout. The picker's current demo has the keycaps' surface, the OpenCode command field matches the URL field's corners and type size, the terminal.shop note takes two lines instead of three, "View source" sits on the size control's baseline, and quiet text in the pad meets AA contrast.

### Fixed

- `text dev` serves `proxy` paths through the proxy for every request. `fetch()` sends `Accept: */*`, so the dev server answered them with the app's HTML first, and the opencode template failed on its first run with "Unexpected token '<'".
- `text dev` no longer loads a second copy of React when Vite's dependency scan reads a server-only file. The scan tripped the server-only import check, which printed a stack trace, then "Invalid hook call" in the console, and broke Fast Refresh.
- `text dev` handles page URLs with a query string, such as `/?demo`. Vite treated them as the project folder and watched the whole disk, so on Linux the page never loaded.
- create-text-app: the dev pill no longer covers the first key hint on any template's first screen, the default project name is `my-app` to match the docs, the templates pass `eslint-plugin-textjs`'s recommended config, and the dashboard README explains the `--adapter static` build.
- `<FocusPad>` and `<ViewportControl>` set borders with longhand properties only. React warned "Updating a style property during rerender (border)" in development every time a key hint flashed.
- Text that is the last item in a row now keeps its place when it gets shorter. After a `<Spacer>`, it stayed where the longest text had left it, and siblings shrunk to fit an overflowing row stayed shrunk.
- `<FocusPad>` replaces its steps, subtitle and key rows when `action` or `hints` change, so switching demos in one pad is not reported as a layout shift.
- `@textjs/react/testing` loads Yoga when it's imported, so a test can stub `fetch` before its first `render()`.

## [1.0.0] - 2026-10-31

The first stable release. `▼ Text.js 1.0.0 (Turbolog)`.

### Changed

- **Breaking:** the framework and CLI package is now `@textjs/next` (`textjs` is taken on npm). Update imports from `textjs` to `@textjs/next`.
- The OpenCode bridge is `bunx @textjs/app proxy` and runs from any directory.
- The console fits the docked DevTools panel by default (bottom, left or right dock, page zoom, toolbar wrap). Undocked DevTools fall back to `120×36`. The pads gained a size control.

### Added

- `useKeymap` with an automatic `?` help screen, key hints and a `Ctrl+K` command palette.
- Data components: `List` (virtualized), `Table`, `Tree`.
- Charts: `LineChart`, `BarChart`, `Sparkline`, `ProgressBar`, plus `Gradient` and `Image`.
- Controls: `Button`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Dialog`, `Confirm` and toasts.
- Layout: `Center`, `Stack`, `Grid`, `SplitPane`, `FocusScope`.
- Hooks for timers, animation, measurement, breakpoints, storage and the clipboard.
- Right-to-left text. Text.js implements the Unicode Bidirectional Algorithm (UAX #9, Unicode 18.0) and passes all 770,241 `BidiTest.txt` and 91,707 `BidiCharacterTest.txt` cases. Arabic is shaped, and `<Text dir>` isolates a span.
- Stable `TX###` error codes. Framework errors carry a code and a link to `https://textjs.org/errors/<code>`.
- `@textjs/react/testing` for rendering components to text in tests.
- `@textjs/react/terminal` and `text run`, which renders an App Router app in a real terminal.
- `text mcp`, which serves an app over the Model Context Protocol so coding agents can navigate it, press keys and read frames without a browser.
- The Text.js DevTools extension, a panel next to Console with the component tree, a frame inspector and a timeline.
- `eslint-plugin-textjs` and a VS Code extension with live previews.
- `apps/terminal-shop`: the terminal.shop storefront in the console, against the real API (dev sandbox by default, production double-locked).
- textjs.org: Learn, a 10-chapter course that runs in the console. Build-time prerendering with hydration, self-hosted metric-matched fonts, slash-less `.html` routes and new docs pages with live previews.

### Performance

- Broke the post-clear DevTools throttle phase lock. After a frame that clears, the renderer waits 110ms once so later frames land on DevTools' immediate path. Display lag p50 went from 63ms to 10ms.
- Damage-band partial paint: only the row bands touched by a mutation are repainted.
- Cached per-row hashes, integer style ids and zero-allocation idle frames.
- Zero idle timers while the page is hidden or unfocused.

### Fixed

- No phantom empty paint-layer spans at row breaks, and no doubled curtain.
- The curtain sits on its own line, so the DevTools source link (`VM12:1`) never wraps row 0.
- The default spinner is cell-exact (Menlo has no braille glyphs). The `braille` variant is opt-in.
- `text build` on Node no longer bundles React's development builds.
- textjs.org: cumulative layout shift is 0 on every route. Playground and OpenCode share one pad layout.
- textjs.org: the docs and Learn sidebars stay pinned at the bottom of long pages.
- textjs.org: file tabs, code blocks and prose tables scroll horizontally only, so iOS Safari never steals vertical page swipes.
- textjs.org: `scrollbar-gutter: stable` applies to mouse devices only. On iOS Safari it made the first scroll jump.
- textjs.org: scroll anchoring is off. On iOS Safari it pinned the hero under the sticky header.

## [0.4.0] - 2026-05-19

Zero-flash frames and server rendering.

### Changed

- Frames are appended instead of `console.clear()` + `console.log()` per frame. DevTools applies a clear synchronously but paints new messages on a 50ms throttle, so clearing left the console blank in 70.6% of DevTools paints at 15fps and 81.1% at 60fps. A leading zero-width curtain span hides earlier frames. The console is cleared only on the first frame, after `invalidate()`, at idle once 100 frames are stacked, or at 300.
- Emitted frames are paced to at least 66ms apart (about 15fps). Faster frames restart the DevTools throttle and are dropped: at 60fps DevTools painted 67 of 295 emitted frames.
- Playground and OpenCode are full-screen focus pads.

### Performance

- Longhand-only span CSS, which cuts the properties DevTools copies onto each line from about 33 to about 7. Hex colors, and blank runs keyed by background only.
- Incremental Markdown parsing and memoized `Markdown`, `Code` and `Diff` rows.
- Single-pass host props, sparse prop updates and no Yoga relayout when text size can't change.
- A streaming frame went from 0.79ms to 0.14ms, a spinner tick from 0.90ms to 0.056ms. Output is bit-identical.

### Added

- Server rendering. A page that exports `runtime = "server"` renders on the server, including `async function` components, and streams row-level cell deltas over server-sent events to a frame player of about 19 kB gzip.
- Partial Prerendering. `text build` inlines each static route's first frame into its HTML, so the console paints before any module loads.
- `middleware.ts`, route segment config (`dynamic`, `revalidate`) and `textjs/cache` (`unstable_cache`, `revalidateTag`, `revalidatePath`).
- `text build --adapter static|bun|vercel|cloudflare`.
- `bench/devtools`: a harness that drives the real DevTools frontend and measures blank paints, dropped frames, display lag and DevTools CPU.

### Fixed

- `path:line`, `//host:port` and `data:` text is no longer linkified by DevTools.
- The OpenCode bridge finds the managed daemon (ephemeral port, basic auth), sends the CSRF header on writes and reports failures in one line.

## [0.3.0] - 2025-11-18

### Changed

- Discrete input (a keypress, a paste) renders synchronously in the same task instead of waiting for the next animation frame.
- A pared-back OpenCode TUI that matches the real one.
- A complete mobile and responsive pass over textjs.org.

### Added

- `@textjs/font`: a FIGlet font parser and renderer with 17 bundled fonts, for `<FigletText>` and `<AsciiFont>`. Output matches 273 references recorded from the `figlet` 2.2.5 binary.
- `text proxy`: a local CORS bridge so textjs.org can talk to your OpenCode server.

## [0.2.0] - 2025-07-15

### Added

- `apps/opencode-console`: a connected OpenCode client rendered in `console.log`, with a demo fallback when no server is running.
- An `opencode` template for `create-text-app`.
- textjs.org: a new landing page, the live console companion, Playground, OpenCode page and documentation.
- A GitHub Pages deployment workflow with static route generation.

## [0.1.0] - 2025-03-25

The first milestone.

### Added

- `@textjs/core`: `CellBuffer` on flat typed arrays, Yoga WASM layout, `Intl.Segmenter` text measurement, and the `%c` run-length encoding driver. One `console.log` per dirty frame and none when idle.
- `@textjs/react`: a React 19 reconciler, PascalCase components (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner` and more), cell-level Tailwind-style `className` utilities, themes and the DOM `FocusPad`.
- `textjs`: the file-system App Router (`layout`, `page`, `loading`, `error`, `not-found`, dynamic segments, route handlers), `text dev`, `text build`, `text start` and the in-console `[▼]` inspector.
- `create-text-app` with `starter` and `dashboard` templates.
