/**
 * Bundle the extension (`dist/extension.js`, CommonJS for the extension host),
 * the headless runner (`dist/runner.mjs`) and the webview (`dist/webview.js`).
 *
 *   bun scripts/build.ts [--production] [--watch]
 */

import { mkdirSync, rmSync, watch } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");
const production = process.argv.includes("--production");

async function build(): Promise<boolean> {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  const common = { minify: production, sourcemap: production ? ("none" as const) : ("linked" as const) };
  const results = await Promise.all([
    Bun.build({
      ...common,
      entrypoints: [join(ROOT, "src/extension.ts")],
      outdir: DIST,
      target: "node",
      format: "cjs",
      external: ["vscode"],
      naming: "extension.js",
    }),
    Bun.build({
      ...common,
      entrypoints: [join(ROOT, "src/runner/runner.ts")],
      outdir: DIST,
      target: "node",
      format: "esm",
      naming: "runner.mjs",
    }),
    Bun.build({
      ...common,
      entrypoints: [join(ROOT, "webview/main.tsx")],
      outdir: DIST,
      target: "browser",
      format: "iife",
      naming: "webview.js",
      define: { "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development") },
    }),
  ]);
  let ok = true;
  for (const r of results) {
    if (!r.success) {
      ok = false;
      for (const log of r.logs) console.error(log);
    }
  }
  if (ok) {
    const sizes = results.flatMap((r) => r.outputs.filter((o) => o.kind === "entry-point").map((o) => `${o.path.slice(DIST.length + 1)} ${(o.size / 1024).toFixed(0)} kB`));
    console.log(`▼ built ${sizes.join(" · ")}${production ? " (production)" : ""}`);
  }
  return ok;
}

const ok = await build();
if (process.argv.includes("--watch")) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  for (const dir of ["src", "webview"]) {
    watch(join(ROOT, dir), { recursive: true }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void build(), 100);
    });
  }
  console.log("▼ watching src/ and webview/");
} else if (!ok) process.exit(1);
