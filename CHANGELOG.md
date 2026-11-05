# Changelog

All notable changes to Text.js are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Releases 0.1.0 through 0.4.0 were tagged in git and not published to npm.

## [Unreleased]

### Added

- `@textjs/core/experimental`: `onConsoleIntent(onIntent, options)` calls `onIntent` once when a visitor wants the console, so a page can download its console app only then. It fires when DevTools is docked on load or docks later (`"dock"`), and on the DevTools shortcuts F12, Ctrl+Shift+J, I, C or K, and ⌘⌥J, I, C or K on a Mac (`"shortcut"`). It also fires on a click on a `[data-textjs-engage]` element, a `<text-console>` element or a `<FocusPad>`, on Enter or Space on a `[data-textjs-engage]` button, and when a size is picked in `<ViewportControl>` before the console starts (`"engage"`). Reloads in a tab where one of those already happened fire `"session"`. Nothing fires on its own on touch screens. Call the handle's `trigger()` to load the app there. `prefetch` warms the app's chunks when the pointer reaches a console surface, and `canPrefetchConsole()` reports whether prefetching suits the device and connection. `CONSOLE_INTENT_KEY` is the `sessionStorage` key it uses. See [Loading on console intent](https://textjs.org/docs/hooks-and-repl#loading-on-console-intent-experimental).
- `@textjs/app` (experimental): `text build --embed`, or `embed` in `text.config.ts`, builds the app as one tag for another site: `<script type="module" src="https://your-host/embed.js"></script>`. `embed.js` logs the route's first frame, prerendered at build time (unless `ppr: false` or middleware could match `embed.initialPath`), and doesn't load the runtime until `onConsoleIntent` fires. Then it imports the app, with its own React 19 and no `react-dom`, and fetches `yoga.wasm` at the same time. On console intent, that app loads 112.8 kB of JavaScript and 29.0 kB of WebAssembly (gzip). The bidi engine, another 10.1 kB, loads the first time the app shows right-to-left text. When `embed.initialPath` is a route with `export const runtime = "server"`, `embed.js` loads the 22.7 kB frame player instead, which streams from the server `embed.js` came from. Navigation stays inside the console and doesn't change the host page's URL, history or title, and in client-rendered apps absolute URLs open in a new tab. Keys reach the app only after the visitor presses a `[data-textjs-engage]` element, a `<text-console>` element or a `<FocusPad>`, or clicks the page to bring focus back from DevTools, and never while they type in the page's own fields or a `[data-textjs-bypass]` element. `embed.js` loads its other files relative to its own URL, so the output works from any path or origin. The output is `embed.js` and `assets/`, with no `index.html` or `404.html`. A build whose first route renders on the server, or that has route handlers or middleware, also keeps `.text/` (the server bundles) for `text start` or the Bun adapter. `assets/embed-[hash].js` is the same script under a hashed name that can be cached forever. `embed.standalone` keeps the app's own pages, `embed.initialPath` picks the route, `embed.globalName` renames or removes `window.text`, and `embed.initialClear` clears the page's console first. For a bordered status box at 120×36, `embed.js` is 2.9 kB (gzip), or 2.2 kB with `ppr: false`. On touch screens, `embed.js` logs nothing and never loads the runtime, so the app doesn't open there. Pages on other sites can open its live session only if their origin is in `embed.allowOrigins`, and `embed.credentials` sends their cookies. `embed.js` and `assets/*` are served with `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`. `text start` and the Bun, Cloudflare and Vercel adapters serve an embed build with `embed.js` revalidated on every request and `assets/*` cached as immutable, and the static adapter writes the same headers to `_headers`. See [Embedding](https://textjs.org/docs/embedding).
- `@textjs/app` (experimental): `<text-console>` shows visitors how to reach an embedded app from the host page, or with `mirror`, shows the app itself. `embed.js` defines the tag and loads its 4.0 kB (gzip) file only when one is on the page. Without attributes it's a one-line bar. It shows the browser's shortcut for opening the console, then asks for a click, then lists the app's `hints` as keys that light up as they reach the app. With `mirror` it shows `embed.js`'s first frame before anything else loads, then the running app's frames. With `ppr: false`, a mirror is blank until the app paints. Clicking the mirror starts the app and sends it the visitor's keys, so the app works with DevTools closed. `chrome` draws a DevTools window around the mirror and implies `mirror`. The `title`, `hints` (`"← →:switch region, Enter:open"`) and `action` attributes fall back to `text.config.ts`. It uses Shadow DOM and constructed stylesheets instead of React, so the page's CSS doesn't reach inside and a `style-src 'self'` policy needs no changes. It's dark by default. Restyle it with `color-scheme: light`, `--text-console-bg` and `--text-console-fg`, or `::part(frame)`. Its size doesn't depend on fonts or content: the bar is 58px tall and a mirror keeps the app grid's aspect ratio, so the one line of CSS `text build --embed` prints reserves its space on the host page before it loads (`reserveCss()` in `@textjs/app/experimental` returns the same line). On touch screens a mirror shows the first frame and doesn't start the app, and the bar is hidden. See [`<text-console>`](https://textjs.org/docs/embedding#text-console).
- `@textjs/app` (experimental): `text dev --embed` serves `/embed.js` with a fresh first frame on each request, and a preview page that loads it the way another site would, with a `<text-console mirror>` on it. The preview is at `/`, or `/__textjs/embed` with `embed.standalone`.
- `@textjs/app`: `<AppRouter openExternal>` decides how URLs on other origins open (default `window.location.assign`). With in-memory history, every absolute URL counts as external, since the page's address isn't the app's.
- `@textjs/app/experimental`: exports `bootEmbedClient`, `bootEmbedPlayer`, `createHostInput`, `startEmbed`, `createTextConsoleMount` and `reserveCss` for pages that load an embedded app themselves.
- `@textjs/core/experimental`: `CONSOLE_OWNER` (`Symbol.for("textjs.consoleOwner")`) records which app renders into the page's console, and `claimConsole()` takes it. A `ConsoleRenderer` on the global console and a frame player that owns its page claim it, so a host app that starts takes the console from an embed, which then unmounts, detaches its input and removes its `window.text`. An embed doesn't start while another app holds the console.
- `@textjs/react`: `<ViewportControl>` works before the console root exists. Picking a size saves it, fires `"engage"` for `onConsoleIntent` and applies the size once `root` is set. `<FocusPad sizeControl>` gets this too, so its size menu no longer sits disabled until the console starts.
- `@textjs/core`: `initYoga({ wasm })` loads Yoga from a URL, its bytes, a `Response` or a compiled `WebAssembly.Module`. The WebAssembly file is exported as `@textjs/core/yoga.wasm`. When it can't be loaded, `initYoga()` rejects with [TX032](https://textjs.org/errors/TX032).
- `@textjs/core`: `loadBidi()` starts downloading the bidi engine before any right-to-left text renders, so that text's first frame is in display order. It resolves at once in builds that include the engine (server rendering, `text run`, tests). See [Loading the bidi engine](https://textjs.org/docs/internationalization#loading-the-bidi-engine).

### Changed

- `@textjs/react`: console roots load the code that talks to the Text.js DevTools extension only when the extension's hook is on the page, so in code-split builds such as `text build`, visitors without the extension don't download it. With the extension, the first root on a page registers once that file (about 5 KB gzip) loads. Later roots register as they're created. The starter template's client JavaScript is 4.2 KB smaller (gzip), the `text build --embed` client 4.1 KB smaller, and textjs.org's console app 3.8 KB smaller.
- `@textjs/core`: the console driver checks whether the console font fits a glyph that may need a stand-in (eighth blocks, quadrants, braille, ▶, ✓ and similar) the first time that glyph appears, instead of measuring all of them on the first frame. Drivers that use the same font size and family share the results. A frame without those glyphs makes no stand-in measurements, so the first frame of textjs.org's home console takes 1.2 ms instead of 9.2 ms in headless Chromium on an M5 Pro Mac mini, and 4.8 ms instead of 38.4 ms with the CPU throttled 4×. On Windows 10, where Consolas lacks those glyphs, frames that use them get the same stand-ins as before, from the first frame.
- `@textjs/core`: `isRtlCodePoint` and `hasRtl` look up 59 right-to-left ranges generated from the Unicode 18.0 data, and no longer load the bidi tables. They return the same result for every code point. `<ConsoleMirror>` on its own bundles 2.1 KB less JavaScript (gzip), and the frame player for server-rendered routes 1.6 KB less.
- `@textjs/app`: `text build` leaves the Dev Overlay and the Redbox out of production builds. They only appear in `text dev`, but every build used to bundle them. The starter template's client JavaScript is 4.3 KB smaller (gzip) and `examples/dashboard`'s is 3.0 KB smaller. An app that renders `<AppRouter>` itself drops them too when its bundler sets `process.env.NODE_ENV` to `"production"` (the default in `vite build` and webpack, `esbuild --minify`, and `bun build --production`). In those builds, `<AppRouter devOverlay>` renders nothing (pass `devOverlay={<TextDevOverlay />}` to keep it), `errorStore` defaults to `null`, and `bootTextApp` ignores `dev: true`.
- textjs.org: the home page and docs pages load 12.9 KB less JavaScript up front (gzip). Their console mirrors used to preload the 13.5 KB bidi chunk and now preload 0.6 KB.
- `@textjs/core`, `@textjs/app`: Text.js apps (`text dev`, `text build`) load Yoga as a separate `.wasm` file instead of a base64 copy inside the JavaScript. `text build` emits `assets/yoga-[hash].wasm` and preloads it from the HTML. With gzip on both files, the starter app downloads 11.4 KB less and parses 95 KB less JavaScript. Other bundlers keep the inline copy, except those that resolve the `workerd` condition (Wrangler), which import `yoga.wasm` as a module. Apps that bundle `@textjs/core` with Vite or webpack can load the `.wasm` file too by adding the `@textjs/client` resolve condition. See [WebAssembly](https://textjs.org/docs/deploying#webassembly).
- `@textjs/core`: a `ConsoleRenderer` no longer takes over `window.text` from a live renderer in another bundle, such as an embed next to the page's own app.
- `@textjs/core/experimental`: `onConsoleIntent` no longer pulls the viewport sizing code into its chunk when the app it loads is code-split from it. In a Vite build where the entry calls `onConsoleIntent` and lazily imports a `ConsoleRenderer`, the entry chunk is 2.8 KB instead of 12.4 KB (gzip).
- `@textjs/react`: `@textjs/react/dom` moves the viewport choice helpers (`loadViewportChoice`, `saveViewportChoice`, `parseViewportChoice`, `formatViewportChoice`, `applyViewportChoice`, `VIEWPORT_CHOICE_KEY` and `VIEWPORT_PRESETS`) into their own module. An app that imports them in one chunk and renders `<ViewportControl>` or `<FocusPad>` in another no longer gets the control's code in the first chunk. On textjs.org that moves 1.9 KB (gzip) out of the entry chunk. The exports are unchanged.
- `@textjs/core`: depends on exactly `yoga-layout` 3.2.1, because `yoga.wasm` and its loader are generated from that version.
- `@textjs/app`: `text build`'s First Load JS includes `.wasm` files.
- `@textjs/app`: with `--adapter cloudflare`, a worker whose route handlers use Yoga is written as a `dist/_worker.js/` directory holding `index.js` and `yoga.wasm`, which Cloudflare loads as a compiled module. Workers that don't use Yoga are still a single `dist/_worker.js` file.
- textjs.org: the console loads Yoga as a `.wasm` file, which makes its download 9.3 KB smaller (gzip), and the Content Security Policy no longer allows `data:` in `connect-src`.
- textjs.org: the DevTools console app loads when DevTools is docked, when you press a DevTools shortcut, or when you click a console preview, a pad, the Console button or Run in console. After that, reloads in the same tab load it straight away. Touch screens don't load it on their own. Until it loads, the home page's console preview shows the app's first frame, rendered at build time, so the frame is there before first paint. The search dialog, the logo menu, the Learn quizzes, the error pages' causes and fixes, and the docs, blog and store descriptions no longer load up front. The home page loads 116.6 KB of JavaScript up front instead of 293.7 KB of JavaScript and WebAssembly (gzip), in 10 files instead of 37, and `/docs/routing` loads 116.7 KB instead of 301.4 KB. In headless Chromium with the CPU throttled 4× and a desktop viewport, the home page runs 177 ms of script instead of 235 ms and its JavaScript heap is 2.5 MB instead of 4.2 MB.
- `@textjs/core`, `@textjs/app`: Text.js apps (`text dev`, `text build`) download the bidi engine and its Unicode tables, a 10.1 KB chunk (gzip), the first time a page shows right-to-left text. Apps used to load them up front. The starter template now loads 9.3 KB less JavaScript on its first visit (gzip). Right-to-left text that appears before the chunk arrives paints in logical order, then the console repaints it in display order. Server rendering, `text run`, tests and bundles without the `@textjs/client` resolve condition keep the engine in the bundle, so their output doesn't change.
- textjs.org: the DevTools console app downloads 13.4 KB less JavaScript when it starts (gzip), because it loads the bidi engine only when it shows right-to-left text. The Bidirectional text example on the internationalization page loads it when it scrolls into view.
- `@textjs/react/testing`: `render()` waits for the bidi engine when it's downloading, so frames are in display order under the `@textjs/client` condition too.
- `@textjs/app`: a prerendered shell with right-to-left text has the client start downloading the bidi engine as it boots, alongside Yoga, so the first client frame repaints the shell in display order. `embed.js` does the same for its first frame.

### Fixed

- `@textjs/app`: a server-rendered route's frame player no longer logs a frame that was waiting on its pacing timer after `text.pause()`, after the tab is hidden, or after it's disposed. An embed the page's own app took the console from could log one more frame over that app's.
- `@textjs/core`: Safari at 115% page zoom with DevTools closed no longer looks like DevTools docked at the side, so responsive sizing keeps its fallback size instead of fitting a panel that isn't there.

## [1.5.0] - 2026-11-03

### Added

- `@textjs/react`: `<FocusPad messages>` replaces any of the pad's built-in strings, for translated sites. It covers every line, the screen reader labels and the console size control. `<TextCanvas>` and `<ViewportControl>` also take `messages`. `<ViewportControl>` uses only the size control's keys. Strings that contain a value, such as "Then click here and press ↑ ↓.", are functions that return the whole sentence. `defaultFocusPadMessages` has the English text. See [Translating the focus pad](https://textjs.org/docs/internationalization#translating-the-focus-pad).
- `@textjs/react`: on right-to-left pages, the focus pad keeps keycaps such as ⌘ ⌥ J and console sizes such as 120×36 left to right, and mirrors its size control and step bar. On Chinese and Japanese pages, it drops the space between its two sentences; Korean keeps it.
- textjs.org: textjs.org/ja is out of draft. The footer's language picker opens the same page in English or 日本語. A browser set to Japanese gets a 日本語で読む button, and an English browser on textjs.org/ja gets Read in English. The button stops appearing once you pick a language or close it. Search engines index the translated Japanese pages and match each to its English version.
- textjs.org: on textjs.org/ja, the focus pad is in Japanese on every page, including the labels under each demo's keys.
- textjs.org: Spanish, French, German, Brazilian Portuguese, Italian, Russian, Turkish, Polish, Indonesian, Vietnamese, Hindi, Korean, Simplified and Traditional Chinese, Arabic, Hebrew, Persian and Urdu are out of draft at textjs.org/es, /fr, /de, /pt-br, /it, /ru, /tr, /pl, /id, /vi, /hi, /ko, /zh-cn, /zh-tw, /ar, /he, /fa and /ur. The footer's language picker and the browser-language button offer them, as they do Japanese. Search engines index the translated pages and match each to its English version.

### Changed

- `@textjs/core`: Chromium and Firefox consoles clear animated sprite output at 16 MB instead of 4 MB, so textjs.org/doom shows "Console was cleared" about every 19 seconds instead of every 4.5. Safari, and sprites drawn as `▀` half-blocks, keep 4 MB. The page's peak heap on textjs.org/doom goes from 10.8 MB to about 12–13 MB.
- textjs.org: a docs page downloads only its own Markdown instead of all 33 pages, so English docs pages load 43–47 KB less JavaScript (gzip) and /ja docs pages 60–64 KB less. Hovering over or focusing a link to another docs page fetches that page early, so it still opens at once.
- `@textjs/react`: `<FocusPad>` and `<ViewportControl>` set their monospace labels in the page's `--mono` font stack when it defines one, and fall back to Geist Mono as before. A page with Arabic or Hebrew labels can add its script's fonts to `--mono`.

### Fixed

- textjs.org/ja: ⌘K search shows the Japanese docs headings and matches Japanese queries against them. It used to list English headings under Japanese page titles. English names still find pages: `routing` finds ルーティング and `open the console` finds コンソールを開く.
- textjs.org: a docs example running in your console shows its changes in the page's preview again on textjs.org/ja, and for the Bidirectional text example on textjs.org/docs/internationalization. The line above an example in the console now reads "▼ Docs › Counter" instead of "▼ Docs › Introduction › Counter".
- textjs.org: on phones, inline code longer than the line wraps instead of widening the page. textjs.org/docs/internationalization was 92px too wide on a 390px screen.

## [1.4.1] - 2026-11-03

### Added

- textjs.org/doom plays Doom's sound effects, with Doom's own stereo panning and distance falloff. Sound starts with your first click or keypress on the page, pauses with the game, and follows Sfx Volume in Doom's Options → Sound Volume menu. There's no music.

### Changed

- `@textjs/react`, `@textjs/app`: the focus hint ("Click the page to use the keyboard") is an amber bar with bold black text in every theme. It used to be the theme's colors reversed. Each time it appears, it blinks 4 times over about 6 seconds, then stays amber. It doesn't blink when reduced motion is on. Each blink cycle logs up to 8 extra console frames.
- textjs.org: Doom moved to textjs.org/doom. textjs.org/playground/doom redirects there.

### Fixed

- `@textjs/core`, `@textjs/react`: Chrome's Issues panel no longer reports "A form field element should have an id or name attribute" on every page. The hidden keyboard `<textarea>` is named `textjs-input`, and `ViewportControl`'s console size `<select>` (also in `FocusPad`'s `sizeControl`) has an `id` and the name `textjs-console-size`. The keyboard `<textarea>` also opts out of 1Password, LastPass, Bitwarden and Dashlane.
- textjs.org: the console header on textjs.org/doom reads "Text.js / doom" instead of "Text.js / playground / doom".
- textjs.org/doom: a narrow window no longer leaves a stray "·" after "View source".
- textjs.org: in a narrow window, the Playground's demo picker fades out at an edge with more demos to scroll to, instead of cutting the last one off mid-word.
- textjs.org/doom runs at Doom's 35 tics per second. In a level it ran 3.8× fast on a 60Hz display (131 tics per second) and 5.5× at 120Hz (192), because the page mistook the extra clock reads Doom makes while drawing a level for a busy-wait, and moved Doom's clock a tic ahead on every animation frame and timer callback.

## [1.4.0] - 2026-11-03

### Added

- `@textjs/react`: `<Image renderMode="halfblock">` draws `▀` half-blocks everywhere, as `<Image>` did in 1.3.
- `@textjs/core/experimental`: `drawPixels` takes `encoding: "rgba"` for a lossless sprite with soft alpha and more than 256 colors, and a `fallback` function that paints the cells wherever the sprite can't be shown.
- `@textjs/app`: curl, Wget, HTTPie and xh get a page's first frame as truecolor ANSI text instead of the HTML page, on `text dev`, `text start` and the `bun`, `vercel` and `cloudflare` adapters. `text build` prerenders frames for static pages. `text start` and `bun` render dynamic and server-rendered pages on request, and answer unknown paths with the app's not-found page and a `404`. Frames are 80 × 24 by default. Change the size, or turn frames off, with `ansi` in `text.config.ts` or `export const ansi` in a page. The `static` adapter serves curl the HTML page. See [curl and Terminal Clients](https://textjs.org/docs/curl).
- `@textjs/app/ansi` exports `wantsAnsi` and `ansiResponse` for servers that don't use `text start` or an adapter, and `@textjs/react` exports `frameToAnsi`.
- textjs.org: a draft Japanese version at textjs.org/ja, starting with the Introduction, Installation and Routing docs and the site interface. Untranslated paragraphs show in English. It isn't indexed or offered in the language picker yet.

### Changed

- `@textjs/react`: `<Image>` now draws a pixel sprite in Chromium and Firefox consoles, with up to 8 × 16 pixels per cell for pixel art and 4 × 8 for photos. This deliberately breaks the [support policy](https://textjs.org/docs/support-policy)'s promise that frames look the same between minor releases. Pass `renderMode="halfblock"` to keep the 1.3 half-blocks. Safari, terminals (including `text run`), ANSI and plain-text output, and server-rendered pages (`runtime = "server"`) still draw half-blocks.
- `@textjs/app`: scripts and uptime checks that fetch pages with curl, Wget, HTTPie or xh now get ANSI text. To keep getting HTML, send `Accept: text/html`, or set `ansi: false` in `text.config.ts`.
- `@textjs/app`: async server components no longer run while `text build` prerenders a page's shell. They show their `<Suspense>` fallback, as before, without starting their data requests at build time.
- `@textjs/app`: the frame player for server-rendered pages is 3 KB smaller, 22.4 KB gzip instead of 25.4 KB for `examples/dashboard`. It no longer ships `CellBuffer`'s drawing methods, box borders or text truncation.

### Fixed

- `@textjs/core`: charts and spinners keep their grid on Windows 10. Its console font is Consolas, which has no ▁▂▃▅▆▇ eighth blocks, quadrants, braille, ▶ or ✓, and their fallback glyphs ran rows past the frame's right edge. `CssConsoleDriver` now measures, once, which of these glyphs the console font draws more than a fifth of a cell off, and draws those as the nearest glyph Consolas has: `_` `▄` `▌` `█` for eighths, half blocks for quadrants and braille, `►` `◄` `√` `×` for arrows, checks and crosses. Fonts that fit them, such as Cascadia Mono on Windows 11 and Menlo on macOS, draw the originals. `measureText: false` turns this off.
- `@textjs/core`: no more 1px vertical hairlines between neighbouring backgrounds in Chrome and Edge DevTools, such as beside "account" and "qty" in textjs.org/coffee. Chromium snaps each `%c` span to device pixels separately and could leave the pixel where two spans met to neither. `CssConsoleDriver` now extends a span's background 1px under an opaque right neighbour (`padding-right:1px;margin-right:-1px`). Firefox and Safari frames don't change.
- `@textjs/core`: `<Image>` sprites in Chrome and Edge follow the same 1px rule as text. Text to the left of a transparent sprite no longer paints a 1px strip of its background over the sprite's left edge, and a sprite seals against opaque text on its right, including inverse text. A sprite alone in its rows now reaches the frame's right edge, like the text rows above and below it.
- `@textjs/react`: `<ConsoleMirror>` draws a photo beside text as half-blocks, as the console does, instead of as the image.

## [1.3.0] - 2026-11-03

### Added

- `@textjs/react/experimental` exports `<Pixels>` for live framebuffers and `useKeyState` for held keys; `@textjs/core/experimental` exports `drawPixels`. These may change in a minor release.
- textjs.org/playground/doom: play the Doom shareware episode in the DevTools console.
- `@textjs/react`, `@textjs/app`: while the page doesn't have focus, the console frame's last row reads "Click the page to use the keyboard", so a visitor who clicks the app in the console knows why keys stopped working. It shows when the app has a `useInput` or `usePaste` handler or a focus target, in the browser console only, including on server-rendered routes. Inline mirrors and the VS Code preview don't show it. Turn it off with `focusHint: false` in `text.config.ts` or `createConsoleRoot`.
- `@textjs/react`: `usePageFocus()` returns whether the page has focus. To decide yourself when the app wants the keyboard, set `focusHint: false` and render `<FocusHint active={…}>`. `useInput(handler, { ambient: true })` marks an always-on shortcut that doesn't show the hint by itself.

### Changed

- `@textjs/core`: while a `<Pixels>` sprite animates, `ConsoleRenderer` batches keyframes every 51ms in Chromium, paces frames to 33ms in Safari, and clears appended output in `CssConsoleDriver` at 4 MB (`SPRITE_MAX_BYTES`). Static sprites and text-only apps keep the existing pacing and 300-frame clear limit.

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
