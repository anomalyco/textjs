/**
 * The final collection's product photos, from the design round Adam picked (merch/options/README.md).
 * Each shot is a generated blank with the exact vector artwork composited on; embroidered ▼ marks go
 * through an image edit and an affine fit, and embroidered lettering is drawn as satin stitches on a
 * mesh that follows the cap's crown. Close-ups are enlargements of the same blanks (scripts/enlarge.ts),
 * so placements carry over exactly.
 *
 *   set -a; . ~/.config/textjs/openai.env; set +a   # only for blanks or edits not in photos/cache
 *   bun scripts/collection.ts [shot…]               # photos/final/, apps/web/src/merch/images/
 *   bun scripts/collection.ts --boards              # the contact sheet and the console.log tee previews (after rendering)
 *
 * The Keycap Set and Notebook keep their photos from scripts/shots.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { embroider as stitched } from "./cap-edit";
import { capMesh, CAP_FRONT_2, enlarged as enlargedCap } from "./capmesh";
import type { Layer, Point, Quad } from "./composite";
import { composite } from "./composite";
import { enlarge } from "./enlarge";
import { fonts, MARK_RATIO } from "./lib";
import {
  LAPTOP_PPI,
  studio,
  vinyl,
  embroider,
  embroideryPrompt,
  ink,
  lineArt,
  markArt,
  on,
  PAIR_FRONT,
  rect,
  refine,
  sizeIn,
  stackArt,
  blockMarkArt,
  TEE_BACK,
  TEE_FRONT,
  THREAD_WHITE,
  WHITE,
  wordmarkArt,
  type Garment,
} from "./options";
import { optionBasePath } from "./options-blanks";
import { basePath } from "./photos";
import { psaBlock, psaCard } from "./psa";
import { close, png, webp } from "./render";

const ROOT = join(import.meta.dir, "..");
const FINAL = join(ROOT, "photos", "final");
const CHECK = join(ROOT, "photos", "check");
const SITE = join(ROOT, "..", "apps", "web", "src", "merch", "images");
const W = 1024;
const H = 1280;
for (const d of [FINAL, CHECK, SITE]) mkdirSync(d, { recursive: true });

const crop = async (base: string, cropY: number, layers: Layer[]): Promise<Buffer> => composite({ base, layers, crop: [0, cropY, W, H] });
const scaleG = (g: Garment, ox: number, oy: number, k: number): Garment => ({ cx: (g.cx - ox) * k, seam: (g.seam - oy) * k, ppi: g.ppi * k });
const scaleQ = (q: Quad, ox: number, oy: number, k: number): Quad => q.map(([x, y]) => [(x - ox) * k, (y - oy) * k]) as Quad;
const optionPhoto = (item: string, label: string): string => join(ROOT, "options", item, `${label}.webp`);

// ── Enlargements (k = 2: a 512 × 768 crop of the blank becomes 1024 × 1536) ─────────────────────
const TEE_CHEST = { name: "tee-chest", x: 255, y: 420, k: 2, subject: "a black heavyweight cotton t-shirt laid flat" };
const TEE_SLEEVE_DOWN = { name: "tee-sleeve-down", x: 512, y: 420, k: 2, subject: "a black heavyweight cotton t-shirt laid flat with its sleeves angled down, its left sleeve" };
const TEE_NAPE = { name: "tee-nape", x: 255, y: 250, k: 2, subject: "the back of a black heavyweight cotton t-shirt laid flat, below the collar" };
const HOODIE_CHEST = { name: "hoodie-chest", x: 246, y: 420, k: 2, subject: "a black cotton fleece hoodie laid flat" };
export { capMarkQuad, CAP_CLOSE_SURFACE };
const CAP_CLOSE = { name: "cap-front", x: 190, y: 450, k: 2, subject: "a black unstructured cotton chino twill dad cap" };
const big = async (e: typeof TEE_CHEST, blank: string): Promise<string> => enlarge({ ...e, base: blank === "tee-front-sleeves-down" ? optionBasePath(blank) : basePath(blank) });

// ── Placements ──────────────────────────────────────────────────────────────────────────────────
// Hoodie: the flat-lay blank is drawn taller than a real 5161 (neck to hem reads 25 in at 28 px/in while the
// chest reads 24 in at 22 px/in), so artwork is sized at 22 px/in and moved down the body at 28 px/in.
const HOODIE: Garment = { cx: 502, seam: 512, ppi: 22 };
const HOODIE_V = 28;
function onHoodie(svg: string, topIn: number, g: Garment = HOODIE, ppiV = HOODIE_V): Quad {
  const [w, h] = sizeIn(svg);
  return rect(g.cx, g.seam + topIn * ppiV + (h * g.ppi) / 2, w * g.ppi, h * g.ppi);
}
const HOODIE_TOP = 3.5;
const HOODIE_MARK: Quad = onHoodie(markArt(3.5), HOODIE_TOP);

// console.log tee: the ▼ on the left sleeve (the viewer's right in a front flat lay). The tee is laid flat with
// its sleeves folded down (tee-front-sleeves-down, an edit of tee-front), so the sleeve hangs about 14.5° from
// vertical, as on a body, and the ▼ reads pointing down. With the sleeves out at 40° it read as ▲.
// Measured on tee-front-sleeves-down: the neck seam is at (513, 495); the sleeve's hem midpoint is at (820, 752)
// and its axis runs (0.25, 0.968). The ▼ sits 2.2 in up the sleeve from the hem edge, turned with the axis.
const TEE_SLEEVES_DOWN: Garment = { cx: 513, seam: 495, ppi: 25.7 };
const SLEEVE_AXIS: Point = [0.25, 0.968];
const SLEEVE_MARK_IN = 1.25;
const sleeveQuad = (): Quad => {
  const d = 2.2 * TEE_SLEEVES_DOWN.ppi;
  const c: Point = [820 - SLEEVE_AXIS[0] * d, 752 - SLEEVE_AXIS[1] * d];
  return rect(c[0], c[1], SLEEVE_MARK_IN * TEE_SLEEVES_DOWN.ppi, SLEEVE_MARK_IN * MARK_RATIO * TEE_SLEEVES_DOWN.ppi, -14.5);
};
// Option (b): a ▼ on the upper back, top 1 in below the back neck seam.
const NAPE_MARK_IN = 1.25;

// Tee chest artwork, shared by the flat lay and the close-up.
const logoArt = (): string => wordmarkArt(8);
const blockArt = (): string => blockMarkArt(4.5);
const stack = (): string => stackArt(10);
const stackQuad = (g: Garment): Quad => {
  const a = stack();
  const [w] = sizeIn(a);
  return on(g, a, 3, -6 + w / 2);
};

// ── Cap lettering ───────────────────────────────────────────────────────────────────────────────
const capArt = (): string => lineArt(fonts.monoBold, [["console.log", THREAD_WHITE]], 3.4);
function capLettering(surface = CAP_FRONT_2, cols = 48, rows = 8, spacing = 1.3, radius = 3.5, stitchPx = 1.4, relief = 0.9): Layer {
  const a = capArt();
  const [w, h] = sizeIn(a);
  const mesh = capMesh(surface, w, h, 0.85, cols, rows);
  const P = mesh.points;
  const quad: Quad = [P[0]!, P[cols]!, P[rows * (cols + 1) + cols]!, P[rows * (cols + 1)]!];
  return embroider(a, quad, THREAD_WHITE, stitchPx, relief, { mesh, satin: { spacing, radius } });
}

/** The cap close-up (an enlargement of cap-front-2), with its centre seam re-measured on the enlargement. */
const CAP_CLOSE_SURFACE = {
  ...enlargedCap(CAP_FRONT_2, 190, 450, 2),
  seamLine: [[436, 792], [445, 740], [455, 700], [468, 640], [478, 600], [490, 540], [507, 480], [523, 420], [535, 380], [550, 340], [563, 300]] as Point[],
};

/**
 * The ▼ on the cap, from the tech pack: 1.6 × 1.4 in, apex 0.6 in above the brim, symmetric about the centre
 * front seam. Its corners are placed on the crown's surface (the left half, on the panel turning away,
 * foreshortens), and the quad is the parallelogram whose top edge and bottom midpoint hit them.
 */
function capMarkQuad(surface = CAP_FRONT_2): Quad {
  const { points: p } = capMesh(surface, 1.6, 1.4, 0.6, 2, 1, "seam");
  const tl = p[0]!, tr = p[2]!, apex = p[4]!;
  const half: Point = [(tr[0] - tl[0]) / 2, (tr[1] - tl[1]) / 2];
  return [tl, tr, [apex[0] + half[0], apex[1] + half[1]], [apex[0] - half[0], apex[1] - half[1]]];
}

// ── Embroidered ▼ edits, fitted back onto the exact mark ────────────────────────────────────────
const WHITE_FLAT = "#e9e9e6";
/** Where each edit drew the ▼ (top-left, top-right, apex), measured with scripts/grid.ts. */
const DRAWN: Record<string, [Point, Point, Point]> = {
  "hoodie-mark": [[465, 609], [541, 609], [503, 676]],
  "hoodie-mark-close": [[432, 380], [588, 380], [511, 515]],
  "cap-mark": [[376, 668], [517, 680], [420, 797]],
  "cap-mark-close-seam": [[384, 426], [667, 453], [460, 689]],
};
const fitted = (key: string, quad: Quad, feather: number): Layer[] => {
  const src = DRAWN[key];
  return src && src[1][0] > 0 ? [{ svg: "", quad, mode: "fit", src, dst: [quad[0], quad[1], [(quad[2][0] + quad[3][0]) / 2, (quad[2][1] + quad[3][1]) / 2]], feather }] : [];
};
const hoodieEdit = (base: string, quad: Quad, name: string): Promise<string> =>
  refine(name, base, quad, WHITE_FLAT, embroideryPrompt("black heavyweight cotton fleece hoodie", "white", "It points straight down."));
const capEdit = (base: string, quad: Quad, name: string): Promise<string> =>
  refine(name, base, quad, WHITE_FLAT, embroideryPrompt("black cotton chino twill cap", "white", "Its top edge follows the brim seam and its point follows the cap's front center seam, so it leans slightly with the cap."));

// ── Shots ───────────────────────────────────────────────────────────────────────────────────────
export interface Shot {
  name: string;
  render: () => Promise<Buffer>;
}

export const SHOTS: Shot[] = [
  // 001 Logo Tee
  { name: "logo-tee-1", render: async () => crop(basePath("tee-front"), 130, [ink(logoArt(), on(TEE_FRONT, logoArt(), 3))]) },
  {
    name: "logo-tee-2",
    render: async () => {
      const g = scaleG(TEE_FRONT, TEE_CHEST.x, TEE_CHEST.y, 2);
      return crop(await big(TEE_CHEST, "tee-front"), 40, [ink(logoArt(), on(g, logoArt(), 3), { displace: 1.2, texture: 0.6 })]);
    },
  },
  { name: "logo-tee-3", render: async () => crop(basePath("tee-pair"), 120, [ink(wordmarkArt(8), on(PAIR_FRONT, wordmarkArt(8), 3))]) },
  // 002 Block Tee
  { name: "block-tee-1", render: async () => crop(basePath("tee-front"), 130, [ink(blockArt(), on(TEE_FRONT, blockArt(), 3))]) },
  {
    name: "block-tee-2",
    render: async () => {
      const g = scaleG(TEE_FRONT, TEE_CHEST.x, TEE_CHEST.y, 2);
      return crop(await big(TEE_CHEST, "tee-front"), 40, [ink(blockArt(), on(g, blockArt(), 3), { displace: 1.2, texture: 0.6 })]);
    },
  },
  // 003 console.log Tee: two-line Geist on the chest, ▼ on the left sleeve
  {
    name: "console-tee-1",
    render: async () => crop(optionBasePath("tee-front-sleeves-down"), 130, [ink(stack(), stackQuad(TEE_SLEEVES_DOWN)), ink(markArt(SLEEVE_MARK_IN), sleeveQuad())]),
  },
  {
    name: "console-tee-2",
    render: async () => {
      const g = scaleG(TEE_FRONT, TEE_CHEST.x, TEE_CHEST.y, 2);
      return crop(await big(TEE_CHEST, "tee-front"), 40, [ink(stack(), stackQuad(g), { displace: 1.2, texture: 0.6 })]);
    },
  },
  {
    name: "console-tee-3",
    render: async () => {
      const q = scaleQ(sleeveQuad(), TEE_SLEEVE_DOWN.x, TEE_SLEEVE_DOWN.y, 2);
      return crop(await big(TEE_SLEEVE_DOWN, "tee-front-sleeves-down"), 150, [ink(markArt(SLEEVE_MARK_IN), q, { displace: 1.2, texture: 0.6 })]);
    },
  },
  // 004 console.log Hoodie
  { name: "console-hoodie-1", render: async () => crop(basePath("hoodie-flat"), 120, [ink(lineArt(fonts.monoMedium, [["console.log", WHITE]], 9), onHoodie(lineArt(fonts.monoMedium, [["console.log", WHITE]], 9), HOODIE_TOP), { texture: 0.7, displace: 0.8 })]) },
  {
    name: "console-hoodie-2",
    render: async () => {
      const a = lineArt(fonts.monoMedium, [["console.log", WHITE]], 9);
      const q = scaleQ(onHoodie(a, HOODIE_TOP), HOODIE_CHEST.x, HOODIE_CHEST.y, 2);
      return crop(await big(HOODIE_CHEST, "hoodie-flat"), 60, [ink(a, q, { texture: 0.8, displace: 1.2 })]);
    },
  },
  // 005 ▼ Hoodie
  {
    name: "mark-hoodie-1",
    render: async () => crop(await hoodieEdit(basePath("hoodie-flat"), HOODIE_MARK, "hoodie-mark"), 120, fitted("hoodie-mark", HOODIE_MARK, 4)),
  },
  {
    name: "mark-hoodie-2",
    render: async () => {
      const q = scaleQ(HOODIE_MARK, HOODIE_CHEST.x, HOODIE_CHEST.y, 2);
      return crop(await hoodieEdit(await big(HOODIE_CHEST, "hoodie-flat"), q, "hoodie-mark-close"), 60, fitted("hoodie-mark-close", q, 8));
    },
  },
  // 006 console.log Cap
  // The lettering is mapped onto the crown, stitched by an image edit and corrected back onto the exact type (scripts/cap-edit.ts).
  {
    name: "console-cap-1",
    render: async () => crop(await stitched({ name: "front", base: basePath("cap-front-2"), layer: capLettering(), detail: "product" }), 140, []),
  },
  {
    name: "console-cap-2",
    render: async () => {
      const layer = capLettering(CAP_CLOSE_SURFACE, 64, 10, 2.4, 7, 2.6, 1.8);
      return crop(await stitched({ name: "close", base: await big(CAP_CLOSE, "cap-front-2"), layer, detail: "close-up" }), 128, []);
    },
  },
  { name: "console-cap-3", render: async () => crop(basePath("cap-back"), 170, []) },
  // 007 ▼ Cap: centred on the centre front seam (capMarkQuad), stitched by an edit and fitted back onto the exact ▼.
  {
    name: "mark-cap-1",
    render: async () => {
      const q = capMarkQuad();
      return crop(await capEdit(basePath("cap-front-2"), q, "cap-mark"), 140, fitted("cap-mark", q, 6));
    },
  },
  {
    name: "mark-cap-2",
    render: async () => {
      const q = capMarkQuad(CAP_CLOSE_SURFACE);
      return crop(await capEdit(await big(CAP_CLOSE, "cap-front-2"), q, "cap-mark-close-seam"), 128, fitted("cap-mark-close-seam", q, 10));
    },
  },
  { name: "mark-cap-3", render: async () => crop(basePath("cap-back"), 170, []) },
  // 008–012 Stickers: the design round's photo and studio render for each
  ...(
    [
      ["sticker-mark", "A"],
      ["sticker-wordmark", "B"],
      ["sticker-console", "C"],
      ["sticker-keys", "D"],
      ["sticker-percent-c", "E"],
    ] as const
  ).flatMap(([slug, label]) => [
    { name: `${slug}-1`, render: async () => pngOf(optionPhoto("stickers", label)) },
    { name: `${slug}-2`, render: async () => pngOf(join(ROOT, "options", "stickers", `${label}-render.webp`)) },
  ]),
  // PSA Tee: the ad's layout at 11 in on the chest (scripts/psa.ts), ▼ Text.js 3 in below the back collar.
  { name: "psa-tee-1", render: async () => crop(basePath("tee-front"), 130, [ink(display(psaBlock(11)), on(TEE_FRONT, psaBlock(11), 3), { texture: 0.6 })]) },
  { name: "psa-tee-2", render: async () => crop(basePath("tee-back"), 130, [ink(display(wordmarkArt(3, "#ffffff")), on(TEE_BACK, wordmarkArt(3, "#ffffff"), 2), { texture: 0.6 })]) },
  {
    name: "psa-tee-3",
    render: async () => {
      const g = scaleG(TEE_FRONT, TEE_CHEST.x, TEE_CHEST.y, 2);
      return crop(await big(TEE_CHEST, "tee-front"), 40, [ink(display(psaBlock(11)), on(g, psaBlock(11), 3), { displace: 1.2, texture: 0.7 })]);
    },
  },
  // PSA Sticker: 4 × 2.25 in, on a laptop lid and as a studio render.
  {
    name: "psa-sticker-1",
    render: async () => {
      const card = psaCard(4);
      const [w, h] = sizeIn(card);
      return crop(optionBasePath("sticker-laptop-close"), 200, [vinyl(card, rect(540, 780, w * LAPTOP_PPI, h * LAPTOP_PPI, -6), { shadow: { dx: 2, dy: 4, blur: 5, opacity: 0.5 } })]);
    },
  },
  { name: "psa-sticker-2", render: async () => studio(psaCard(4), 760, -4) },
];

/** White print artwork as it reads on black cotton. */
const display = (svg: string): string => svg.replace(/#ffffff/g, WHITE);

/** The console.log tee's back option (b), shown on the board only. */
export const NAPE_SHOTS: Shot[] = [
  {
    name: "console-tee-back",
    render: async () => crop(basePath("tee-back"), 130, [ink(markArt(NAPE_MARK_IN), on(TEE_BACK, markArt(NAPE_MARK_IN), 1))]),
  },
  {
    name: "console-tee-back-close",
    render: async () => {
      const g = scaleG(TEE_BACK, TEE_NAPE.x, TEE_NAPE.y, 2);
      return crop(await big(TEE_NAPE, "tee-back"), 40, [ink(markArt(NAPE_MARK_IN), on(g, markArt(NAPE_MARK_IN), 1), { displace: 1.2, texture: 0.6 })]);
    },
  },
];

async function pngOf(file: string): Promise<Buffer> {
  const type = file.endsWith(".webp") ? "webp" : "png";
  return png(`<!doctype html><style>html,body{margin:0;background:#000}img{display:block;width:${W}px;height:${H}px}</style><img src="data:image/${type};base64,${readFileSync(file).toString("base64")}">`, W, H, 1);
}

async function write(shot: Shot, site: boolean): Promise<void> {
  const bytes = await shot.render();
  writeFileSync(join(CHECK, `${shot.name}.png`), bytes);
  const sizes = await webp(bytes, [600, W], 0.9);
  writeFileSync(join(FINAL, `${shot.name}.webp`), sizes.get(W) as Buffer);
  if (site) for (const [w, b] of sizes) writeFileSync(join(SITE, `${shot.name}-${w}.webp`), b);
  console.log(`rendered ${shot.name}`);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const only = args.filter((a) => !a.startsWith("--"));
  if (args.includes("--boards")) {
    const { boards } = await import("./collection-boards");
    await boards();
  } else {
    for (const s of SHOTS) if (!only.length || only.some((o) => s.name.startsWith(o))) await write(s, true);
    for (const s of NAPE_SHOTS) if (!only.length || only.some((o) => s.name.startsWith(o))) await write(s, false);
    try {
      const { encodeSiteImages } = await import("./encode-site-images");
      encodeSiteImages(only);
    } catch {
      // Keeps canvas-encoded fallback if neither cwebp nor ffmpeg+libwebp is installed locally.
    }
  }
  await close();
}
