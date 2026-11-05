/**
 * Right-to-left detection without the bidi tables, so the frame player, DOM
 * mirrors and the scene painter can tell whether text could be reordered
 * without bundling the Unicode Bidirectional Algorithm (see `bidi.ts`).
 */

import { RTL_RANGES } from "./rtl-data";
import type { Grapheme } from "./text-measure";

/** LEFT-TO-RIGHT OVERRIDE and POP DIRECTIONAL FORMATTING: pin already-visual text to LTR order. */
export const LTR_OVERRIDE = "\u202D";
export const POP_DIRECTIONAL_FORMATTING = "\u202C";

export type TextDirection = "auto" | "ltr" | "rtl";

let ranges: Uint32Array | null = null;

/** True for code points whose presence can make the browser or a terminal reorder text (R, AL, AN). */
export function isRtlCodePoint(cp: number): boolean {
  // Outside the right-to-left blocks (Latin, box drawing, CJK, emoji) without touching the table. The test
  // against the Bidi_Class table on every code point keeps these bounds honest across Unicode updates.
  if (cp < 0x0590 || cp > 0x1efff) return false;
  if (cp > 0x08ff && cp < 0xfb1d) return cp === 0x200f;
  ranges ??= Uint32Array.from(RTL_RANGES.split(","), (s) => Number.parseInt(s, 36));
  // Last range starting at or before cp.
  let lo = 0;
  let hi = (ranges.length >> 1) - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((ranges[mid * 2] as number) <= cp) lo = mid;
    else hi = mid - 1;
  }
  return (ranges[lo * 2] as number) <= cp && cp <= (ranges[lo * 2 + 1] as number);
}

/** True when `text` contains any R, AL or AN character (the strings that need bidi neutralization when emitted). */
export function hasRtl(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x0590) continue;
    const cp = c >= 0xd800 && c <= 0xdbff ? (text.codePointAt(i) as number) : c;
    if (isRtlCodePoint(cp)) return true;
    if (cp > 0xffff) i++;
  }
  return false;
}

/**
 * Code points that can raise text to a right-to-left (odd) level: R, AL, AN
 * and RLE, RLO, RLI. Without one, every resolved level is even, so LTR
 * embeddings, overrides and isolates (LRE, LRO, LRI, FSI, PDF, PDI) alone
 * never reorder, mirror or shape anything.
 */
function isReorderTrigger(cp: number): boolean {
  if (cp < 0x0590) return false;
  if (cp === 0x202b || cp === 0x202e || cp === 0x2067) return true;
  return isRtlCodePoint(cp);
}

/** True when displaying `text` requires reordering (it contains R, AL or AN, or an RLE/RLO/RLI control). */
export function textNeedsBidi(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x0590) continue;
    if (isReorderTrigger(c >= 0xd800 && c <= 0xdbff ? (text.codePointAt(i) as number) : c)) return true;
  }
  return false;
}

/**
 * Whether a grapheme sequence needs the bidi path: `dir === "rtl"` or any
 * R/AL/AN character or RLE/RLO/RLI control (LTR-only controls and isolates
 * cannot reorder anything). Pure-LTR text returns `false` after one cheap
 * scan (every code point below U+0590 is rejected by a single comparison).
 */
export function graphemesNeedBidi(gs: readonly Grapheme[], dir: TextDirection = "auto"): boolean {
  if (dir === "rtl") return true;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i] as Grapheme;
    if (g.codePoint < 0x0590 && !g.isMulti) continue;
    if (isReorderTrigger(g.codePoint)) return true;
    if (g.isMulti) {
      const s = g.grapheme;
      for (let j = 0; j < s.length; j++) {
        const c = s.charCodeAt(j);
        if (c >= 0x0590 && isReorderTrigger(s.codePointAt(j) as number)) return true;
      }
    }
  }
  return false;
}
