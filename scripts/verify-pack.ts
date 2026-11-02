/**
 * Install the packed (publish-shaped) `@textjs/core`, `@textjs/react`,
 * `@textjs/opencode` and `@textjs/app` into a fresh starter app outside the
 * repo and smoke-test the `text` and `textjs-opencode` CLIs under Node and Bun.
 *
 *   bun scripts/verify-pack.ts [--keep] [--skip-build]
 *
 * Packing mirrors `release-publish.ts`: `bun pm pack`, then the
 * `publishConfig` overrides are hoisted into the packed manifest.
 */

import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { preparePackedManifest } from "./release-publish";

const root = resolve(import.meta.dir, "..");
const PACKAGES = [
  ["@textjs/core", "packages/core"],
  ["@textjs/react", "packages/react"],
  ["@textjs/opencode", "packages/opencode"],
  ["@textjs/app", "packages/app"],
] as const;

function sh(cmd: string, args: string[], cwd: string, env?: Record<string, string>): string {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (exit ${r.status})\n${r.stdout}\n${r.stderr}`);
  return `${r.stdout}${r.stderr}`;
}

/** Pack every package into `work/` and return `name → tarball path`. */
export function packPackages(work: string, build: boolean, packages: ReadonlyArray<readonly [string, string]> = PACKAGES): Record<string, string> {
  if (build) sh("bun", ["run", "build:packages"], root);
  const out: Record<string, string> = {};
  for (const [name, dir] of packages) {
    const dest = join(work, name.replace("/", "__"));
    mkdirSync(dest, { recursive: true });
    sh("bun", ["pm", "pack", "--destination", dest, "--ignore-scripts", "--quiet"], join(root, dir));
    const tgz = readdirSync(dest).find((f) => f.endsWith(".tgz")) as string;
    sh("tar", ["xzf", tgz], dest);
    const manifest = join(dest, "package", "package.json");
    writeFileSync(manifest, `${JSON.stringify(preparePackedManifest(JSON.parse(readFileSync(manifest, "utf8")) as Record<string, unknown>), null, 2)}\n`);
    rmSync(join(dest, tgz));
    sh("tar", ["czf", "final.tgz", "package"], dest);
    // Forward slashes: these paths go into `file:` specifiers in package.json.
    out[name] = join(dest, "final.tgz").replaceAll("\\", "/");
  }
  return out;
}

const SERVER_PAGE = `export const runtime = "server";
import { Box, Text } from "@textjs/app";
import { usePathname } from "@textjs/app/navigation";

async function Data(): Promise<React.ReactNode> {
  await new Promise((r) => setTimeout(r, 10));
  return <Text>server data ok</Text>;
}

export default function Page() {
  const pathname = usePathname();
  return (
    <Box className="flex-col">
      <Text>server page at {pathname}</Text>
      <Data />
    </Box>
  );
}
`;

const CLIENT_NAV_PAGE = `import { Text } from "@textjs/app";
import { usePathname, useRouter } from "@textjs/app/navigation";

export default function Page() {
  const pathname = usePathname();
  useRouter();
  return <Text>nav page at {pathname}</Text>;
}
`;

function scaffold(app: string, tarballs: Record<string, string>): void {
  cpSync(join(root, "packages/create-text-app/templates/starter"), app, { recursive: true });
  const fill = (s: string): string => s.replaceAll("{{name}}", "pack-smoke").replaceAll("{{textjsVersion}}", `file:${tarballs["@textjs/app"]}`);
  for (const f of ["package.json", "text.config.ts", "app/layout.tsx", "README.md"]) {
    const p = join(app, f);
    writeFileSync(p, fill(readFileSync(p, "utf8")));
  }
  const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8")) as Record<string, unknown>;
  const local = Object.fromEntries(Object.entries(tarballs).map(([n, t]) => [n, `file:${t}`]));
  pkg.overrides = local;
  pkg.resolutions = local;
  writeFileSync(join(app, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  mkdirSync(join(app, "app/live"), { recursive: true });
  writeFileSync(join(app, "app/live/page.tsx"), SERVER_PAGE);
  mkdirSync(join(app, "app/nav"), { recursive: true });
  writeFileSync(join(app, "app/nav/page.tsx"), CLIENT_NAV_PAGE);
}

type Runtime = "node" | "bun";
const textCmd = (rt: Runtime, app: string): string[] => (rt === "node" ? ["node", join(app, "node_modules/@textjs/app/bin/text.js")] : ["bun", join(app, "node_modules/@textjs/app/bin/text.js")]);

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

const BAD = /TX014|Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|ERR_UNSUPPORTED|Could not resolve|is not exported|SyntaxError/;

function runSync(name: string, cmd: string[], app: string): Result {
  const [bin, ...args] = cmd as [string, ...string[]];
  const r = spawnSync(bin, args, { cwd: app, encoding: "utf8", timeout: 180_000 });
  const out = `${r.stdout}${r.stderr}`;
  return { name, ok: r.status === 0 && !BAD.test(out), detail: out.trim().split("\n").slice(-6).join("\n") };
}

/** Read an SSE stream until `needle` shows up (or `ms` elapses); returns everything read. */
async function readStream(url: string, needle: string, ms: number): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  let text = "";
  try {
    const res = await fetch(url, { signal: ac.signal, headers: { accept: "text/event-stream" } });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    while (!text.includes(needle)) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => undefined);
  } catch {
    // timed out: return what arrived
  } finally {
    clearTimeout(timer);
  }
  return text;
}

async function runServer(name: string, cmd: string[], app: string, port: number): Promise<Result> {
  const [bin, ...args] = cmd as [string, ...string[]];
  const child = spawn(bin, [...args, "--port", String(port)], { cwd: app, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  try {
    const base = `http://127.0.0.1:${port}`;
    let up = false;
    for (let i = 0; i < 100 && !up; i++) {
      await Bun.sleep(200);
      up = await fetch(base).then(
        (r) => r.ok,
        () => false,
      );
    }
    if (!up) return { name, ok: false, detail: `server did not start\n${out}` };
    const home = await (await fetch(base)).text();
    const live = await fetch(`${base}/live`);
    const liveText = await live.text();
    // The server-rendered page streams cell deltas over SSE: its async server
    // component and `usePathname()` must render (one RouterContext).
    const frames = await readStream(`${base}/__textjs/live?path=/live&cols=100&rows=32`, "server data ok", 15_000);
    const ok = home.includes("<script") && live.ok && frames.includes("server data ok") && frames.includes("server page at /live") && !BAD.test(out) && !BAD.test(liveText + frames);
    return { name, ok, detail: `GET / ${home.length}B, GET /live ${live.status}, live SSE ${frames.includes("server data ok") ? "rendered the server page" : `missing server output:\n${frames.slice(0, 2000)}`}${out.trim() ? `\n${out.trim().split("\n").slice(-6).join("\n")}` : ""}` };
  } finally {
    child.kill("SIGTERM");
  }
}

function nodePath(): string {
  return spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim();
}

/** `text run` draws ANSI frames to stdout; the starter's home page must appear. */
async function runTerminal(name: string, cmd: string[], app: string): Promise<Result> {
  const [bin, ...args] = cmd as [string, ...string[]];
  const child = spawn(bin, [...args, "run"], { cwd: app, stdio: ["pipe", "pipe", "pipe"], detached: true, env: { ...process.env, COLUMNS: "100", LINES: "32" } });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const plain = (): string => stripVTControlCharacters(out);
  for (let i = 0; i < 100 && !plain().includes("count") && child.exitCode === null; i++) await Bun.sleep(100);
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-(child.pid as number), "SIGTERM");
  } catch {
    // already gone
  }
  const ok = plain().includes("count") && !BAD.test(plain());
  return { name, ok, detail: ok ? "rendered the home page as ANSI" : plain().trim().split("\n").slice(-10).join("\n") };
}

async function runMcp(name: string, cmd: string[], app: string): Promise<Result> {
  // The SDK is a dependency of the installed `@textjs/app`, not of the repo root.
  const { Client } = (await import(Bun.resolveSync("@modelcontextprotocol/sdk/client/index.js", join(app, "node_modules/@textjs/app")))) as typeof import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = (await import(Bun.resolveSync("@modelcontextprotocol/sdk/client/stdio.js", join(app, "node_modules/@textjs/app")))) as typeof import("@modelcontextprotocol/sdk/client/stdio.js");
  const [bin, ...args] = cmd as [string, ...string[]];
  const transport = new StdioClientTransport({ command: bin, args: [...args, "mcp", app], cwd: app, stderr: "pipe" });
  let err = "";
  transport.stderr?.on("data", (d) => (err += d));
  const client = new Client({ name: "verify-pack", version: "0.0.0" });
  try {
    await client.connect(transport);
    const text = async (tool: string, a: Record<string, unknown> = {}): Promise<string> => {
      const r = (await client.callTool({ name: tool, arguments: a })) as { content: { type: string; text?: string }[]; isError?: boolean };
      const t = r.content.map((c) => c.text ?? "").join("\n");
      if (r.isError) throw new Error(`${tool}: ${t}`);
      return t;
    };
    const home = await text("read_frame");
    await text("navigate", { path: "/nav" });
    const nav = await text("read_frame");
    await text("navigate", { path: "/live" });
    const live = await text("wait_for", { text: "server data ok", timeoutMs: 10_000 }).then(
      () => "ok",
      (e: Error) => e.message,
    );
    const ok = home.includes("count") && nav.includes("nav page at /nav") && live === "ok" && !BAD.test(home + nav + err);
    return { name, ok, detail: ok ? "screenshot /, /nav (navigation hooks), /live (server component)" : `home:\n${home}\nnav:\n${nav}\nlive: ${live}\nstderr:\n${err}` };
  } catch (e) {
    return { name, ok: false, detail: `${e instanceof Error ? e.message : String(e)}\nstderr:\n${err}` };
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function main(argv: string[]): Promise<number> {
  // Not realpath'd: GitHub's Windows TEMP is an 8.3 short path (C:\Users\RUNNER~1\…), which the CLI must handle.
  const work = mkdtempSync(join(tmpdir(), "textjs-verify-pack-"));
  console.log(`▼ verify-pack in ${work}`);
  const tarballs = packPackages(work, !argv.includes("--skip-build"));
  const app = join(work, "app");
  scaffold(app, tarballs);
  console.log(sh("bun", ["install", "--no-save"], app).trim().split("\n").slice(-2).join("\n"));
  const results: Result[] = [];
  for (const rt of ["node", "bun"] as const) {
    const cmd = textCmd(rt, app);
    const build = runSync(`${rt}: text build`, [...cmd, "build"], app);
    // Production builds must not ship React's development bundles.
    const assets = join(app, "dist", "assets");
    const dev = readdirSync(assets).some((f) => f.endsWith(".js") && readFileSync(join(assets, f), "utf8").includes("not wrapped in act("));
    results.push(dev ? { ...build, ok: false, detail: `${build.detail}\nclient bundle contains React development builds` } : build);
    results.push(await runServer(`${rt}: text start`, [...cmd, "start"], app, rt === "node" ? 3911 : 3912));
    // `run` and `mcp` import route files as TypeScript: under Node the CLI re-runs itself with Bun.
    results.push(await runTerminal(`${rt}: text run`, cmd, app));
    results.push(await runMcp(`${rt}: text mcp`, cmd, app));
    const bridge = runSync(`${rt}: textjs-opencode --help`, [rt, join(app, "node_modules/@textjs/opencode/bin/textjs-opencode.js"), "--help"], app);
    results.push(bridge.ok && bridge.detail.includes("--allow-origin") ? bridge : { ...bridge, ok: false });
    if (rt === "node") {
      // Without Bun on the PATH they fail with a clean TX019, not a module error.
      const r = spawnSync(nodePath(), [...cmd.slice(1), "mcp"], { cwd: app, encoding: "utf8", env: { ...process.env, PATH: dirname(nodePath()) } });
      const out = `${r.stdout}${r.stderr}`;
      results.push({ name: "node (no bun on PATH): text mcp", ok: r.status === 1 && /TX019/.test(out) && r.stdout === "" && !BAD.test(out), detail: out.trim() });
    }
  }
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}\n${r.detail.replace(/^/gm, "    ")}`);
  if (!argv.includes("--keep")) rmSync(work, { recursive: true, force: true });
  return results.every((r) => r.ok) ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
