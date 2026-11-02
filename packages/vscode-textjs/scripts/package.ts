/**
 * Package the extension into `vscode-textjs-<version>.vsix` with @vscode/vsce
 * and verify the archive's contents.
 *
 *   bun run package
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const ROOT = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { name: string; version: string };
const out = join(ROOT, `${pkg.name}-${pkg.version}.vsix`);
const vsce = join(ROOT, "node_modules/@vscode/vsce/vsce");

const run = spawnSync(process.execPath, [vsce, "package", "--no-dependencies", "--out", out], { cwd: ROOT, stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);

/** Minimal ZIP central-directory reader (the .vsix is a zip). */
export function listZip(buf: Buffer): Map<string, () => Buffer> {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map<string, () => Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

if (!existsSync(out)) throw new Error(`${out} was not created`);
const zip = readFileSync(out);
const entries = listZip(zip);
const names = [...entries.keys()].sort();
const required = [
  "extension/package.json",
  "extension/readme.md",
  "extension/LICENSE.txt",
  "extension/dist/extension.js",
  "extension/dist/runner.mjs",
  "extension/dist/webview.js",
  "extension/webview/styles.css",
  "extension/media/icon.png",
  "extension/snippets/textjs.code-snippets",
  "extension/snippets/route-handler.code-snippets",
  "extension.vsixmanifest",
];
const lower = new Set(names.map((n) => n.toLowerCase()));
const missing = required.filter((r) => !lower.has(r.toLowerCase()));
const forbidden = names.filter((n) => /\/(src|test|scripts|node_modules|\.harness)\/|\.map$|\.ts$/.test(n));
const manifest = JSON.parse(entries.get("extension/package.json")!().toString("utf8")) as { main: string; contributes: { commands: unknown[] } };
const problems = [...missing.map((m) => `missing ${m}`), ...forbidden.map((f) => `unexpected ${f}`)];
if (manifest.main !== "./dist/extension.js") problems.push(`main is ${manifest.main}`);
for (const n of names) console.log(`  ${n}`);
if (problems.length > 0) {
  console.error(`\n⨯ ${out}\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`\n▼ ${out.slice(ROOT.length + 1)} · ${names.length} files · ${(zip.length / 1024).toFixed(0)} kB · ${manifest.contributes.commands.length} commands — verified`);
