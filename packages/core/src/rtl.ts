/**
 * Right-to-left detection without the bidi tables, so the frame player and
 * DOM mirrors that only need to know whether text could be reordered don't
 * bundle the Unicode Bidirectional Algorithm (see `bidi.ts`).
 */

import { RTL_RANGES } from "./rtl-data";

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
