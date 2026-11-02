import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Script types a browser executes (data blocks such as JSON-LD aren't subject to script-src). */
const EXECUTABLE = /^(?:|text\/javascript|application\/javascript|module)$/i;

/** `'sha256-…'` sources for every inline script in `html`, in document order. */
export function inlineScriptSources(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? "";
    if (!EXECUTABLE.test(type)) continue;
    out.push(`'sha256-${createHash("sha256").update(m[2] ?? "", "utf8").digest("base64")}'`);
  }
  return out;
}

/** The distinct inline script hashes across every `.html` file under `dir`, sorted. */
export function inlineScriptHashes(dir: string): string[] {
  const hashes = new Set<string>();
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) for (const h of inlineScriptSources(readFileSync(p, "utf8"))) hashes.add(h);
    }
  };
  walk(dir);
  return [...hashes].sort();
}

/** Cloudflare Pages silently drops `_headers` lines longer than this. */
export const MAX_HEADER_LINE = 2000;

/** Adds `hashes` after `'self'` in the `/*` rule's `script-src`. Throws unless there's exactly one to extend, or if the line gets too long for Pages. */
export function withScriptHashes(headers: string, hashes: readonly string[]): string {
  const lines = headers.split("\n");
  const at: number[] = [];
  let rule = "";
  lines.forEach((line, i) => {
    if (line.trim() && !line.startsWith("#") && !/^\s/.test(line)) rule = line.trim();
    else if (rule === "/*" && /^\s+Content-Security-Policy:/i.test(line)) at.push(i);
  });
  if (at.length !== 1) throw new Error(`_headers: expected one Content-Security-Policy under /*, found ${at.length}`);
  const i = at[0] as number;
  const line = lines[i] as string;
  if (/'sha256-/.test(line)) throw new Error("_headers: script-src already has hashes");
  const next = line.replace(/(script-src 'self')(?=[ ;])/, `$1${hashes.map((h) => ` ${h}`).join("")}`);
  if (next === line && hashes.length > 0) throw new Error("_headers: no script-src 'self' to add inline script hashes to");
  if (next.length > MAX_HEADER_LINE) throw new Error(`_headers: the Content-Security-Policy line is ${next.length} characters; Cloudflare Pages ignores lines over ${MAX_HEADER_LINE}`);
  lines[i] = next;
  return lines.join("\n");
}
