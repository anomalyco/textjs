/**
 * Types and helpers for `@internal` APIs shared across Text.js packages, as `@textjs/core/internal`.
 * Not exported from `@textjs/core` and not covered by the support policy.
 */

import { COLOR_DEFAULT, packRGBA, type ColorInput, type PackedColor } from "./color";
import type { BufferSprite } from "./sprite-types";

/** @internal Cell storage without the drawing API: what drivers and the frame player need. */
export { CellGrid } from "./cell-grid";

/** @internal The bidi engine's load in flight, which ends with a repaint (see `bidi-engine.ts`). */
export { bidiLoading } from "./bidi-engine";

/** A one-row bar over the last row of console frames (the focus hint). */
export interface ConsoleBanner {
  text: string;
  fg: ColorInput;
  bg: ColorInput;
}

/** A saved buffer row (see `CellGrid._overlayRow`). */
export interface RowSnapshot {
  chars: Uint32Array;
  fg: Uint32Array;
  bg: Uint32Array;
  attrs: Uint16Array;
  pool: number;
  version: number;
  sprites: BufferSprite[] | null;
}

function nib(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

/** Parse a packed integer or `#hex` banner color without pulling `NAMED_COLORS` into the live player. */
export function parseBannerColor(input: ColorInput): PackedColor {
  if (input === undefined || input === null) return COLOR_DEFAULT;
  if (typeof input === "number") return Number.isFinite(input) ? input >>> 0 : COLOR_DEFAULT;
  const s = input.trim();
  if (s.charCodeAt(0) === 35) {
    const n = s.length - 1;
    if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return COLOR_DEFAULT;
    const v: number[] = [];
    for (let i = 1; i < s.length; i++) {
      const h = nib(s.charCodeAt(i));
      if (h < 0) return COLOR_DEFAULT;
      v.push(h);
    }
    if (n <= 4) return packRGBA((v[0] ?? 0) * 17, (v[1] ?? 0) * 17, (v[2] ?? 0) * 17, n === 4 ? (v[3] ?? 0) * 17 : 255);
    return packRGBA((v[0] ?? 0) * 16 + (v[1] ?? 0), (v[2] ?? 0) * 16 + (v[3] ?? 0), (v[4] ?? 0) * 16 + (v[5] ?? 0), n === 8 ? (v[6] ?? 0) * 16 + (v[7] ?? 0) : 255);
  }
  if (/^0x[0-9a-fA-F]{1,8}$/.test(s)) return parseInt(s.slice(2), 16) >>> 0;
  return COLOR_DEFAULT;
}

export { engageSurfaceOf, isMac, watchConsoleIntent } from "./console-intent";
