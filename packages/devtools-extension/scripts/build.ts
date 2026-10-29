/**
 * Builds the unpacked extension into `dist/` and a Web Store upload zip into
 * `release/textjs-devtools-<version>.zip`. Nothing is published.
 *
 *   bun scripts/build.ts            # production (minified)
 *   bun scripts/build.ts --dev      # readable bundles
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ICON_SIZES, renderIcon } from "./icons";
import { createZip } from "./zip";

const ROOT = resolve(import.meta.dir, "..");
const DIST = join(ROOT, "dist");
const RELEASE = join(ROOT, "release");

const ENTRIES: Array<[string, string]> = [
  ["src/page.ts", "page.js"],
  ["src/content.ts", "content.js"],
  ["src/background.ts", "background.js"],
  ["src/devtools.ts", "devtools.js"],
  ["src/panel/main.tsx", "panel.js"],
];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? listFiles(p) : [p];
  });
}

/**
 * `introspect` exposes `__textjsDevtools` (service worker) and `__textjsPanel`
 * (panel) for the end-to-end tests. Dev builds have it; release builds never do.
 */
export async function build(options: { dev?: boolean; zip?: boolean; introspect?: boolean } = {}): Promise<{ dist: string; zip: string | null; version: string }> {
  const introspect = options.introspect ?? options.dev ?? false;
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, "icons"), { recursive: true });

  await Promise.all(
    ENTRIES.map(async ([entry, out]) => {
      const result = await Bun.build({
        entrypoints: [join(ROOT, entry)],
        target: "browser",
        format: "iife",
        minify: !options.dev,
        sourcemap: "none",
        define: {
          "process.env.NODE_ENV": JSON.stringify(options.dev ? "development" : "production"),
          "process.env.TEXTJS_DEVTOOLS_INTROSPECT": JSON.stringify(introspect ? "1" : ""),
        },
      });
      if (!result.success) throw new AggregateError(result.logs, `build failed: ${entry}`);
      writeFileSync(join(DIST, out), await result.outputs[0]!.text());
    }),
  );

  for (const f of ["panel.html", "panel.css", "devtools.html"]) writeFileSync(join(DIST, f), readFileSync(join(ROOT, "static", f)));
  const manifest = JSON.parse(readFileSync(join(ROOT, "static/manifest.json"), "utf8")) as Record<string, unknown>;
  manifest.version = pkg.version;
  writeFileSync(join(DIST, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const size of ICON_SIZES) writeFileSync(join(DIST, `icons/icon-${size}.png`), renderIcon(size));

  let zipPath: string | null = null;
  if (options.zip !== false) {
    mkdirSync(RELEASE, { recursive: true });
    zipPath = join(RELEASE, `textjs-devtools-${pkg.version}.zip`);
    const files = listFiles(DIST).map((p) => ({ name: relative(DIST, p).split("\\").join("/"), data: new Uint8Array(readFileSync(p)) }));
    writeFileSync(zipPath, createZip(files));
  }
  return { dist: DIST, zip: zipPath, version: pkg.version };
}

if (import.meta.main) {
  const dev = process.argv.includes("--dev");
  const t0 = performance.now();
  const { dist, zip, version } = await build({ dev });
  const size = (p: string): string => `${(statSync(p).size / 1024).toFixed(1)} kB`;
  console.log(`▼ Text.js DevTools ${version} built in ${Math.round(performance.now() - t0)}ms`);
  for (const f of listFiles(dist)) console.log(`  ${relative(ROOT, f).padEnd(28)} ${size(f)}`);
  if (zip) console.log(`  ${relative(ROOT, zip).padEnd(28)} ${size(zip)}`);
}
