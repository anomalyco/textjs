/**
 * Run a Node-style `(req, res)` handler (the live session server) inside a
 * Web-standard `(Request) => Response` server such as `Bun.serve`: the
 * response streams as soon as the handler flushes headers or writes, and the
 * handler sees `close` when the client goes away.
 */

import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";

/** Read by `readRequestBody()` (see `server/http.ts`). */
const WEB_REQUEST = Symbol.for("textjs.webRequest");

type NodeStyleHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean> | boolean;

class RequestShim extends EventEmitter {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string> = {};
  destroyed = false;

  constructor(request: Request, url: string) {
    super();
    this.method = request.method.toUpperCase();
    this.url = url;
    request.headers.forEach((value, key) => {
      this.headers[key] = value;
    });
    (this as unknown as Record<symbol, Request>)[WEB_REQUEST] = request;
  }

  setEncoding(): this {
    return this;
  }

  destroy(): this {
    this.destroyed = true;
    return this;
  }
}

class ResponseShim extends EventEmitter {
  statusCode = 200;
  statusMessage = "";
  headersSent = false;
  writableEnded = false;
  destroyed = false;
  readonly ready: Promise<Response>;
  readonly #headers = new Headers();
  #controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  #resolve!: (response: Response) => void;
  #pendingDrain = false;
  readonly #encoder = new TextEncoder();

  constructor(signal: AbortSignal) {
    super();
    this.ready = new Promise((r) => {
      this.#resolve = r;
    });
    signal.addEventListener("abort", () => this.#closed(), { once: true });
  }

  setHeader(name: string, value: number | string | readonly string[]): this {
    this.#headers.delete(name);
    for (const v of Array.isArray(value) ? value : [String(value)]) this.#headers.append(name, v);
    return this;
  }

  getHeader(name: string): string | undefined {
    return this.#headers.get(name) ?? undefined;
  }

  hasHeader(name: string): boolean {
    return this.#headers.has(name);
  }

  removeHeader(name: string): void {
    this.#headers.delete(name);
  }

  flushHeaders(): void {
    this.#start();
  }

  write(chunk: string | Uint8Array): boolean {
    if (this.writableEnded || this.destroyed) return false;
    this.#start();
    const controller = this.#controller;
    if (!controller) return false;
    try {
      controller.enqueue(typeof chunk === "string" ? this.#encoder.encode(chunk) : chunk);
    } catch {
      this.#closed();
      return false;
    }
    if ((controller.desiredSize ?? 1) > 0) return true;
    this.#pendingDrain = true;
    return false;
  }

  end(chunk?: string | Uint8Array): this {
    if (this.writableEnded) return this;
    if (!this.headersSent) {
      // Nothing streamed yet: answer with a complete body.
      this.writableEnded = true;
      this.headersSent = true;
      const body = chunk === undefined ? null : typeof chunk === "string" ? chunk : (chunk as Uint8Array<ArrayBuffer>);
      this.#resolve(new Response(this.#bodyless() ? null : body, { status: this.statusCode, headers: this.#headers }));
      queueMicrotask(() => this.#closed());
      return this;
    }
    if (chunk !== undefined) this.write(chunk);
    this.writableEnded = true;
    try {
      this.#controller?.close();
    } catch {
      // already closed by the client
    }
    queueMicrotask(() => this.#closed());
    return this;
  }

  #bodyless(): boolean {
    return this.statusCode === 204 || this.statusCode === 304;
  }

  #start(): void {
    if (this.headersSent) return;
    this.headersSent = true;
    const stream = new ReadableStream<Uint8Array>(
      {
        start: (controller) => {
          this.#controller = controller;
        },
        pull: () => {
          if (!this.#pendingDrain) return;
          this.#pendingDrain = false;
          this.emit("drain");
        },
        cancel: () => this.#closed(),
      },
      { highWaterMark: 64 * 1024, size: (chunk) => chunk?.byteLength ?? 0 },
    );
    this.#resolve(new Response(stream, { status: this.statusCode, headers: this.#headers }));
  }

  #closed(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.writableEnded = true;
    this.emit("close");
  }
}

/**
 * Call `handler` with Node-compatible request / response objects. Resolves to
 * the response, or `null` when the handler declined the request (`false`)
 * without writing anything.
 */
export async function runNodeStyle(request: Request, url: string, handler: NodeStyleHandler): Promise<Response | null> {
  const req = new RequestShim(request, url);
  const res = new ResponseShim(request.signal);
  const handled = Promise.resolve(handler(req as unknown as IncomingMessage, res as unknown as ServerResponse));
  const first = await Promise.race([res.ready.then((r) => ({ response: r })), handled.then((ok) => ({ ok }))]);
  if ("response" in first) return first.response;
  if (!first.ok && !res.headersSent) return null;
  return res.ready;
}
