/**
 * Image model client with a content-addressed cache. A request (model, prompt, size, quality and
 * the bytes of any reference images) maps to one file in merch/photos/cache/, so re-running the
 * pipeline costs nothing unless a prompt changes. Credentials come from the environment:
 *
 *   set -a; . ~/.config/textjs/openai.env; set +a
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

export const MODEL = "gpt-image-2.5-sunburst";
export const CACHE = join(import.meta.dir, "..", "photos", "cache");
mkdirSync(CACHE, { recursive: true });

export type Size = "1024x1024" | "1536x1024" | "1024x1536";
export type Quality = "low" | "medium" | "high";

export interface Request {
  prompt: string;
  size: Size;
  quality: Quality;
  /** Reference images for /images/edits (absolute paths). */
  refs?: string[];
  /** Distinguishes otherwise identical requests (a re-roll). */
  seed?: number;
}

function key(r: Request): string {
  const h = createHash("sha256");
  h.update(JSON.stringify({ model: MODEL, prompt: r.prompt, size: r.size, quality: r.quality, seed: r.seed ?? 0 }));
  for (const ref of r.refs ?? []) h.update(readFileSync(ref));
  return h.digest("hex").slice(0, 20);
}

export function cachedPath(r: Request): string {
  return join(CACHE, `${key(r)}.png`);
}

/** Returns the PNG path for `r`, calling the API only on a cache miss. */
export async function generate(r: Request, label: string): Promise<string> {
  const out = cachedPath(r);
  if (existsSync(out)) return out;
  const base = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!base || !apiKey) throw new Error("OPENAI_BASE_URL / OPENAI_API_KEY are not set (source ~/.config/textjs/openai.env)");
  const headers = { Authorization: `Bearer ${apiKey}` };
  let res: Response;
  const started = Date.now();
  if (r.refs?.length) {
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", r.prompt);
    form.append("size", r.size);
    form.append("quality", r.quality);
    for (const ref of r.refs) form.append("image[]", new Blob([readFileSync(ref)], { type: "image/png" }), basename(ref));
    res = await fetch(`${base}/images/edits`, { method: "POST", headers, body: form });
  } else {
    res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt: r.prompt, size: r.size, quality: r.quality, n: 1 }),
    });
  }
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${label}: no image in response`);
  writeFileSync(out, Buffer.from(b64, "base64"));
  writeFileSync(out.replace(/\.png$/, ".json"), `${JSON.stringify({ label, model: MODEL, ...r, refs: r.refs?.map((f) => basename(f)) }, null, 1)}\n`);
  console.log(`generated ${label} (${r.quality}, ${r.size}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return out;
}
