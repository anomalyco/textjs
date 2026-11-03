import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { NOT_FOUND_PATH, ROUTES } from "../src/entry-server";
import { LOCALES } from "../src/i18n/locales";
import { ogCards } from "../src/og";
import { woff2Cmap } from "../scripts/og/cmap";
import { SCRIPT_FONTS } from "../scripts/og/render";
import { drawn, OG_FONTS } from "../scripts/og/template";
import { blockId, parseTranslation } from "../scripts/i18n/document";
import { readCatalog, readText, translationFile } from "../scripts/i18n/sources";

const ROOT = join(import.meta.dir, "..");
/** The fonts every card draws with (template.ts): the site's Geist and Geist Mono subsets, their OG supplements, Noto Symbols. */
const SHARED = ["/fonts/geist-latin.woff2", "/fonts/geist-og.woff2", "/fonts/geist-mono-latin.woff2", "/fonts/geist-mono-og.woff2", "/fonts/noto-symbols-og.woff2"];
const cmaps = new Map<string, Set<number>>();
const cmap = (url: string): Set<number> => {
  const file = OG_FONTS[url];
  if (!file) throw new Error(`${url} isn't in OG_FONTS (missing file?)`);
  if (!cmaps.has(url)) cmaps.set(url, woff2Cmap(join(ROOT, file)));
  return cmaps.get(url) as Set<number>;
};

/** What the renderer's glyph check skips: whitespace and bidi isolates. */
const isDrawn = (ch: string): boolean => ch.trim() !== "" && !/[\u2066-\u2069]/.test(ch);

/**
 * Every built locale's share-card text against its fonts' cmaps, without a browser: CI renders cards for English and
 * Japanese only, so a stale script-font subset would otherwise first fail in the production deploy. A card's title
 * and label are English strings from the catalog (or error titles from errors.md), so each locale's text is their
 * translation. `bun scripts/og/subset-locale-fonts.ts` refreshes a subset.
 */
describe("share-card fonts", async () => {
  const english = new Set<string>();
  for (const card of await ogCards(ROUTES, NOT_FOUND_PATH)) {
    const d = drawn(card);
    english.add(d.title);
    if (d.label) english.add(d.label);
  }
  for (const locale of LOCALES.filter((l) => l.status !== "planned")) {
    test(`${locale.code}: the card fonts draw every character on its cards`, () => {
      const catalog = readCatalog(locale.code);
      const errors = parseTranslation(readText(translationFile(locale.code, "errors")));
      const texts = [...english].map((t) => {
        const v = catalog[t];
        return typeof v === "string" ? v : (errors.get(blockId(t)) ?? t);
      });
      const fonts = [...SHARED, ...(SCRIPT_FONTS[locale.code] ? [SCRIPT_FONTS[locale.code] as string] : [])].map(cmap);
      const missing = [...new Set(texts.join(""))].filter((ch) => isDrawn(ch) && !fonts.some((f) => f.has(ch.codePointAt(0) as number)));
      expect(missing.map((ch) => `${ch} U+${(ch.codePointAt(0) as number).toString(16).toUpperCase().padStart(4, "0")}`)).toEqual([]);
    });
  }
});
