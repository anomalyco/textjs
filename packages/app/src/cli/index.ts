// Command modules (Vite, the dev server, the MCP server) load lazily: `text mcp`
// must own stdout before any third-party module runs.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { txError, txMessage, VERSION } from "@textjs/core";
import { brand, color, fail } from "./ui";

export interface ParsedArgs {
  command: string;
  dir: string;
  port?: number;
  host?: string | boolean;
  /** `text proxy --target <url>`. */
  target?: string;
  /** `text proxy --allow-origin <origin>` (repeatable). */
  allowOrigins: string[];
  /** `text build --adapter <static|bun|vercel|cloudflare>`. */
  adapter?: string;
  /** `text run --path <pathname>`. */
  path?: string;
  help: boolean;
  version: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { command: "", dir: ".", allowOrigins: [], help: false, version: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-p" || a === "--port") out.port = Number(argv[++i]);
    else if (a.startsWith("--port=")) out.port = Number(a.slice(7));
    else if (a === "--path") out.path = argv[++i];
    else if (a.startsWith("--path=")) out.path = a.slice(7);
    else if (a === "--adapter") out.adapter = argv[++i];
    else if (a.startsWith("--adapter=")) out.adapter = a.slice(10);
    else if (a === "--target") out.target = argv[++i];
    else if (a.startsWith("--target=")) out.target = a.slice(9);
    else if (a === "--allow-origin") {
      const v = argv[++i];
      if (v) out.allowOrigins.push(v);
    } else if (a.startsWith("--allow-origin=")) out.allowOrigins.push(a.slice(15));
    else if (a === "-H" || a === "--host" || a === "--hostname") {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-") && /[.:]|localhost/.test(next)) {
        out.host = next;
        i++;
      } else out.host = true;
    } else if (a.startsWith("--host=")) out.host = a.slice(7);
    else positional.push(a);
  }
  out.command = positional[0] ?? "";
  if (positional[1]) out.dir = positional[1];
  if (out.port !== undefined && !Number.isFinite(out.port)) out.port = undefined;
  return out;
}

export const HELP = `Usage: text <command> [options] [dir]

Commands:
  dev      Start the development server (Vite + React Fast Refresh)
  build    Create an optimized console production build
  start    Serve the production build
  run      Render the app in this terminal (Bun)
  proxy    Bridge textjs.org/opencode to your local OpenCode server
           (same as bunx @textjs/opencode@latest proxy)
  mcp      Serve the app to coding agents over MCP (stdio, Bun)

Options:
  -p, --port <port>   Port (default 3000; proxy 4096)
  --path <pathname>   run: initial route (default /)
  --adapter <name>    build: static | bun | vercel | cloudflare
  --target <url>      proxy: OpenCode server URL (default: discover)
  --allow-origin <o>  proxy: allow another browser origin
  -H, --host [host]   Expose on the network (optionally bind a host)
  -v, --version       Print the Text.js version
  -h, --help          Show this help
`;

/** Commands that import route files as TypeScript and so need Bun. */
const BUN_COMMANDS = new Set(["run", "mcp"]);
const REEXEC_ENV = "TEXTJS_REEXEC_BUN";

/**
 * Re-run this CLI under Bun (same script and arguments, inherited stdio,
 * forwarded signals). Resolves with the child's exit code, or `null` when
 * Bun is not installed.
 */
export function reexecUnderBun(argv: readonly string[], script = process.argv[1]): Promise<number | null> {
  if (!script || process.env[REEXEC_ENV]) return Promise.resolve(null);
  return new Promise((done) => {
    const child = spawn("bun", [script, ...argv], { stdio: "inherit", env: { ...process.env, [REEXEC_ENV]: "1" } });
    const signals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
    const forward = (signal: NodeJS.Signals): void => void child.kill(signal);
    for (const s of signals) process.on(s, forward);
    const finish = (code: number | null): void => {
      for (const s of signals) process.off(s, forward);
      done(code);
    };
    child.once("error", () => finish(null));
    child.once("exit", (code, signal) => finish(code ?? (signal ? 1 : 0)));
  });
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.version) {
    console.log(`Text.js v${VERSION}`);
    return 0;
  }
  if (BUN_COMMANDS.has(args.command) && !args.help && typeof process.versions.bun !== "string") {
    const code = await reexecUnderBun(argv);
    if (code !== null) return code;
    // No Bun: `text mcp` reports TX019 on stderr (stdout is reserved for JSON-RPC).
    if (args.command === "mcp") {
      process.stderr.write(`${txMessage("TX019", "mcp", "mcp")}\n`);
      return 1;
    }
  }
  if (args.command === "mcp") {
    // Owns stdout (JSON-RPC) and its own flags; see `text mcp --help`.
    const { runMcpCli } = await import("../mcp/cli");
    return runMcpCli(argv);
  }
  if (args.help || args.command === "" || args.command === "help") {
    console.log(`\n   ${brand()}\n   The Console Framework for the Web\n`);
    console.log(HELP);
    return args.command === "" && !args.help ? 1 : 0;
  }
  const root = resolve(args.dir);
  try {
    switch (args.command) {
      case "dev": {
        const { startDevServer } = await import("./dev");
        const server = await startDevServer({ root, port: args.port, host: args.host });
        const stop = async (): Promise<void> => {
          await server.close();
          process.exit(0);
        };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
        await new Promise<never>(() => undefined);
        return 0;
      }
      case "build": {
        const { buildApp } = await import("./build");
        await buildApp({ root, adapter: args.adapter });
        return 0;
      }
      case "start": {
        const { startProductionServer } = await import("./start");
        const s = await startProductionServer({ root, port: args.port, host: typeof args.host === "string" ? args.host : args.host ? "0.0.0.0" : undefined });
        const stop = async (): Promise<void> => {
          await s.close();
          process.exit(0);
        };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
        await new Promise<never>(() => undefined);
        return 0;
      }
      case "run": {
        if (typeof process.versions.bun !== "string") throw txError("TX019", "run", "run");
        const { runInTerminal } = await import("./run");
        const app = await runInTerminal({ root, path: args.path });
        await app.waitUntilExit();
        return 0;
      }
      case "proxy": {
        // One implementation: the bridge lives in @textjs/opencode (`bunx @textjs/opencode@latest proxy`).
        const { runProxy } = await import("@textjs/opencode");
        return await runProxy({ port: args.port, target: args.target, allowOrigins: args.allowOrigins });
      }
      default:
        console.error(fail(txMessage("TX020", color.bold(args.command))));
        if (args.command === "deploy") console.error(color.gray("   To deploy, run text build --adapter <static|bun|vercel|cloudflare>."));
        console.log(HELP);
        return 1;
    }
  } catch (error) {
    if (args.command !== "build") console.error(fail(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}
