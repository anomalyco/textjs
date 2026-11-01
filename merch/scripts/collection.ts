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
import { capMesh, CAP_FRONT_2, enlarged as enlargedCap } from "./capmesh";
import type { Layer, Point, Quad } from "./composite";
import { composite } from "./composite";
import { enlarge } from "./enlarge";
import { fonts, MARK_RATIO } from "./lib";
import {
  CAP_MARK,
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
import { basePath } from "./photos";
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
const TEE_SLEEVE = { name: "tee-sleeve", x: 512, y: 380, k: 2, subject: "a black heavyweight cotton t-shirt laid flat, its left sleeve" };
const TEE_NAPE = { name: "tee-nape", x: 255, y: 250, k: 2, subject: "the back of a black heavyweight cotton t-shirt laid flat, below the collar" };
const HOODIE_CHEST = { name: "hoodie-chest", x: 246, y: 420, k: 2, subject: "a black cotton fleece hoodie laid flat" };
const CAP_CLOSE = { name: "cap-front", x: 190, y: 450, k: 2, subject: "a black unstructured cotton chino twill dad cap" };
const big = async (e: typeof TEE_CHEST, blank: string): Promise<string> => enlarge({ ...e, base: basePath(blank) });

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

// console.log tee: the ▼ on the left sleeve (the viewer's right in a front flat lay). Measured on tee-front:
// the sleeve runs out at 38.7° and its hem's midpoint is at (905, 710); the ▼ sits 2.4 in in from the hem edge
// (1 in above the 0.9 in hem band), turned so it points down the arm.
const SLEEVE_AXIS: Point = [0.78, 0.62];
const SLEEVE_MARK_IN = 1.25;
const sleeveQuad = (): Quad => {
  const d = 2.4 * TEE_FRONT.ppi;
  const c: Point = [905 - SLEEVE_AXIS[0] * d, 710 - SLEEVE_AXIS[1] * d];
  return rect(c[0], c[1], SLEEVE_MARK_IN * TEE_FRONT.ppi, SLEEVE_MARK_IN * MARK_RATIO * TEE_FRONT.ppi, -51.5);
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

// ── Embroidered ▼ edits, fitted back onto the exact mark ────────────────────────────────────────
const WHITE_FLAT = "#e9e9e6";
/** Where each edit drew the ▼ (top-left, top-right, apex), measured with scripts/grid.ts. */
const DRAWN: Record<string, [Point, Point, Point]> = {
  "hoodie-mark": [[465, 609], [541, 609], [503, 676]],
  "hoodie-mark-close": [[432, 380], [588, 380], [511, 515]],
  "cap-mark-close": [[393, 373], [708, 408], [517, 660]],
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
  { name: "console-tee-1", render: async () => crop(basePath("tee-front"), 130, [ink(stack(), stackQuad(TEE_FRONT)), ink(markArt(SLEEVE_MARK_IN), sleeveQuad())]) },
  {
    name: "console-tee-2",
    render: async () => {
      const g = scaleG(TEE_FRONT, TEE_CHEST.x, TEE_CHEST.y, 2);
      return crop(await big(TEE_CHEST, "tee-front"), 40, [ink(stack(), stackQuad(g), { displace: 1.2, texture: 0.6 })]);
    },
  },
  {
    // The sleeve close-up is turned so the sleeve hangs straight down, as it does when worn: in the flat lay the
    // sleeve runs out at 38.5°, and a ▼ turned that far reads as ▲.
    name: "console-tee-3",
    render: async () => {
      const q = scaleQ(sleeveQuad(), TEE_SLEEVE.x, TEE_SLEEVE.y, 2);
      const full = await composite({ base: await big(TEE_SLEEVE, "tee-front"), layers: [ink(markArt(SLEEVE_MARK_IN), q, { displace: 1.2, texture: 0.6 })] });
      const c: Point = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
      return turned(full, c, 51.5, 500, 0.62);
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
  { name: "console-cap-1", render: async () => crop(basePath("cap-front-2"), 140, [capLettering()]) },
  {
    name: "console-cap-2",
    render: async () => crop(await big(CAP_CLOSE, "cap-front-2"), 128, [capLettering(enlargedCap(CAP_FRONT_2, CAP_CLOSE.x, CAP_CLOSE.y, 2), 64, 10, 2.4, 7, 2.6, 1.8)]),
  },
  { name: "console-cap-3", render: async () => crop(basePath("cap-back"), 170, []) },
  // 007 ▼ Cap (the design-round edit, option B)
  { name: "mark-cap-1", render: async () => pngOf(optionPhoto("cap", "B")) },
  {
    name: "mark-cap-2",
    render: async () => {
      const q = scaleQ(CAP_MARK, CAP_CLOSE.x, CAP_CLOSE.y, 2);
      return crop(await capEdit(await big(CAP_CLOSE, "cap-front-2"), q, "cap-mark-close"), 128, fitted("cap-mark-close", q, 10));
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
];

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

/**
 * A 4:5 window `ww` wide, turned `deg` degrees about `c` (which lands at the window's horizontal centre and
 * `ay` of its height), scaled up to 1024 × 1280.
 */
async function turned(bytes: Buffer, c: Point, deg: number, ww: number, ay: number): Promise<Buffer> {
  const k = W / ww;
  const html = `<!doctype html><style>html,body{margin:0;overflow:hidden;background:#000}canvas{display:block}</style><canvas id="c" width="${W}" height="${H}"></canvas><script>
    const img = new Image();
    img.onload = () => {
      const x = document.getElementById("c").getContext("2d");
      x.imageSmoothingQuality = "high";
      x.translate(${W / 2}, ${H * ay});
      x.scale(${k}, ${k});
      x.rotate(${(deg * Math.PI) / 180});
      x.translate(${-c[0]}, ${-c[1]});
      x.drawImage(img, 0, 0);
    };
    img.src = "data:image/png;base64,${bytes.toString("base64")}";
  </script>`;
  return png(html, W, H, 1);
}

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
  }
  await close();
}
