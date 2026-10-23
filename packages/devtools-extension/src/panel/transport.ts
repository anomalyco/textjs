import { PANEL_PORT, type Method, type PageEvent, type RequestMap, type ResponseMessage, type StatusMessage } from "../protocol";

export type TransportMessage = PageEvent | StatusMessage;

export interface Transport {
  request<M extends Method>(method: M, root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]>;
  subscribe(listener: (msg: TransportMessage) => void): () => void;
}

const REQUEST_TIMEOUT_MS = 5000;
const PING_MS = 20_000;

/** Panel ⇄ service worker port, reconnecting if the worker restarts. */
export class ExtensionTransport implements Transport {
  private port: chrome.runtime.Port | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly listeners = new Set<(msg: TransportMessage) => void>();

  constructor(private readonly tabId: number) {
    this.connect();
    setInterval(() => this.port?.postMessage({ kind: "ping" }), PING_MS);
  }

  private connect(): void {
    const port = chrome.runtime.connect({ name: PANEL_PORT });
    this.port = port;
    port.onMessage.addListener((raw) => {
      const msg = raw as ResponseMessage | TransportMessage | { kind: "hello" };
      if (msg.kind === "response") {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve(msg.result);
        else p.reject(new Error(msg.error ?? "Request failed"));
        return;
      }
      if (msg.kind === "event" || msg.kind === "status") for (const l of this.listeners) l(msg);
    });
    port.onDisconnect.addListener(() => {
      this.port = null;
      for (const l of this.listeners) l({ kind: "status", page: "disconnected" });
      setTimeout(() => this.connect(), 200);
    });
    port.postMessage({ kind: "init", tabId: this.tabId });
  }

  request<M extends Method>(method: M, root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]> {
    const port = this.port;
    if (!port) return Promise.reject(new Error("Not connected"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      port.postMessage({ kind: "request", id, method, root, args });
    });
  }

  subscribe(listener: (msg: TransportMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
