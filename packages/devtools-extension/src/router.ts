/**
 * Service-worker routing, separated from `background.ts` so it can be tested
 * with fake ports. Pairs each inspected tab's content-script port with its
 * DevTools panel port and holds no other state.
 *
 * Every port is checked before it is trusted: only this extension's own panel
 * page can pair with a tab, only top-frame content scripts can speak for one,
 * and messages are shape-checked and rebuilt before they are forwarded.
 */

import { CONTENT_PORT, isTabId, PANEL_PORT, type DetectResult, type RequestMessage, type StatusMessage } from "./protocol";

export { isTabId };

export interface RouterRuntime {
  readonly id: string;
  getURL(path: string): string;
  sendMessage(message: unknown): Promise<unknown>;
  readonly onConnect: chrome.runtime.Event<(port: chrome.runtime.Port) => void>;
  readonly onMessage: chrome.runtime.Event<(message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => boolean | void>;
}

export interface Router {
  pages(): Array<{ tabId: number; url: string | null }>;
  panels(): number[];
}

const METHODS: ReadonlySet<string> = new Set(["roots", "tree", "frame", "highlight", "setWireframe", "pause", "resume", "resize", "fit", "copyText"]);
const MAX_ARGS = 4;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isArgValue = (v: unknown): boolean => v === null || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));

/** A panel request rebuilt from known fields only, or `null` when malformed. */
export function sanitizeRequest(raw: Record<string, unknown>): RequestMessage | null {
  const { id, method, root, args } = raw;
  if (typeof id !== "number" || !Number.isSafeInteger(id)) return null;
  if (typeof method !== "string" || !METHODS.has(method)) return null;
  if (root !== null && !(typeof root === "number" && Number.isSafeInteger(root))) return null;
  if (!Array.isArray(args) || args.length > MAX_ARGS || !args.every(isArgValue)) return null;
  return { kind: "request", id, method: method as RequestMessage["method"], root, args: [...args] };
}

/** Whether a port or message came from one of this extension's own pages at `path`. */
export function fromExtensionPage(runtime: RouterRuntime, sender: chrome.runtime.MessageSender | undefined, path: string): boolean {
  const s = sender;
  if (!s || s.id !== runtime.id || typeof s.url !== "string" || s.tab !== undefined) return false;
  const base = runtime.getURL(path);
  return s.url === base || s.url.startsWith(`${base}?`) || s.url.startsWith(`${base}#`);
}

export function startRouter(runtime: RouterRuntime): Router {
  const pages = new Map<number, chrome.runtime.Port>();
  const panels = new Map<number, chrome.runtime.Port>();

  const send = (port: chrome.runtime.Port | undefined, msg: unknown): void => {
    if (!port) return;
    try {
      port.postMessage(msg);
    } catch {
      // Port closed mid-flight; its onDisconnect handler cleans up.
    }
  };

  const status = (tabId: number): void => {
    const msg: StatusMessage = { kind: "status", page: pages.has(tabId) ? "connected" : "disconnected" };
    send(panels.get(tabId), msg);
  };

  const onContent = (port: chrome.runtime.Port): void => {
    const s = port.sender;
    const tabId = s?.tab?.id;
    if (s?.id !== runtime.id || !isTabId(tabId) || s.frameId !== 0) {
      port.disconnect();
      return;
    }
    pages.get(tabId)?.disconnect();
    pages.set(tabId, port);
    port.onMessage.addListener((raw) => {
      // Only page replies and events reach the panel; `status` belongs to this worker.
      if (!isObject(raw) || (raw.kind !== "response" && raw.kind !== "event")) return;
      send(panels.get(tabId), raw);
    });
    port.onDisconnect.addListener(() => {
      if (pages.get(tabId) !== port) return;
      pages.delete(tabId);
      status(tabId);
    });
    if (panels.has(tabId)) send(port, { kind: "attach" });
    status(tabId);
    // Content scripts connect only once their page has a root: tell DevTools pages to add the panel.
    const detected: DetectResult = { kind: "detected", tabId, roots: true };
    runtime.sendMessage(detected).catch(() => undefined);
  };

  const onPanel = (port: chrome.runtime.Port): void => {
    if (!fromExtensionPage(runtime, port.sender, "panel.html")) {
      port.disconnect();
      return;
    }
    let tabId: number | null = null;
    port.onMessage.addListener((raw) => {
      if (!isObject(raw)) return;
      if (raw.kind === "init") {
        // One init per port, for a real tab.
        if (tabId !== null || !isTabId(raw.tabId)) {
          port.disconnect();
          if (tabId !== null && panels.get(tabId) === port) {
            panels.delete(tabId);
            send(pages.get(tabId), { kind: "detach" });
          }
          return;
        }
        tabId = raw.tabId;
        const previous = panels.get(tabId);
        panels.set(tabId, port);
        previous?.disconnect();
        send(pages.get(tabId), { kind: "attach" });
        status(tabId);
        return;
      }
      if (tabId === null || raw.kind !== "request") return;
      const req = sanitizeRequest(raw);
      if (req) send(pages.get(tabId), req);
    });
    port.onDisconnect.addListener(() => {
      if (tabId === null || panels.get(tabId) !== port) return;
      panels.delete(tabId);
      send(pages.get(tabId), { kind: "detach" });
    });
  };

  // DevTools pages ask once, when they open, whether their tab already has roots.
  runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!fromExtensionPage(runtime, sender, "devtools.html")) return;
    const m = msg as Record<string, unknown> | null;
    if (typeof m !== "object" || m === null || m.kind !== "detect" || !isTabId(m.tabId)) return;
    const reply: DetectResult = { kind: "detected", tabId: m.tabId, roots: pages.has(m.tabId) };
    sendResponse(reply);
  });

  runtime.onConnect.addListener((port) => {
    if (port.name === CONTENT_PORT) onContent(port);
    else if (port.name === PANEL_PORT) onPanel(port);
    else port.disconnect();
  });

  return {
    pages: () => [...pages.entries()].map(([tabId, p]) => ({ tabId, url: p.sender?.url ?? null })),
    panels: () => [...panels.keys()],
  };
}
