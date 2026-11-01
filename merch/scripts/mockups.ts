/**
 * Studio mockups for the store. Every scene is an SVG drawn in inches (garments) or millimetres
 * (objects) with the real artwork from merch/artwork/ composited at its print size and position,
 * so the marks in the photos are the marks in the files. Writes 1600×2000 masters to merch/mockups/
 * (WebP committed, PNG ignored) and 600/1200 px WebP to apps/web/src/merch/images/.
 *
 *   cd merch && bun run mockups            # all
 *   cd merch && bun run mockups frame-tee  # one product
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { command, fmt, fonts, IN, mark, MARK_RATIO, measure, MONO_CAP_HEIGHT, option, text } from "./lib";
import { close, png, webp } from "./render";

const ROOT = join(import.meta.dir, "..");
const ART = join(ROOT, "artwork");
const MASTERS = join(ROOT, "mockups");
const SITE = join(ROOT, "..", "apps", "web", "src", "merch", "images");
mkdirSync(MASTERS, { recursive: true });
mkdirSync(SITE, { recursive: true });

const W = 1600;
const H = 2000;

/** Inner markup and size (mm) of an artwork file. */
function art(file: string): { body: string; w: number; h: number } {
  const svg = readFileSync(join(ART, file), "utf8");
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!vb) throw new Error(`${file}: no viewBox`);
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<g id="(guides|cover-guide)[^"]*"[\s\S]*?<\/g>|<rect id="cover-guide[^>]*\/>/g, "");
  return { body, w: Number(vb[1]), h: Number(vb[2]) };
}

/** Places artwork with its top-left at (x, y) in scene units, at `unitsPerMm`. */
function place(file: string, x: number, y: number, unitsPerMm: number, extra = ""): string {
  const a = art(file);
  return `<g transform="translate(${fmt(x)} ${fmt(y)}) scale(${unitsPerMm})" ${extra}>${a.body}</g>`;
}

// ── Shared studio defs ─────────────────────────────────────────────────────────

const DEFS = `
<radialGradient id="backdrop" cx="50%" cy="42%" r="75%">
  <stop offset="0" stop-color="#121212"/>
  <stop offset="0.6" stop-color="#0b0b0b"/>
  <stop offset="1" stop-color="#070707"/>
</radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.32"/>
</filter>
<filter id="weave" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="1.6 0.9" numOctaves="2" seed="3" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.45"/>
</filter>
<filter id="cloth" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.0024 0.0042" numOctaves="2" seed="21" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="9" diffuseConstant="1.1" lighting-color="#ffffff" result="l">
    <feDistantLight azimuth="225" elevation="52"/>
  </feDiffuseLighting>
  <feColorMatrix in="l" type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
</filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="softer" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="34"/></filter>
<filter id="fold" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="ink" x="-2%" y="-2%" width="104%" height="104%">
  <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="11" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="5" result="g"/>
  <feColorMatrix in="g" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 1.18" result="mask"/>
  <feComposite in="d" in2="mask" operator="in"/>
</filter>
<filter id="stitch" x="-10%" y="-10%" width="120%" height="120%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/>
  <feSpecularLighting in="b" surfaceScale="3" specularConstant="0.32" specularExponent="22" lighting-color="#ffffff" result="s">
    <feDistantLight azimuth="235" elevation="38"/>
  </feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="sl"/>
  <feOffset in="SourceAlpha" dx="1.5" dy="2.5" result="o"/>
  <feGaussianBlur in="o" stdDeviation="2" result="ob"/>
  <feFlood flood-color="#000" flood-opacity="0.7"/>
  <feComposite in2="ob" operator="in" result="shadow"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="sl"/></feMerge>
</filter>
<pattern id="satin" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
  <rect width="5" height="5" fill="#101011"/>
  <rect width="5" height="1.4" fill="#19191a"/>
</pattern>
<pattern id="rib" width="6" height="40" patternUnits="userSpaceOnUse">
  <rect width="6" height="40" fill="#1c1c1d"/>
  <rect width="2.2" height="40" fill="#151516"/>
</pattern>
<filter id="deboss" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/>
  <feOffset in="b" dx="-3" dy="-4" result="hi"/>
  <feComposite in="SourceAlpha" in2="hi" operator="out" result="edgeShadow"/>
  <feFlood flood-color="#000" flood-opacity="0.85"/>
  <feComposite in2="edgeShadow" operator="in" result="dark"/>
  <feOffset in="b" dx="3" dy="4" result="lo"/>
  <feComposite in="SourceAlpha" in2="lo" operator="out" result="edgeLight"/>
  <feFlood flood-color="#ffffff" flood-opacity="0.13"/>
  <feComposite in2="edgeLight" operator="in" result="light"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dark"/><feMergeNode in="light"/></feMerge>
</filter>`;

function scene(body: string, defs = ""): string {
  return `<!doctype html><html><head><style>html,body{margin:0;background:#0a0a0a}svg{display:block}</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${DEFS}${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#backdrop)"/>
${body}
<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.075"/>
</svg></body></html>`;
}

/** A point mapper from garment inches to scene pixels. */
type Map = (x: number, y: number) => string;
function mapper(ox: number, oy: number, ppi: number): Map {
  return (x, y) => `${fmt(ox + x * ppi)} ${fmt(oy + y * ppi)}`;
}

let clipId = 0;
/** Fabric body: drop shadow, base tone, edge falloff, folds and weave, all clipped to `d`. */
function fabric(d: string, folds: string, opts: { tone?: string; light?: string; relief?: number } = {}): { under: string; over: (inner: string) => string } {
  const id = `clip${clipId++}`;
  const tone = opts.tone ?? "#161617";
  const under = `
<path d="${d}" fill="#000" opacity="0.75" transform="translate(10 26)" filter="url(#softer)"/>
<clipPath id="${id}"><path d="${d}"/></clipPath>`;
  const over = (inner: string): string => `
<g clip-path="url(#${id})">
  <path d="${d}" fill="${tone}"/>
  <rect x="0" y="0" width="${W}" height="${H}" filter="url(#cloth)" style="mix-blend-mode:soft-light" opacity="${opts.relief ?? 0.55}"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sheen)" opacity="0.9"/>
  ${folds}
  ${inner}
  <rect width="${W}" height="${H}" filter="url(#weave)" opacity="0.11"/>
  <path d="${d}" fill="none" stroke="#050505" stroke-width="40" opacity="0.5" filter="url(#soft)"/>
  <path d="${d}" fill="none" stroke="${opts.light ?? "#4a4a4a"}" stroke-width="2" opacity="0.28" transform="translate(-1 -1.5)"/>
</g>`;
  return { under, over };
}

const SHEEN = `<linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.07"/>
  <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.02"/>
  <stop offset="1" stop-color="#000000" stop-opacity="0.18"/>
</linearGradient>`;

/** A soft crease: a light ridge beside a dark valley. */
function crease(path: string, width = 16, strength = 1): string {
  return `<path d="${path}" fill="none" stroke="#000" stroke-width="${width}" opacity="${0.42 * strength}" filter="url(#fold)" stroke-linecap="round"/>
<path d="${path}" fill="none" stroke="#5a5a5a" stroke-width="${width * 0.55}" opacity="${0.16 * strength}" filter="url(#fold)" stroke-linecap="round" transform="translate(-9 -7)"/>`;
}

function stitches(path: string, opacity = 0.55): string {
  return `<path d="${path}" fill="none" stroke="#2c2c2d" stroke-width="2" stroke-dasharray="7 5" opacity="${opacity}"/>`;
}

// ── Tee ────────────────────────────────────────────────────────────────────────
// Size L flat measurements (inches): 22 chest, 29 body length from HPS, dropped 23 in shoulder.

function teeShape(p: Map, back: boolean): { d: string; neckOuter: string; neckInner: string; drop: number } {
  const drop = back ? 0.9 : 3.3;
  const d = [
    `M${p(-3.9, 0)}`,
    `C${p(-6.2, 0.25)} ${p(-9.6, 0.85)} ${p(-11.7, 1.6)}`,
    `C${p(-14.2, 2.7)} ${p(-16.9, 4.2)} ${p(-18.75, 5.55)}`,
    `C${p(-19.1, 5.8)} ${p(-19.15, 6.1)} ${p(-19.0, 6.4)}`,
    `C${p(-17.9, 8.4)} ${p(-16.4, 10.6)} ${p(-15.3, 12.35)}`,
    `C${p(-15.1, 12.65)} ${p(-14.8, 12.7)} ${p(-14.5, 12.55)}`,
    `C${p(-13.3, 11.9)} ${p(-12.1, 11.2)} ${p(-11.2, 10.7)}`,
    `C${p(-10.95, 16)} ${p(-11.05, 23)} ${p(-11.3, 28.75)}`,
    `C${p(-11.3, 29.05)} ${p(-11.1, 29.2)} ${p(-10.8, 29.2)}`,
    `C${p(-4, 29.45)} ${p(4, 29.35)} ${p(10.8, 29.2)}`,
    `C${p(11.1, 29.2)} ${p(11.3, 29.05)} ${p(11.3, 28.75)}`,
    `C${p(11.05, 23)} ${p(10.95, 16)} ${p(11.2, 10.7)}`,
    `C${p(12.1, 11.2)} ${p(13.3, 11.9)} ${p(14.5, 12.55)}`,
    `C${p(14.8, 12.7)} ${p(15.1, 12.65)} ${p(15.3, 12.35)}`,
    `C${p(16.4, 10.6)} ${p(17.9, 8.4)} ${p(19.0, 6.4)}`,
    `C${p(19.15, 6.1)} ${p(19.1, 5.8)} ${p(18.75, 5.55)}`,
    `C${p(16.9, 4.2)} ${p(14.2, 2.7)} ${p(11.7, 1.6)}`,
    `C${p(9.6, 0.85)} ${p(6.2, 0.25)} ${p(3.9, 0)}`,
    // Front view: the silhouette's top edge is the back neckline, seen through the front opening.
    `C${p(2.6, 0.85)} ${p(-2.6, 0.85)} ${p(-3.9, 0)}Z`,
  ].join("");
  const neckOuter = `M${p(-3.9, 0)}C${p(-2.6, drop * 0.95)} ${p(2.6, drop * 0.95)} ${p(3.9, 0)}`;
  const neckInner = `M${p(-3.2, -0.25)}C${p(-2.1, drop * 0.95 - 1.15)} ${p(2.1, drop * 0.95 - 1.15)} ${p(3.2, -0.25)}`;
  return { d, neckOuter, neckInner, drop };
}

function tee(ox: number, oy: number, ppi: number, back: boolean): string {
  const p = mapper(ox, oy, ppi);
  const { d, drop } = teeShape(p, back);
  const folds = [
    crease(`M${p(-10.6, 11.6)}C${p(-9.4, 12.8)} ${p(-8.4, 14.2)} ${p(-7.9, 15.8)}`, 18, 0.55),
    crease(`M${p(10.7, 12.0)}C${p(9.6, 13.2)} ${p(8.9, 14.4)} ${p(8.5, 15.6)}`, 16, 0.45),
    crease(`M${p(-9, 20.5)}C${p(-5, 19.6)} ${p(-1, 20.6)} ${p(3, 19.9)}`, 30, 0.22),
    crease(`M${p(-6, 27.6)}C${p(-2, 26.9)} ${p(3, 27.4)} ${p(8, 27.1)}`, 14, 0.6),
    crease(`M${p(-16.6, 7.6)}C${p(-15.2, 8.4)} ${p(-13.6, 9.8)} ${p(-12.6, 11.4)}`, 12, 0.7),
    crease(`M${p(16.8, 7.4)}C${p(15.4, 8.6)} ${p(14.2, 9.6)} ${p(13, 11)}`, 12, 0.7),
  ].join("");
  const f = fabric(d, folds);
  // Collar: 1 in rib. On the front, the inside of the back neck (rib and printed label) shows through.
  const outer = (dip: number, w = 3.9): string => `M${p(-w, 0)}C${p(-w * 0.67, dip)} ${p(w * 0.67, dip)} ${p(w, 0)}`;
  const band = (top: number, bottom: number, wTop: number, wBottom: number): string =>
    `M${p(-wTop, 0)}C${p(-wTop * 0.67, top)} ${p(wTop * 0.67, top)} ${p(wTop, 0)}L${p(wBottom, 0.05)}C${p(wBottom * 0.67, bottom)} ${p(-wBottom * 0.67, bottom)} ${p(-wBottom, 0.05)}Z`;
  const collar = back
    ? `<path d="${band(drop * 0.95, drop * 0.95 + 1.1, 3.9, 4.4)}" fill="url(#rib)" opacity="0.55"/>
       <path d="${outer(drop * 0.95)}" fill="none" stroke="#0a0a0a" stroke-width="2.5" opacity="0.7"/>`
    : `<path d="${outer(0.85)}L${p(3.9, 0)}C${p(2.6, drop * 0.95)} ${p(-2.6, drop * 0.95)} ${p(-3.9, 0)}Z" fill="#0b0b0b"/>
       <path d="${band(0.85, 1.75, 3.9, 3.7)}" fill="url(#rib)" opacity="0.45"/>
       <g opacity="0.55">${place("neck-label.svg", ox - 0.75 * ppi, oy + 0.95 * ppi, (ppi / IN) * 0.75)}</g>
       <path d="M${p(-3.9, 0)}C${p(-2.6, drop * 0.95)} ${p(2.6, drop * 0.95)} ${p(3.9, 0)}L${p(3.35, 0.15)}C${p(2.2, drop * 0.95 - 1.15)} ${p(-2.2, drop * 0.95 - 1.15)} ${p(-3.35, 0.15)}Z" fill="#000" opacity="0.6" transform="translate(0 -10)" filter="url(#fold)"/>
       <path d="M${p(-3.9, 0)}C${p(-2.6, drop * 0.95)} ${p(2.6, drop * 0.95)} ${p(3.9, 0)}L${p(3.35, 0.15)}C${p(2.2, drop * 0.95 - 1.15)} ${p(-2.2, drop * 0.95 - 1.15)} ${p(-3.35, 0.15)}Z" fill="url(#rib)"/>
       <path d="M${p(-3.35, 0.15)}C${p(-2.2, drop * 0.95 - 1.15)} ${p(2.2, drop * 0.95 - 1.15)} ${p(3.35, 0.15)}" fill="none" stroke="#3a3a3b" stroke-width="2" opacity="0.6"/>
       <path d="${outer(drop * 0.95)}" fill="none" stroke="#0a0a0a" stroke-width="3" opacity="0.8"/>`;
  const seams = [
    stitches(`M${p(-11.2, 28.1)}C${p(-4, 28.35)} ${p(4, 28.35)} ${p(11.2, 28.1)}`),
    stitches(`M${p(-18.35, 6.6)}L${p(-14.7, 13.0)}`, 0.4),
    stitches(`M${p(18.35, 6.6)}L${p(14.7, 13.0)}`, 0.4),
    `<path d="M${p(-11.7, 1.6)}C${p(-11.3, 4)} ${p(-11.1, 7.5)} ${p(-11.2, 10.7)}M${p(11.7, 1.6)}C${p(11.3, 4)} ${p(11.1, 7.5)} ${p(11.2, 10.7)}" fill="none" stroke="#0c0c0c" stroke-width="2.4" opacity="0.6"/>`,
    `<path d="M${p(-3.9, 0)}C${p(-6.2, 0.25)} ${p(-9.6, 0.85)} ${p(-11.7, 1.6)}M${p(3.9, 0)}C${p(6.2, 0.25)} ${p(9.6, 0.85)} ${p(11.7, 1.6)}" fill="none" stroke="#0c0c0c" stroke-width="2" opacity="0.5" transform="translate(0 3)"/>`,
  ].join("");
  return `${f.under}${f.over(`${seams}${collar}`)}`;
}

/** Garment print: artwork placed by inches from the garment's centre line and HPS. */
function print(file: string, ox: number, oy: number, ppi: number, topIn: number): string {
  const a = art(file);
  const upm = ppi / IN;
  const x = ox - (a.w * upm) / 2;
  const y = oy + topIn * ppi;
  return `<g filter="url(#ink)" opacity="0.94">${place(file, x, y, upm)}</g>`;
}

/** Print tops, in inches below the high point of the shoulder: 3 in below the back neck seam (0.9 in drop), 3 in below the front one (3.3 in drop). */
const BACK_TOP = 3.9;
const FRONT_TOP = 6.3;

function teeScene(view: "pair" | "back" | "front"): string {
  if (view === "pair") {
    const ppiB = 30;
    const back = tee(980, 330, ppiB, true) + print("frame-tee-back.svg", 980, 330, ppiB, BACK_TOP);
    const ppiF = 30;
    const front = tee(640, 900, ppiF, false) + print("frame-tee-front.svg", 640, 900, ppiF, FRONT_TOP);
    return scene(back + front, SHEEN);
  }
  const ppi = 36;
  const ox = W / 2;
  const oy = 470;
  return scene(tee(ox, oy, ppi, view === "back") + (view === "back" ? print("frame-tee-back.svg", ox, oy, ppi, BACK_TOP) : print("frame-tee-front.svg", ox, oy, ppi, FRONT_TOP)), SHEEN);
}

/** A close crop: renders the scene at 2.4× around a point. */
function crop(svgScene: string, cx: number, cy: number, zoom: number): string {
  const vw = W / zoom;
  const vh = H / zoom;
  return svgScene.replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="${fmt(cx - vw / 2)} ${fmt(cy - vh / 2)} ${fmt(vw)} ${fmt(vh)}"`);
}

// ── Hoodie ─────────────────────────────────────────────────────────────────────
// Size L flat (inches): 23.5 chest, 28 length from HPS, 2.75 in rib hem and cuffs.

function hoodie(ox: number, oy: number, ppi: number): string {
  const p = mapper(ox, oy, ppi);
  const body = [
    `M${p(-4.3, 0)}`,
    `C${p(-7, 0.4)} ${p(-10.5, 1.2)} ${p(-12.4, 2.2)}`,
    `C${p(-14.6, 7)} ${p(-16.4, 15)} ${p(-17.6, 24.8)}`,
    `L${p(-17.4, 27.6)}L${p(-13.4, 28.0)}L${p(-13.2, 25.2)}`,
    `C${p(-12.8, 19)} ${p(-12.3, 15)} ${p(-11.75, 11.4)}`,
    `C${p(-11.8, 18)} ${p(-11.8, 23)} ${p(-11.4, 25.4)}`,
    `L${p(-11.5, 28.2)}C${p(-4, 28.5)} ${p(4, 28.5)} ${p(11.5, 28.2)}L${p(11.4, 25.4)}`,
    `C${p(11.8, 23)} ${p(11.8, 18)} ${p(11.75, 11.4)}`,
    `C${p(12.3, 15)} ${p(12.8, 19)} ${p(13.2, 25.2)}`,
    `L${p(13.4, 28.0)}L${p(17.4, 27.6)}L${p(17.6, 24.8)}`,
    `C${p(16.4, 15)} ${p(14.6, 7)} ${p(12.4, 2.2)}`,
    `C${p(10.5, 1.2)} ${p(7, 0.4)} ${p(4.3, 0)}`,
    `C${p(3.2, 2.4)} ${p(-3.2, 2.4)} ${p(-4.3, 0)}Z`,
  ].join("");
  const hood = `M${p(-5.6, 1.4)}C${p(-7.9, -1.2)} ${p(-7.9, -7.2)} ${p(-5.2, -10.0)}C${p(-3.4, -11.7)} ${p(-1.2, -12.3)} ${p(0, -12.35)}C${p(1.2, -12.3)} ${p(3.4, -11.7)} ${p(5.2, -10.0)}C${p(7.9, -7.2)} ${p(7.9, -1.2)} ${p(5.6, 1.4)}C${p(3, 3.6)} ${p(-3, 3.6)} ${p(-5.6, 1.4)}Z`;
  const opening = `M${p(0, 3.1)}C${p(-2.4, 2.2)} ${p(-5.4, -0.4)} ${p(-5.2, -4.0)}C${p(-5.0, -6.9)} ${p(-3.0, -9.0)} ${p(0, -9.3)}C${p(3.0, -9.0)} ${p(5.0, -6.9)} ${p(5.2, -4.0)}C${p(5.4, -0.4)} ${p(2.4, 2.2)} ${p(0, 3.1)}Z`;
  const folds = [
    crease(`M${p(-11.2, 13)}C${p(-9, 15)} ${p(-7.8, 18)} ${p(-7.6, 22)}`, 24),
    crease(`M${p(11.3, 13.4)}C${p(9.4, 15.6)} ${p(8.4, 18.4)} ${p(8.2, 22)}`, 20, 0.8),
    crease(`M${p(-15.2, 8)}C${p(-15.6, 13)} ${p(-15.4, 18)} ${p(-15.8, 23)}`, 18, 0.7),
    crease(`M${p(15.4, 9)}C${p(15.4, 13)} ${p(15.6, 18)} ${p(15.9, 23)}`, 18, 0.6),
    crease(`M${p(-3.4, 2.6)}C${p(-1, 3.9)} ${p(1, 3.9)} ${p(3.4, 2.6)}`, 18, 0.45),
  ].join("");
  const fb = fabric(body, folds, { tone: "#1c1c1d" });
  const fh = fabric(hood, crease(`M${p(-5.6, -6)}C${p(-4.6, -9)} ${p(-2, -10.6)} ${p(0, -10.8)}`, 16, 0.6), { tone: "#1b1b1c" });
  const pocket = `<path d="M${p(-6.6, 17.6)}L${p(6.6, 17.6)}L${p(8.6, 24.9)}L${p(-8.6, 24.9)}Z" fill="#000" opacity="0.12"/>
<path d="M${p(-6.6, 17.6)}L${p(6.6, 17.6)}M${p(6.6, 17.6)}L${p(8.6, 24.9)}M${p(-6.6, 17.6)}L${p(-8.6, 24.9)}" fill="none" stroke="#0c0c0c" stroke-width="3"/>
${stitches(`M${p(-6.4, 17.95)}L${p(6.4, 17.95)}`, 0.5)}
${crease(`M${p(-8.2, 24)}C${p(-7, 21.5)} ${p(-6.8, 20)} ${p(-6.6, 18.2)}`, 10, 0.6)}
${crease(`M${p(8.2, 24)}C${p(7, 21.5)} ${p(6.8, 20)} ${p(6.6, 18.2)}`, 10, 0.6)}`;
  const ribs = `<path d="M${p(-11.4, 25.4)}C${p(-4, 25.7)} ${p(4, 25.7)} ${p(11.4, 25.4)}L${p(11.5, 28.2)}C${p(4, 28.5)} ${p(-4, 28.5)} ${p(-11.5, 28.2)}Z" fill="url(#rib)" opacity="0.85"/>
<path d="M${p(-17.6, 24.8)}L${p(-13.2, 25.2)}L${p(-13.4, 28.0)}L${p(-17.4, 27.6)}Z" fill="url(#rib)" opacity="0.85"/>
<path d="M${p(17.6, 24.8)}L${p(13.2, 25.2)}L${p(13.4, 28.0)}L${p(17.4, 27.6)}Z" fill="url(#rib)" opacity="0.85"/>
<path d="M${p(-11.4, 25.4)}C${p(-4, 25.7)} ${p(4, 25.7)} ${p(11.4, 25.4)}" fill="none" stroke="#0b0b0b" stroke-width="3"/>`;
  const armholes = `<path d="M${p(-12.4, 2.2)}C${p(-12.2, 5)} ${p(-11.9, 8)} ${p(-11.75, 11.4)}M${p(12.4, 2.2)}C${p(12.2, 5)} ${p(11.9, 8)} ${p(11.75, 11.4)}" fill="none" stroke="#0b0b0b" stroke-width="3" opacity="0.8"/>`;
  const a = art("hoodie-chest.svg");
  const upm = ppi / IN;
  const markScene = `<g filter="url(#stitch)"><path d="${mark(ox - (a.w * upm) / 2, oy + 5.8 * ppi, a.w * upm)}" fill="url(#satin)"/></g>`;
  const hoodInside = `<path d="${opening}" fill="url(#lining)"/>
<path d="M${p(0, -12.35)}C${p(0.05, -11.4)} ${p(0.05, -10.2)} ${p(0, -9.3)}" fill="none" stroke="#0a0a0a" stroke-width="2.6" opacity="0.8"/>
<path d="${opening}" fill="none" stroke="#000" stroke-width="30" opacity="0.6" filter="url(#fold)"/>
<path d="${opening}" fill="none" stroke="#2c2c2d" stroke-width="3" opacity="0.7"/>
${crease(`M${p(-3.4, -8.4)}C${p(-4.6, -4)} ${p(-4.0, -0.6)} ${p(-2.2, 1.8)}`, 14, 0.4)}`;
  return `${fh.under}${fb.under}${fh.over(hoodInside)}${fb.over(`${pocket}${ribs}${armholes}${markScene}`)}`;
}

function hoodieScene(): string {
  const defs = `${SHEEN}<radialGradient id="lining" cx="50%" cy="62%" r="62%"><stop offset="0" stop-color="#050505"/><stop offset="0.7" stop-color="#0b0b0c"/><stop offset="1" stop-color="#18181a"/></radialGradient>`;
  return scene(hoodie(W / 2, 640, 36), defs);
}

// ── Cap ────────────────────────────────────────────────────────────────────────
// Yupoong 6245CM, front view. Units: inches at `ppi`, origin at the centre of the crown base.

function capFront(ox: number, oy: number, ppi: number): string {
  const p = mapper(ox, oy, ppi);
  // Three-quarter view from the front left, camera slightly above: crown on the right, the
  // pre-curved bill sweeping out to the lower left.
  const crown = `M${p(-3.6, 0.2)}C${p(-4.05, -2.2)} ${p(-2.3, -3.95)} ${p(0.5, -4.0)}C${p(3.2, -3.95)} ${p(4.7, -2.2)} ${p(4.35, 0.35)}C${p(2.6, 0.95)} ${p(-1.6, 0.95)} ${p(-3.6, 0.2)}Z`;
  const bill = `M${p(-3.6, 0.2)}C${p(-2.4, 0.8)} ${p(0, 1.0)} ${p(1.7, 0.86)}C${p(0.9, 2.15)} ${p(-3.4, 2.75)} ${p(-6.3, 1.75)}C${p(-7.0, 1.45)} ${p(-6.2, 0.15)} ${p(-3.6, 0.2)}Z`;
  const edge = `M${p(1.7, 0.86)}C${p(0.9, 2.15)} ${p(-3.4, 2.75)} ${p(-6.3, 1.75)}C${p(-6.4, 1.95)} ${p(-3.4, 2.95)} ${p(1.62, 1.0)}Z`;
  const folds = [
    crease(`M${p(2.6, -3.2)}C${p(3.3, -2)} ${p(3.5, -0.8)} ${p(3.3, 0.5)}`, 16, 0.55),
    crease(`M${p(-0.6, -0.6)}C${p(0.2, -0.3)} ${p(1.2, -0.3)} ${p(2.0, -0.6)}`, 16, 0.35),
  ].join("");
  const fc = fabric(crown, `<path d="${crown}" fill="url(#crownLight)"/>${folds}`, { tone: "#19191a", relief: 0.6 });
  const fbill = fabric(bill, `<path d="${bill}" fill="url(#billLight)"/>`, { tone: "#19191a", relief: 0.3 });
  // Front centre seam and the two front panel seams, in perspective.
  const seams = `<path d="M${p(0.5, -4.0)}C${p(-0.9, -3.2)} ${p(-1.6, -1.6)} ${p(-1.35, 0.78)}" fill="none" stroke="#0a0a0a" stroke-width="2.6" opacity="0.8"/>
<path d="M${p(0.5, -4.0)}C${p(-1.9, -3.6)} ${p(-3.4, -2.2)} ${p(-3.55, -0.2)}M${p(0.5, -4.0)}C${p(1.6, -3.2)} ${p(2.0, -1.4)} ${p(1.75, 0.82)}" fill="none" stroke="#0a0a0a" stroke-width="2.2" opacity="0.5"/>
<ellipse cx="${fmt(ox + 0.5 * ppi)}" cy="${fmt(oy - 4.0 * ppi)}" rx="${fmt(0.26 * ppi)}" ry="${fmt(0.09 * ppi)}" fill="#202022"/>
<ellipse cx="${fmt(ox + 2.55 * ppi)}" cy="${fmt(oy - 2.75 * ppi)}" rx="${fmt(0.07 * ppi)}" ry="${fmt(0.09 * ppi)}" fill="#0a0a0a" stroke="#2a2a2b" stroke-width="2"/>`;
  const a = art("cap-front.svg");
  const w = a.w * (ppi / IN);
  // The mark sits on the front seam, turned with the front panels (foreshortened to 78%).
  const cx = ox - 0.78 * ppi;
  const top = oy - 2.78 * ppi;
  const logo = `<g filter="url(#stitch)"><g transform="translate(${fmt(cx)} ${fmt(top)}) rotate(9) scale(0.8 1) translate(${fmt(-w / 2)} 0)"><path d="${mark(0, 0, w)}" fill="url(#satin)"/></g></g>`;
  const billStitches = [0.38, 0.76, 1.14, 1.52].map((t, i) => stitches(`M${p(-3.6 - t * 0.5, 0.2 + t * 0.38)}C${p(-2.4, 0.8 + t * 0.95)} ${p(-0.3, 1.02 + t * 0.7)} ${p(1.7 - t * 0.55, 0.86 + t * 0.52)}`, 0.42 - i * 0.05)).join("");
  const ground = `<ellipse cx="${fmt(ox - 1.2 * ppi)}" cy="${fmt(oy + 2.35 * ppi)}" rx="${fmt(5.4 * ppi)}" ry="${fmt(0.55 * ppi)}" fill="#000" opacity="0.7" filter="url(#softer)"/>`;
  return `${ground}${fc.under}${fbill.under}${fc.over(`${seams}${logo}`)}${fbill.over(billStitches)}<path d="${edge}" fill="#0a0a0a"/>`;
}

function capBack(ox: number, oy: number, ppi: number): string {
  const p = mapper(ox, oy, ppi);
  const crown = `M${p(-4.0, 0.1)}C${p(-4.3, -2.6)} ${p(-2.6, -4.1)} ${p(0, -4.15)}C${p(2.6, -4.1)} ${p(4.3, -2.6)} ${p(4.0, 0.1)}C${p(2, 0.3)} ${p(-2, 0.3)} ${p(-4.0, 0.1)}Z`;
  const opening = `M${p(-1.7, 0.25)}C${p(-1.7, -0.9)} ${p(-1.1, -1.55)} ${p(0, -1.6)}C${p(1.1, -1.55)} ${p(1.7, -0.9)} ${p(1.7, 0.25)}Z`;
  const fc = fabric(crown, [crease(`M${p(-2.4, -3.3)}C${p(-2.8, -2)} ${p(-2.9, -1)} ${p(-2.7, 0)}`, 12, 0.6), crease(`M${p(2.4, -3.3)}C${p(2.8, -2)} ${p(2.9, -1)} ${p(2.7, 0)}`, 12, 0.6)].join(""), { tone: "#1c1c1d" });
  const strap = `<path d="${opening}" fill="#0a0a0a"/>
<path d="M${p(-1.75, -0.3)}L${p(1.75, -0.3)}L${p(1.75, 0.2)}L${p(-1.75, 0.2)}Z" fill="#1e1e1f"/>
<path d="M${p(-1.75, -0.3)}L${p(1.75, -0.3)}" stroke="#2c2c2c" stroke-width="2"/>
<rect x="${fmt(ox + 0.3 * ppi)}" y="${fmt(oy - 0.42 * ppi)}" width="${fmt(0.62 * ppi)}" height="${fmt(0.74 * ppi)}" rx="${fmt(0.08 * ppi)}" fill="none" stroke="#5b5650" stroke-width="${fmt(0.07 * ppi)}"/>
<rect x="${fmt(ox + 0.3 * ppi)}" y="${fmt(oy - 0.42 * ppi)}" width="${fmt(0.62 * ppi)}" height="${fmt(0.74 * ppi)}" rx="${fmt(0.08 * ppi)}" fill="none" stroke="#8d877e" stroke-width="2" opacity="0.6" transform="translate(-1 -1.5)"/>
<path d="M${p(0, -4.15)}C${p(0.05, -3)} ${p(0.05, -2)} ${p(0, -1.6)}" fill="none" stroke="#0b0b0b" stroke-width="3" opacity="0.8"/>
<ellipse cx="${fmt(ox)}" cy="${fmt(oy - 4.17 * ppi)}" rx="${fmt(0.26 * ppi)}" ry="${fmt(0.12 * ppi)}" fill="#202021"/>`;
  const a = art("cap-back.svg");
  const upm = ppi / IN;
  const capH = 0.25 * IN * upm;
  const size = capH / MONO_CAP_HEIGHT;
  const label = text(fonts.monoBold, "textjs.org", ox - (a.w * upm) / 2, oy - 1.95 * ppi, size);
  const emb = `<g filter="url(#stitch)"><path d="${label}" fill="#151515"/></g>`;
  return `${fc.under}${fc.over(`${strap}${emb}`)}`;
}

function capScene(view: "front" | "back"): string {
  const defs = `${SHEEN}<linearGradient id="billLight" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.03"/><stop offset="1" stop-color="#fff" stop-opacity="0.09"/></linearGradient>
<linearGradient id="crownLight" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>`;
  return scene(view === "front" ? capFront(W / 2 + 120, 1080, 140) : capBack(W / 2, 1180, 150), defs);
}

// ── Sticker sheet ──────────────────────────────────────────────────────────────

function stickerScene(): string {
  const a = art("sticker-sheet.svg");
  const upm = 940 / a.w;
  const x = (W - a.w * upm) / 2;
  const y = (H - a.h * upm) / 2 + 20;
  const body = a.body
    .replace(/<rect id="sheet"[^>]*\/>/, `<rect id="sheet" width="${a.w}" height="${a.h}" rx="2.4" fill="#121212"/>`)
    .replace(/stroke="#ec008c" stroke-width="0.25"/, 'stroke="#2e2e2e" stroke-width="0.3"');
  const sheet = `<g transform="translate(${fmt(x)} ${fmt(y)}) rotate(-3 ${fmt((a.w * upm) / 2)} ${fmt((a.h * upm) / 2)})">
  <rect width="${fmt(a.w * upm)}" height="${fmt(a.h * upm)}" rx="18" fill="#000" opacity="0.8" transform="translate(12 30)" filter="url(#softer)"/>
  <g transform="scale(${upm})">${body}</g>
  <rect width="${fmt(a.w * upm)}" height="${fmt(a.h * upm)}" rx="18" fill="url(#sheen)"/>
  <rect width="${fmt(a.w * upm)}" height="${fmt(a.h * upm)}" rx="18" fill="none" stroke="#2a2a2a" stroke-width="2"/>
</g>`;
  return scene(sheet, SHEEN);
}

// ── Keycaps ────────────────────────────────────────────────────────────────────

function keycap(cx: number, cy: number, u: number, s: number, legend: string): string {
  const bw = (u * 19.05 - 1.05) * s;
  const bh = 18 * s;
  const tw = bw - 5.6 * s;
  const th = 12.6 * s;
  const x = cx - bw / 2;
  const y = cy - bh / 2;
  const tx = cx - tw / 2;
  const ty = y + 1.6 * s;
  const id = `dish${clipId++}`;
  return `
<radialGradient id="${id}" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#1b1b1c"/><stop offset="1" stop-color="#232325"/></radialGradient>
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="${fmt(1.6 * s)}" fill="#000" opacity="0.85" transform="translate(10 30)" filter="url(#soft)"/>
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(bw)}" height="${fmt(bh)}" rx="${fmt(1.6 * s)}" fill="#141415"/>
<path d="M${fmt(x)} ${fmt(y + bh * 0.55)}L${fmt(tx)} ${fmt(ty + th)}L${fmt(tx + tw)} ${fmt(ty + th)}L${fmt(x + bw)} ${fmt(y + bh * 0.55)}L${fmt(x + bw)} ${fmt(y + bh - 1.6 * s)}Q${fmt(x + bw)} ${fmt(y + bh)} ${fmt(x + bw - 1.6 * s)} ${fmt(y + bh)}L${fmt(x + 1.6 * s)} ${fmt(y + bh)}Q${fmt(x)} ${fmt(y + bh)} ${fmt(x)} ${fmt(y + bh - 1.6 * s)}Z" fill="#0e0e0f"/>
<path d="M${fmt(x + 1.6 * s)} ${fmt(y)}L${fmt(x + bw - 1.6 * s)} ${fmt(y)}L${fmt(tx + tw)} ${fmt(ty)}L${fmt(tx)} ${fmt(ty)}Z" fill="#202022"/>
<rect x="${fmt(tx)}" y="${fmt(ty)}" width="${fmt(tw)}" height="${fmt(th)}" rx="${fmt(2.2 * s)}" fill="url(#${id})"/>
<rect x="${fmt(tx)}" y="${fmt(ty)}" width="${fmt(tw)}" height="${fmt(th)}" rx="${fmt(2.2 * s)}" fill="none" stroke="#353537" stroke-width="2" opacity="0.7"/>
<rect x="${fmt(tx)}" y="${fmt(ty)}" width="${fmt(tw)}" height="${fmt(th)}" rx="${fmt(2.2 * s)}" filter="url(#weave)" opacity="0.08"/>
${legend}`;
}

function keycapScene(detail: boolean): string {
  const s = detail ? 52 : 19;
  const gap = 4 * s;
  const ws = [1.25, 1.25, 1].map((u) => u * 19.05 - 1.05);
  const total = ws.reduce((a, b) => a + b, 0) * s + 2 * gap;
  let x = (W - total) / 2;
  const cy = detail ? 900 : 1000;
  const out: string[] = [];
  const legendColor = "#a1a1a1";
  const glyphs = ["cmd", "opt", "J"] as const;
  if (detail) x -= (ws[0] + ws[1]) * s + 2 * gap - (W - ws[2] * s) / 2 + (W - total) / 2;
  for (const [i, g] of glyphs.entries()) {
    const bw = (ws[i] as number) * s;
    const cx = x + bw / 2;
    const ty = cy - 9 * s + 1.6 * s;
    const lcy = ty + 6.3 * s;
    let legend = "";
    if (g === "cmd") legend = `<path d="${command(cx, lcy, 5.4 * s)}" fill="none" stroke="${legendColor}" stroke-width="${fmt(0.6 * s)}" stroke-linejoin="round" opacity="0.92"/>`;
    else if (g === "opt") legend = `<path d="${option(cx, lcy, 5.6 * s)}" fill="none" stroke="${legendColor}" stroke-width="${fmt(0.6 * s)}" stroke-linecap="square" opacity="0.92"/>`;
    else {
      const capH = 4.6 * s;
      const size = capH / MONO_CAP_HEIGHT;
      legend = `<path d="${text(fonts.mono, "J", cx - measure(fonts.mono, "J", size) / 2, lcy + capH / 2, size)}" fill="${legendColor}" opacity="0.92"/>
<rect x="${fmt(cx - 2 * s)}" y="${fmt(ty + 10.4 * s)}" width="${fmt(4 * s)}" height="${fmt(0.55 * s)}" rx="${fmt(0.27 * s)}" fill="#2a2a2c"/>
<rect x="${fmt(cx - 2 * s)}" y="${fmt(ty + 10.4 * s)}" width="${fmt(4 * s)}" height="${fmt(0.25 * s)}" rx="${fmt(0.12 * s)}" fill="#3a3a3c"/>`;
    }
    out.push(keycap(cx, cy, [1.25, 1.25, 1][i] as number, s, legend));
    x += bw + gap;
  }
  return scene(out.join(""), SHEEN);
}

// ── Notebook ───────────────────────────────────────────────────────────────────

function notebookScene(view: "cover" | "open"): string {
  if (view === "cover") {
    const s = 6.2; // px per mm
    const w = 145 * s;
    const h = 210 * s;
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    const m = 22 * s;
    const body = `<g transform="rotate(-4 ${W / 2} ${H / 2})">
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(4 * s)}" fill="#000" opacity="0.85" transform="translate(16 40)" filter="url(#softer)"/>
<rect x="${fmt(x + w - 2)}" y="${fmt(y + 6)}" width="10" height="${fmt(h - 12)}" rx="4" fill="#d9d4c7"/>
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(4 * s)}" fill="#18181a"/>
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(4 * s)}" fill="url(#sheen)"/>
<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${fmt(4 * s)}" filter="url(#weave)" opacity="0.12"/>
<rect x="${fmt(x + 9 * s)}" y="${fmt(y)}" width="3" height="${fmt(h)}" fill="#0c0c0d" opacity="0.8"/>
<g filter="url(#deboss)"><path d="${mark(x + (w - m) / 2, y + 78 * s, m)}" fill="#141416"/></g>
<rect x="${fmt(x + w - 18 * s)}" y="${fmt(y - 2)}" width="${fmt(6 * s)}" height="${fmt(h + 4)}" fill="#0d0d0e"/>
<rect x="${fmt(x + w - 18 * s)}" y="${fmt(y - 2)}" width="2" height="${fmt(h + 4)}" fill="#2c2c2e" opacity="0.7"/>
<path d="M${fmt(x + 40 * s)} ${fmt(y + h)}C${fmt(x + 41 * s)} ${fmt(y + h + 22 * s)} ${fmt(x + 37 * s)} ${fmt(y + h + 36 * s)} ${fmt(x + 43 * s)} ${fmt(y + h + 50 * s)}" fill="none" stroke="#141414" stroke-width="${fmt(3.2 * s)}"/>
<path d="M${fmt(x + 46 * s)} ${fmt(y + h)}C${fmt(x + 48 * s)} ${fmt(y + h + 18 * s)} ${fmt(x + 52 * s)} ${fmt(y + h + 30 * s)} ${fmt(x + 50 * s)} ${fmt(y + h + 44 * s)}" fill="none" stroke="#101010" stroke-width="${fmt(3.2 * s)}"/>
</g>`;
    return scene(body, SHEEN);
  }
  // Open spread, dot grid at 5 mm.
  const s = 4.9;
  const pw = 140 * s;
  const ph = 205 * s;
  const cx = W / 2;
  const y = (H - ph) / 2;
  const dots: string[] = [];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? cx - pw : cx;
    for (let gx = 10; gx < 140; gx += 5) for (let gy = 10; gy < 200; gy += 5) dots.push(`M${fmt(x0 + gx * s)} ${fmt(y + gy * s)}h0.01`);
  }
  const page = (x0: number, curve: number): string => `<path d="M${fmt(x0)} ${fmt(y)}L${fmt(x0 + pw)} ${fmt(y)}L${fmt(x0 + pw)} ${fmt(y + ph)}L${fmt(x0)} ${fmt(y + ph)}Z" fill="#e7e2d6"/>
<rect x="${fmt(curve < 0 ? x0 + pw - 70 : x0)}" y="${fmt(y)}" width="70" height="${fmt(ph)}" fill="url(#gutter${curve < 0 ? "L" : "R"})"/>`;
  const defs = `${SHEEN}<linearGradient id="gutterL" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>
<linearGradient id="gutterR" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  const body = `<g transform="rotate(-2 ${W / 2} ${H / 2})">
<rect x="${fmt(cx - pw - 4 * s)}" y="${fmt(y - 4 * s)}" width="${fmt(2 * pw + 8 * s)}" height="${fmt(ph + 8 * s)}" rx="${fmt(4 * s)}" fill="#000" opacity="0.85" transform="translate(14 36)" filter="url(#softer)"/>
<rect x="${fmt(cx - pw - 4 * s)}" y="${fmt(y - 4 * s)}" width="${fmt(2 * pw + 8 * s)}" height="${fmt(ph + 8 * s)}" rx="${fmt(4 * s)}" fill="#18181a"/>
${page(cx - pw, -1)}${page(cx, 1)}
<path d="${dots.join("")}" stroke="#9a968c" stroke-width="3" stroke-linecap="round"/>
<rect x="${fmt(cx - pw)}" y="${fmt(y)}" width="${fmt(2 * pw)}" height="${fmt(ph)}" filter="url(#weave)" opacity="0.05"/>
<path d="M${fmt(cx)} ${fmt(y)}V${fmt(y + ph)}" stroke="#7d786d" stroke-width="2"/>
<path d="M${fmt(cx + 30 * s)} ${fmt(y - 4 * s)}L${fmt(cx + 30 * s)} ${fmt(y + ph * 0.7)}" stroke="#141414" stroke-width="${fmt(3 * s)}" opacity="0.95"/>
</g>`;
  return scene(body, defs);
}

// ── Render ─────────────────────────────────────────────────────────────────────

const SCENES: Record<string, Array<[string, () => string]>> = {
  "frame-tee": [
    ["frame-tee-1", () => teeScene("pair")],
    ["frame-tee-2", () => teeScene("back")],
    ["frame-tee-3", () => teeScene("front")],
    ["frame-tee-4", () => crop(teeScene("back"), W / 2, 470 + 7.3 * 36, 2.3)],
  ],
  hoodie: [
    ["hoodie-1", () => hoodieScene()],
    ["hoodie-2", () => crop(hoodieScene(), W / 2, 640 + 7.4 * 36, 4.2)],
  ],
  cap: [
    ["cap-1", () => capScene("front")],
    ["cap-2", () => capScene("back")],
  ],
  stickers: [
    ["stickers-1", () => stickerScene()],
    ["stickers-2", () => crop(stickerScene(), W / 2 - 30, 860, 1.6)],
  ],
  keycaps: [
    ["keycaps-1", () => keycapScene(false)],
    ["keycaps-2", () => keycapScene(true)],
  ],
  notebook: [
    ["notebook-1", () => notebookScene("cover")],
    ["notebook-2", () => notebookScene("open")],
  ],
};

const only = process.argv[2];
for (const [product, scenes] of Object.entries(SCENES)) {
  if (only && product !== only) continue;
  for (const [name, build] of scenes) {
    const master = await png(build(), W, H, 1);
    writeFileSync(join(MASTERS, `${name}.png`), master);
    for (const [w, bytes] of await webp(master, [600, 1200, W])) writeFileSync(w === W ? join(MASTERS, `${name}.webp`) : join(SITE, `${name}-${w}.webp`), bytes);
    console.log(`rendered ${name}`);
  }
}
await close();
void MARK_RATIO;
