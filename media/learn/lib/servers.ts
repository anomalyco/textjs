/**
 * The apps a live scene films:
 * - `site`: textjs.org itself (apps/web, Vite dev server), e.g. `/learn/getting-started`.
 * - `starter`: a fresh `create-text-app --template starter` project wired to this checkout's packages and run with
 *   the real `text dev`, so lessons can be filmed exactly as a reader builds them (files are written mid-scene and
 *   Fast Refresh redraws the console).
 */
import { existsSync, mkdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, normalize } from "node:path";
import { CACHE, REPO } from "./env";

export async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

async function waitFor(url: string, ms = 60_000): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await Bun.sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export interface AppServer {
  origin: string;
  /** Project directory (starter only). */
  dir?: string;
  write(file: string, content: string): void;
  stop(): void;
}

const running = new Map<string, Promise<AppServer>>();

export function server(kind: "site" | "starter"): Promise<AppServer> {
  let s = running.get(kind);
  if (!s) {
    s = kind === "site" ? startSite() : startStarter();
    running.set(kind, s);
  }
  return s;
}

export async function stopServers(): Promise<void> {
  for (const s of running.values()) (await s).stop();
  running.clear();
}

/** A production build of the site (as textjs.org ships: no dev-only React warnings in the console). */
async function startSite(): Promise<AppServer> {
  const dist = join(CACHE, "site-dist");
  const build = Bun.spawnSync(["bunx", "vite", "build", "--outDir", dist, "--emptyOutDir"], { cwd: join(REPO, "apps/web"), stdout: "pipe", stderr: "pipe" });
  if (build.exitCode !== 0) throw new Error(`site build failed: ${build.stderr.toString().slice(-1500)}`);
  const srv = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const file = join(dist, normalize(path));
      if (path !== "/" && file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return new Response(Bun.file(file));
      return new Response(Bun.file(join(dist, "index.html")), { headers: { "content-type": "text/html; charset=utf-8" } });
    },
  });
  return {
    origin: `http://127.0.0.1:${srv.port}`,
    write() {
      throw new Error("The site server is read-only");
    },
    stop: () => srv.stop(true),
  };
}

async function startStarter(): Promise<AppServer> {
  const root = join(CACHE, "starter");
  const dir = join(root, "acme-deploys");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const cta = Bun.spawnSync(["bun", join(REPO, "packages/create-text-app/dist/bin/create-text-app.js"), "acme-deploys", "--template", "starter"], { cwd: root, stdout: "pipe", stderr: "pipe" });
  if (cta.exitCode !== 0) throw new Error(`create-text-app failed: ${cta.stderr.toString()} (run \`bun run build:packages\` first)`);
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(dir, "node_modules/@textjs/app"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  const port = await freePort();
  const proc = Bun.spawn(["bun", join(REPO, "packages/app/bin/text.js"), "dev", "--port", String(port), "--host", "127.0.0.1"], { cwd: dir, stdout: "ignore", stderr: "ignore" });
  const origin = `http://127.0.0.1:${port}`;
  await waitFor(`${origin}/`);
  return {
    origin,
    dir,
    write(file, content) {
      const path = join(dir, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    },
    stop: () => proc.kill(),
  };
}

/** The starter's create-text-app output, for terminal scenes (real, not retyped). */
export function starterTranscript(): string {
  const root = join(CACHE, "transcript");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const p = Bun.spawnSync(["bun", join(REPO, "packages/create-text-app/dist/bin/create-text-app.js"), "acme-deploys", "--template", "starter"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return p.stdout.toString().replace(/\x1b\[[0-9;]*m/g, "").replaceAll(root, "~");
}

