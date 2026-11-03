/**
 * HTML for the Open Graph cards (1200×630), screenshotted by ./render.ts. Every card is the same
 * layout on black: the ▼ Text.js lockup top left with at most one quiet label beside it (a section,
 * an error code or an app's wordmark), and the page title bottom left. Store products add their
 * photo on the right. Fonts come from `public/fonts` (the site's own Geist subsets) with ./fonts as
 * the fallback for glyphs those subsets leave out, so nothing falls through to a system font and
 * the output is the same on any machine.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { OgCard } from "../../src/og";
import { WORDMARK_SVG } from "../../src/site/LogoMenu";

/** Origin the renderer serves fonts and images from (requests never leave the page). */
export const OG_ORIGIN = "https://og.textjs.local";

/**
 * Grayscale antialiasing and no hinting, so text renders alike on macOS and Linux (Linux would
 * otherwise use subpixel colour fringes, which also stop text cards from encoding as grayscale).
 */
export const CHROMIUM_ARGS = ["--disable-lcd-text", "--font-render-hinting=none"];

/** Font files: URL path → file path relative to apps/web. Script fonts exist once a locale needs them (subset-locale-fonts.ts). */
export const OG_FONTS: Record<string, string> = withExisting({
  "/fonts/geist-latin.woff2": "public/fonts/geist-latin.woff2",
  "/fonts/geist-mono-latin.woff2": "public/fonts/geist-mono-latin.woff2",
  "/fonts/geist-mono-symbols.woff2": "public/fonts/geist-mono-symbols.woff2",
  "/fonts/geist-og.woff2": "scripts/og/fonts/geist-og.woff2",
  "/fonts/geist-mono-og.woff2": "scripts/og/fonts/geist-mono-og.woff2",
  "/fonts/noto-symbols-og.woff2": "scripts/og/fonts/noto-symbols-og.woff2",
  "/fonts/noto-sans-jp-og.woff2": "scripts/og/fonts/noto-sans-jp-og.woff2",
  "/fonts/noto-sans-arabic-og.woff2": "scripts/og/fonts/noto-sans-arabic-og.woff2",
});

function withExisting(fonts: Record<string, string>): Record<string, string> {
  const web = join(import.meta.dirname, "..", "..");
  return Object.fromEntries(Object.entries(fonts).filter(([, file]) => existsSync(join(web, file))));
}

// The site's unicode ranges (index.html), so the bundled subsets draw exactly what they draw on the site.
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const MONO_SYMBOLS = "U+2000-2001, U+2004-2008, U+200A, U+23B8-23BD, U+2500-259F";

const FONT_CSS = `
@font-face { font-family: "Geist"; font-weight: 100 900; src: url(/fonts/geist-latin.woff2) format("woff2"); unicode-range: ${LATIN}; }
@font-face { font-family: "Geist Mono"; font-weight: 100 900; src: url(/fonts/geist-mono-latin.woff2) format("woff2"); unicode-range: ${LATIN}; }
@font-face { font-family: "Geist Mono"; font-weight: 100 900; src: url(/fonts/geist-mono-symbols.woff2) format("woff2"); unicode-range: ${MONO_SYMBOLS}; }
@font-face { font-family: "Geist OG"; font-weight: 100 900; src: url(/fonts/geist-og.woff2) format("woff2"); }
@font-face { font-family: "Geist Mono OG"; font-weight: 100 900; src: url(/fonts/geist-mono-og.woff2) format("woff2"); }
@font-face { font-family: "OG Symbols"; src: url(/fonts/noto-symbols-og.woff2) format("woff2"); }
@font-face { font-family: "OG Japanese"; font-weight: 100 900; src: url(/fonts/noto-sans-jp-og.woff2) format("woff2"); }
@font-face { font-family: "OG Arabic"; font-weight: 100 900; src: url(/fonts/noto-sans-arabic-og.woff2) format("woff2"); }
`;

const SANS = `"Geist", "Geist OG", "OG Symbols"`;
const MONO = `"Geist Mono", "Geist Mono OG", "OG Symbols"`;

/** The ▼ Text.js lockup from the site's logo menu, in white. */
export const LOCKUP_SVG = WORDMARK_SVG.trim().replace(/ fill="#000"/g, "").replace("<svg ", '<svg class="wordmark" fill="#fff" ');

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Left and bottom edge of the text: clear of X's domain label, which sits over the bottom-left corner. */
const EDGE = 88;
const BOTTOM = 100;
/** Titles start below this line, under the brand row. */
const TITLE_TOP = 176;

export const BASE_CSS = `
${FONT_CSS}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: #000; }
body { font-family: ${SANS}; color: #ededed; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; font-synthesis: none; }
.card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #000; }

.brand { position: absolute; left: ${EDGE}px; top: 80px; height: 48px; display: flex; align-items: center; gap: 24px; }
.wordmark { height: 48px; width: auto; fill: #fff; display: block; }
.label { height: 36px; display: flex; align-items: center; padding-left: 24px; border-left: 2px solid #333; font-size: 34px; font-weight: 500; letter-spacing: -0.02em; color: #8f8f8f; white-space: nowrap; }
.label.code { font-family: ${MONO}; font-weight: 400; letter-spacing: 0; }
.label svg { height: 30px; width: auto; display: block; color: #a1a1a1; }

.title { position: absolute; left: ${EDGE}px; bottom: ${BOTTOM}px; font-weight: 600; letter-spacing: -0.05em; line-height: 1.04; color: #fff; text-wrap: balance; padding-bottom: 0.06em; }

.photo { position: absolute; right: 0; top: 0; width: 504px; height: 630px; object-fit: cover; }
.photo-fade { position: absolute; right: 344px; top: 0; width: 160px; height: 630px; background: linear-gradient(90deg, #000, rgba(0,0,0,0)); }

/* Translated cards: the script's own font after Geist, no negative tracking, and room for taller glyphs. */
.card:lang(ja) { font-family: "Geist", "OG Japanese", "Geist OG", "OG Symbols"; }
.card:is(:lang(ar), :lang(fa), :lang(ur)) { font-family: "Geist", "OG Arabic", "Geist OG", "OG Symbols"; }
.card[lang]:not(:lang(en)) :is(.title, .label) { letter-spacing: 0; }
.card:is(:lang(ja), :lang(ko), :lang(zh-CN), :lang(zh-TW), :lang(ar), :lang(fa), :lang(ur), :lang(he), :lang(hi)) .title { line-height: 1.2; }
.card[dir="rtl"] .brand { left: auto; right: ${EDGE}px; }
.card[dir="rtl"] .label { padding-left: 0; padding-right: 24px; border-left: 0; border-right: 2px solid #333; }
.card[dir="rtl"] .title { left: auto; right: ${EDGE}px; }
.card[dir="rtl"] .photo { right: auto; left: 0; }
.card[dir="rtl"] .photo-fade { right: auto; left: 344px; background: linear-gradient(270deg, #000, rgba(0,0,0,0)); }
`;

/**
 * Runs in the page before the screenshot: shrinks the title until it fits two lines below the brand
 * row (three for the longest titles), then reports anything outside the safe area.
 */
export const FIT_SCRIPT = `
window.__fit = function () {
  const title = document.querySelector("[data-fit]");
  if (title) {
    const [max, min] = title.dataset.fit.split(",").map(Number);
    const lines = () => Math.round(title.scrollHeight / parseFloat(getComputedStyle(title).lineHeight));
    const fits = (n) => lines() <= n && title.scrollWidth <= title.clientWidth + 1 && title.getBoundingClientRect().top >= ${TITLE_TOP};
    const shrink = (from, n) => {
      for (let size = from; size >= min; size -= 2) {
        title.style.fontSize = size + "px";
        if (fits(n)) return true;
      }
      return false;
    };
    if (!shrink(max, 2)) shrink(Math.round(max * 0.8), 3);
  }
  const over = [];
  for (const el of document.querySelectorAll(".title, .brand")) {
    const r = el.getBoundingClientRect();
    if (r.right > 1160 || r.bottom > 595 || r.left < 40 || r.top < 35) over.push(el.className + ": " + el.textContent.slice(0, 40));
  }
  const t = document.querySelector(".title");
  if (t && t.getBoundingClientRect().top < ${TITLE_TOP}) over.push("title runs into the brand row: " + t.textContent.slice(0, 40));
  return over;
};
`;

export function documentHtml(body = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${OG_ORIGIN}/"><style>${BASE_CSS}</style><script>${FIT_SCRIPT}</script></head><body>${body}</body></html>`;
}

/** What a card draws: the only fields that change its pixels (and so its cache key). */
export function drawn(card: OgCard): { title: string; label: string; code: boolean; wordmark?: string; photo?: string; lang?: string; dir?: "rtl" } {
  const code = card.template === "error" && Boolean(card.code);
  // One word for the section: `Docs · Getting Started` → `Docs`.
  const label = code ? (card.code as string) : (card.section.split(" · ")[0] ?? "");
  const locale = card.lang && card.lang !== "en" ? { lang: card.lang, ...(card.dir === "rtl" ? { dir: "rtl" as const } : {}) } : {};
  return { title: card.title, label: card.wordmark ? "" : label, code, wordmark: card.wordmark, photo: card.photo, ...locale };
}

/** Body markup of one card. */
export function cardHtml(card: OgCard): string {
  const d = drawn(card);
  const label = d.wordmark ? `<span class="label">${d.wordmark}</span>` : d.label ? `<span class="label${d.code ? " code" : ""}">${escapeHtml(d.label)}</span>` : "";
  const width = d.photo ? 580 : 1024;
  const max = d.photo ? 96 : 112;
  const photo = d.photo ? `<img class="photo" src="${escapeHtml(d.photo)}"><div class="photo-fade"></div>` : "";
  const locale = d.lang ? ` lang="${escapeHtml(d.lang)}"${d.dir ? ` dir="${d.dir}"` : ""}` : "";
  return `<div class="card"${locale}><div class="brand">${LOCKUP_SVG}${label}</div><div class="title" data-fit="${max},60" style="width:${width}px;font-size:${max}px">${escapeHtml(d.title)}</div>${photo}</div>`;
}
