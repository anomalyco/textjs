# ▼ Text.js DevTools

A Chrome DevTools panel for Text.js console apps: component tree, cell-level frame inspector and frame timeline. DevTools inside DevTools.

```bash
bun run build      # dist/ (unpacked) + release/textjs-devtools-<version>.zip
bun test           # page bridge, manifest and bundle checks
bun run e2e        # Playwright Chromium + examples/dashboard, full message path
bun run harness    # panel UI against harness/fixture.json → harness/shots/
bun e2e/probe-devtools.ts --shots   # real DevTools: panel created, connected, screenshot
```

Load `dist/` from `chrome://extensions` (Developer mode → Load unpacked). Nothing here publishes anything.

## Layout

| Path | Runs in |
| --- | --- |
| `src/page.ts`, `src/page-bridge.ts` | Page MAIN world, `document_start`. Installs `__TEXTJS_DEVTOOLS_HOOK__` and answers panel requests. |
| `src/content.ts` | Isolated world. Relays `window.postMessage` ⇄ runtime port, only once the page reports a root. |
| `src/background.ts` | Service worker. Pairs content and panel ports by tab id. |
| `src/devtools.ts` | DevTools page. Creates the panel when the page has a console root. |
| `src/panel/*` | The panel (React DOM). |

The hook API and root registration live in `@textjs/react` (`src/devtools-hook.ts`). `bun e2e/extension.e2e.ts --record` refreshes `harness/fixture.json` from a live session.
