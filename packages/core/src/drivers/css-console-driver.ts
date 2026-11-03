import { blendOver } from "../color";
import { parseBannerColor, type ConsoleBanner } from "../internal";
import {
  ATTR_ALLOW_LINK,
  ATTR_BOLD,
  ATTR_INVERSE,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  CHAR_SPACE,
  GRAPHEME_POOL_FLAG,
  type CellGrid,
} from "../cell-grid";
import type { SpriteDriverContext } from "../sprite-types";
import {
  DEFAULT_STYLE_RESOLVE,
  DEFAULT_TYPOGRAPHY,
  resolveStyle,
  SEAL_CSS,
  sealsBefore,
  styleCss,
  styleKeyOf,
  typographyCss,
  type ConsoleTypographyOptions,
  type EffectiveStyle,
  type StyleResolveOptions,
} from "./style";
import { hasRtl, isRtlCodePoint, LTR_OVERRIDE, POP_DIRECTIONAL_FORMATTING } from "../bidi";
import { LruCache } from "../text-measure";
import { consoleProfile, inlineTypographyCss, type ConsoleBrowser, type ConsoleProfile } from "./console-browser";
import { applyStandIns, measureStandIns, type GlyphStandIns } from "./stand-ins";

/** Minimal console surface used by the driver; inject a fake for tests and benchmarks. */
export interface ConsoleTarget {
  clear(): void;
  log(...args: unknown[]): void;
}

export interface CompiledSpan {
  styleId: number;
  styleKey: bigint;
  css: string;
  /** Span text, already escaped for use inside a `console.log` format string. */
  text: string;
  /** Resolved background of the span. */
  bg: number;
  /** Span contains only blank cells. */
  blank: boolean;
  link: boolean;
  /** Underline or strikethrough: visible on blank cells, so blanks never join. */
  deco: boolean;
  /** Grid cells the span covers (a wide grapheme counts 2). */
  cells: number;
}

export interface ConsoleFrame {
  format: string;
  args: string[];
}

/**
 * How a new frame replaces the previous one.
 *
 * - `"append"` (default): log each frame below the last and let DevTools'
 *   stick-to-bottom scrolling swap them in a single paint. The console is
 *   cleared only on the first frame, after `invalidate()`, and to release
 *   old frames: on the first frame after an idle second once 100 frames have
 *   piled up (when a brief blank is least visible), or at `maxFrames`.
 * - `"frame"` (or `true`): `console.clear()` before every frame. DevTools
 *   applies a clear synchronously but paints new messages on a 50ms throttle,
 *   so this flashes an empty console whenever frames arrive faster than that.
 * - `"never"` (or `false`): never clear.
 */
export type ClearMode = "append" | "frame" | "never";

export interface CssConsoleDriverOptions {
  console?: ConsoleTarget;
  typography?: Partial<ConsoleTypographyOptions>;
  style?: Partial<StyleResolveOptions>;
  /** Frame replacement strategy (default `"append"`). */
  clear?: ClearMode | boolean;
  /** In `"append"` mode, clear and start over after this many frames (default 300). */
  maxFrames?: number;
  /**
   * In `"append"` mode, push earlier frames above the top of the console with
   * a 100vh top margin on a leading span (a 100vh line in Firefox and Safari,
   * which ignore vertical margins on inline spans), so a frame shorter than the console
   * never shows the tail of the previous one. Defaults to `true` when writing
   * to the global console and `false` for an injected target.
   */
  curtain?: boolean;
  /** Fold blank cells into the open span when their background matches (default `true`). */
  coalesceWhitespace?: boolean;
  /**
   * In `"append"` mode, clear the console before the first frame (default
   * `true`). Pass `false` when a prerendered shell already cleared it and
   * painted a frame, so the first live frame appends beneath it in one paint.
   */
  initialClear?: boolean;
  /**
   * Measures text advance in CSS px with the console font, used to fit spans
   * of right-to-left text to the cell grid (see `fitRtlSpans`) and to find
   * glyphs the font can't fit in a cell (see `measureStandIns`). Defaults
   * to a canvas measurer in browsers; `false` (and non-browser runtimes)
   * disable both.
   */
  measureText?: TextAdvanceMeasurer | false;
  /**
   * The console the frames are written for (default: detected from the page,
   * `"chromium"` outside a browser). Firefox and Safari keep `%c` spans inline,
   * so they get 14px line heights without margins, no soft wrapping and a
   * line-height curtain (see `ConsoleBrowser`).
   */
  browser?: ConsoleBrowser;
}

/** Advance width in CSS px of `text` rendered with the console font. */
export type TextAdvanceMeasurer = (text: string, bold: boolean, italic: boolean) => number;

/**
 * A canvas-backed measurer for the console font, or `null` outside browsers
 * (or when no 2D context is available). The measurer returns `NaN` if
 * measuring fails, which disables fitting for that span.
 */
export function createCanvasMeasurer(fontFamily: string, fontSize: number): TextAdvanceMeasurer | null {
  let ctx: { font: string; measureText(t: string): { width: number } } | null = null;
  try {
    if (typeof OffscreenCanvas !== "undefined") ctx = new OffscreenCanvas(1, 1).getContext("2d");
    else if (typeof document !== "undefined" && typeof document.createElement === "function") ctx = document.createElement("canvas").getContext("2d");
  } catch {
    ctx = null;
  }
  if (ctx === null || ctx === undefined) return null;
  const c = ctx;
  let font = "";
  return (text, bold, italic) => {
    try {
      const f = `${italic ? "italic " : ""}${bold ? "700 " : ""}${fontSize}px ${fontFamily}`;
      if (f !== font) {
        c.font = f;
        font = f;
      }
      return c.measureText(text).width;
    } catch {
      return Number.NaN;
    }
  };
}

export interface DriverRenderOptions {
  /** Emit the frame even when no row changed. */
  force?: boolean;
}

export interface DriverRenderResult {
  skipped: boolean;
  cleared?: boolean;
  dirtyRows: number;
  spanCount: number;
  /** @internal Distinct visual frames delivered by this log call (`> 1` when temporal sprite keyframes are batched). */
  _visualFrames?: number;
  encodeMs: number;
  frame: ConsoleFrame | null;
}

const now: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();

const LINK_SCHEME = "://";
const LINK_SCHEME_SAFE = ":\u2060//";
// DevTools linkifies `/path/file.ts:12` and `//host:3000` as source links.
const PATH_LINE = /(\/[\w.-]*):(?=\d)/g;
const DATA_URI = /(data):(?=\S)/gi;

/**
 * Escape text for a `console.log` format string: `%` becomes `%%`, and unless
 * links are allowed, URL schemes, `www.`, `data:` and `path:line` get a word
 * joiner so Chromium's linkifier cannot hijack span styles.
 */
export function escapeConsoleText(text: string, allowLink = false): string {
  let s = text;
  if (s.includes("%")) s = s.replaceAll("%", "%%");
  if (!allowLink) {
    if (s.includes(":")) {
      if (s.includes(LINK_SCHEME)) s = s.replaceAll(LINK_SCHEME, LINK_SCHEME_SAFE);
      if (s.includes("/")) s = s.replace(PATH_LINE, "$1:\u2060");
      if (s.includes("ata:") || s.includes("ATA:")) s = s.replace(DATA_URI, "$1\u2060:");
    }
    if (s.includes("www.") || s.includes("WWW.")) s = s.replace(/www\./gi, (m) => `${m.slice(0, 3)}\u2060.`);
  }
  return s;
}

/**
 * Cells are already in visual order, but DevTools runs the Unicode bidi
 * algorithm (and Arabic shaping) over every message. Spans holding R, AL or AN
 * characters are wrapped in LRO…PDF so the browser lays them out left to right
 * exactly as the cells are ordered. (`direction`/`unicode-bidi` CSS is stripped
 * by DevTools' `%c` sanitizer.)
 */
function pinVisualOrder(text: string): string {
  return LTR_OVERRIDE + text + POP_DIRECTIONAL_FORMATTING;
}

/** Blink stores inline sizes in LayoutUnits (1/64 px) and rounds text widths up to one. */
const LAYOUT_UNIT = 64;

/**
 * DOM text of an escaped span (`%%` → `%`). The pins stay in the text so a
 * measurer sees the same (overridden) runs DevTools lays out: without them it
 * would reorder the visual-order glyphs and form ligatures (lam-alef) that
 * never appear on screen.
 */
function unescapeConsoleText(escaped: string): string {
  return escaped.includes("%%") ? escaped.replaceAll("%%", "%") : escaped;
}

const IDLE_COMPACT_FRAMES = 100;
const IDLE_COMPACT_MS = 1000;
/**
 * Sprite frames clear once the characters logged since the last clear would pass this. Half-block
 * frames (Safari, or a sprite drawn as cells) keep the 4 MB measured on the 160×50 half-block bench,
 * about 5.3K spans per frame, which Web Inspector doesn't virtualize. A sprite frame is 3 spans,
 * Chromium's `ConsoleViewport` virtualizes offscreen messages and the 100vh curtain keeps about 2
 * mounted, and `console.clear()` doesn't free DevTools' heap anyway. The page holds about 1 byte
 * per character logged until its console storage levels off near 5M characters, so 16 MB costs
 * about 2 MB more peak page heap, freed on clear. 300 Doom logs are ~17.6 MB.
 */
const SPRITE_MAX_BYTES = 4 * 1024 * 1024;
const SPRITE_URL_MAX_BYTES = 16 * 1024 * 1024;
/** The banner swaps its colors every `BLINK_MS`, `BLINK_SWAPS` times (even, so it ends as set). */
const BLINK_MS = 700;
const BLINK_SWAPS = 8;

const SKIPPED: DriverRenderResult = Object.freeze({
  skipped: true,
  cleared: false,
  dirtyRows: 0,
  spanCount: 0,
  encodeMs: 0,
  frame: null,
});

const ASCII_CHARS: readonly string[] = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i < 0x20 ? CHAR_SPACE : i));
const EMPTY_ARGS: readonly string[] = Object.freeze([]);

const L1_SIZE = 1024;
const L1_MASK = L1_SIZE - 1;
const BL_SIZE = 64;
const BL_MASK = BL_SIZE - 1;

interface InternedStyle {
  id: number;
  css: string;
  /** The same style with `SEAL_CSS`, interned on first use and evicted with this one. */
  sealed?: InternedStyle;
}

interface PrecompiledRow {
  spans: CompiledSpan[];
  midFormat: string;
  midArgs: readonly string[];
  midLast: CompiledSpan | null;
}

function buildPrecompiledRow(spans: CompiledSpan[]): PrecompiledRow {
  const n = spans.length;
  if (n <= 1) return { spans, midFormat: "", midArgs: EMPTY_ARGS, midLast: null };
  const lastBlank = (spans[n - 1] as CompiledSpan).blank;
  const midEnd = lastBlank ? n - 1 : n;
  if (midEnd <= 1) return { spans, midFormat: "", midArgs: EMPTY_ARGS, midLast: null };
  let midFormat = "";
  const midArgs = new Array<string>(midEnd - 1);
  for (let i = 1; i < midEnd; i++) {
    const s = spans[i] as CompiledSpan;
    midFormat += `%c${s.text}`;
    midArgs[i - 1] = s.css;
  }
  return { spans, midFormat, midArgs, midLast: spans[midEnd - 1] as CompiledSpan };
}

/**
 * Renders a `CellBuffer` into DevTools with exactly one
 * `console.log(format, ...css)` per dirty frame (see `ClearMode` for when it
 * also clears), and zero calls otherwise.
 */
export class CssConsoleDriver {
  readonly typography: Readonly<ConsoleTypographyOptions>;
  readonly styleOptions: Readonly<StyleResolveOptions>;
  private target: ConsoleTarget | null;
  readonly clearMode: ClearMode;
  private readonly maxFrames: number;
  private readonly profile: Readonly<ConsoleProfile>;
  private readonly curtainOption: boolean | undefined;
  private readonly coalesce: boolean;
  private readonly baseCss: string;
  private readonly cssCache = new Map<bigint, InternedStyle>();
  /** `cssCache` entries by id, for `sealSpans`. */
  private readonly styleById = new Map<number, InternedStyle>();
  private nextStyleId = 1;
  private readonly l1Valid = new Uint8Array(L1_SIZE);
  private readonly l1Fg = new Uint32Array(L1_SIZE);
  private readonly l1Bg = new Uint32Array(L1_SIZE);
  private readonly l1At = new Uint16Array(L1_SIZE);
  private readonly l1Id = new Int32Array(L1_SIZE);
  private readonly l1EffBg = new Uint32Array(L1_SIZE);
  private readonly l1Flags = new Uint8Array(L1_SIZE);
  private readonly l1Css: string[] = new Array<string>(L1_SIZE).fill("");
  private readonly l1Key: bigint[] = new Array<bigint>(L1_SIZE).fill(0n);
  private readonly blValid = new Uint8Array(BL_SIZE);
  private readonly blBg = new Uint32Array(BL_SIZE);
  private readonly blLink = new Uint8Array(BL_SIZE);
  private readonly blId = new Int32Array(BL_SIZE);
  private readonly blCss: string[] = new Array<string>(BL_SIZE).fill("");
  private readonly blKey: bigint[] = new Array<bigint>(BL_SIZE).fill(0n);
  private width = -1;
  private height = -1;
  private prevHashes: Uint32Array = new Uint32Array(0);
  private rowSpanned: Uint8Array = new Uint8Array(0);
  private hasSpannedRows = false;
  private rowCache: CompiledSpan[][] = [];
  private preRows: PrecompiledRow[] = [];
  private readonly partsBuf: string[] = [];
  private rendered = false;
  private banner: ConsoleBanner | null = null;
  private bannerSwapped = false;
  private blinkTimer: ReturnType<typeof setInterval> | null = null;
  private lastSpanCount = 0;
  private lastVisualFrames = 1;
  /** Clear budget for the last encoded frame's sprites: 16 MB when every sprite was a URL, else 4 MB. */
  private spriteBudget = SPRITE_MAX_BYTES;
  /** Frames logged since the last `console.clear()`; 0 forces a clear on the next frame. */
  private appended = 0;
  private appendedBytes = 0;
  private lastLogAt = 0;
  private parity = false;
  private readonly curtainCss: string;
  private readonly scratch: EffectiveStyle = { fg: 0, bg: 0, flags: 0 };
  private readonly measureOption: TextAdvanceMeasurer | false | undefined;
  private measurer: TextAdvanceMeasurer | null | undefined;
  private cellAdvance = 0;
  private standIns: GlyphStandIns | null | undefined;
  private readonly fitCache = new LruCache<string, string>(1024);
  private nextFitId = -2;
  private readonly blankScratch: EffectiveStyle = { fg: 0, bg: 0, flags: 0 };
  private readonly stagedSprites = new Map<string, Array<{ hash: number; pixels: Uint32Array; atMs: number }>>();
  private readonly stagePixelPool: Uint32Array[] = [];
  private readonly spriteSvgCache = new Map<string, { hash: number; drawW: number; drawH: number; url: string }>();

  constructor(options: CssConsoleDriverOptions = {}) {
    this.target = options.console ?? null;
    const profile = consoleProfile(options.browser);
    this.profile = profile;
    this.typography = Object.freeze({ ...DEFAULT_TYPOGRAPHY, ...profile.typography, ...options.typography });
    this.styleOptions = Object.freeze({ ...DEFAULT_STYLE_RESOLVE, ...options.style });
    const clear = options.clear ?? "append";
    this.clearMode = clear === true ? "frame" : clear === false ? "never" : clear;
    this.maxFrames = Math.max(1, options.maxFrames ?? 300);
    this.curtainOption = options.curtain;
    this.coalesce = options.coalesceWhitespace ?? true;
    this.baseCss = profile.inline ? inlineTypographyCss(this.typography, profile.typography.fontFamily) : typographyCss(this.typography);
    this.curtainCss = profile.curtainCss;
    if (options.initialClear === false) this.appended = 1;
    this.measureOption = options.measureText;
  }

  /** @internal */
  get _profile(): Readonly<ConsoleProfile> {
    return this.profile;
  }

  /** @internal */
  _nextFitId(): number {
    return this.nextFitId--;
  }

  /** @internal Whether this console supports multi-keyframe sprite batching (`true` in Chromium append mode). */
  get _supportsTemporalSprites(): boolean {
    return this.profile.supportsTemporalBatching && this.clearMode === "append";
  }

  /** @internal */
  get _hasStagedKeyframes(): boolean {
    return this.stagedSprites.size > 0;
  }

  /** @internal Drop any buffered temporal sprite keyframes without emitting them. */
  _discardStagedKeyframes(): void {
    if (this.stagedSprites.size === 0) return;
    for (const list of this.stagedSprites.values()) {
      for (const f of list) if (this.stagePixelPool.length < 8) this.stagePixelPool.push(f.pixels);
    }
    this.stagedSprites.clear();
  }

  /** @internal */
  _stageKeyframe(buffer: CellGrid, atMs: number = now()): boolean {
    if (!this._supportsTemporalSprites || buffer._sprites.length === 0) return false;
    return buffer._sprites[0]!.codec.stageKeyframe(this.stagedSprites, this.stagePixelPool, buffer, atMs);
  }

  setConsole(target: ConsoleTarget | null): void {
    this.target = target;
  }

  /** Forget the previous frame so the next render is emitted in full (after a clear). */
  invalidate(): void {
    this.rendered = false;
    this.width = -1;
    this.height = -1;
    this.appended = 0;
    this.appendedBytes = 0;
    this._discardStagedKeyframes();
  }

  /** Number of interned CSS style strings. */
  get internedStyles(): number {
    return this.cssCache.size;
  }

  get lastFrameSpanCount(): number {
    return this.lastSpanCount;
  }

  private internStyle(style: EffectiveStyle, key: bigint): InternedStyle {
    let entry = this.cssCache.get(key);
    if (entry === undefined) {
      entry = { id: this.nextStyleId++, css: styleCss(this.baseCss, style) };
      this.storeStyle(key, entry);
    }
    return entry;
  }

  /** Adds a style to `cssCache` and `styleById`, evicting the oldest past 4,096. */
  private storeStyle(key: bigint, entry: InternedStyle): void {
    if (this.cssCache.size >= 4096) {
      const oldest = this.cssCache.entries().next();
      if (!oldest.done) {
        this.cssCache.delete(oldest.value[0]);
        this.styleById.delete(oldest.value[1].id);
      }
    }
    this.cssCache.set(key, entry);
    this.styleById.set(entry.id, entry);
  }

  /**
   * Compile one row into RLE spans. Plain spaces whose visible background
   * matches the open span are folded into it regardless of foreground, weight
   * or slant (all invisible on a blank cell), which removes most `%c` breaks
   * in real TUI layouts. `after` is the background of whatever follows the
   * row on the same line, if anything, for sealing its last span.
   */
  compileRow(buffer: CellGrid, y: number, after?: number): CompiledSpan[] {
    const spans: CompiledSpan[] = [];
    const W = buffer.width;
    const C = buffer._chars;
    const F = buffer._fg;
    const B = buffer._bg;
    const A = buffer._attrs;
    const pool = buffer.graphemePool;
    const opts = this.styleOptions;
    const scratch = this.scratch;
    const coalesce = this.coalesce;
    const l1Valid = this.l1Valid;
    const l1Fg = this.l1Fg;
    const l1Bg = this.l1Bg;
    const l1At = this.l1At;
    const l1Id = this.l1Id;
    const l1EffBg = this.l1EffBg;
    const l1Flags = this.l1Flags;
    const l1Css = this.l1Css;
    const l1Key = this.l1Key;

    // Last resolved raw style.
    let hasRaw = false;
    let rawFg = 0;
    let rawBg = 0;
    let rawAttrs = 0;
    let rId = -1;
    let rKey = 0n;
    let rCss = "";
    let rBg = 0;
    let rLink = false;
    let rDeco = false;

    // Open span.
    let id = -1;
    let key = 0n;
    let css = "";
    let allowLink = false;
    let spanBg = 0;
    let spanDeco = false;
    let text = "";
    let blank = true;
    let hasSpecial = false;
    let rtl = false;
    let rowRtl = false;
    let cells = 0;

    // Blank run waiting to see whether the next cell shares its background.
    let pend = 0;
    let pId = -1;
    let pKey = 0n;
    let pCss = "";
    let pBg = 0;
    let pLink = false;

    // Last resolved blank-run style.
    let hasBlank = false;
    let bBg = 0;
    let bLink = false;
    let bId = -1;
    let bKey = 0n;
    let bCss = "";

    for (let i = y * W, end = i + W; i < end; i++) {
      const a = A[i] as number;
      if (a & ATTR_WIDE_CONT) {
        // The right half of the wide grapheme just appended to the open span.
        cells++;
        continue;
      }
      const f = F[i] as number;
      const b = B[i] as number;
      const c = C[i] as number;
      if (coalesce && c <= CHAR_SPACE && (a & (ATTR_UNDERLINE | ATTR_STRIKETHROUGH)) === 0) {
        const link = (a & ATTR_ALLOW_LINK) !== 0;
        let effBg = b >>> 0;
        if (a & ATTR_INVERSE) {
          effBg = (f & 255) === 0 ? opts.inverseBg : f;
          if ((effBg & 255) !== 255) effBg = blendOver(effBg, opts.inverseFg);
          effBg >>>= 0;
        }
        if (pend === 0 && id !== -1 && !spanDeco && effBg === spanBg && link === allowLink) {
          text += " ";
          cells++;
          continue;
        }
        if (pend > 0 && effBg === pBg && link === pLink) {
          pend++;
          continue;
        }
        if (pend > 0) {
          if (pId !== id) {
            if (text.length > 0) {
              spans.push({
                styleId: id,
                styleKey: key,
                css,
                text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
                bg: spanBg,
                blank,
                link: allowLink,
                deco: spanDeco,
                cells,
              });
            }
            id = pId;
            key = pKey;
            css = pCss;
            allowLink = pLink;
            spanBg = pBg;
            spanDeco = false;
            text = "";
            blank = true;
            hasSpecial = false;
            rtl = false;
            cells = 0;
          }
          text += pend === 1 ? " " : " ".repeat(pend);
          cells += pend;
          pend = 0;
        }
        // A blank run that opens its own span only needs its background.
        if (!hasBlank || effBg !== bBg || link !== bLink) {
          hasBlank = true;
          bBg = effBg;
          bLink = link;
          const linkNum = link ? 1 : 0;
          const bh = (Math.imul(effBg, 0x9e3779b1) ^ linkNum) & BL_MASK;
          if (this.blValid[bh] === 1 && this.blBg[bh] === effBg && this.blLink[bh] === linkNum) {
            bId = this.blId[bh] as number;
            bKey = this.blKey[bh] as bigint;
            bCss = this.blCss[bh] as string;
          } else {
            const bs = this.blankScratch;
            bs.bg = effBg;
            bs.flags = link ? ATTR_ALLOW_LINK : 0;
            bKey = styleKeyOf(bs);
            const entry = this.internStyle(bs, bKey);
            bId = entry.id;
            bCss = entry.css;
            this.blValid[bh] = 1;
            this.blBg[bh] = effBg;
            this.blLink[bh] = linkNum;
            this.blId[bh] = bId;
            this.blKey[bh] = bKey;
            this.blCss[bh] = bCss;
          }
        }
        pend = 1;
        pId = bId;
        pKey = bKey;
        pCss = bCss;
        pBg = effBg;
        pLink = link;
        continue;
      }

      if (!hasRaw || f !== rawFg || b !== rawBg || a !== rawAttrs) {
        hasRaw = true;
        rawFg = f;
        rawBg = b;
        rawAttrs = a;
        const h = (Math.imul(f ^ Math.imul(b, 0x9e3779b1), 0x85ebca6b) ^ a) & L1_MASK;
        if (l1Valid[h] === 1 && l1Fg[h] === f && l1Bg[h] === b && l1At[h] === a) {
          rId = l1Id[h] as number;
          rKey = l1Key[h] as bigint;
          rCss = l1Css[h] as string;
          rBg = l1EffBg[h] as number;
          const fl = l1Flags[h] as number;
          rLink = (fl & 1) !== 0;
          rDeco = (fl & 2) !== 0;
        } else {
          resolveStyle(f, b, a, opts, scratch);
          const k = styleKeyOf(scratch);
          const entry = this.internStyle(scratch, k);
          rId = entry.id;
          rKey = k;
          rCss = entry.css;
          rBg = scratch.bg;
          rLink = (a & ATTR_ALLOW_LINK) !== 0;
          rDeco = (scratch.flags & (ATTR_UNDERLINE | ATTR_STRIKETHROUGH)) !== 0;
          l1Valid[h] = 1;
          l1Fg[h] = f;
          l1Bg[h] = b;
          l1At[h] = a;
          l1Id[h] = rId;
          l1Key[h] = rKey;
          l1Css[h] = rCss;
          l1EffBg[h] = rBg;
          l1Flags[h] = (rLink ? 1 : 0) | (rDeco ? 2 : 0);
        }
      }

      if (pend > 0) {
        if (!rDeco && rBg === pBg && rLink === pLink) {
          // The blanks adopt this cell's style.
          if (rId !== id) {
            if (text.length > 0) {
              spans.push({
                styleId: id,
                styleKey: key,
                css,
                text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
                bg: spanBg,
                blank,
                link: allowLink,
                deco: spanDeco,
                cells,
              });
            }
            id = rId;
            key = rKey;
            css = rCss;
            allowLink = rLink;
            spanBg = rBg;
            spanDeco = rDeco;
            text = "";
            blank = true;
            hasSpecial = false;
            rtl = false;
            cells = 0;
          }
          text += pend === 1 ? " " : " ".repeat(pend);
          cells += pend;
          pend = 0;
        } else {
          if (pId !== id) {
            if (text.length > 0) {
              spans.push({
                styleId: id,
                styleKey: key,
                css,
                text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
                bg: spanBg,
                blank,
                link: allowLink,
                deco: spanDeco,
                cells,
              });
            }
            id = pId;
            key = pKey;
            css = pCss;
            allowLink = pLink;
            spanBg = pBg;
            spanDeco = false;
            text = "";
            blank = true;
            hasSpecial = false;
            rtl = false;
            cells = 0;
          }
          text += pend === 1 ? " " : " ".repeat(pend);
          cells += pend;
          pend = 0;
        }
      }

      if (rId !== id) {
        if (text.length > 0) {
          spans.push({
            styleId: id,
            styleKey: key,
            css,
            text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
            bg: spanBg,
            blank,
            link: allowLink,
            deco: spanDeco,
            cells,
          });
        }
        id = rId;
        key = rKey;
        css = rCss;
        allowLink = rLink;
        spanBg = rBg;
        spanDeco = rDeco;
        text = "";
        blank = true;
        hasSpecial = false;
        rtl = false;
        cells = 0;
      }
      blank = false;
      cells++;
      if (c < 0x80) {
        if (c === 0x25 || c === 0x3a || c === 0x77 || c === 0x57) hasSpecial = true;
        text += ASCII_CHARS[c] as string;
      } else if (c >= GRAPHEME_POOL_FLAG) {
        hasSpecial = true;
        const g = pool[c & 0x7fffffff] ?? " ";
        if (!rtl && hasRtl(g)) {
          rtl = true;
          rowRtl = true;
        }
        text += g;
      } else if (c < 0x10000) {
        // Inline pre-filter (box drawing, CJK skip the call); U+200F RLM is the one R inside the gap.
        if (c >= 0x0590 && (c <= 0x08ff || c >= 0xfb1d || c === 0x200f) && isRtlCodePoint(c)) {
          rtl = true;
          rowRtl = true;
          hasSpecial = true;
        }
        text += String.fromCharCode(c);
      } else {
        if (isRtlCodePoint(c)) {
          rtl = true;
          rowRtl = true;
          hasSpecial = true;
        }
        text += String.fromCodePoint(c);
      }
      // Fast continuation across consecutive non-blank BMP non-RTL cells with identical style.
      while (i + 1 < end) {
        const nc = C[i + 1] as number;
        if (nc <= CHAR_SPACE || nc >= 0xfb1d || (nc >= 0x0590 && (nc <= 0x08ff || nc === 0x200f))) break;
        if (F[i + 1] !== rawFg || B[i + 1] !== rawBg || A[i + 1] !== rawAttrs) break;
        i++;
        cells++;
        if (nc < 0x80) {
          if (nc === 0x25 || nc === 0x3a || nc === 0x77 || nc === 0x57) hasSpecial = true;
          text += ASCII_CHARS[nc] as string;
        } else {
          text += String.fromCharCode(nc);
        }
      }
    }

    if (pend > 0) {
      if (pId !== id) {
        if (text.length > 0) {
          spans.push({
            styleId: id,
            styleKey: key,
            css,
            text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
            bg: spanBg,
            blank,
            link: allowLink,
            deco: spanDeco,
            cells,
          });
        }
        id = pId;
        key = pKey;
        css = pCss;
        allowLink = pLink;
        spanBg = pBg;
        spanDeco = false;
        text = "";
        blank = true;
        hasSpecial = false;
        rtl = false;
        cells = 0;
      }
      text += pend === 1 ? " " : " ".repeat(pend);
      cells += pend;
    }
    if (text.length > 0) {
      spans.push({
        styleId: id,
        styleKey: key,
        css,
        text: blank || !hasSpecial ? text : rtl ? pinVisualOrder(escapeConsoleText(text, allowLink)) : escapeConsoleText(text, allowLink),
        bg: spanBg,
        blank,
        link: allowLink,
        deco: spanDeco,
        cells,
      });
    }
    const standIns = this.standIns === undefined ? this.measureStandIns() : this.standIns;
    if (standIns !== null) for (const span of spans) if (!span.blank) span.text = applyStandIns(span.text, standIns);
    if (!this.profile.inline) this.sealSpans(spans, after);
    if (rowRtl) this.fitRtlSpans(spans);
    return spans;
  }

  /** Glyphs the console font can't fit in a cell, measured on the first row (see `measureStandIns`). */
  private measureStandIns(): GlyphStandIns | null {
    this._getCellAdvance();
    const measure = this.measurer;
    this.standIns = measure && this.cellAdvance > 0 ? measureStandIns(measure, this.cellAdvance) : null;
    return this.standIns;
  }

  /**
   * Seal spans by `sealsBefore`, with `after` as the last span's right
   * neighbour. An opaque span left unsealed is marked `deco` so `assemble`
   * never folds it into a sealed one.
   */
  private sealSpans(spans: CompiledSpan[], after: number | undefined): void {
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i] as CompiledSpan;
      if ((s.bg & 255) === 0) continue;
      if (!sealsBefore(s.bg, i + 1 < spans.length ? (spans[i + 1] as CompiledSpan).bg : after)) {
        s.deco = true;
        continue;
      }
      // The L1 and blank caches outlive `cssCache` evictions, so a hot style may come back with
      // an id `cssCache` dropped (or re-interned under a new id): store it again.
      let style = this.styleById.get(s.styleId) ?? this.cssCache.get(s.styleKey);
      if (style === undefined) this.storeStyle(s.styleKey, (style = { id: s.styleId, css: s.css }));
      const sealed = (style.sealed ??= { id: this.nextStyleId++, css: style.css + SEAL_CSS });
      s.styleId = sealed.id;
      s.css = sealed.css;
    }
  }

  /**
   * Fallback fonts give Hebrew/Arabic glyphs a slightly different advance than
   * the monospace cell (Courier New's 0.6em vs Menlo's 0.602em on macOS), and
   * DevTools paints every background span with `contain: paint`, which shows
   * 1px hairlines when span edges leave the cell grid's subpixel pattern. Pad
   * (or pull in) each pinned span by the exact LayoutUnit difference so its box
   * is as wide as the same number of Latin cells, and keep it from merging
   * with neighbours, which would repeat the padding on their lines. Negative
   * margins are capped at half a cell, so only drift is corrected; a span
   * whose fallback font is much wider overflows rather than being overlapped.
   */
  /** @internal */
  _getCellAdvance(): number {
    if (this.measurer === undefined) {
      const m = this.measureOption;
      this.measurer = m === false ? null : (m ?? createCanvasMeasurer(this.typography.fontFamily, this.typography.fontSize));
      if (this.measurer !== null) this.cellAdvance = this.measurer("M".repeat(32), false, false) / 32;
    }
    return this.cellAdvance > 0 ? this.cellAdvance : this.typography.fontSize * 0.602;
  }

  private fitRtlSpans(spans: CompiledSpan[]): void {
    this._getCellAdvance();
    const measure = this.measurer;
    if (measure === null || measure === undefined || !(this.cellAdvance > 0)) return;
    for (const span of spans) {
      if (span.blank || span.text.charCodeAt(0) !== 0x202d) continue;
      const bold = span.css.includes("font-weight:700");
      const italic = span.css.includes("font-style:italic");
      const sealed = span.css.endsWith(SEAL_CSS);
      const key = `${bold ? 1 : 0}${italic ? 1 : 0}${sealed ? 1 : 0}${span.cells}:${span.text}`;
      let fit = this.fitCache.get(key);
      if (fit === undefined) {
        const target = Math.ceil(span.cells * this.cellAdvance * LAYOUT_UNIT);
        const advance = measure(unescapeConsoleText(span.text), bold, italic);
        const natural = Number.isFinite(advance) ? Math.ceil(advance * LAYOUT_UNIT) : target;
        // Pull in by at most half a cell: a proportional fallback font (Times New Roman next to
        // Cascadia Mono on Windows) would otherwise drag the following spans over these glyphs.
        const delta = Math.max(target - natural, -Math.floor((this.cellAdvance * LAYOUT_UNIT) / 2));
        if (delta !== 0 && sealed) {
          // Replaces the seal (sliced off below), with its 1px folded in.
          fit = `padding-right:${Math.max(delta, 0) / LAYOUT_UNIT + 1}px;margin-right:${Math.min(delta, 0) / LAYOUT_UNIT - 1}px;`;
        } else {
          fit = delta > 0 ? `padding-right:${delta / LAYOUT_UNIT}px;` : delta < 0 ? `margin-right:${delta / LAYOUT_UNIT}px;` : "";
        }
        this.fitCache.set(key, fit);
      }
      if (fit === "") continue;
      span.css = (sealed ? span.css.slice(0, -SEAL_CSS.length) : span.css) + fit;
      span.styleId = this.nextFitId--;
      span.deco = true;
    }
  }

  /**
   * Assemble cached row spans into one format string. Spans with the same
   * style continue across `\n`, blank spans join a neighbour that shares their
   * background, and unmerged row breaks reset `%c` to `""` so DevTools emits a
   * plain text newline instead of a phantom empty `contain:paint` inline-block.
   */
  private assemble(): ConsoleFrame {
    const parts = this.partsBuf;
    parts.length = 0;
    const args: string[] = [];
    let curId = -1;
    let curBg = 0;
    let curLink = false;
    let curDeco = false;
    // A blank span held to see what follows across row boundaries.
    let held: CompiledSpan | null = null;
    let heldLeadSep = "";
    let heldText = "";
    let sep = "";
    const coalesce = this.coalesce;
    const preRows = this.preRows;
    const rowCount = preRows.length;
    const spanned = this.hasSpannedRows ? this.rowSpanned : null;

    for (let y = 0; y < rowCount; y++) {
      if (spanned !== null && spanned[y] === 1) continue;
      if (y > 0) sep += "\n";
      const row = preRows[y];
      if (row === undefined) continue;
      const spans = row.spans;
      const n = spans.length;
      if (n === 0) continue;

      if (coalesce && n >= 2) {
        // 1. First span on row (interacts with previous row / sep).
        const s0 = spans[0] as CompiledSpan;
        if (held !== null) {
          if (s0.styleId === held.styleId || (!s0.deco && !held.deco && s0.bg === held.bg && s0.link === held.link)) {
            if (s0.blank) {
              heldText += sep + s0.text;
              sep = "";
            } else {
              if (heldLeadSep) {
                if (curId !== -1) {
                  parts.push("%c", heldLeadSep);
                  args.push("");
                } else parts.push(heldLeadSep);
                heldLeadSep = "";
              }
              parts.push("%c", heldText, sep, s0.text);
              args.push(s0.css);
              curId = s0.styleId;
              curBg = s0.bg;
              curLink = s0.link;
              curDeco = s0.deco;
              held = null;
              sep = "";
            }
          } else {
            if (heldLeadSep) {
              if (curId !== -1) {
                parts.push("%c", heldLeadSep);
                args.push("");
              } else parts.push(heldLeadSep);
              heldLeadSep = "";
            }
            parts.push("%c", heldText);
            args.push(held.css);
            curId = held.styleId;
            curBg = held.bg;
            curLink = held.link;
            curDeco = held.deco;
            held = null;
            if (s0.styleId === curId || (s0.blank && !s0.deco && !curDeco && s0.bg === curBg && s0.link === curLink)) {
              parts.push(sep, s0.text);
              sep = "";
            } else if (s0.blank) {
              held = s0;
              heldLeadSep = sep;
              heldText = s0.text;
              sep = "";
            } else {
              if (sep) {
                parts.push("%c", sep);
                args.push("");
                sep = "";
              }
              parts.push("%c", s0.text);
              args.push(s0.css);
              curId = s0.styleId;
              curBg = s0.bg;
              curLink = s0.link;
              curDeco = s0.deco;
            }
          }
        } else if (s0.styleId === curId || (s0.blank && !s0.deco && !curDeco && s0.bg === curBg && s0.link === curLink && curId !== -1)) {
          parts.push(sep, s0.text);
          sep = "";
        } else if (s0.blank) {
          held = s0;
          heldLeadSep = sep;
          heldText = s0.text;
          sep = "";
        } else {
          if (sep) {
            if (curId !== -1) {
              parts.push("%c", sep);
              args.push("");
            } else parts.push(sep);
            sep = "";
          }
          parts.push("%c", s0.text);
          args.push(s0.css);
          curId = s0.styleId;
          curBg = s0.bg;
          curLink = s0.link;
          curDeco = s0.deco;
        }

        // 2. Precompiled interior spans (never interact across row boundaries).
        const midLast = row.midLast;
        if (midLast !== null) {
          if (held !== null) {
            if (heldLeadSep) {
              if (curId !== -1) {
                parts.push("%c", heldLeadSep);
                args.push("");
              } else parts.push(heldLeadSep);
              heldLeadSep = "";
            }
            parts.push("%c", heldText);
            args.push(held.css);
            held = null;
          }
          parts.push(row.midFormat);
          const ma = row.midArgs;
          for (let m = 0; m < ma.length; m++) args.push(ma[m] as string);
          curId = midLast.styleId;
          curBg = midLast.bg;
          curLink = midLast.link;
          curDeco = midLast.deco;
        }

        // 3. Trailing blank span on row (if any; interacts with next row).
        const sLast = spans[n - 1] as CompiledSpan;
        if (sLast.blank) {
          if (held !== null) {
            if (sLast.styleId === held.styleId || (!sLast.deco && !held.deco && sLast.bg === held.bg && sLast.link === held.link)) {
              heldText += sLast.text;
              continue;
            }
            if (heldLeadSep) {
              if (curId !== -1) {
                parts.push("%c", heldLeadSep);
                args.push("");
              } else parts.push(heldLeadSep);
              heldLeadSep = "";
            }
            parts.push("%c", heldText);
            args.push(held.css);
            curId = held.styleId;
            curBg = held.bg;
            curLink = held.link;
            curDeco = held.deco;
            held = null;
          }
          if (sLast.styleId === curId || (!sLast.deco && !curDeco && sLast.bg === curBg && sLast.link === curLink && curId !== -1)) {
            parts.push(sLast.text);
          } else {
            held = sLast;
            heldLeadSep = "";
            heldText = sLast.text;
          }
        }
        continue;
      }

      for (let k = 0; k < n; k++) {
        const s = spans[k] as CompiledSpan;
        if (held !== null) {
          if (s.styleId === held.styleId || (!s.deco && !held.deco && s.bg === held.bg && s.link === held.link)) {
            if (s.blank) {
              heldText += sep + s.text;
              sep = "";
              continue;
            }
            if (heldLeadSep) {
              if (curId !== -1) {
                parts.push("%c", heldLeadSep);
                args.push("");
              } else parts.push(heldLeadSep);
              heldLeadSep = "";
            }
            parts.push("%c", heldText, sep, s.text);
            args.push(s.css);
            curId = s.styleId;
            curBg = s.bg;
            curLink = s.link;
            curDeco = s.deco;
            held = null;
            sep = "";
            continue;
          }
          if (heldLeadSep) {
            if (curId !== -1) {
              parts.push("%c", heldLeadSep);
              args.push("");
            } else parts.push(heldLeadSep);
            heldLeadSep = "";
          }
          parts.push("%c", heldText);
          args.push(held.css);
          curId = held.styleId;
          curBg = held.bg;
          curLink = held.link;
          curDeco = held.deco;
          held = null;
        }
        if (s.styleId === curId || (coalesce && s.blank && !s.deco && !curDeco && s.bg === curBg && s.link === curLink && curId !== -1)) {
          parts.push(sep, s.text);
          sep = "";
          continue;
        }
        if (coalesce && s.blank) {
          held = s;
          heldLeadSep = sep;
          heldText = s.text;
          sep = "";
          continue;
        }
        if (sep) {
          if (curId !== -1) {
            parts.push("%c", sep);
            args.push("");
          } else parts.push(sep);
          sep = "";
        }
        parts.push("%c", s.text);
        args.push(s.css);
        curId = s.styleId;
        curBg = s.bg;
        curLink = s.link;
        curDeco = s.deco;
      }
    }
    if (held !== null) {
      if (heldLeadSep) {
        if (curId !== -1) {
          parts.push("%c", heldLeadSep);
          args.push("");
        } else parts.push(heldLeadSep);
      }
      parts.push("%c", heldText);
      args.push(held.css);
      curId = held.styleId;
    }
    if (sep) {
      if (curId !== -1) {
        parts.push("%c", sep);
        args.push("");
      } else parts.push(sep);
    }
    const format = parts.join("");
    parts.length = 0;
    return { format, args };
  }

  /**
   * Diff row hashes and re-encode only changed rows. Returns `null` (with zero
   * string allocation) when nothing changed and `force` is not set.
   */
  encode(buffer: CellGrid, options: DriverRenderOptions = {}): { frame: ConsoleFrame | null; dirtyRows: number } {
    const banner = this.banner;
    if (banner === null || buffer.height === 0) return this.encodeRows(buffer, options);
    // Console-only: drawn over the last row for this frame, then put back, so the buffer never holds it.
    const y = buffer.height - 1;
    let fg = parseBannerColor(banner.fg);
    let bg = parseBannerColor(banner.bg);
    if (this.bannerSwapped) [fg, bg] = [bg, fg];
    const saved = buffer._overlayRow(y, banner.text, fg, bg, ATTR_BOLD);
    try {
      return this.encodeRows(buffer, options);
    } finally {
      buffer._restoreRow(y, saved);
    }
  }

  /**
   * A one-row bar drawn over the last row of every logged frame, never into the buffer, so inline
   * mirrors and editors that read the buffer don't show it. `null` removes it. With `repaint`, in a
   * browser without reduced motion, a new banner blinks (swaps fg and bg) a few times, calling
   * `repaint` on each swap, then stays. @internal
   */
  _setBanner(banner: ConsoleBanner | null, repaint?: () => void): void {
    this.banner = banner;
    this.bannerSwapped = false;
    if (this.blinkTimer !== null) clearInterval(this.blinkTimer);
    this.blinkTimer = null;
    if (banner === null || repaint === undefined || typeof matchMedia !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swaps = 0;
    const timer = setInterval(() => {
      this.bannerSwapped = !this.bannerSwapped;
      if (++swaps === BLINK_SWAPS) {
        clearInterval(timer);
        this.blinkTimer = null;
      }
      repaint();
    }, BLINK_MS);
    this.blinkTimer = timer;
  }

  private encodeRows(buffer: CellGrid, options: DriverRenderOptions): { frame: ConsoleFrame | null; dirtyRows: number } {
    this.lastVisualFrames = 1;
    this.spriteBudget = SPRITE_MAX_BYTES;
    const hasSprites = buffer._sprites.length > 0;
    const useSpriteUrls = hasSprites && this.profile.supportsSpriteUrl;
    if (hasSprites && !useSpriteUrls) {
      this._discardStagedKeyframes();
      buffer._ensureSpritesMaterialized();
    } else if (!hasSprites && this.stagedSprites.size > 0) {
      this._discardStagedKeyframes();
    }
    const W = buffer.width;
    const H = buffer.height;
    const resized = W !== this.width || H !== this.height;
    if (resized) {
      this.width = W;
      this.height = H;
      this.prevHashes = new Uint32Array(H);
      this.rowSpanned = new Uint8Array(H);
      this.hasSpannedRows = false;
      this.rowCache = new Array<CompiledSpan[]>(H);
      this.preRows = new Array<PrecompiledRow>(H);
      this.rendered = false;
    }

    if (!useSpriteUrls) {
      const hashes = buffer.getRowHashes();
      const prev = this.prevHashes;
      const spanned = this.rowSpanned;
      const hadSpanned = this.hasSpannedRows;
      if (hadSpanned) this.hasSpannedRows = false;
      let dirty = 0;
      const full = !this.rendered;
      for (let y = 0; y < H; y++) {
        const h = hashes[y] as number;
        const wasSpanned = hadSpanned && spanned[y] !== 0;
        if (wasSpanned) spanned[y] = 0;
        if (full || wasSpanned || h !== prev[y]) {
          dirty++;
          prev[y] = h;
          const compiled = this.compileRow(buffer, y);
          this.rowCache[y] = compiled;
          this.preRows[y] = buildPrecompiledRow(compiled);
        }
      }
      if (dirty === 0 && !options.force && this.rendered) return { frame: null, dirtyRows: 0 };
      this.rendered = true;
      return { frame: this.assemble(), dirtyRows: dirty };
    }

    const { nextSpanned, dirty, maxVisualFrames, drewCells } = buffer._sprites[0]!.codec.encodeSprites(
      this,
      buffer,
      buffer.getRowHashes(),
      this.prevHashes,
      this.rowSpanned,
      this.rowCache,
      this.stagedSprites,
      this.stagePixelPool,
      this.spriteSvgCache,
      !this.rendered,
      options.force === true,
      now(),
    );
    for (let y = 0; y < H; y++) {
      if (this.rowCache[y] !== undefined && this.preRows[y]?.spans !== this.rowCache[y]) {
        this.preRows[y] = buildPrecompiledRow(this.rowCache[y] as CompiledSpan[]);
      }
    }
    this.rowSpanned = nextSpanned;
    this.hasSpannedRows = nextSpanned.some((v) => v !== 0);
    this.lastVisualFrames = maxVisualFrames;
    if (!drewCells) this.spriteBudget = SPRITE_URL_MAX_BYTES;

    if (dirty === 0 && maxVisualFrames <= 1 && !options.force && this.rendered) return { frame: null, dirtyRows: 0 };
    this.rendered = true;
    return { frame: this.assemble(), dirtyRows: dirty };
  }

  render(buffer: CellGrid, options: DriverRenderOptions = {}): DriverRenderResult {
    const t0 = now();
    const { frame, dirtyRows } = this.encode(buffer, options);
    if (frame === null) return SKIPPED;
    const hasSprites = buffer._sprites.length > 0;
    let frameBytes = 0;
    if (hasSprites) {
      frameBytes = frame.format.length;
      for (let i = 0; i < frame.args.length; i++) frameBytes += (frame.args[i] as string).length;
    }
    const target = this.target ?? (typeof console !== "undefined" ? console : null);
    let cleared = false;
    if (target !== null) {
      const mode = this.clearMode;
      let clear = mode === "frame";
      if (mode === "append") {
        const n = this.appended;
        const overSpriteBudget = hasSprites && n >= 1 && this.appendedBytes + frameBytes > this.spriteBudget;
        if (n === 0 || n >= this.maxFrames || overSpriteBudget || (n >= IDLE_COMPACT_FRAMES && t0 - this.lastLogAt >= IDLE_COMPACT_MS)) {
          clear = true;
          this.appended = 0;
          this.appendedBytes = 0;
        }
        this.appended++;
        if (hasSprites) this.appendedBytes += frameBytes;
        this.lastLogAt = t0;
      }
      if (clear) {
        target.clear();
        cleared = true;
      }
      if (mode === "append") this.logAppended(target, frame, !clear && dirtyRows === 0);
      else target.log(frame.format, ...frame.args);
    }
    this.lastSpanCount = frame.args.length;
    const res: DriverRenderResult = {
      skipped: false,
      cleared,
      dirtyRows,
      spanCount: frame.args.length,
      encodeMs: now() - t0,
      frame,
    };
    if (this.lastVisualFrames > 1) res._visualFrames = this.lastVisualFrames;
    return res;
  }

  private logAppended(target: ConsoleTarget, frame: ConsoleFrame, unchanged: boolean): void {
    let format = frame.format;
    // DevTools collapses identical consecutive messages behind a repeat badge,
    // which shifts the frame sideways; vary a zero-width tail instead.
    if (unchanged) {
      this.parity = !this.parity;
      if (this.parity) format += "\u200b";
    }
    if (!(this.curtainOption ?? this.target === null)) {
      target.log(format, ...frame.args);
      return;
    }
    // A zero-width span of its own: a multi-row span would repeat the margin on every line.
    // Resetting style before "\n" keeps the break outside the curtain span (so margin-top:100vh
    // is applied once, not repeated on row 0) while ending the curtain's line beside DevTools'
    // right-floated source link ("VM12:1") instead of narrowing the frame's first row.
    target.log(`%c\u200b%c\n${format}`, this.curtainCss, "", ...frame.args);
  }
}
