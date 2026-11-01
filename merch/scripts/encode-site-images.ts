/**
 * Re-encodes the store's 600 px and 1024 px WebP assets (`apps/web/src/merch/images/`) from the
 * 1024 × 1280 masters in `merch/photos/final/*.webp` using libwebp method 6 (`cwebp` or `ffmpeg`).
 *
 *   bun scripts/encode-site-images.ts [shot…]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const FINAL = join(ROOT, "photos", "final");
const WEB_MERCH = join(ROOT, "..", "apps", "web", "src", "merch");
const SITE = join(WEB_MERCH, "images");
const QUALITY = 80;

type Backend = "cwebp" | "ffmpeg";

function detectBackend(): Backend {
  const cw = spawnSync("cwebp", ["-version"], { encoding: "utf8" });
  if (cw.status === 0) return "cwebp";
  const ff = spawnSync("ffmpeg", ["-hide_banner", "-h", "encoder=libwebp"], { encoding: "utf8" });
  if (ff.status === 0 && !ff.stdout.includes("not recognized")) return "ffmpeg";
  throw new Error("encode-site-images requires `cwebp` or `ffmpeg` built with `libwebp`.");
}

/** Shot names referenced by the store catalog (`apps/web/src/merch/products.ts`). */
export function siteShotNames(): string[] {
  const source = readFileSync(join(WEB_MERCH, "products.ts"), "utf8");
  const seen = new Set<string>();
  for (const m of source.matchAll(/from\s+"\.\/images\/([a-z0-9-]+)-(?:600|1024)\.webp"/g)) {
    seen.add(m[1] as string);
  }
  return [...seen];
}

function encodeOne(backend: Backend, src: string, dst: string, width: 600 | 1024): void {
  const height = Math.round((width * 5) / 4);
  const res =
    backend === "cwebp"
      ? spawnSync(
          "cwebp",
          [
            "-quiet",
            "-q",
            String(QUALITY),
            "-m",
            "6",
            "-sharp_yuv",
            "-mt",
            ...(width === 600 ? ["-resize", String(width), String(height)] : []),
            src,
            "-o",
            dst,
          ],
          { encoding: "utf8" },
        )
      : spawnSync(
          "ffmpeg",
          [
            "-y",
            "-loglevel",
            "error",
            "-i",
            src,
            ...(width === 600 ? ["-vf", `scale=${width}:${height}:flags=lanczos`] : []),
            "-c:v",
            "libwebp",
            "-compression_level",
            "6",
            "-quality",
            String(QUALITY),
            dst,
          ],
          { encoding: "utf8" },
        );
  if (res.status !== 0) {
    throw new Error(`Failed encoding ${dst}: ${res.stderr || res.stdout}`);
  }
}

export function encodeSiteImages(only: string[] = []): { shots: number; totalBytes: number } {
  const backend = detectBackend();
  mkdirSync(SITE, { recursive: true });
  const names = siteShotNames().filter((n) => only.length === 0 || only.some((o) => n.startsWith(o)));
  let totalBytes = 0;
  for (const name of names) {
    const master = join(FINAL, `${name}.webp`);
    if (!existsSync(master)) throw new Error(`Missing master photo: ${master}`);
    for (const w of [600, 1024] as const) {
      const dst = join(SITE, `${name}-${w}.webp`);
      encodeOne(backend, master, dst, w);
      totalBytes += statSync(dst).size;
    }
  }
  return { shots: names.length, totalBytes };
}

if (import.meta.main) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const { shots, totalBytes } = encodeSiteImages(only);
  console.log(`encoded ${shots * 2} site WebPs (${shots} shots, ${(totalBytes / 1024).toFixed(1)} KB total)`);
}
