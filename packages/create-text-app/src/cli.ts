import { basename, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { detectPackageManager, isTemplateName, runCommand, scaffold, TEMPLATES, toPackageName, validateProjectName, VERSION, type PackageManager, type TemplateName } from "./index";
import { txMessage } from "./errors";

const useColor = (): boolean => !process.env.NO_COLOR && (Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY));
const paint =
  (open: number, close: number) =>
  (s: string): string =>
    useColor() ? `\x1b[${open}m${s}\x1b[${close}m` : s;
const bold = paint(1, 22);
const dim = paint(2, 22);
const cyan = paint(36, 39);
const green = paint(32, 39);
const red = paint(31, 39);

export interface CliArgs {
  dir?: string;
  template?: string;
  yes: boolean;
  help: boolean;
  version: boolean;
  textjsVersion?: string;
  force: boolean;
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = { yes: false, help: false, version: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === "-y" || a === "--yes") out.yes = true;
    else if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-v" || a === "--version") out.version = true;
    else if (a === "-f" || a === "--force") out.force = true;
    else if (a === "-t" || a === "--template") out.template = argv[++i];
    else if (a.startsWith("--template=")) out.template = a.slice(11);
    else if (a === "--textjs-version") out.textjsVersion = argv[++i];
    else if (!a.startsWith("-") && out.dir === undefined) out.dir = a;
  }
  return out;
}

/** The docs' quickstart (`bunx create-text-app@latest`, then `cd my-app`) relies on this default. */
export const DEFAULT_DIR = "my-app";

const HELP = `Usage: create-text-app [project-directory] [options]

Options:
  -t, --template <name>   starter | dashboard | opencode (default: starter)
  -y, --yes               Use defaults for anything not passed as a flag
  -f, --force             Scaffold into a non-empty directory
  -v, --version           Print the version
  -h, --help              Show this help
`;

/** Arrow-key list selection in a TTY. */
async function select<T extends string>(question: string, options: ReadonlyArray<{ value: T; label: string; hint: string }>): Promise<T> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  let index = 0;
  const render = (first: boolean): void => {
    if (!first) stdout.write(`\x1b[${options.length}A`);
    for (let i = 0; i < options.length; i++) {
      const o = options[i] as { value: T; label: string; hint: string };
      const active = i === index;
      stdout.write(`\x1b[2K${active ? cyan("❯ ") : "  "}${active ? bold(o.label) : o.label} ${dim(o.hint)}\n`);
    }
  };
  stdout.write(`${green("?")} ${bold(question)} ${dim("(↑/↓, enter)")}\n`);
  render(true);
  return new Promise<T>((done, fail) => {
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (buf: Buffer): void => {
      const key = buf.toString();
      if (key === "\x03") {
        cleanup();
        fail(new Error("cancelled"));
      } else if (key === "\x1b[A" || key === "k") {
        index = (index - 1 + options.length) % options.length;
        render(false);
      } else if (key === "\x1b[B" || key === "j") {
        index = (index + 1) % options.length;
        render(false);
      } else if (key === "\r" || key === "\n") {
        cleanup();
        done((options[index] as { value: T }).value);
      }
    };
    const cleanup = (): void => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on("data", onData);
  });
}

async function ask(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${green("?")} ${bold(question)} ${dim(`(${fallback})`)} `);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

export function successMessage(opts: { dir: string; displayDir: string; template: TemplateName; pm: PackageManager }): string {
  const { displayDir, pm } = opts;
  const lines = [
    "",
    `${green("Success!")} Created ${bold(basename(opts.dir))} at ${opts.dir}`,
    "",
    "Inside that directory, you can run several commands:",
    "",
    `  ${cyan(runCommand(pm, "dev"))}`,
    "    Starts the development server.",
    "",
    `  ${cyan(runCommand(pm, "build"))}`,
    "    Creates an optimized console production build.",
    "",
    `  ${cyan(runCommand(pm, "start"))}`,
    "    Serves the production build.",
    "",
    "We suggest that you begin by typing:",
    "",
  ];
  if (displayDir !== ".") lines.push(`  ${cyan("cd")} ${displayDir}`);
  lines.push(`  ${cyan(`${pm} install`)}`, `  ${cyan(runCommand(pm, "dev"))}`, "", `Then open the page and press ${bold("⌘⌥J")} to open Chrome DevTools — your app renders in the Console.`, "");
  return lines.join("\n");
}

export async function main(argv: readonly string[]): Promise<number> {
  const args = parseCliArgs(argv);
  if (args.version) {
    console.log(VERSION);
    return 0;
  }
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  const interactive = !args.yes && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
  console.log(`\n${bold("▼ create-text-app")} ${dim(`v${VERSION}`)}\n`);

  try {
    let dir = args.dir;
    if (dir === undefined) dir = interactive ? await ask("What is your project named?", DEFAULT_DIR) : DEFAULT_DIR;
    const nameError = validateProjectName(toPackageName(dir));
    if (nameError) {
      console.error(`${red("⨯")} ${txMessage("TX027", bold(JSON.stringify(dir)), nameError)}`);
      return 1;
    }

    let template: TemplateName;
    if (args.template !== undefined) {
      if (!isTemplateName(args.template)) {
        console.error(`${red("⨯")} ${txMessage("TX025", bold(args.template), Object.keys(TEMPLATES).join(", "))}`);
        return 1;
      }
      template = args.template;
    } else if (interactive) {
      template = await select(
        "Which template would you like to use?",
        (Object.keys(TEMPLATES) as TemplateName[]).map((value) => ({ value, label: value, hint: TEMPLATES[value] })),
      );
    } else template = "starter";

    const target = resolve(dir);
    console.log(`Creating a new Text.js app in ${green(target)}.\n`);
    console.log(`Using template: ${bold(template)}\n`);
    const result = scaffold({ dir: target, template, textjsVersion: args.textjsVersion, force: args.force });
    for (const f of result.files) console.log(`  ${dim("+")} ${f}`);
    const rel = relative(process.cwd(), result.dir) || ".";
    console.log(successMessage({ dir: result.dir, displayDir: rel, template, pm: detectPackageManager() }));
    return 0;
  } catch (error) {
    console.error(`${red("⨯")} ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
