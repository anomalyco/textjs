/**
 * `text mcp [dir]` — serve a headless Text.js app to coding agents over MCP
 * (stdio). stdout carries JSON-RPC only: app `console.*` output and stray
 * `process.stdout.write` calls are captured into the `logs` tool instead.
 */

import { resolve } from "node:path";
import type { Writable } from "node:stream";
import type { ThemeName } from "@textjs/react";
import { captureConsole, LogBuffer, type LogEntry } from "./logs";

export interface McpCliArgs {
  dir: string;
  path?: string;
  cols?: number;
  rows?: number;
  theme?: string;
  skipConfig: boolean;
  verbose: boolean;
  help: boolean;
}

export const MCP_HELP = `Usage: text mcp [dir] [options]

Serve the app in [dir] to coding agents over the Model Context Protocol (stdio).
The app runs headless, in-process: same routes, layouts and route handlers.

Options:
  --path <pathname>   Initial route (default /)
  --cols <n>          Grid width (default: text.config.ts viewport, else 100)
  --rows <n>          Grid height (default: text.config.ts viewport, else 32)
  --theme <name>      Theme preset
  --no-config         Ignore text.config.ts
  --verbose           Mirror captured logs to stderr
  -h, --help          Show this help

Tools: list_routes navigate read_frame press type paste resize inspect_tree
       find wait_for logs fetch reload
`;

export function parseMcpArgs(argv: readonly string[]): McpCliArgs {
  const out: McpCliArgs = { dir: ".", skipConfig: false, verbose: false, help: false };
  const positional: string[] = [];
  const num = (v: string | undefined): number | undefined => {
    const n = Number(v);
    return v !== undefined && Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    const eq = a.indexOf("=");
    const flag = a.startsWith("--") && eq > 0 ? a.slice(0, eq) : a;
    const inline = a.startsWith("--") && eq > 0 ? a.slice(eq + 1) : undefined;
    const value = (): string | undefined => inline ?? argv[++i];
    if (flag === "-h" || flag === "--help") out.help = true;
    else if (flag === "--path") out.path = value();
    else if (flag === "--cols") out.cols = num(value());
    else if (flag === "--rows") out.rows = num(value());
    else if (flag === "--theme") out.theme = value();
    else if (flag === "--no-config") out.skipConfig = true;
    else if (flag === "--verbose") out.verbose = true;
    else positional.push(a);
  }
  // argv includes the command itself ("mcp") when called from `text`.
  if (positional[0] === "mcp") positional.shift();
  if (positional[0]) out.dir = positional[0];
  return out;
}

function formatEntry(e: LogEntry): string {
  return `[text mcp] ${e.level}${e.source !== "console" ? ` (${e.source})` : ""}: ${e.message}\n`;
}

/** Run the stdio server until stdin closes or a signal arrives. Resolves with the exit code. */
export async function runMcpCli(argv: readonly string[]): Promise<number> {
  const args = parseMcpArgs(argv);
  const stderr = (s: string): void => void process.stderr.write(s);
  if (args.help) {
    // Only a human asks for help, so stdout is not carrying JSON-RPC yet.
    process.stdout.write(MCP_HELP);
    return 0;
  }
  if (typeof process.versions.bun !== "string") {
    stderr("text mcp requires Bun (route files are imported as TypeScript). Run it with `bunx --bun text mcp`.\n");
    return 1;
  }

  // 1. Own stdout before anything can write to it.
  const realWrite = process.stdout.write.bind(process.stdout) as (chunk: string | Uint8Array, cb?: (err?: Error | null) => void) => boolean;
  const logs = new LogBuffer();
  const mirror = args.verbose ? (e: LogEntry) => stderr(formatEntry(e)) : undefined;
  const capture = captureConsole(logs, mirror);
  const strayWrite = ((chunk: string | Uint8Array, encodingOrCb?: unknown, cb?: unknown): boolean => {
    const text = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
    const entry = logs.push("log", "process", [text.replace(/\n$/, "")]);
    mirror?.(entry);
    const done = typeof encodingOrCb === "function" ? encodingOrCb : cb;
    if (typeof done === "function") queueMicrotask(() => (done as () => void)());
    return true;
  }) as typeof process.stdout.write;
  process.stdout.write = strayWrite;
  const transportOut = {
    write: (chunk: string) => realWrite(chunk),
    once: (event: string, listener: () => void) => {
      process.stdout.once(event, listener);
      return transportOut;
    },
    on: (event: string, listener: () => void) => {
      process.stdout.on(event, listener);
      return transportOut;
    },
  } as unknown as Writable;

  const onRejection = (reason: unknown): void => {
    const e = logs.push("error", "process", ["Unhandled promise rejection:", reason]);
    mirror?.(e);
  };
  const onException = (error: unknown): void => {
    const e = logs.push("error", "process", ["Uncaught exception:", error]);
    mirror?.(e);
  };
  process.on("unhandledRejection", onRejection);
  process.on("uncaughtException", onException);

  const [{ StdioServerTransport }, { createTextMcpServer }] = await Promise.all([import("@modelcontextprotocol/sdk/server/stdio.js"), import("./server")]);
  const root = resolve(args.dir);
  const { server, controller } = createTextMcpServer({
    root,
    path: args.path,
    cols: args.cols,
    rows: args.rows,
    theme: args.theme as ThemeName | undefined,
    skipConfig: args.skipConfig,
    logs,
    captureConsole: false,
  });
  const transport = new StdioServerTransport(process.stdin, transportOut);

  let resolveExit: (code: number) => void = () => undefined;
  const exited = new Promise<number>((r) => {
    resolveExit = r;
  });
  let closing = false;
  const shutdown = async (code: number): Promise<void> => {
    if (closing) return;
    closing = true;
    try {
      await Promise.race([controller.dispose(), new Promise((r) => setTimeout(r, 2000))]);
      await server.close().catch(() => undefined);
    } finally {
      process.off("unhandledRejection", onRejection);
      process.off("uncaughtException", onException);
      capture.restore();
      process.stdout.write = realWrite as typeof process.stdout.write;
      resolveExit(code);
      // App timers or sockets must not keep a disconnected server alive.
      setTimeout(() => process.exit(code), 500).unref();
    }
  };
  transport.onclose = () => void shutdown(0);
  process.stdin.once("end", () => void shutdown(0));
  process.stdin.once("close", () => void shutdown(0));
  process.once("SIGINT", () => void shutdown(130));
  process.once("SIGTERM", () => void shutdown(143));

  await server.connect(transport);
  stderr(`▼ Text.js MCP server · ${root}\n`);
  // Load the app in the background; tools wait for it and report load errors.
  controller.start().catch((error: unknown) => {
    stderr(`[text mcp] failed to start the app: ${error instanceof Error ? error.message : String(error)}\n`);
  });
  return exited;
}
