#!/usr/bin/env bun
/**
 * Subsets the Noto fonts the Open Graph cards use for scripts Geist doesn't cover, to the characters in each
 * locale's catalog and error pages (card titles and labels all come from them). Run it after translating, with fonttools
 * (`pip install fonttools brotli`) and the source fonts from google/fonts:
 *
 *   bun scripts/og/subset-locale-fonts.ts --font ja=NotoSansJP[wght].ttf --font ar=NotoSansArabic[wdth,wght].ttf
 *
 * render.ts fails the build if a card still draws a character from a system font.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { readCatalog, readText, translationFile } from "../i18n/sources";

/** Locale → the OG font file it fills (scripts/og/fonts/), and the locales that share it. */
const FONTS: Record<string, { file: string; locales: string[] }> = {
  ja: { file: "noto-sans-jp-og.woff2", locales: ["ja"] },
  ko: { file: "noto-sans-kr-og.woff2", locales: ["ko"] },
  "zh-CN": { file: "noto-sans-sc-og.woff2", locales: ["zh-CN"] },
  "zh-TW": { file: "noto-sans-tc-og.woff2", locales: ["zh-TW"] },
  hi: { file: "noto-sans-devanagari-og.woff2", locales: ["hi"] },
  ar: { file: "noto-sans-arabic-og.woff2", locales: ["ar", "fa", "ur"] },
};

const { values } = parseArgs({ options: { font: { type: "string", multiple: true }, pyftsubset: { type: "string", default: "pyftsubset" } } });
const tmp = mkdtempSync(join(tmpdir(), "og-fonts-"));
try {
  for (const arg of values.font ?? []) {
    const [key, source] = arg.split("=");
    const target = FONTS[key as string];
    if (!target || !source) throw new Error(`--font ${arg}: expected one of ${Object.keys(FONTS).join(", ")}=<font file>`);
    const chars = new Set<string>();
    for (const locale of target.locales) {
      for (const v of Object.values(readCatalog(locale))) for (const s of typeof v === "string" ? [v] : Object.values(v)) for (const ch of s) chars.add(ch);
      for (const ch of readText(translationFile(locale, "errors"))) chars.add(ch);
    }
    const text = join(tmp, `${key}.txt`);
    writeFileSync(text, [...chars].join(""));
    const out = join(import.meta.dirname, "fonts", target.file);
    const r = spawnSync(values.pyftsubset as string, [source, `--text-file=${text}`, "--layout-features=*", "--flavor=woff2", `--output-file=${out}`], { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`pyftsubset failed for ${key}`);
    console.log(`${target.file}: ${chars.size} characters`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
