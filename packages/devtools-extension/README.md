# ▼ Text.js DevTools

A Chrome DevTools panel for Text.js console apps: component tree, cell-level frame inspector and frame timeline. DevTools inside DevTools.

```bash
bun run build      # dist/ (unpacked) + release/textjs-devtools-<version>.zip
bun test           # router, content relay, page bridge, panel store/transport, manifest and bundle checks
bun run e2e        # Playwright Chromium + examples/dashboard, full message path
bun run harness    # panel UI against harness/fixture.json → harness/shots/
bun e2e/probe-devtools.ts --shots   # real DevTools: panel created, connected, screenshot
```

The e2e tests, probe and harness need Chromium (Chrome for Testing; branded Chrome ignores `--load-extension`). They use `TEXTJS_CHROMIUM` if set, otherwise playwright-core's browser or the newest one in the Playwright cache (`bunx playwright-core install chromium`).

Load `dist/` from `chrome://extensions` (Developer mode → Load unpacked). Nothing here publishes anything.

## Layout

| Path | Runs in |
| --- | --- |
| `src/page.ts`, `src/page-bridge.ts` | Page MAIN world, `document_start`. Installs `__TEXTJS_DEVTOOLS_HOOK__` and answers panel requests. |
| `src/content.ts`, `src/content-relay.ts` | Isolated world. Relays `window.postMessage` ⇄ runtime port, only while the page reports a root. Accepts only `hello`/`response`/`event` from the page. |
| `src/background.ts`, `src/router.ts` | Service worker. Pairs content and panel ports by tab id after checking each port's sender. |
| `src/devtools.ts`, `src/devtools-page.ts` | DevTools page. Creates the panel when the worker reports a console root, and forwards panel shown/hidden. |
| `src/panel/*` | The panel (React DOM). |

The hook API and root registration live in `@textjs/react` (`src/devtools-hook.ts`). `bun e2e/extension.e2e.ts --record` refreshes `harness/fixture.json` from a live session.
