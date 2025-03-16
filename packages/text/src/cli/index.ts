import { resolve } from "node:path";
import { VERSION } from "@textjs/core";
import { buildApp } from "./build";
import { startDevServer } from "./dev";
import { startProductionServer } from "./start";
import { brand, color, fail } from "./ui";

export interface ParsedArgs {
  command: string;
  dir: string;
  port?: number;
  host?: string | boolean;
  help: boolean;
  version: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { command: "", dir: ".", help: false, version: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-p" || a === "--port") out.port = Number(argv[++i]);
    else if (a.startsWith("--port=")) out.port = Number(a.slice(7));
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

Options:
  -p, --port <port>   Port (default 3000)
  -H, --host [host]   Expose on the network (optionally bind a host)
  -v, --version       Print the Text.js version
  -h, --help          Show this help
`;

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.version) {
    console.log(`Text.js v${VERSION}`);
    return 0;
  }
  if (args.help || args.command === "" || args.command === "help") {
    console.log(`\n   ${brand()} — The Console Framework for the Web\n`);
    console.log(HELP);
    return args.command === "" && !args.help ? 1 : 0;
  }
  const root = resolve(args.dir);
  try {
    switch (args.command) {
      case "dev": {
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
      case "build":
        await buildApp({ root });
        return 0;
      case "start": {
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
      default:
        console.error(fail(`Unknown command ${color.bold(args.command)}.`));
        console.log(HELP);
        return 1;
    }
  } catch (error) {
    if (args.command !== "build") console.error(fail(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}
