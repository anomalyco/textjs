/**
 * Runs in the page's MAIN world. Installs `__TEXTJS_DEVTOOLS_HOOK__` before the
 * app boots and answers panel requests through `window.postMessage`.
 *
 * Until the panel attaches the bridge does nothing per frame: `hook.active`
 * stays `false`, so roots skip telemetry entirely.
 */

import { installDevToolsHook, type DevToolsFrameRecord, type DevToolsHookEvent, type TextDevToolsHook } from "@textjs/react/devtools-hook";
import {
  CONTENT_SOURCE,
  PAGE_SOURCE,
  type ContentWire,
  type HelloMessage,
  type PageToPanel,
  type RequestMessage,
} from "./protocol";

export interface BridgeWindow {
  postMessage(message: unknown, targetOrigin: string): void;
  addEventListener(type: "message", listener: (event: { source: unknown; data: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { source: unknown; data: unknown }) => void): void;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface PageBridge {
  readonly hook: TextDevToolsHook;
  dispose(): void;
}

/** Frame records are batched so a 15fps app costs ~4 messages a second. */
export const FRAME_BATCH_MS = 250;
/** Keep at most this many pending records (skipped frames can be frequent). */
const MAX_BATCH = 512;

export function startPageBridge(win: BridgeWindow, target: object = win): PageBridge {
  const hook = installDevToolsHook(target);
  let batch: DevToolsFrameRecord[] = [];
  let committed = false;
  let timer: unknown = null;

  const post = (msg: HelloMessage | PageToPanel): void => {
    win.postMessage({ ...msg, source: PAGE_SOURCE }, "*");
  };

  const flush = (): void => {
    timer = null;
    if (batch.length === 0) return;
    const records = batch;
    batch = [];
    post({ kind: "event", event: "frames", records, committed });
    committed = false;
  };

  const rootsList = () => [...hook.roots.values()].map((h) => h.info());

  const onHookEvent = (e: DevToolsHookEvent): void => {
    if (e.type === "root-added" || e.type === "root-removed") {
      post({ kind: "hello", roots: hook.roots.size, protocol: hook.protocol });
      if (hook.active) post({ kind: "event", event: "roots", roots: rootsList() });
      return;
    }
    if (!hook.active) return;
    if (e.type === "root-changed") {
      post({ kind: "event", event: "root-changed", root: e.root });
      return;
    }
    if (batch.length >= MAX_BATCH) batch.shift();
    batch.push(e.record);
    if (e.record.commits > 0) committed = true;
    if (timer === null) timer = win.setTimeout(flush, FRAME_BATCH_MS);
  };
  const unsubscribe = hook.subscribe(onHookEvent);

  const handle = (req: RequestMessage): void => {
    try {
      if (req.method === "roots") {
        post({ kind: "response", id: req.id, ok: true, result: rootsList() });
        return;
      }
      const root = req.root === null ? undefined : hook.roots.get(req.root);
      if (!root) throw new Error(`No console root #${req.root}`);
      const a = req.args;
      let result: unknown;
      switch (req.method) {
        case "tree":
          result = root.tree();
          break;
        case "frame":
          result = root.frame();
          break;
        case "highlight":
          result = root.highlight(typeof a[0] === "number" ? a[0] : null);
          break;
        case "setWireframe":
          root.setWireframe(a[0] === true);
          result = root.info();
          break;
        case "pause":
          root.pause();
          result = root.info();
          break;
        case "resume":
          root.resume();
          result = root.info();
          break;
        case "resize":
          root.resize(clampSize(a[0]), clampSize(a[1]));
          result = root.info();
          break;
        case "fit":
          root.fit();
          result = root.info();
          break;
        case "copyText":
          result = root.copyText();
          break;
        default:
          throw new Error(`Unknown method ${String(req.method)}`);
      }
      post({ kind: "response", id: req.id, ok: true, result });
    } catch (error) {
      post({ kind: "response", id: req.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const detach = (): void => {
    hook.active = false;
    for (const r of hook.roots.values()) r.highlight(null);
    batch = [];
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
  };

  const onMessage = (event: { source: unknown; data: unknown }): void => {
    if (event.source !== win) return;
    const data = event.data as ContentWire | null;
    if (!data || typeof data !== "object" || data.source !== CONTENT_SOURCE) return;
    if (data.kind === "attach") {
      hook.active = true;
      post({ kind: "event", event: "roots", roots: rootsList() });
    } else if (data.kind === "detach") detach();
    else if (data.kind === "request") handle(data);
  };
  win.addEventListener("message", onMessage);

  // Roots that registered before the content script was listening.
  if (hook.roots.size > 0) post({ kind: "hello", roots: hook.roots.size, protocol: hook.protocol });

  return {
    hook,
    dispose() {
      detach();
      unsubscribe();
      win.removeEventListener("message", onMessage);
    },
  };
}

function clampSize(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(8, Math.min(400, n)) : 80;
}
