/**
 * Console capture for `text mcp`. On the stdio transport stdout carries
 * JSON-RPC, so app output must never reach it: every `console.*` call is
 * recorded into a bounded ring buffer that agents read with the `logs` tool.
 */

import { formatWithOptions } from "node:util";

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LogEntry {
  /** Monotonic sequence number (stable across `logs` calls; use it as a cursor). */
  seq: number;
  /** Milliseconds since the session started. */
  t: number;
  level: LogLevel;
  /** Where the entry came from: app `console.*`, a React error callback, or the host process. */
  source: "console" | "react" | "process" | "server";
  message: string;
  /** `TX###` code when the logged error carries one. */
  code?: string;
}

const MAX_MESSAGE = 8_000;

/** `TX###` code of an error-like value (duck-typed so this works with any Text.js version). */
export function txCodeOf(value: unknown): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const code = (value as { code?: unknown }).code;
  if (typeof code === "string" && /^TX\d{3}$/.test(code)) return code;
  const message = (value as { message?: unknown }).message;
  if (typeof message === "string") return /\b(TX\d{3})\b/.exec(message)?.[1];
  return undefined;
}

/**
 * Format console arguments like Node's `util.format`, dropping `%c` styling
 * (the browser console's styled-span syntax) together with the style argument
 * it consumes. Directives are scanned left to right, so `%%c` stays a literal
 * `%c` and `%s` / `%c` mixes consume arguments in order.
 */
export function formatLogArgs(args: readonly unknown[]): string {
  let list = args;
  const fmt = list[0];
  if (typeof fmt === "string" && fmt.includes("%c")) {
    const rest = list.slice(1);
    const kept: unknown[] = [];
    let next = 0;
    const out = fmt.replace(/%[csdifjoO%]/g, (token) => {
      if (token === "%%") return token;
      if (next >= rest.length) return token;
      const arg = rest[next++];
      if (token === "%c") return "";
      kept.push(arg);
      return token;
    });
    list = [out, ...kept, ...rest.slice(next)];
  }
  const text = formatWithOptions({ colors: false, depth: 4, breakLength: 120 }, ...list);
  return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}… (${text.length - MAX_MESSAGE} more chars)` : text;
}

export class LogBuffer {
  private readonly entries: LogEntry[] = [];
  private seq = 0;
  private readonly started = Date.now();
  private readonly listeners = new Set<(entry: LogEntry) => void>();

  constructor(private readonly capacity = 1_000) {}

  /** Record an entry; `indent` is the `console.group` depth (two spaces per level). */
  push(level: LogLevel, source: LogEntry["source"], args: readonly unknown[], indent = 0): LogEntry {
    const code = args.map(txCodeOf).find((c) => c !== undefined);
    const text = formatLogArgs(args);
    const message = indent > 0 ? text.replace(/^/gm, "  ".repeat(indent)) : text;
    const entry: LogEntry = { seq: ++this.seq, t: Date.now() - this.started, level, source, message, ...(code ? { code } : {}) };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) this.entries.splice(0, this.entries.length - this.capacity);
    for (const l of this.listeners) l(entry);
    return entry;
  }

  /** Entries with `seq > since`, optionally filtered by level, newest last. */
  read(options: { since?: number; levels?: readonly LogLevel[]; limit?: number } = {}): LogEntry[] {
    const { since = 0, levels, limit = 200 } = options;
    const out = this.entries.filter((e) => e.seq > since && (!levels || levels.includes(e.level)));
    return limit > 0 && out.length > limit ? out.slice(out.length - limit) : out;
  }

  /** Highest sequence number issued so far. */
  get cursor(): number {
    return this.seq;
  }

  /** Errors logged after `since`. */
  errorsSince(since: number): number {
    let n = 0;
    for (const e of this.entries) if (e.seq > since && e.level === "error") n++;
    return n;
  }

  clear(): void {
    this.entries.length = 0;
  }

  onEntry(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface ConsoleCapture {
  restore(): void;
}

type ConsoleFn = (...args: unknown[]) => unknown;

/**
 * Route every `console` method into `buffer`. `mirror` additionally receives
 * each entry (e.g. stderr when `--verbose`); stdout is never written.
 *
 * All methods are replaced, not just `log`/`info`/`warn`/`error`/`debug`: Bun's
 * native `console.count`, `group`, `table`, `dir`, `write` (and Node's) print
 * straight to file descriptor 1, which would corrupt a stdio JSON-RPC stream,
 * and `assert` / `timeLog` / `timeEnd` would bypass the buffer.
 */
export function captureConsole(buffer: LogBuffer, mirror?: (entry: LogEntry) => void): ConsoleCapture {
  const target = console as unknown as Record<string, unknown>;
  let depth = 0;
  const counts = new Map<string, number>();
  const timers = new Map<string, number>();
  const push = (level: LogLevel, args: readonly unknown[]): void => {
    const entry = buffer.push(level, "console", args, depth);
    mirror?.(entry);
  };
  const label = (v: unknown): string => (v === undefined ? "default" : String(v));
  const elapsed = (name: string): string | null => {
    const start = timers.get(name);
    if (start === undefined) return null;
    return `${name}: ${(performance.now() - start).toFixed(3)}ms`;
  };

  const handlers: Record<string, ConsoleFn> = {
    log: (...a) => push("log", a),
    info: (...a) => push("info", a),
    warn: (...a) => push("warn", a),
    error: (...a) => push("error", a),
    debug: (...a) => push("debug", a),
    dir: (obj) => push("log", [obj]),
    dirxml: (...a) => push("log", a),
    table: (data, columns) => push("log", columns === undefined ? [data] : [data, columns]),
    trace: (...a) => {
      const stack = new Error().stack?.split("\n").slice(2).join("\n") ?? "";
      push("debug", [`Trace${a.length > 0 ? `: ${formatLogArgs(a)}` : ""}${stack ? `\n${stack}` : ""}`]);
    },
    assert: (condition, ...a) => {
      if (condition) return;
      push("error", a.length > 0 ? ["Assertion failed:", ...a] : ["Assertion failed"]);
    },
    count: (name) => {
      const key = label(name);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      push("log", [`${key}: ${n}`]);
    },
    countReset: (name) => void counts.set(label(name), 0),
    group: (...a) => {
      if (a.length > 0) push("log", a);
      depth++;
    },
    groupCollapsed: (...a) => {
      if (a.length > 0) push("log", a);
      depth++;
    },
    groupEnd: () => {
      depth = Math.max(0, depth - 1);
    },
    time: (name) => void timers.set(label(name), performance.now()),
    timeLog: (name, ...a) => {
      const line = elapsed(label(name));
      if (line === null) push("warn", [`Timer "${label(name)}" does not exist`]);
      else push("log", [line, ...a]);
    },
    timeEnd: (name) => {
      const line = elapsed(label(name));
      if (line === null) push("warn", [`Timer "${label(name)}" does not exist`]);
      else push("log", [line]);
      timers.delete(label(name));
    },
    clear: () => undefined,
    // Bun: `console.write(...chunks)` writes raw bytes to stdout and returns the byte count.
    write: (...chunks) => {
      const text = chunks.map((c) => (typeof c === "string" ? c : c instanceof Uint8Array ? new TextDecoder().decode(c) : String(c))).join("");
      push("log", [text.replace(/\n$/, "")]);
      return new TextEncoder().encode(text).length;
    },
  };

  const originals = new Map<string, PropertyDescriptor | undefined>();
  const names = new Set([...Object.keys(handlers), ...Object.getOwnPropertyNames(console)]);
  for (const name of names) {
    if (name === "Console" || name.startsWith("_")) continue;
    const current = target[name];
    if (!(name in handlers) && typeof current !== "function") continue;
    originals.set(name, Object.getOwnPropertyDescriptor(console, name));
    // Anything else (`profile`, `timeStamp`, Bun's `record` / `screenshot`, …) becomes a no-op.
    const fn = handlers[name] ?? (() => undefined);
    try {
      Object.defineProperty(console, name, { value: fn, writable: true, configurable: true, enumerable: true });
    } catch {
      target[name] = fn;
    }
  }
  let restored = false;
  return {
    restore() {
      if (restored) return;
      restored = true;
      for (const [name, desc] of originals) {
        if (desc) Object.defineProperty(console, name, desc);
        else delete target[name];
      }
    },
  };
}
