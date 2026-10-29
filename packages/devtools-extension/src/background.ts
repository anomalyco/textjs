/**
 * Service worker: routes messages between each inspected tab's content script
 * and its DevTools panel (see `router.ts`).
 */

import { startRouter } from "./router";

const router = startRouter(chrome.runtime);

// Introspection for end-to-end tests (`serviceWorker.evaluate`); compiled out of release builds.
if (process.env.TEXTJS_DEVTOOLS_INTROSPECT === "1") (globalThis as Record<string, unknown>).__textjsDevtools = router;
