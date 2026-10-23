/**
 * Isolated-world relay between the page bridge and the service worker. It only
 * opens a port once the page reports a Text.js console root, so ordinary pages
 * never wake the service worker.
 */

import { CONTENT_PORT, CONTENT_SOURCE, PAGE_SOURCE, type ContentWire, type PageWire } from "./protocol";

let port: chrome.runtime.Port | null = null;
let roots = 0;

function connect(): void {
  if (port !== null) return;
  try {
    port = chrome.runtime.connect({ name: CONTENT_PORT });
  } catch {
    // Extension reloaded or removed; this content script is orphaned.
    port = null;
    return;
  }
  port.onMessage.addListener((msg: unknown) => {
    const m = msg as Omit<ContentWire, "source">;
    if (!m || typeof m !== "object") return;
    window.postMessage({ ...m, source: CONTENT_SOURCE }, "*");
  });
  port.onDisconnect.addListener(() => {
    port = null;
    // The page should stop streaming; the panel re-attaches after reconnecting.
    window.postMessage({ kind: "detach", source: CONTENT_SOURCE }, "*");
    if (roots > 0) setTimeout(connect, 250);
  });
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as PageWire | null;
  if (!data || typeof data !== "object" || data.source !== PAGE_SOURCE) return;
  if (data.kind === "hello") {
    roots = data.roots;
    if (roots > 0) connect();
  }
  if (port === null) return;
  const { source: _source, ...msg } = data;
  try {
    port.postMessage(msg);
  } catch {
    port = null;
  }
});
