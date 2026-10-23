/**
 * Service worker: pairs each inspected tab's content-script port with its
 * DevTools panel port and forwards messages verbatim. It holds no other state.
 */

import { CONTENT_PORT, PANEL_PORT, type PanelInit, type StatusMessage } from "./protocol";

const pages = new Map<number, chrome.runtime.Port>();
const panels = new Map<number, chrome.runtime.Port>();

function send(port: chrome.runtime.Port | undefined, msg: unknown): void {
  if (!port) return;
  try {
    port.postMessage(msg);
  } catch {
    // Port closed mid-flight; its onDisconnect handler cleans up.
  }
}

function status(tabId: number): void {
  const msg: StatusMessage = { kind: "status", page: pages.has(tabId) ? "connected" : "disconnected" };
  send(panels.get(tabId), msg);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === CONTENT_PORT) {
    const tabId = port.sender?.tab?.id;
    if (tabId === undefined || port.sender?.frameId !== 0) {
      port.disconnect();
      return;
    }
    pages.get(tabId)?.disconnect();
    pages.set(tabId, port);
    port.onMessage.addListener((msg) => send(panels.get(tabId), msg));
    port.onDisconnect.addListener(() => {
      if (pages.get(tabId) === port) pages.delete(tabId);
      status(tabId);
    });
    if (panels.has(tabId)) send(port, { kind: "attach" });
    status(tabId);
    return;
  }

  if (port.name === PANEL_PORT) {
    let tabId: number | null = null;
    port.onMessage.addListener((raw) => {
      const msg = raw as PanelInit | { kind: string };
      if (msg.kind === "init" && "tabId" in msg) {
        tabId = msg.tabId;
        panels.get(tabId)?.disconnect();
        panels.set(tabId, port);
        send(pages.get(tabId), { kind: "attach" });
        status(tabId);
        return;
      }
      if (msg.kind === "ping" || tabId === null) return;
      send(pages.get(tabId), msg);
    });
    port.onDisconnect.addListener(() => {
      if (tabId === null || panels.get(tabId) !== port) return;
      panels.delete(tabId);
      send(pages.get(tabId), { kind: "detach" });
    });
  }
});

// Introspection for end-to-end tests (`serviceWorker.evaluate`).
(globalThis as Record<string, unknown>).__textjsDevtools = {
  pages: () => [...pages.entries()].map(([tabId, p]) => ({ tabId, url: p.sender?.url ?? null })),
  panels: () => [...panels.keys()],
};
