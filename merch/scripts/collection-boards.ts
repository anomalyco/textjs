/**
 * Boards for review: the final collection on one sheet, and the console.log tee's two mark positions.
 * Run through `bun scripts/collection.ts --boards` after the photos are rendered.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { png } from "./render";

const ROOT = join(import.meta.dir, "..");
const FINAL = join(ROOT, "photos", "final");
const OPTIONS = join(ROOT, "options");

const font = (file: string): string => `data:font/woff2;base64,${readFileSync(join(ROOT, "node_modules/geist/dist/fonts", file)).toString("base64")}`;
const img = (name: string): string => `<img src="data:image/webp;base64,${readFileSync(join(FINAL, `${name}.webp`)).toString("base64")}">`;
const STYLE = `
  @font-face{font-family:G;src:url(${font("geist-sans/Geist-Medium.woff2")})}
  @font-face{font-family:GS;src:url(${font("geist-sans/Geist-SemiBold.woff2")})}
  @font-face{font-family:GM;src:url(${font("geist-mono/GeistMono-Regular.woff2")})}
  html,body{margin:0;background:#0a0a0a;color:#ededed;font-family:G}
  header{padding:44px 40px 0}
  h1{font:600 44px GS;margin:0;letter-spacing:-0.02em}
  header p{margin:10px 0 0;color:#8f8f8f;font-size:22px}
  figure{margin:0;position:relative}
  figure img{display:block;width:100%;border-radius:6px}
  .num{font:22px GM;color:#8f8f8f}
  .name{font:600 26px GS;margin-top:4px}
  .sub{font-size:20px;color:#a1a1a1;margin-top:4px;line-height:1.35}
  .flag{position:absolute;top:14px;left:14px;background:#ededed;color:#0a0a0a;font:600 18px GS;padding:6px 10px;border-radius:999px}
`;

interface Tile {
  num: string;
  name: string;
  photo: string;
  sub: string;
  flag?: string;
}

const TILES: Tile[] = [
  { num: "001", name: "Logo Tee", photo: "logo-tee-1", sub: "AS Colour 5082 · DTG · ▼ Text.js 8 in" },
  { num: "002", name: "Block Tee", photo: "block-tee-1", sub: "AS Colour 5082 · DTG · block ▼ 4.5 in" },
  { num: "003", name: "console.log Tee", photo: "console-tee-1", sub: "AS Colour 5082 · DTG · chest 10 in, ▼ on left sleeve" },
  { num: "004", name: "console.log Hoodie", photo: "console-hoodie-1", sub: "AS Colour 5161 · DTG · 9 in, 3.5 in below the neck" },
  { num: "005", name: "▼ Hoodie", photo: "mark-hoodie-1", sub: "AS Colour 5161 · embroidered · ▼ 3.5 in" },
  { num: "006", name: "console.log Cap", photo: "console-cap-1", sub: "Yupoong 6245CM · embroidered · 3.4 in" },
  { num: "007", name: "▼ Cap", photo: "mark-cap-1", sub: "Yupoong 6245CM · embroidered · ▼ 1.6 in" },
  { num: "008", name: "▼ Sticker", photo: "sticker-mark-1", sub: "Die-cut · 3 in" },
  { num: "009", name: "Wordmark Sticker", photo: "sticker-wordmark-1", sub: "Die-cut · 3 in" },
  { num: "010", name: "console.log Sticker", photo: "sticker-console-1", sub: "Die-cut · 3 in" },
  { num: "011", name: "⌘⌥J Sticker", photo: "sticker-keys-1", sub: "Die-cut · 3 in" },
  { num: "012", name: "%c Sticker", photo: "sticker-percent-c-1", sub: "Die-cut · 2 in" },
  { num: "013", name: "PSA Tee", photo: "psa-tee-1", sub: "AS Colour 5082 · DTG · 11 in front, ▼ Text.js back" },
  { num: "014", name: "PSA Sticker", photo: "psa-sticker-1", sub: "Die-cut · 4 × 2.25 in" },
  { num: "015", name: "Keycap Set", photo: "keycaps-1", sub: "Not on Fourthwall at a sensible minimum: separate maker, self-fulfilled", flag: "Later" },
  { num: "016", name: "Notebook", photo: "notebook-1", sub: "Not on Fourthwall: Leuchtturm1917 deboss (min. 50), self-fulfilled", flag: "Later" },
];

export async function boards(): Promise<void> {
  // ── The final collection ──
  const cols = 4;
  const cell = 440;
  const gap = 32;
  const rows = Math.ceil(TILES.length / cols);
  const width = cols * cell + (cols + 1) * gap;
  const height = 150 + rows * (cell * 1.25 + 160) + 60;
  const sheet = `<!doctype html><style>${STYLE}main{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:${gap}px;padding:36px ${gap}px}</style>
    <header><h1>Text.js merch: final collection</h1><p>001–014 made on demand by Fourthwall (first drop). 015–016 later, from separate makers.</p></header>
    <main>${TILES.map((t) => `<figure>${img(t.photo)}${t.flag ? `<span class="flag">${t.flag}</span>` : ""}<div class="num" style="margin-top:14px">${t.num}</div><div class="name">${t.name}</div><div class="sub">${t.sub}</div></figure>`).join("")}</main>`;
  writeFileSync(join(OPTIONS, "final-collection.png"), await png(sheet, width, Math.round(height), 1));
  console.log("wrote options/final-collection.png");

  // ── console.log tee: sleeve (store default) vs upper back ──
  const pw = 520;
  const side = `<!doctype html><style>${STYLE}
      main{display:grid;grid-template-columns:repeat(2,${pw * 2 + 16}px);gap:56px;padding:36px 40px}
      .pair{display:grid;grid-template-columns:repeat(2,${pw}px);gap:16px}
      h2{font:600 30px GS;margin:0 0 6px}
      .sub{margin:0 0 18px;min-height:54px}
    </style>
    <header><h1>console.log Tee: where the ▼ goes</h1><p>Same front in both. A is in the store; B is the alternative.</p></header>
    <main>
      <section><h2>A · Left sleeve, 1.25 in (store default)</h2><p class="sub">Fourthwall's Left Sleeve region. The ▼ points down the arm; the tee is laid flat with its sleeves folded down, as worn.</p>
        <div class="pair"><figure>${img("console-tee-1")}</figure><figure>${img("console-tee-3")}</figure></div></section>
      <section><h2>B · Upper back, 1.25 in</h2><p class="sub">Back Large region, centered, top edge 1 in below the back neck seam.</p>
        <div class="pair"><figure>${img("console-tee-back")}</figure><figure>${img("console-tee-back-close")}</figure></div></section>
    </main>`;
  writeFileSync(join(OPTIONS, "console-tee-sleeve-vs-back.png"), await png(side, 2 * (pw * 2 + 16) + 56 + 80, 150 + 120 + pw * 1.25 + 60, 1));
  console.log("wrote options/console-tee-sleeve-vs-back.png");

  // ── The cap close-up at full size ──
  writeFileSync(join(OPTIONS, "console-cap-closeup.png"), readFileSync(join(ROOT, "photos", "check", "console-cap-2.png")));
  console.log("wrote options/console-cap-closeup.png");
}
