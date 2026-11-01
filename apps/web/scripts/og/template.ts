/**
 * HTML for the Open Graph cards (1200×630), screenshotted by ./render.ts. One stylesheet and a
 * handful of layouts: text-only (docs, blog), text beside a console frame, a list or a product
 * photo, error codes and the 404. Fonts come from `public/fonts` (the site's own Geist subsets)
 * with ./fonts as the fallback for glyphs those subsets leave out, so nothing falls through to a
 * system font and the output is the same on any machine.
 */

import type { OgCard } from "../../src/og";
import { WORDMARK_SVG } from "../../src/site/LogoMenu";

/** Origin the renderer serves fonts and images from (requests never leave the page). */
export const OG_ORIGIN = "https://og.textjs.local";

/**
 * Grayscale antialiasing and no hinting, so text renders alike on macOS and Linux (Linux would
 * otherwise use subpixel colour fringes, which also stop text cards from encoding as grayscale).
 */
export const CHROMIUM_ARGS = ["--disable-lcd-text", "--font-render-hinting=none"];

/** Font files: URL path → file path relative to apps/web. */
export const OG_FONTS: Record<string, string> = {
  "/fonts/geist-latin.woff2": "public/fonts/geist-latin.woff2",
  "/fonts/geist-mono-latin.woff2": "public/fonts/geist-mono-latin.woff2",
  "/fonts/geist-mono-symbols.woff2": "public/fonts/geist-mono-symbols.woff2",
  "/fonts/geist-og.woff2": "scripts/og/fonts/geist-og.woff2",
  "/fonts/geist-mono-og.woff2": "scripts/og/fonts/geist-mono-og.woff2",
  "/fonts/noto-symbols-og.woff2": "scripts/og/fonts/noto-symbols-og.woff2",
  "/fonts/noto-emoji-og.woff2": "scripts/og/fonts/noto-emoji-og.woff2",
};

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
@font-face { font-family: "OG Emoji"; src: url(/fonts/noto-emoji-og.woff2) format("woff2"); }
`;

const SANS = `"Geist", "Geist OG", "OG Symbols", "OG Emoji"`;
const MONO = `"Geist Mono", "Geist Mono OG", "OG Symbols", "OG Emoji"`;

/** The ▼ Text.js lockup from the site's logo menu, in white. */
export const LOCKUP_SVG = WORDMARK_SVG.trim().replace(/ fill="#000"/g, "").replace("<svg ", '<svg class="wordmark" fill="#fff" ');

export const MARK_SVG = '<svg class="mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 4h20L12 21.5z"/></svg>';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const BASE_CSS = `
${FONT_CSS}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: #000; }
body { font-family: ${SANS}; color: #ededed; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; font-synthesis: none; }
.mono { font-family: ${MONO}; }
.card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #000; }

/* Grid: 70px cells inside a frame inset 40px, faded toward the text, with crosses on the frame corners. */
.grid { position: absolute; left: 40px; top: 35px; width: 1120px; height: 560px;
  background-image: linear-gradient(rgba(255,255,255,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.075) 1px, transparent 1px);
  background-size: 70px 70px; background-position: -1px -1px; }
.grid.fade-right { -webkit-mask-image: linear-gradient(90deg, transparent 18%, #000 78%); }
.grid.fade-top { -webkit-mask-image: radial-gradient(ellipse 75% 85% at 50% 0%, #000 25%, transparent 80%); }
.grid.fade-center { -webkit-mask-image: radial-gradient(ellipse 60% 70% at 50% 50%, #000 15%, transparent 80%); }
.rule-h, .rule-v { position: absolute; background: rgba(255,255,255,0.14); }
.rule-h { left: 0; width: 1200px; height: 1px; }
.rule-v { top: 0; height: 630px; width: 1px; }
.cross { position: absolute; width: 21px; height: 21px; }
.cross::before, .cross::after { content: ""; position: absolute; background: rgba(255,255,255,0.5); }
.cross::before { left: 10px; top: 0; width: 1px; height: 21px; }
.cross::after { top: 10px; left: 0; width: 21px; height: 1px; }

.brand { position: absolute; left: 96px; top: 84px; display: flex; align-items: center; gap: 20px; }
.wordmark { height: 40px; width: auto; fill: #fff; display: block; }
.mark { width: 40px; height: 40px; fill: #fff; display: block; }
.app-mark { height: 28px; display: flex; align-items: center; color: #ededed; padding-left: 20px; border-left: 1px solid rgba(255,255,255,0.2); }
.app-mark svg { height: 28px; width: auto; display: block; }

.text { position: absolute; left: 96px; top: 160px; bottom: 100px; display: flex; flex-direction: column; justify-content: center; }
.section { font-family: ${MONO}; font-size: 26px; line-height: 32px; color: #a1a1a1; margin-bottom: 22px; white-space: nowrap; }
.title { font-weight: 600; letter-spacing: -0.045em; line-height: 1.04; color: #fff; text-wrap: balance; padding-bottom: 0.08em; }
.desc { margin-top: 22px; font-size: 30px; line-height: 1.38; color: #a1a1a1; letter-spacing: -0.01em; text-wrap: pretty; }
.desc code { font-family: ${MONO}; font-size: 0.9em; color: #ededed; }
.meta { margin-top: 28px; display: flex; gap: 14px; font-family: ${MONO}; font-size: 24px; line-height: 30px; color: #8f8f8f; white-space: nowrap; }
.meta span + span::before { content: "·"; margin-right: 14px; color: #4d4d4d; }

/* A Chrome DevTools Console panel (site/DevToolsWindow.tsx) holding one real frame. */
.devtools { position: absolute; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; overflow: hidden; background: #202124;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 40px 100px -20px rgba(0,0,0,0.9), 0 0 160px -40px rgba(255,255,255,0.12); }
.dt-tabs { display: flex; height: 40px; background: #292a2d; border-bottom: 1px solid #3c4043; font-size: 16px; color: #9aa0a6; padding-left: 8px; }
.dt-tab { display: flex; align-items: center; padding: 0 14px; border-bottom: 2px solid transparent; white-space: nowrap; }
.dt-tab.active { color: #e8eaed; border-bottom-color: #8ab4f8; }
.dt-body { position: relative; overflow: hidden; background: #0a0a0a; }
.dt-body > .fit { position: absolute; left: 0; top: 0; padding: 14px 16px; }
.dt-body.center > .fit { left: 50%; transform: translateX(-50%); }
.dt-body [data-textjs-mirror] { font-family: ${MONO} !important; }

/* A status-page style list. */
.list { position: absolute; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; background: #0a0a0a; overflow: hidden; }
.row { display: flex; align-items: center; gap: 16px; height: 60px; padding: 0 26px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 22px; white-space: nowrap; }
.row:first-child { border-top: 0; }
.row .label { font-family: ${MONO}; color: #ededed; flex-shrink: 0; }
.row .value { color: #a1a1a1; margin-left: auto; overflow: hidden; text-overflow: ellipsis; }
.row .dot { width: 10px; height: 10px; border-radius: 5px; flex-shrink: 0; background: #45a557; }
.row .dot.info { background: #0070f3; }
.row.lead .label { color: #a1a1a1; }
.row.lead .value { color: #ededed; margin-left: 0; }

.photo { position: absolute; right: 0; top: 0; width: 504px; height: 630px; object-fit: cover; }
.photo-fade { position: absolute; right: 344px; top: 0; width: 160px; height: 630px; background: linear-gradient(90deg, #000, rgba(0,0,0,0)); }

.code { font-family: ${MONO}; font-size: 30px; line-height: 36px; color: #a1a1a1; margin-bottom: 20px; }
.big-code { font-family: ${MONO}; font-weight: 500; font-size: 120px; line-height: 1; letter-spacing: -0.04em; color: #fff; margin-bottom: 26px; }

.nf { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0; }
.nf .n { font-size: 64px; font-weight: 600; letter-spacing: -0.04em; color: #fff; padding-right: 36px; margin-right: 36px; border-right: 1px solid rgba(255,255,255,0.3); line-height: 96px; }
.nf .m { font-size: 36px; color: #ededed; letter-spacing: -0.01em; }

.cmd { margin-top: 36px; display: inline-flex; align-self: flex-start; align-items: center; gap: 14px; height: 60px; padding: 0 26px; border: 1px solid rgba(255,255,255,0.18); border-radius: 30px; background: #0a0a0a;
  font-family: ${MONO}; font-size: 24px; color: #ededed; white-space: nowrap; }
.cmd .p { color: #707070; }
`;

/**
 * Runs in the page before the screenshot: shrinks each title until it fits its line budget, then
 * scales every console frame to its panel.
 */
export const FIT_SCRIPT = `
window.__fit = function () {
  const lineHeight = (el) => parseFloat(getComputedStyle(el).lineHeight);
  const linesOf = (el) => Math.round(el.scrollHeight / lineHeight(el));
  for (const block of document.querySelectorAll(".text")) {
    const title = block.querySelector("[data-fit]");
    const desc = block.querySelector(".desc");
    const [max, min, lines] = title ? title.dataset.fit.split(",").map(Number) : [0, 0, 0];
    let size = max;
    const titleFits = () => linesOf(title) <= lines && title.scrollWidth <= title.clientWidth + 1;
    if (title) {
      title.style.fontSize = size + "px";
      while (size > min && !titleFits()) { size -= 2; title.style.fontSize = size + "px"; }
    }
    // A description is shown whole or not at all: never cut off with an ellipsis.
    let descSize = 30;
    const descLines = desc ? Number(desc.dataset.lines) : 0;
    const descFits = () => !desc || linesOf(desc) <= descLines;
    while (desc && !descFits() && descSize > 26) { descSize -= 2; desc.style.fontSize = descSize + "px"; }
    if (desc && !descFits()) desc.remove();
    // Then the whole block must fit below the brand: a title down to 85% of its
    // size, then no description, then a title down to its minimum.
    const comfortable = Math.max(min, Math.round(max * 0.85));
    const overflows = () => block.scrollHeight > block.clientHeight + 1;
    while (overflows() && title && size > comfortable) { size -= 2; title.style.fontSize = size + "px"; }
    if (overflows() && block.querySelector(".desc")) {
      block.querySelector(".desc").remove();
      // With the room back, the title can grow again.
      while (title && size < max) {
        title.style.fontSize = size + 2 + "px";
        if (overflows() || !titleFits()) { title.style.fontSize = size + "px"; break; }
        size += 2;
      }
    }
    while (overflows() && title && size > min) { size -= 2; title.style.fontSize = size + "px"; }
  }
  const over = [];
  for (const block of document.querySelectorAll(".text")) if (block.scrollHeight > block.clientHeight + 1) over.push("text block is " + (block.scrollHeight - block.clientHeight) + "px too tall");
  for (const el of document.querySelectorAll(".title, .desc, .section, .meta, .brand, .big-code, .nf > span, .list")) {
    const r = el.getBoundingClientRect();
    if (r.right > 1160 || r.bottom > 595 || r.left < 40 || r.top < 35) over.push(el.className + ": " + el.textContent.slice(0, 40));
  }
  return over;
};
`;

export function documentHtml(body = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${OG_ORIGIN}/"><style>${BASE_CSS}</style><script>${FIT_SCRIPT}</script></head><body>${body}</body></html>`;
}

/** Frame lines and crosses shared by every card. */
export function chrome(fade: "right" | "top" | "center" | "none" = "right"): string {
  const crosses = [
    [40, 35],
    [1160, 35],
    [40, 595],
    [1160, 595],
  ]
    .map(([x, y]) => `<span class="cross" style="left:${(x as number) - 10}px;top:${(y as number) - 10}px"></span>`)
    .join("");
  return `<div class="grid${fade === "none" ? "" : ` fade-${fade}`}"></div><div class="rule-h" style="top:35px"></div><div class="rule-h" style="top:595px"></div><div class="rule-v" style="left:40px"></div><div class="rule-v" style="left:1160px"></div>${crosses}`;
}

function brand(card: OgCard): string {
  const app = card.wordmark ? `<span class="app-mark">${card.wordmark}</span>` : "";
  return `<div class="brand">${LOCKUP_SVG}${app}</div>`;
}

/** Wraps `inline code` in descriptions (backticks never appear; `<Box>`-style names do). */
function richText(s: string): string {
  return escapeHtml(s).replace(/(&lt;[A-Z][A-Za-z]*&gt;)/g, "<code>$1</code>");
}

function textBlock(card: OgCard, width: number, opts: { titleMax?: number; titleMin?: number; lines?: number; descLines?: number } = {}): string {
  const { titleMax = 84, titleMin = 52, lines = 2, descLines = 2 } = opts;
  const section = card.code ? `<div class="code">${escapeHtml(card.code)}</div>` : card.section ? `<div class="section">${escapeHtml(card.section)}</div>` : "";
  const desc = card.description ? `<div class="desc" data-lines="${descLines}">${richText(card.description)}</div>` : "";
  const meta = card.meta.length ? `<div class="meta">${card.meta.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>` : "";
  return `<div class="text" style="width:${width}px">${section}<div class="title" data-fit="${titleMax},${titleMin},${lines}" style="font-size:${titleMax}px">${escapeHtml(card.title)}</div>${desc}${meta}</div>`;
}

/** The frame is drawn at its own size (whole-pixel cells); the window crops it, and may run off the card's right edge. */
function devtools(card: OgCard, box: { left: number; top: number; width: number; height: number }): string {
  if (!card.frame) return "";
  const tabs = ["Elements", "Console", "Sources", "Network", "Performance"].map((t) => `<span class="dt-tab${t === "Console" ? " active" : ""}">${t}</span>`).join("");
  return `<div class="devtools" style="left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px"><div class="dt-tabs">${tabs}</div><div class="dt-body" style="height:${box.height - 42}px"><div class="fit">${card.frame.html}</div></div></div>`;
}

function list(card: OgCard, box: { left: number; top: number; width: number }): string {
  const labelWidth = Math.max(...(card.rows ?? []).map((r) => [...r.label].length));
  const rows = (card.rows ?? [])
    .map((r) => {
      const dot = r.tone === "muted" ? "" : `<span class="dot${r.tone === "info" ? " info" : ""}"></span>`;
      const lead = r.tone === "muted" ? " lead" : "";
      return `<div class="row${lead}"><span class="label" style="${lead ? `width:${labelWidth}ch` : ""}">${escapeHtml(r.label)}</span><span class="value">${escapeHtml(r.value)}</span>${dot}</div>`;
    })
    .join("");
  return `<div class="list" style="left:${box.left}px;top:${box.top}px;width:${box.width}px">${rows}</div>`;
}

const FRAME_BOX = { left: 596, top: 84, width: 640, height: 488 };

/** Body markup of one card. */
export function cardHtml(card: OgCard): string {
  switch (card.template) {
    case "home":
      return `<div class="card">${chrome("right")}${brand(card)}
        <div class="text" style="width:460px">
          <div class="title" data-fit="88,64,2" style="font-size:88px">${escapeHtml(card.title)}</div>
          <div class="desc" data-lines="3">${escapeHtml(card.description).replace("console.log", "<code>console.log</code>")}</div>
          <div class="cmd"><span class="p">$</span>bunx create-text-app</div>
        </div>
        ${devtools(card, FRAME_BOX)}</div>`;
    case "merch":
      return `<div class="card">${chrome("none")}${brand(card)}${textBlock(card, 560, { titleMax: 80, lines: 2, descLines: 3 })}
        ${card.photo ? `<img class="photo" src="${escapeHtml(card.photo)}"><div class="photo-fade"></div>` : ""}</div>`;
    case "error":
      if (card.code === "404")
        return `<div class="card">${chrome("center")}${brand(card)}<div class="nf"><span class="n">404</span><span class="m">${escapeHtml(card.title)}.</span></div></div>`;
      return `<div class="card">${chrome("right")}${brand(card)}
        <div class="text" style="width:1000px"><div class="section">${escapeHtml(card.section)}</div><div class="big-code">${escapeHtml(card.code ?? "")}</div>
        <div class="title" data-fit="64,44,2" style="font-size:64px">${escapeHtml(card.title)}</div>
        ${card.description ? `<div class="meta">${card.description.split(" · ").map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>` : ""}</div></div>`;
    case "page": {
      if (card.frame) return `<div class="card">${chrome("right")}${brand(card)}${textBlock(card, 450, { titleMax: 72, titleMin: 48, lines: 3, descLines: 3 })}${devtools(card, FRAME_BOX)}</div>`;
      if (card.rows?.length) return `<div class="card">${chrome("right")}${brand(card)}${textBlock(card, 450, { titleMax: 72, titleMin: 48, lines: 3, descLines: 3 })}${list(card, { left: 596, top: 84, width: 564 })}</div>`;
      return `<div class="card">${chrome("right")}${brand(card)}${textBlock(card, 960, { titleMax: 92, titleMin: 56, lines: 2, descLines: 3 })}</div>`;
    }
  }
}
