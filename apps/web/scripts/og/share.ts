/**
 * Share image options for X (1600×900, plus 1200×1200 squares of two of them) and a labelled
 * contact sheet, written to brand/share/. Not used by the site.
 *
 *   bun scripts/og/share.ts
 */

// Registers Vite's `?raw` imports for the site modules imported below.
import "../../test/setup";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright-core";
import { chromium } from "playwright-core";
import { contactSheet } from "./sheet";
import { BASE_CSS, CHROMIUM_ARGS, escapeHtml, LOCKUP_SVG, OG_FONTS, OG_ORIGIN } from "./template";

const WEB_DIR = join(import.meta.dirname, "..", "..");
const OUT = join(WEB_DIR, "..", "..", "brand", "share");

const { companionFrame, frameLineHeight } = await import("../../src/og");
const { render } = await import("@textjs/react/testing");
const { AsciiFont } = await import("@textjs/react");
const { createElement } = await import("react");
const { resetLocation } = await import("../../src/router");

const VERSION = (JSON.parse(readFileSync(join(WEB_DIR, "..", "..", "packages", "create-text-app", "package.json"), "utf8")) as { version: string }).version;

/** The ▼ exactly as Text.js's <AsciiFont> draws it on the home page: rows of filled cells. */
async function triangleCells(): Promise<boolean[][]> {
  const app = await render(createElement(AsciiFont, { text: "▼" }), { cols: 20, rows: 8 });
  const lines = app.lines().filter((l) => l.trim());
  await app.unmount();
  const width = Math.max(...lines.map((l) => l.trimEnd().length));
  const left = Math.min(...lines.map((l) => l.search(/\S/)));
  return lines.map((l) => [...l.padEnd(width).slice(left, width)].map((c) => c === "█"));
}

const SHARE_CSS = `
${BASE_CSS}
html, body { width: auto; height: auto; }
.share { position: relative; overflow: hidden; background: #000; }
.share .grid-full { --line: rgba(255,255,255,0.07); position: absolute; inset: 0; background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); }
.share .foot { position: absolute; display: flex; align-items: center; gap: 18px; }
.share .foot .wordmark { height: 34px; }
.share .foot .site { font-family: "Geist Mono", "Geist Mono OG"; font-size: 24px; color: #707070; }
.key { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 13%;
  background: linear-gradient(180deg, #262626 0%, #121212 100%);
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.16), inset 0 -0.06em 0 rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.09), 0 40px 80px -20px rgba(0,0,0,0.95), 0 0 160px -40px rgba(255,255,255,0.14); }
.key::before { content: ""; position: absolute; left: 7%; right: 7%; top: 6%; bottom: 13%; border-radius: 10%; background: radial-gradient(ellipse 90% 80% at 50% 35%, #232323, #191919); box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.5); }
.key span { position: relative; color: #ededed; font-family: "Geist", "Geist OG", "OG Symbols"; font-weight: 500; line-height: 1; margin-top: -12px; }
.prompt { font-family: "Geist Mono", "Geist Mono OG"; color: #ededed; white-space: pre; }
.prompt .p { color: #707070; }
.prompt .dim { color: #707070; }
.cursor { display: inline-block; background: #ededed; vertical-align: top; }
.pipe { position: absolute; }
.node { position: absolute; border: 1.5px solid rgba(255,255,255,0.55); border-radius: 14px; background: #000; display: flex; flex-direction: column; justify-content: center; padding: 0 22px; }
.node .step { font-family: "Geist Mono", "Geist Mono OG"; font-size: 24px; color: #a1a1a1; white-space: nowrap; }
.node .name { font-size: 36px; font-weight: 600; letter-spacing: -0.025em; color: #fff; margin-top: 6px; white-space: nowrap; }
.node.last { border-color: #fff; box-shadow: 0 0 80px -20px rgba(255,255,255,0.35); }
`;

interface Shot {
  file: string;
  label: string;
  width: number;
  height: number;
  html: string;
}

function foot(left: number, bottom: number, site = true): string {
  return `<div class="foot" style="left:${left}px;bottom:${bottom}px">${LOCKUP_SVG}${site ? `<span class="site">textjs.org</span>` : ""}</div>`;
}

function crosses(w: number, h: number, inset: number): string {
  const pts = [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ];
  const lines = `<div class="rule-h" style="top:${inset}px;width:${w}px"></div><div class="rule-h" style="top:${h - inset}px;width:${w}px"></div><div class="rule-v" style="left:${inset}px;height:${h}px"></div><div class="rule-v" style="left:${w - inset}px;height:${h}px"></div>`;
  return lines + pts.map(([x, y]) => `<span class="cross" style="left:${(x as number) - 10}px;top:${(y as number) - 10}px"></span>`).join("");
}

/** The teaser: three keys on black, centred, with no name or mark. */
function keycaps(w: number, h: number): string {
  const size = Math.round(Math.min(w, h) * (w > h ? 0.33 : 0.27));
  const keys = ["⌘", "⌥", "J"].map((k) => `<div class="key" style="width:${size}px;height:${size}px"><span style="font-size:${Math.round(size * 0.36)}px">${k}</span></div>`).join("");
  return `<div class="share" style="width:${w}px;height:${h}px">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:${Math.round(size * 0.16)}px">${keys}</div></div>`;
}

function frameShot(w: number, h: number, frame: { html: string; cols: number; rows: number }, fontSize: number): string {
  const fw = frame.cols * fontSize * 0.6 + 52;
  const fh = frame.rows * frameLineHeight(fontSize) + 44;
  const html = frame.html;
  const tabs = ["Elements", "Console", "Sources", "Network", "Performance", "Memory"].map((t) => `<span class="dt-tab${t === "Console" ? " active" : ""}">${t}</span>`).join("");
  return `<div class="share" style="width:${w}px;height:${h}px">
    <div class="grid-full" style="background-size:80px 80px;-webkit-mask-image:radial-gradient(ellipse 60% 60% at 50% 45%, #000 20%, transparent 85%)"></div>
    <div class="devtools" style="left:${(w - fw) / 2}px;top:64px;width:${fw}px;height:${fh + 49}px"><div class="dt-tabs" style="height:48px;font-size:18px">${tabs}</div>
      <div class="dt-body" style="height:${fh}px"><div class="fit" style="padding:22px 26px">${html}</div></div></div>
    ${foot(80, 50)}</div>`;
}

function giantType(w: number, h: number): string {
  return `<div class="share" style="width:${w}px;height:${h}px">
    <div class="grid-full" style="background-size:100px 100px;background-position:0 50px;-webkit-mask-image:radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 80%)"></div>
    ${crosses(w, h, 60)}
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-bottom:40px">
      <div style="font-size:250px;font-weight:600;letter-spacing:-0.055em;color:#fff;line-height:1">console.log</div></div>
    ${foot(120, 110)}</div>`;
}

function pipeline(w: number, h: number): string {
  // Turbolog's stages, as on the home page (pages/home/Turbolog.tsx).
  const stages = [
    ["React 19", "Commit"],
    ["Yoga", "Layout"],
    ["CellBuffer", "Paint"],
    ["Row hash", "Dirty gate"],
    ["RLE", "Encode"],
    ["console.log", "Emit"],
  ];
  const nodeW = 340;
  const nodeH = 132;
  const cols = 3;
  const gapX = 110;
  const gapY = 130;
  const totalW = cols * nodeW + (cols - 1) * gapX;
  const x0 = (w - totalW) / 2;
  const y0 = 280;
  // Snake through two rows: left to right, then right to left.
  const pos = stages.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
    return { x: x0 + col * (nodeW + gapX), y: y0 + row * (nodeH + gapY) };
  });
  let path = "";
  for (let i = 0; i < pos.length - 1; i++) {
    const a = pos[i] as { x: number; y: number };
    const b = pos[i + 1] as { x: number; y: number };
    if (a.y === b.y) {
      const dir = b.x > a.x ? 1 : -1;
      const x1 = dir > 0 ? a.x + nodeW : a.x;
      const x2 = dir > 0 ? b.x : b.x + nodeW;
      path += `M${x1} ${a.y + nodeH / 2}H${x2 - dir * 10}`;
      path += `M${x2 - dir * 18} ${a.y + nodeH / 2 - 8}L${x2 - dir * 4} ${a.y + nodeH / 2}L${x2 - dir * 18} ${a.y + nodeH / 2 + 8}`;
    } else {
      const x = a.x + nodeW / 2 + 0;
      const r = 24;
      const right = a.x + nodeW;
      path += `M${right} ${a.y + nodeH / 2}H${right + gapX / 2 - r}Q${right + gapX / 2} ${a.y + nodeH / 2} ${right + gapX / 2} ${a.y + nodeH / 2 + r}V${b.y + nodeH / 2 - r}Q${right + gapX / 2} ${b.y + nodeH / 2} ${right + gapX / 2 - r} ${b.y + nodeH / 2}H${right + 10}`;
      path += `M${right + 18} ${b.y + nodeH / 2 - 8}L${right + 4} ${b.y + nodeH / 2}L${right + 18} ${b.y + nodeH / 2 + 8}`;
      void x;
    }
  }
  const nodes = stages
    .map(([step, name], i) => {
      const p = pos[i] as { x: number; y: number };
      return `<div class="node${i === stages.length - 1 ? " last" : ""}" style="left:${p.x}px;top:${p.y}px;width:${nodeW}px;height:${nodeH}px"><span class="step">${escapeHtml(step as string)}</span><span class="name">${escapeHtml(name as string)}</span></div>`;
    })
    .join("");
  return `<div class="share" style="width:${w}px;height:${h}px">
    <div class="grid-full" style="background-size:40px 40px;opacity:0.6;-webkit-mask-image:radial-gradient(ellipse 65% 65% at 50% 55%, #000 10%, transparent 85%)"></div>
    <div style="position:absolute;left:${x0}px;top:110px;font-family:'Geist Mono','Geist Mono OG';font-size:28px;color:#a1a1a1">Turbolog</div>
    <div style="position:absolute;left:${x0}px;top:150px;font-size:56px;font-weight:600;letter-spacing:-0.035em;color:#fff">From React commit to console.log</div>
    <svg class="pipe" width="${w}" height="${h}" style="left:0;top:0"><path d="${path}" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ${nodes}${foot(x0, 70)}</div>`;
}

function triangleGrid(w: number, h: number, cells: boolean[][]): string {
  // Console cells are 0.6em wide and 1.3em tall.
  const cw = Math.round(Math.min(w, h * 1.4) / 30);
  const ch = Math.round(cw * (1.3 / 0.6));
  const tw = (cells[0]?.length ?? 0) * cw;
  const th = cells.length * ch;
  const ox = Math.round((w - tw) / 2 / cw) * cw;
  const oy = Math.round((h - th) / 2 - h * 0.03);
  const filled = cells
    .flatMap((row, y) => row.map((on, x) => (on ? `<rect x="${ox + x * cw}" y="${oy + y * ch}" width="${cw}" height="${ch}" fill="#fff"/>` : "")))
    .join("");
  return `<div class="share" style="width:${w}px;height:${h}px">
    <div class="grid-full" style="background-size:${cw}px ${ch}px;background-position:${ox % cw}px ${oy % ch}px;--line:rgba(255,255,255,0.13);-webkit-mask-image:radial-gradient(ellipse 55% 60% at 50% 47%, #000 25%, transparent 90%)"></div>
    <svg style="position:absolute;left:0;top:0" width="${w}" height="${h}">${filled}</svg>
    <div class="foot" style="left:50%;transform:translateX(-50%);bottom:${Math.round(h * 0.08)}px">${LOCKUP_SVG}</div></div>`;
}

/** What `bunx create-text-app@latest` prints first (packages/create-text-app/src/cli.ts), waiting at its first question. */
function prompt(w: number, h: number): string {
  const size = Math.round(w / 36);
  const cursor = `<span class="cursor" style="width:${Math.round(size * 0.6)}px;height:${Math.round(size * 1.3)}px"></span>`;
  return `<div class="share" style="width:${w}px;height:${h}px">
    ${crosses(w, h, 60)}
    <div style="position:absolute;left:${Math.round(w * 0.1)}px;top:50%;transform:translateY(-56%)">
      <div class="prompt" style="font-size:${size}px;line-height:1.5"><span class="p">$ </span>bunx create-text-app@latest

<b style="font-weight:700">▼ create-text-app</b> <span class="dim">v${escapeHtml(VERSION)}</span>

<span style="color:#45a557">?</span> <b style="font-weight:700">What is your project named?</b> <span class="dim">(my-text-app)</span> ${cursor}</div></div>
    ${foot(Math.round(w * 0.1), 100)}</div>`;
}

async function renderShots(shots: readonly Shot[]): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  try {
    for (const s of shots) {
      const page: Page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1 });
      const html = `<!doctype html><meta charset="utf-8"><style>${SHARE_CSS}</style>${s.html}`;
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== OG_ORIGIN) return route.abort();
        if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
        const font = OG_FONTS[url.pathname];
        return font ? route.fulfill({ contentType: "font/woff2", body: readFileSync(join(WEB_DIR, font)) }) : route.abort();
      });
      await page.goto(`${OG_ORIGIN}/`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      writeFileSync(join(OUT, s.file), await page.screenshot({ type: "png" }));
      await page.close();
      console.log(`brand/share/${s.file}`);
    }
  } finally {
    await browser.close();
  }
}

const FRAME_FONT = 25;
const homeFrame = await companionFrame("/", 54, 19, { fontSize: FRAME_FONT });
resetLocation("/");
const cells = await triangleCells();

const W = 1600;
const H = 900;
const shots: Shot[] = [
  { file: "1-keycaps.png", label: "1 · ⌘⌥J keycaps", width: W, height: H, html: keycaps(W, H) },
  { file: "2-console-frame.png", label: "2 · The home page frame in DevTools", width: W, height: H, html: frameShot(W, H, homeFrame, FRAME_FONT) },
  { file: "3-console-log.png", label: "3 · console.log", width: W, height: H, html: giantType(W, H) },
  { file: "4-turbolog.png", label: "4 · The Turbolog pipeline", width: W, height: H, html: pipeline(W, H) },
  { file: "5-triangle-cells.png", label: "5 · ▼ in console cells", width: W, height: H, html: triangleGrid(W, H, cells) },
  { file: "6-create-text-app.png", label: "6 · bunx create-text-app", width: W, height: H, html: prompt(W, H) },
  { file: "1-keycaps-square.png", label: "1 · square", width: 1200, height: 1200, html: keycaps(1200, 1200) },
  { file: "5-triangle-cells-square.png", label: "5 · square", width: 1200, height: 1200, html: triangleGrid(1200, 1200, cells) },
];

await renderShots(shots);
await contactSheet(
  join(OUT, "options.png"),
  shots.map((s) => ({ file: join(OUT, s.file), label: s.label })),
  2,
  760,
  "Share images for X: 1600×900, and 1200×1200 squares of 1 and 5",
);
console.log("brand/share/options.png");
