#!/usr/bin/env bun
/**
 * `bun run build`: one Vite client + SSR build per locale, then the prerenderer (postbuild-pages.ts).
 *
 * English builds into dist/ as before. Other locales build into node_modules/.cache/textjs-locales/<code>/ and
 * the prerenderer merges their chunks into dist/assets and writes their pages under dist/<path>/.
 *
 *   TEXTJS_LOCALES=en,ja,ar bun run build    only these locales (English is always built)
 */

import { cpus } from "node:os";
import { join } from "node:path";
import { LOCALES } from "../src/i18n/locales";

const WEB_DIR = join(import.meta.dirname, "..");
const CACHE = join(WEB_DIR, "node_modules", ".cache");
const only = process.env.TEXTJS_LOCALES?.split(",").map((s) => s.trim()).filter(Boolean);
const locales = LOCALES.filter((l) => l.code !== "en" && (only ? only.includes(l.code) : l.status !== "planned"));

async function run(args: string[], env: Record<string, string>): Promise<void> {
  const proc = Bun.spawn(["bun", "x", "vite", ...args], { cwd: WEB_DIR, env: { ...process.env, ...env }, stdout: "inherit", stderr: "inherit" });
  if ((await proc.exited) !== 0) throw new Error(`vite ${args.join(" ")} failed (TEXTJS_LOCALE=${env.TEXTJS_LOCALE})`);
}

async function build(code: string): Promise<void> {
  const env = { TEXTJS_LOCALE: code };
  if (code === "en") {
    await run(["build"], env);
    await run(["build", "--ssr", "src/entry-server.tsx", "--outDir", join(CACHE, "textjs-ssr"), "--emptyOutDir"], env);
    return;
  }
  const dir = join(CACHE, "textjs-locales", code);
  await run(["build", "--outDir", join(dir, "client"), "--emptyOutDir", "--logLevel", "warn"], env);
  await run(["build", "--ssr", "src/entry-server.tsx", "--outDir", join(dir, "ssr"), "--emptyOutDir", "--logLevel", "warn"], env);
}

const queue = ["en", ...locales.map((l) => l.code)];
const workers = Math.max(1, Math.min(4, cpus().length));
await Promise.all(
  Array.from({ length: Math.min(workers, queue.length) }, async () => {
    for (let code = queue.shift(); code; code = queue.shift()) await build(code);
  }),
);

const post = Bun.spawn(["bun", "scripts/postbuild-pages.ts"], {
  cwd: WEB_DIR,
  env: { ...process.env, TEXTJS_LOCALES: ["en", ...locales.map((l) => l.code)].join(",") },
  stdout: "inherit",
  stderr: "inherit",
});
if ((await post.exited) !== 0) process.exit(1);
