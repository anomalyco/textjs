import { color } from "./color";
import { DEFAULT_PROXY_PORT, startProxy } from "./proxy";
import { VERSION } from "./version";

export interface ParsedArgs {
  command: string;
  port?: number;
  target?: string;
  allowOrigins: string[];
  help: boolean;
  version: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { command: "", allowOrigins: [], help: false, version: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-p" || a === "--port") out.port = Number(argv[++i]);
    else if (a.startsWith("--port=")) out.port = Number(a.slice(7));
    else if (a === "--target") out.target = argv[++i];
    else if (a.startsWith("--target=")) out.target = a.slice(9);
    else if (a === "--allow-origin") {
      const v = argv[++i];
      if (v) out.allowOrigins.push(v);
    } else if (a.startsWith("--allow-origin=")) out.allowOrigins.push(a.slice(15));
    else positional.push(a);
  }
  out.command = positional[0] ?? "";
  if (out.port !== undefined && !Number.isFinite(out.port)) out.port = undefined;
  return out;
}

export const HELP = `Usage: bunx @textjs/opencode proxy [options]

Commands:
  proxy  Bridge textjs.org/opencode to the OpenCode server on this machine

Options:
  -p, --port <port>        Port (default ${DEFAULT_PROXY_PORT})
  --target <url>           OpenCode server URL (default: discover)
  --allow-origin <origin>  Allow another browser origin (repeatable)
  -v, --version            Print the version
  -h, --help               Show this help
`;

export interface RunProxyOptions {
  port?: number;
  target?: string;
  allowOrigins?: readonly string[];
}

/** Start the bridge and keep it running until SIGINT or SIGTERM. */
export async function runProxy(options: RunProxyOptions = {}): Promise<never> {
  const bridge = await startProxy({ port: options.port ?? DEFAULT_PROXY_PORT, target: options.target, allowOrigins: options.allowOrigins });
  const stop = async (): Promise<void> => {
    await bridge.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return new Promise<never>(() => undefined);
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.version) {
    console.log(`@textjs/opencode v${VERSION}`);
    return 0;
  }
  if (args.help || args.command === "" || args.command === "help") {
    console.log(HELP);
    return args.command === "" && !args.help ? 1 : 0;
  }
  if (args.command !== "proxy") {
    console.error(` ${color.red("⨯")} Unknown command ${color.bold(args.command)}.\n`);
    console.log(HELP);
    return 1;
  }
  try {
    return await runProxy(args);
  } catch (error) {
    console.error(` ${color.red("⨯")} ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
