/**
 * Types for `@internal` APIs shared across Text.js packages. Not exported from `@textjs/core`.
 */

import type { ColorInput } from "./color";

/** A one-row bar over the last row of console frames (the focus hint). */
export interface ConsoleBanner {
  text: string;
  fg: ColorInput;
  bg: ColorInput;
}

/** A saved buffer row (see `CellBuffer._overlayRow`). */
export interface RowSnapshot {
  chars: Uint32Array;
  fg: Uint32Array;
  bg: Uint32Array;
  attrs: Uint16Array;
  pool: number;
  version: number;
}
