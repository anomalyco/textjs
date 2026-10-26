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

const LEVELS: readonly LogLevel[] = ["log", "info", "warn", "error", "debug"];
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

export function formatLogArgs(args: readonly unknown[]): string {
  // Drop `%c` styling (the browser console's styled-span syntax) before formatting.
  let list = args;
  if (typeof list[0] === "string" && list[0].includes("%c")) {
    const fmt = list[0];
    const styles = (fmt.match(/%c/g) ?? []).length;
    list = [fmt.replace(/%c/g, ""), ...list.slice(1 + styles)];
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

  push(level: LogLevel, source: LogEntry["source"], args: readonly unknown[]): LogEntry {
    const code = args.map(txCodeOf).find((c) => c !== undefined);
    const entry: LogEntry = { seq: ++this.seq, t: Date.now() - this.started, level, source, message: formatLogArgs(args), ...(code ? { code } : {}) };
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

/**
 * Route `console.*` into `buffer`. `mirror` additionally receives each line
 * (e.g. stderr when `--verbose`); stdout is never written.
 */
export function captureConsole(buffer: LogBuffer, mirror?: (entry: LogEntry) => void): ConsoleCapture {
  const originals = new Map<LogLevel, (...args: unknown[]) => void>();
  const target = console as unknown as Record<LogLevel, (...args: unknown[]) => void>;
  for (const level of LEVELS) {
    originals.set(level, target[level]);
    target[level] = (...args: unknown[]) => {
      const entry = buffer.push(level, "console", args);
      mirror?.(entry);
    };
  }
  // `console.trace` / `console.dir` / `console.table` write to stdout in Node and Bun too.
  const extra = ["trace", "dir", "table"] as const;
  const extraOriginals = new Map<string, unknown>();
  const anyConsole = console as unknown as Record<string, unknown>;
  for (const name of extra) {
    extraOriginals.set(name, anyConsole[name]);
    anyConsole[name] = (...args: unknown[]) => {
      const entry = buffer.push(name === "trace" ? "debug" : "log", "console", args);
      mirror?.(entry);
    };
  }
  let restored = false;
  return {
    restore() {
      if (restored) return;
      restored = true;
      for (const [level, fn] of originals) target[level] = fn;
      for (const [name, fn] of extraOriginals) anyConsole[name] = fn;
    },
  };
}
