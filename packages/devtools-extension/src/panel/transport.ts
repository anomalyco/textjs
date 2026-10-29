import { PANEL_PORT, type Method, type PageEvent, type RequestMap, type StatusMessage } from "../protocol";
import { isResult, sanitizeMessage } from "./validate";

export type TransportMessage = PageEvent | StatusMessage;

export interface Transport {
  request<M extends Method>(method: M, root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]>;
  subscribe(listener: (msg: TransportMessage) => void): () => void;
  /** Close the connection while the panel is hidden; the page stops streaming. */
  suspend?(): void;
  /** Reconnect after `suspend()`. */
  resume?(): void;
}

export interface TransportRuntime {
  connect(info: { name: string }): chrome.runtime.Port;
}

const REQUEST_TIMEOUT_MS = 5000;
const PING_MS = 20_000;
const RETRY_MS = 1000;

/**
 * Panel ⇄ service worker port. The worker can be stopped at any time (idle
 * termination); the port is then reopened right away and pending requests are
 * rejected. That is not a page disconnect: the worker reports the page's real
 * status after the panel re-inits.
 */
export class ExtensionTransport implements Transport {
  private port: chrome.runtime.Port | null = null;
  private nextId = 1;
  private suspended = false;
  private ping: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private connectedAt = 0;
  private readonly pending = new Map<number, { method: Method; resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly listeners = new Set<(msg: TransportMessage) => void>();

  constructor(
    private readonly tabId: number,
    private readonly runtime: TransportRuntime = chrome.runtime,
  ) {
    this.connect();
  }

  get connected(): boolean {
    return this.port !== null;
  }

  private connect(): void {
    if (this.port !== null || this.suspended) return;
    this.retry = null;
    let port: chrome.runtime.Port;
    try {
      port = this.runtime.connect({ name: PANEL_PORT });
    } catch {
      // Extension context invalidated (reload/update); keep trying quietly.
      this.emit({ kind: "status", page: "disconnected" });
      this.retry = setTimeout(() => this.connect(), RETRY_MS);
      return;
    }
    this.port = port;
    this.connectedAt = Date.now();
    port.onMessage.addListener((raw) => {
      if (this.port === port) this.receive(raw);
    });
    port.onDisconnect.addListener(() => {
      if (this.port !== port) return;
      this.port = null;
      this.stopPing();
      this.rejectAll("Disconnected");
      // Reopen at once after a worker restart, but back off if the worker keeps refusing us.
      if (Date.now() - this.connectedAt < RETRY_MS) this.retry = setTimeout(() => this.connect(), RETRY_MS);
      else this.connect();
    });
    port.postMessage({ kind: "init", tabId: this.tabId });
    this.stopPing();
    this.ping = setInterval(() => {
      try {
        this.port?.postMessage({ kind: "ping" });
      } catch {
        // onDisconnect reconnects.
      }
    }, PING_MS);
  }

  suspend(): void {
    if (this.suspended) return;
    this.suspended = true;
    this.stopPing();
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = null;
    const port = this.port;
    this.port = null;
    port?.disconnect();
    this.rejectAll("Panel hidden");
  }

  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    this.connect();
  }

  private stopPing(): void {
    if (this.ping !== null) clearInterval(this.ping);
    this.ping = null;
  }

  private rejectAll(reason: string): void {
    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const p of pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
  }

  private emit(msg: TransportMessage): void {
    for (const l of this.listeners) l(msg);
  }

  /** Messages relayed from the page are untrusted: responses and events are validated before use. */
  private receive(raw: unknown): void {
    if (typeof raw !== "object" || raw === null) return;
    const r = raw as Record<string, unknown>;
    if (r.kind === "response") {
      const p = typeof r.id === "number" ? this.pending.get(r.id) : undefined;
      if (!p) return;
      this.pending.delete(r.id as number);
      clearTimeout(p.timer);
      if (r.ok !== true) p.reject(new Error(typeof r.error === "string" ? r.error.slice(0, 300) : "Request failed"));
      else if (!isResult(p.method, r.result)) p.reject(new Error(`Malformed ${p.method} response`));
      else p.resolve(r.result);
      return;
    }
    const msg = sanitizeMessage(raw);
    if (msg) this.emit(msg);
  }

  request<M extends Method>(method: M, root: number | null, ...args: RequestMap[M]["args"]): Promise<RequestMap[M]["result"]> {
    const port = this.port;
    if (!port) return Promise.reject(new Error(this.suspended ? "Panel hidden" : "Not connected"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { method, resolve: resolve as (v: unknown) => void, reject, timer });
      try {
        port.postMessage({ kind: "request", id, method, root, args });
      } catch {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(new Error("Not connected"));
      }
    });
  }

  subscribe(listener: (msg: TransportMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
