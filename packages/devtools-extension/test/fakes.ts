/** Minimal in-memory stand-ins for `chrome.runtime` ports. */

type Listener<T extends (...args: any[]) => void> = Set<T>;

class FakeEvent<T extends (...args: any[]) => void> {
  readonly listeners: Listener<T> = new Set();
  addListener(l: T): void {
    this.listeners.add(l);
  }
  removeListener(l: T): void {
    this.listeners.delete(l);
  }
  fire(...args: Parameters<T>): void {
    for (const l of [...this.listeners]) l(...args);
  }
}

/** One end of a port pair. `disconnect()` fires `onDisconnect` on the other end only, like Chrome. */
export class FakePort implements chrome.runtime.Port {
  peer!: FakePort;
  connected = true;
  readonly onMessage = new FakeEvent<(message: unknown, port: chrome.runtime.Port) => void>();
  readonly onDisconnect = new FakeEvent<(port: chrome.runtime.Port) => void>();
  readonly received: any[] = [];

  constructor(
    readonly name: string,
    readonly sender?: chrome.runtime.MessageSender,
  ) {}

  postMessage(message: unknown): void {
    if (!this.connected) throw new Error("Attempting to use a disconnected port object");
    const copy = structuredClone(message);
    this.peer.received.push(copy);
    this.peer.onMessage.fire(copy, this.peer);
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.peer.connected = false;
    this.peer.onDisconnect.fire(this.peer);
  }
}

/** A connected pair: `[client end, worker end]`. */
export function portPair(name: string, sender?: chrome.runtime.MessageSender): [FakePort, FakePort] {
  const client = new FakePort(name);
  const worker = new FakePort(name, sender);
  client.peer = worker;
  worker.peer = client;
  return [client, worker];
}

export const EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";

export class FakeRuntime {
  readonly id = EXTENSION_ID;
  readonly onConnect = new FakeEvent<(port: chrome.runtime.Port) => void>();
  getURL(path: string): string {
    return `chrome-extension://${EXTENSION_ID}/${path}`;
  }
  /** Open a port to the worker as `sender`; returns the client end. */
  connect(name: string, sender: chrome.runtime.MessageSender): FakePort {
    const [client, worker] = portPair(name, sender);
    this.onConnect.fire(worker);
    return client;
  }
}
