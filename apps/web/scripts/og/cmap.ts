/**
 * The characters a WOFF2 font maps to a glyph (its `cmap` table) and the joining forms its GSUB table gives them.
 * Lets tests check a locale's share-card text against the bundled fonts without launching a browser.
 */

import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

/** WOFF2's known-table index (the spec's table of 63 tags); 63 means a tag follows. */
const TAGS = "cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill".split(" ").filter(Boolean);

/** The font's tables by tag, decompressed (glyf, loca and hmtx may be in WOFF2's transformed form). */
function woff2Tables(file: string): Map<string, Buffer> {
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
  const entries: { tag: string; offset: number; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[at++] as number;
    const index = flags & 0x3f;
    const tag = index === 63 ? buf.toString("latin1", at, (at += 4)) : (TAGS[index] ?? "");
    const version = flags >> 6;
    const length = base128();
    // glyf and loca are transformed unless version 3; hmtx only with version 1; every other table never.
    const transformed = tag === "glyf" || tag === "loca" ? version !== 3 : tag === "hmtx" ? version === 1 : false;
    const stored = transformed ? base128() : length;
    entries.push({ tag, offset, length: stored });
    offset += stored;
  }
  const data = brotliDecompressSync(buf.subarray(at, at + compressedSize));
  return new Map(entries.map((e) => [e.tag, data.subarray(e.offset, e.offset + e.length)]));
}

function table(file: string, tag: string): Buffer {
  const t = woff2Tables(file).get(tag);
  if (!t) throw new Error(`${file}: no ${tag} table`);
  return t;
}

export function woff2Cmap(file: string): Set<number> {
  return new Set(cmapGlyphs(table(file, "cmap")).keys());
}

/**
 * Glyphs reachable through each of the given GSUB features (Arabic `init`, `medi`, `fina`), as the set of input glyphs
 * their single or multiple substitutions cover, by code point: `fina` → the characters that have a final form. Lets a test check
 * that a subset kept the joining forms of every letter it draws, without shaping text in a browser.
 */
export function woff2Forms(file: string, features: readonly string[]): Map<string, Set<number>> {
  const tables = woff2Tables(file);
  const cmap = tables.get("cmap");
  const gsub = tables.get("GSUB");
  const out = new Map(features.map((f) => [f, new Set<number>()]));
  if (!cmap || !gsub) return out;
  const featureList = gsub.readUInt16BE(6);
  const lookupList = gsub.readUInt16BE(8);
  /** Each single (1) or multiple (2) substitution subtable of a lookup: input glyph → first output glyph. */
  const substitutions = (index: number): Map<number, number> => {
    const map = new Map<number, number>();
    const lookup = lookupList + gsub.readUInt16BE(lookupList + 2 + index * 2);
    const lookupType = gsub.readUInt16BE(lookup);
    const count = gsub.readUInt16BE(lookup + 4);
    for (let i = 0; i < count; i++) {
      let sub = lookup + gsub.readUInt16BE(lookup + 6 + i * 2);
      let type = lookupType;
      // Extension substitution (type 7) points at the real subtable.
      if (type === 7) {
        type = gsub.readUInt16BE(sub + 2);
        sub += gsub.readUInt32BE(sub + 4);
      }
      if (type !== 1 && type !== 2) continue;
      const format = gsub.readUInt16BE(sub);
      coverage(gsub, sub + gsub.readUInt16BE(sub + 2)).forEach((g, k) => {
        if (type === 1) map.set(g, format === 1 ? (g + gsub.readInt16BE(sub + 4)) & 0xffff : gsub.readUInt16BE(sub + 6 + k * 2));
        else map.set(g, gsub.readUInt16BE(sub + gsub.readUInt16BE(sub + 6 + k * 2) + 2));
      });
    }
    return map;
  };
  const byFeature = new Map<string, Map<number, number>>();
  const featureCount = gsub.readUInt16BE(featureList);
  for (let i = 0; i < featureCount; i++) {
    const tag = gsub.toString("latin1", featureList + 2 + i * 6, featureList + 6 + i * 6);
    const feature = featureList + gsub.readUInt16BE(featureList + 6 + i * 6);
    const map = byFeature.get(tag) ?? new Map<number, number>();
    for (let j = 0; j < gsub.readUInt16BE(feature + 2); j++) for (const [a, b] of substitutions(gsub.readUInt16BE(feature + 4 + j * 2))) map.set(a, b);
    byFeature.set(tag, map);
  }
  // Fonts that build letters from a dotless base and a dot (Noto Naskh's ب → ٮ + dot, by `ccmp`) give the base its forms.
  const ccmp = byFeature.get("ccmp") ?? new Map<number, number>();
  for (const [code, glyph] of cmapGlyphs(cmap)) {
    for (const f of features) {
      const forms = byFeature.get(f);
      if (forms && (forms.has(glyph) || forms.has(ccmp.get(glyph) ?? -1))) out.get(f)?.add(code);
    }
  }
  return out;
}

/** The glyphs an OpenType coverage table lists. */
function coverage(t: Buffer, at: number): number[] {
  const format = t.readUInt16BE(at);
  const count = t.readUInt16BE(at + 2);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    if (format === 1) out.push(t.readUInt16BE(at + 4 + i * 2));
    else for (let g = t.readUInt16BE(at + 4 + i * 6); g <= t.readUInt16BE(at + 6 + i * 6); g++) out.push(g);
  }
  return out;
}

function cmapGlyphs(t: Buffer): Map<number, number> {
  const out = new Map<number, number>();
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
          if (glyph) out.set(c, glyph);
        }
      }
    } else if (format === 12) {
      const groups = sub.readUInt32BE(12);
      for (let g = 0; g < groups; g++) {
        const lo = sub.readUInt32BE(16 + g * 12);
        const hi = sub.readUInt32BE(20 + g * 12);
        const first = sub.readUInt32BE(24 + g * 12);
        for (let c = lo; c <= hi; c++) if (first + (c - lo)) out.set(c, first + (c - lo));
      }
    }
  }
  return out;
}
