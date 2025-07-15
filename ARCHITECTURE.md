# ▼ Text.js Architecture & Engineering Specification

**Text.js** (`textjs.org`) is **"The Console Framework for the Web"** — a React 19 & App Router web framework whose entire UI renders inside browser DevTools `console.log` statements via a custom React reconciler, Yoga WASM Flexbox layout, and Run-Length Encoded `%c` CSS framebuffers.

## Brand & Design Identity
- **Brand Mark:** `▼` (`U+25BC` BLACK DOWN-POINTING TRIANGLE) — an inverted play on Vercel's `▲`. Where traditional frameworks render *up* into the DOM, Text.js Inverted Architecture™ streams frames *down* (`▼`) into the DevTools Console drawer. Never use `▲` as the Text.js logo; always use `▼`.
- **Engine Name:** **Turbolog** (`▼ Text.js 0.2.0 (Turbolog)`).
- **JSX Casing:** **PascalCase** components (`<Box>`, `<Text>`, `<ScrollBox>`, `<Input>`, `<Textarea>`, `<Select>`, `<Tabs>`, `<Link>`, `<Code>`, `<Markdown>`, `<Diff>`, `<Modal>`, `<Spinner>`, `<AsciiFont>`, `<Spacer>`, `<Badge>`, `<Divider>`) matching Next.js / React conventions, backed by clean lowercase host intrinsic elements (`tx-box`, `tx-text`, `tx-raw-text`) inside the custom React reconciler.

## Non-Negotiable Rendering & Performance Contracts
1. **Strictly ONE `console.log` Call Per Dirty Frame:**
   - Never log line-by-line (which creates ugly DevTools row borders, `(2)` repeat badges, and 30× CDP IPC overhead).
   - Every dirty frame emits `console.clear()` followed by **one** `console.log(formatString, ...cssArgs)` with rows joined by `\n`.
2. **Zero-Noop-Log Dirty Gate:**
   - `CellBuffer` tracks per-row 32-bit dirty hashes comparing `backBuffer` vs `frontBuffer`.
   - If zero cells changed since the previous committed frame, **do not allocate strings, do not call `console.clear()`, and do not call `console.log()`**. Idle CPU and DevTools churn must be strictly zero.
3. **Row-Level RLE Caching & Cross-Line Span Merging:**
   - `CellBuffer` stores flat TypedArrays (`chars: Uint32Array` + grapheme overflow table for multi-codepoint emojis/ZWJ, `fg: Uint32Array` packed `0xRRGGBBAA`, `bg: Uint32Array` packed `0xRRGGBBAA`, `attrs: Uint16Array` bitmask).
   - Only rows whose hash changed since the last frame re-scan cells into RLE spans; unchanged rows reuse their cached RLE spans.
   - Adjacent spans across `\n` boundaries with identical `(fg, bg, attrs)` merge into a single `%c` span so an entire 100×32 TUI frame uses ~35–90 `%c` style arguments instead of 3,200.
   - CSS style strings are interned in a `Map<bigint, string>` so rendering allocates zero repeated CSS strings.
4. **Chromium `ConsoleViewMessage.ts` Edge-Case Defenses:**
   - **Escape `%` as `%%`:** Every literal `%` in cell text must be escaped as `%%` in the `console.log` format string so user text like `"100%"` or `"%s"` never consumes a `%c` style argument.
   - **Suppress URL Auto-Linkifier Style Hijacking:** Chromium's `_applyForcedVisibleStyle` injects `!important` theme colors onto URLs inside `%c` spans. Insert `\u2060` (word joiner) after `://` (`https:\u2060//`) unless the cell carries the `ALLOW_LINK` attribute flag.
   - **Seamless Multi-Row Background Fills:** Calibrate `font-family`, `font-size`, `line-height`, and `margin` on `%c` spans so `display: inline-block` spans across `<br>` lines have zero vertical pixel gaps between background colors.
   - **Unfocused Cursor Freeze (Copy/Select Support):** When `document.hasFocus()` is `false`, freeze blinking cursors into static hollow blocks (`▯`) so `console.clear()` stops firing while the user highlights and copies text inside DevTools Console.

## Monorepo Package Structure
- `packages/core` (`@textjs/core`): `CellBuffer`, `RGBA` alpha blending, `TextMeasure` (`Intl.Segmenter` + East Asian/Emoji width + LRU wrap cache), `Yoga` WASM layout tree (`pointScaleFactor = 1`, scissor culling, `zIndex`), `CssConsoleDriver`, `AnsiDriver`, `DomMirror` frame snapshotter, `InputEngine` (hidden `<textarea>` sink for keyboard, `⌘V` paste, IME, and `wheel` scroll forwarding), `ViewportObserver` (fixed + responsive docked DevTools sizing + `window.text` console REPL API).
- `packages/react` (`@textjs/react`): Custom React 19 reconciler (`react-reconciler@0.34.0`), `rAF` commit scheduler, dual styling (`props` + memoized `className` cell-Tailwind utilities + `ThemeProvider`), full PascalCase TUI component kit, hooks (`useInput`, `useFocus`, `useFocusManager`, `useViewport`, `useTheme`, `useConsoleStats`), and `<FocusPad />` DOM receiver HUD.
- `packages/text` (`textjs`): File-system `app/` Router (`layout.tsx`, `page.tsx`, `[param]/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `api/*/route.ts`) synced with `window.location` / `history.pushState`, `text dev` / `text build` / `text start` CLI powered by Vite + React Fast Refresh, in-console `[▼]` DevTools inspector overlay (`Ctrl+\``), and in-console Redbox error boundary.
- `packages/create-text-app` (`create-text-app`): CLI project generator (`starter`, `dashboard`, `opencode` templates).
- `apps/opencode-console`: Connected OpenCode Lite TUI running in `console.log` against a local `opencode` server (with `opencode service status` auto-discovery proxy in local dev + rich interactive simulation fallback for static web previews).
- `apps/web`: Official `textjs.org` website — marketing landing page, live interactive real-DevTools `console.log` companion app when visitors press `⌘⌥J`, inline simulated Chrome DevTools Console + JSX playground, OpenCode showcase (`/opencode`), and full documentation (`/docs/...`).
