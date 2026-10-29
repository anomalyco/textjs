/**
 * Isolated-world relay between the page bridge and the service worker. It only
 * holds a port while the page reports at least one Text.js console root, so
 * ordinary pages never wake the service worker.
 *
 * The page is untrusted: only `hello` (handled here), `response` and `event`
 * messages are accepted from it, and only `response`/`event` are forwarded.
 */

import { CONTENT_PORT, CONTENT_SOURCE, PAGE_SOURCE } from "./protocol";

export interface RelayWindow {
  postMessage(message: unknown, targetOrigin: string): void;
  addEventListener(type: "message", listener: (event: { source: unknown; data: unknown }) => void): void;
  addEventListener(type: "pageshow" | "pagehide", listener: (event: { persisted: boolean }) => void): void;
  setTimeout(fn: () => void, ms: number): unknown;
}

export interface RelayRuntime {
  connect(info: { name: string }): chrome.runtime.Port;
}

export const RECONNECT_MS = 250;

const TO_PAGE: ReadonlySet<unknown> = new Set(["attach", "detach", "request"]);

export function startContentRelay(win: RelayWindow, runtime: RelayRuntime): { readonly connected: boolean } {
  let port: chrome.runtime.Port | null = null;
  let roots = 0;
  let frozen = false;

  const toPage = (msg: Record<string, unknown>): void => win.postMessage({ ...msg, source: CONTENT_SOURCE }, "*");

  const connect = (): void => {
    if (port !== null || frozen || roots <= 0) return;
    let p: chrome.runtime.Port;
    try {
      p = runtime.connect({ name: CONTENT_PORT });
    } catch {
      // Extension reloaded or removed; this content script is orphaned.
      return;
    }
    port = p;
    p.onMessage.addListener((msg: unknown) => {
      if (port !== p || !msg || typeof msg !== "object") return;
      const m = msg as Record<string, unknown>;
      if (TO_PAGE.has(m.kind)) toPage(m);
    });
    p.onDisconnect.addListener(() => {
      if (port !== p) return;
      port = null;
      // The page should stop streaming; the panel re-attaches after reconnecting.
      toPage({ kind: "detach" });
      win.setTimeout(connect, RECONNECT_MS);
    });
  };

  const disconnect = (): void => {
    const p = port;
    if (p === null) return;
    port = null;
    try {
      p.disconnect();
    } catch {
      // Already closed.
    }
    toPage({ kind: "detach" });
  };

  win.addEventListener("message", (event) => {
    if (event.source !== win) return;
    const data = event.data as Record<string, unknown> | null;
    if (!data || typeof data !== "object" || data.source !== PAGE_SOURCE) return;
    if (data.kind === "hello") {
      const n = data.roots;
      roots = typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : 0;
      if (roots > 0) connect();
      else disconnect();
      return;
    }
    if (data.kind !== "response" && data.kind !== "event") return;
    if (port === null) return;
    const { source: _source, ...msg } = data;
    try {
      port.postMessage(msg);
    } catch {
      port = null;
    }
  });

  // Back/forward cache: ports don't survive a frozen page, so close ours and reopen on restore.
  win.addEventListener("pagehide", (event) => {
    if (!event.persisted) return;
    frozen = true;
    disconnect();
  });
  win.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    frozen = false;
    connect();
  });

  return {
    get connected() {
      return port !== null;
    },
  };
}
