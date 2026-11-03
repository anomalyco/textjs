import type { CellBuffer } from "./cell-buffer";
import type { PackedColor } from "./color";

export interface SpriteDriverContext {
  readonly inline: boolean;
  readonly rowHeight: number;
  readonly defaultInlineFamily: string | undefined;
  readonly typography: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly rowMarginY: number;
    readonly rowPaddingY: number;
    readonly extraCss: string;
  };
  readonly styleOptions: {
    readonly inverseFg: PackedColor;
    readonly inverseBg: PackedColor;
  };
  getCellAdvance(): number;
  nextUniqueStyleId(): number;
  compileRow(buffer: CellBuffer, y: number): Array<{
    styleId: number;
    styleKey: bigint;
    css: string;
    text: string;
    bg: number;
    blank: boolean;
    link: boolean;
    deco: boolean;
    cells: number;
  }>;
}

export interface SpriteCodec {
  materialize(buf: CellBuffer, sp: BufferSprite): void;
  encodePngDataUrl(sp: BufferSprite): string;
  stageKeyframe(
    staged: Map<string, Array<{ hash: number; pixels: Uint32Array; atMs: number }>>,
    pool: Uint32Array[],
    buffer: CellBuffer,
    atMs: number,
  ): boolean;
  encodeSprites(
    ctx: SpriteDriverContext,
    buffer: CellBuffer,
    hashes: Uint32Array,
    prevHashes: Uint32Array,
    prevSpanned: Uint8Array,
    rowCache: unknown[][],
    staged: Map<string, Array<{ hash: number; pixels: Uint32Array; atMs: number }>>,
    stagePool: Uint32Array[],
    svgCache: Map<string, { hash: number; drawW: number; drawH: number; url: string }>,
    full: boolean,
    force: boolean,
    renderAt: number,
  ): { nextSpanned: Uint8Array; dirty: number; maxVisualFrames: number };
}

export interface BufferSprite {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  pixels: Uint32Array;
  fit: "contain" | "fill";
  pixelAspect: number;
  palette?: readonly PackedColor[];
  sample: "nearest" | "average";
  hash: number;
  opaque: boolean;
  underBg: PackedColor;
  materialized: boolean;
  cellsDirty: boolean;
  codec: SpriteCodec;
}
