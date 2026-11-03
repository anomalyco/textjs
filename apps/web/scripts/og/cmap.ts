/**
 * The characters a WOFF2 font maps to a glyph, read from its `cmap` table. Lets tests check a locale's share-card
 * text against the bundled fonts without launching a browser.
 */

import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

/** WOFF2's known-table index (the spec's table of 63 tags); 63 means a tag follows. */
const TAGS = "cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill".split(" ").filter(Boolean);

export function woff2Cmap(file: string): Set<number> {
  const buf = readFileSync(file);
  if (buf.toString("latin1", 0, 4) !== "wOF2") throw new Error(`${file}: not a WOFF2 font`);
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  let at = 48;
  const base128 = (): number => {
    let n = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[at++] as number;
      n = n * 128 + (b & 0x7f);
      if (!(b & 0x80)) return n;
    }
    throw new Error(`${file}: bad UIntBase128`);
  };
  let offset = 0;
  let cmap: { offset: number; length: number } | null = null;
  for (let i = 0; i < numTables; i++) {
    const flags = buf[at++] as number;
    const index = flags & 0x3f;
    const tag = index === 63 ? buf.toString("latin1", at, (at += 4)) : (TAGS[index] ?? "");
    const version = flags >> 6;
    const length = base128();
    // glyf and loca are transformed unless version 3; hmtx only with version 1; every other table never.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : tag === "hmtx" ? version === 1 : false;
    const stored = transformed ? base128() : length;
    if (tag === "cmap") cmap = { offset, length: stored };
    offset += stored;
  }
  if (!cmap) throw new Error(`${file}: no cmap table`);
  const data = brotliDecompressSync(buf.subarray(at, at + compressedSize));
  return parseCmap(data.subarray(cmap.offset, cmap.offset + cmap.length));
}

function parseCmap(t: Buffer): Set<number> {
  const out = new Set<number>();
  const count = t.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const platform = t.readUInt16BE(4 + i * 8);
    const encoding = t.readUInt16BE(6 + i * 8);
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    const sub = t.subarray(t.readUInt32BE(8 + i * 8));
    const format = sub.readUInt16BE(0);
    if (format === 4) {
      const segs = sub.readUInt16BE(6) / 2;
      const end = 14;
      const start = end + segs * 2 + 2;
      const delta = start + segs * 2;
      const range = delta + segs * 2;
      for (let s = 0; s < segs; s++) {
        const lo = sub.readUInt16BE(start + s * 2);
        const hi = sub.readUInt16BE(end + s * 2);
        const d = sub.readUInt16BE(delta + s * 2);
        const ro = sub.readUInt16BE(range + s * 2);
        for (let c = lo; c <= hi && c !== 0xffff; c++) {
          let glyph: number;
          if (ro === 0) glyph = (c + d) & 0xffff;
          else {
            const g = sub.readUInt16BE(range + s * 2 + ro + (c - lo) * 2);
            glyph = g === 0 ? 0 : (g + d) & 0xffff;
          }
          if (glyph) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = sub.readUInt32BE(12);
      for (let g = 0; g < groups; g++) {
        const lo = sub.readUInt32BE(16 + g * 12);
        const hi = sub.readUInt32BE(20 + g * 12);
        const first = sub.readUInt32BE(24 + g * 12);
        for (let c = lo; c <= hi; c++) if (first + (c - lo)) out.add(c);
      }
    }
  }
  return out;
}
