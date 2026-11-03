import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { NOT_FOUND_PATH, ROUTES } from "../src/entry-server";
import { LOCALES } from "../src/i18n/locales";
import { ogCards, pageTitle } from "../src/og";
import { woff2Cmap, woff2Forms } from "../scripts/og/cmap";
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

/** What the renderer's glyph check skips: whitespace and bidi marks and isolates. */
const isDrawn = (ch: string): boolean => ch.trim() !== "" && !/[\u061c\u200e\u200f\u2066-\u2069]/.test(ch);

/**
 * Arabic letters that join on both sides (initial, medial and final forms) and on the right only (final form), from
 * Unicode's ArabicShaping.txt for the Arabic block; others (ء, digits, marks) don't join.
 */
const DUAL_JOINING = /[\u0626\u0628\u062a-\u062e\u0633-\u063f\u0641-\u0647\u0649\u064a\u066e\u066f\u0678-\u0687\u069a-\u06bf\u06c1\u06c2\u06cc\u06ce\u06d0\u06d1\u06fa-\u06fc\u06ff]/;
const RIGHT_JOINING = /[\u0622-\u0625\u0627\u0629\u062f-\u0632\u0648\u0671-\u0673\u0675-\u0677\u0688-\u0699\u06c0\u06c3-\u06cb\u06cd\u06cf\u06d2\u06d3\u06d5\u06ee\u06ef]/;

/**
 * Every built locale's share-card text against its fonts' cmaps, without a browser: CI renders cards for English and
 * Japanese only, so a stale script-font subset would otherwise first fail in the production deploy. A card's title
 * and label are English strings from the catalog (or error titles from errors.md), so each locale's text is their
 * translation. `bun scripts/og/subset-locale-fonts.ts` refreshes a subset.
 */
const codePoint = (ch: string): string => `${ch} U+${(ch.codePointAt(0) as number).toString(16).toUpperCase().padStart(4, "0")}`;

describe("share-card fonts", async () => {
  /**
   * Each drawn string with the catalog key it comes from. A page title is drawn from its translated full `<title>`
   * with the site suffix stripped (`Changelog | Text.js` → its translation, minus ` | Text.js`), which needn't match
   * the translation of the bare title, so it's looked up the same way when the whole title is a catalog key.
   */
  const english = new Map<string, { key: string; full?: string }>();
  const routes = [...ROUTES, { path: NOT_FOUND_PATH, title: "404", description: "" }];
  (await ogCards(ROUTES, NOT_FOUND_PATH)).forEach((card, i) => {
    const d = drawn(card);
    const route = routes[i] as (typeof routes)[number] & { cardTitle?: string };
    const fromTitle = !route.cardTitle && d.title === pageTitle(route.title) && d.title !== route.title;
    english.set(`title:${d.title}:${fromTitle}`, { key: d.title, full: fromTitle ? route.title : undefined });
    if (d.label) english.set(`label:${d.label}`, { key: d.label });
  });
  for (const locale of LOCALES.filter((l) => l.status !== "planned")) {
    test(`${locale.code}: the card fonts draw every character on its cards`, () => {
      const catalog = readCatalog(locale.code);
      const errors = parseTranslation(readText(translationFile(locale.code, "errors")));
      const texts = [...english.values()].map(({ key, full }) => {
        // A whole translated title (`Changelog | Text.js`); interpolated ones (`{title} | Text.js Docs`) aren't keys.
        const whole = full === undefined ? undefined : catalog[full];
        if (typeof whole === "string") return pageTitle(whole);
        const v = catalog[key];
        return typeof v === "string" ? v : (errors.get(blockId(key)) ?? key);
      });
      const fonts = [...SHARED, ...(SCRIPT_FONTS[locale.code] ? [SCRIPT_FONTS[locale.code] as string] : [])].map(cmap);
      const chars = [...new Set(texts.join(""))];
      const missing = chars.filter((ch) => isDrawn(ch) && !fonts.some((f) => f.has(ch.codePointAt(0) as number)));
      expect(missing.map(codePoint)).toEqual([]);
      // Arabic letters join: the script font must have the forms each letter takes inside a word, or a card shows
      // every letter on its own.
      const script = SCRIPT_FONTS[locale.code];
      if (script && chars.some((ch) => DUAL_JOINING.test(ch) || RIGHT_JOINING.test(ch))) {
        const forms = woff2Forms(join(ROOT, OG_FONTS[script] as string), ["init", "medi", "fina"]);
        const has = (f: string, ch: string): boolean => forms.get(f)?.has(ch.codePointAt(0) as number) ?? false;
        const unjoined = chars.filter((ch) => (DUAL_JOINING.test(ch) && !(has("init", ch) && has("medi", ch) && has("fina", ch))) || (RIGHT_JOINING.test(ch) && !has("fina", ch)));
        expect(unjoined.map(codePoint)).toEqual([]);
      }
    });
  }
});
