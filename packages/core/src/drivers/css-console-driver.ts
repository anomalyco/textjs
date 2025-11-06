import { blendOver } from "../color";
import {
  ATTR_ALLOW_LINK,
  ATTR_INVERSE,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  CHAR_SPACE,
  GRAPHEME_POOL_FLAG,
  type CellBuffer,
} from "../cell-buffer";
import {
  DEFAULT_STYLE_RESOLVE,
  DEFAULT_TYPOGRAPHY,
  resolveStyle,
  styleCss,
  styleKeyOf,
  typographyCss,
  type ConsoleTypographyOptions,
  type EffectiveStyle,
  type StyleResolveOptions,
} from "./style";

/** Minimal console surface used by the driver; inject a fake for tests and benchmarks. */
export interface ConsoleTarget {
  clear(): void;
  log(...args: unknown[]): void;
}

export interface CompiledSpan {
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
}

export interface ConsoleFrame {
  format: string;
  args: string[];
}

export interface CssConsoleDriverOptions {
  console?: ConsoleTarget;
  typography?: Partial<ConsoleTypographyOptions>;
  style?: Partial<StyleResolveOptions>;
  /** Call `console.clear()` before each frame (default `true`). */
  clear?: boolean;
  /** Fold blank cells into the open span when their background matches (default `true`). */
  coalesceWhitespace?: boolean;
}

export interface DriverRenderOptions {
  /** Emit the frame even when no row changed. */
  force?: boolean;
}

export interface DriverRenderResult {
  skipped: boolean;
  dirtyRows: number;
  spanCount: number;
  encodeMs: number;
  frame: ConsoleFrame | null;
}

const now: () => number =
  typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();

const LINK_SCHEME = "://";
const LINK_SCHEME_SAFE = ":\u2060//";
const WWW = "www.";
const WWW_SAFE = "www\u2060.";

/**
 * Escape text for a `console.log` format string: `%` becomes `%%`, and unless
 * links are allowed, `://` and `www.` get a word joiner so Chromium's
 * linkifier cannot hijack span styles.
 */
export function escapeConsoleText(text: string, allowLink = false): string {
  let s = text;
  if (s.includes("%")) s = s.replaceAll("%", "%%");
  if (!allowLink) {
    if (s.includes(LINK_SCHEME)) s = s.replaceAll(LINK_SCHEME, LINK_SCHEME_SAFE);
    if (s.includes(WWW) || s.includes("WWW.")) s = s.replace(/www\./gi, (m) => `${m.slice(0, 3)}\u2060.`);
  }
  return s;
}

const SKIPPED: DriverRenderResult = Object.freeze({ skipped: true, dirtyRows: 0, spanCount: 0, encodeMs: 0, frame: null });

/**
 * Renders a `CellBuffer` into DevTools with exactly one `console.clear()` and
 * one `console.log(format, ...css)` per dirty frame, and zero calls otherwise.
 */
export class CssConsoleDriver {
  readonly typography: Readonly<ConsoleTypographyOptions>;
  readonly styleOptions: Readonly<StyleResolveOptions>;
  private target: ConsoleTarget | null;
  private readonly clearEachFrame: boolean;
  private readonly coalesce: boolean;
  private readonly baseCss: string;
  private readonly cssCache = new Map<bigint, string>();
  private width = -1;
  private height = -1;
  private prevHashes: Uint32Array = new Uint32Array(0);
  private nextHashes: Uint32Array = new Uint32Array(0);
  private rowCache: CompiledSpan[][] = [];
  private rendered = false;
  private lastSpanCount = 0;
  private readonly scratch: EffectiveStyle = { fg: 0, bg: 0, flags: 0 };

  constructor(options: CssConsoleDriverOptions = {}) {
    this.target = options.console ?? null;
    this.typography = Object.freeze({ ...DEFAULT_TYPOGRAPHY, ...options.typography });
    this.styleOptions = Object.freeze({ ...DEFAULT_STYLE_RESOLVE, ...options.style });
    this.clearEachFrame = options.clear ?? true;
    this.coalesce = options.coalesceWhitespace ?? true;
    this.baseCss = typographyCss(this.typography);
  }

  setConsole(target: ConsoleTarget | null): void {
    this.target = target;
  }

  /** Forget the previous frame so the next render is emitted in full. */
  invalidate(): void {
    this.rendered = false;
    this.width = -1;
    this.height = -1;
  }

  /** Number of interned CSS style strings. */
  get internedStyles(): number {
    return this.cssCache.size;
  }

  get lastFrameSpanCount(): number {
    return this.lastSpanCount;
  }

  private cssFor(style: EffectiveStyle, key: bigint): string {
    let css = this.cssCache.get(key);
    if (css === undefined) {
      css = styleCss(this.baseCss, style);
      if (this.cssCache.size >= 4096) {
        const oldest = this.cssCache.keys().next();
        if (!oldest.done) this.cssCache.delete(oldest.value);
      }
      this.cssCache.set(key, css);
    }
    return css;
  }

  /**
   * Compile one row into RLE spans. Plain spaces whose visible background
   * matches the open span are folded into it regardless of foreground, weight
   * or slant (all invisible on a blank cell), which removes most `%c` breaks
   * in real TUI layouts.
   */
  compileRow(buffer: CellBuffer, y: number): CompiledSpan[] {
    const spans: CompiledSpan[] = [];
    const W = buffer.width;
    const C = buffer.chars;
    const F = buffer.fg;
    const B = buffer.bg;
    const A = buffer.attrs;
    const pool = buffer.graphemePool;
    const opts = this.styleOptions;
    const scratch = this.scratch;
    const coalesce = this.coalesce;
    // Last resolved raw style.
    let rawFg = -1;
    let rawBg = -1;
    let rawAttrs = -1;
    let rKey = -1n;
    let rCss = "";
    let rBg = 0;
    let rLink = false;
    let rDeco = false;
    // Open span.
    let key = -1n;
    let css = "";
    let allowLink = false;
    let spanBg = 0;
    let spanDeco = false;
    let text = "";
    let blank = true;
    // Blank run waiting to see whether the next cell shares its background.
    let pend = 0;
    let pKey = -1n;
    let pCss = "";
    let pBg = 0;
    let pLink = false;
    const push = (): void => {
      if (text.length > 0) spans.push({ styleKey: key, css, text: blank ? text : escapeConsoleText(text, allowLink), bg: spanBg, blank, link: allowLink, deco: spanDeco });
    };
    const resolve = (f: number, b: number, a: number): void => {
      if (f === rawFg && b === rawBg && a === rawAttrs) return;
      rawFg = f;
      rawBg = b;
      rawAttrs = a;
      resolveStyle(f, b, a, opts, scratch);
      const k = styleKeyOf(scratch);
      if (k === rKey) return;
      rKey = k;
      rCss = this.cssFor(scratch, k);
      rBg = scratch.bg;
      rLink = (a & ATTR_ALLOW_LINK) !== 0;
      rDeco = (scratch.flags & (ATTR_UNDERLINE | ATTR_STRIKETHROUGH)) !== 0;
    };
    const promotePending = (): void => {
      if (pend === 0) return;
      if (pKey !== key) {
        push();
        key = pKey;
        css = pCss;
        allowLink = pLink;
        spanBg = pBg;
        spanDeco = false;
        text = "";
        blank = true;
      }
      text += " ".repeat(pend);
      pend = 0;
    };
    for (let i = y * W, end = i + W; i < end; i++) {
      const a = A[i] as number;
      if (a & ATTR_WIDE_CONT) continue;
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
        if (pend === 0 && key !== -1n && !spanDeco && effBg === spanBg && link === allowLink) {
          text += " ";
          continue;
        }
        if (pend > 0 && effBg === pBg && link === pLink) {
          pend++;
          continue;
        }
        promotePending();
        resolve(f, b, a);
        pend = 1;
        pKey = rKey;
        pCss = rCss;
        pBg = rBg;
        pLink = rLink;
        continue;
      }
      resolve(f, b, a);
      if (pend > 0) {
        if (!rDeco && rBg === pBg && rLink === pLink) {
          // The blanks adopt this cell's style.
          if (rKey !== key) {
            push();
            key = rKey;
            css = rCss;
            allowLink = rLink;
            spanBg = rBg;
            text = "";
            blank = true;
          }
          text += " ".repeat(pend);
          pend = 0;
        } else promotePending();
      }
      if (rKey !== key) {
        push();
        key = rKey;
        css = rCss;
        allowLink = rLink;
        spanBg = rBg;
        spanDeco = rDeco;
        text = "";
        blank = true;
      }
      blank = false;
      if (c >= GRAPHEME_POOL_FLAG) text += pool[c & 0x7fffffff] ?? " ";
      else if (c < 0x10000) text += String.fromCharCode(c < 0x20 ? CHAR_SPACE : c);
      else text += String.fromCodePoint(c);
    }
    promotePending();
    push();
    return spans;
  }

  /**
   * Assemble cached row spans into one format string. Spans with the same
   * style continue across `\n`, and blank spans join a neighbour that shares
   * their background.
   */
  private assemble(): ConsoleFrame {
    const parts: string[] = [];
    const args: string[] = [];
    let curKey: bigint | null = null;
    let curBg = 0;
    let curLink = false;
    let curDeco = false;
    // A blank span (plus the separators before it) held to see what follows.
    let held: CompiledSpan | null = null;
    let heldText = "";
    let sep = "";
    const open = (s: CompiledSpan, text: string): void => {
      parts.push("%c", text);
      args.push(s.css);
      curKey = s.styleKey;
      curBg = s.bg;
      curLink = s.link;
      curDeco = s.deco;
    };
    const flushHeld = (): void => {
      if (held === null) return;
      open(held, heldText);
      held = null;
    };
    const rows = this.rowCache;
    for (let y = 0; y < rows.length; y++) {
      const spans = rows[y] ?? [];
      if (y > 0) sep += "\n";
      for (let k = 0; k < spans.length; k++) {
        const s = spans[k] as CompiledSpan;
        if (held !== null) {
          if (s.styleKey === held.styleKey || (!s.deco && s.bg === held.bg && s.link === held.link)) {
            if (s.blank) {
              heldText += sep + s.text;
              sep = "";
              continue;
            }
            open(s, heldText + sep + s.text);
            held = null;
            sep = "";
            continue;
          }
          flushHeld();
        }
        if (s.styleKey === curKey || (this.coalesce && s.blank && !curDeco && s.bg === curBg && s.link === curLink && curKey !== null)) {
          parts.push(sep, s.text);
          sep = "";
          continue;
        }
        if (this.coalesce && s.blank) {
          held = s;
          heldText = sep + s.text;
          sep = "";
          continue;
        }
        if (sep) {
          parts.push(sep);
          sep = "";
        }
        open(s, s.text);
      }
    }
    flushHeld();
    if (sep) parts.push(sep);
    return { format: parts.join(""), args };
  }

  /**
   * Diff row hashes and re-encode only changed rows. Returns `null` (with zero
   * string allocation) when nothing changed and `force` is not set.
   */
  encode(buffer: CellBuffer, options: DriverRenderOptions = {}): { frame: ConsoleFrame | null; dirtyRows: number } {
    const W = buffer.width;
    const H = buffer.height;
    const resized = W !== this.width || H !== this.height;
    if (resized) {
      this.width = W;
      this.height = H;
      this.prevHashes = new Uint32Array(H);
      this.nextHashes = new Uint32Array(H);
      this.rowCache = new Array<CompiledSpan[]>(H);
      this.rendered = false;
    }
    const hashes = buffer.computeRowHashes(this.nextHashes);
    this.nextHashes = hashes;
    const prev = this.prevHashes;
    let dirty = 0;
    const full = !this.rendered;
    for (let y = 0; y < H; y++) {
      const h = hashes[y] as number;
      if (full || h !== prev[y]) {
        dirty++;
        prev[y] = h;
        this.rowCache[y] = this.compileRow(buffer, y);
      }
    }
    if (dirty === 0 && !options.force && this.rendered) return { frame: null, dirtyRows: 0 };
    this.rendered = true;
    return { frame: this.assemble(), dirtyRows: dirty };
  }

  render(buffer: CellBuffer, options: DriverRenderOptions = {}): DriverRenderResult {
    const t0 = now();
    const { frame, dirtyRows } = this.encode(buffer, options);
    if (frame === null) return SKIPPED;
    const target = this.target ?? (typeof console !== "undefined" ? console : null);
    if (target !== null) {
      if (this.clearEachFrame) target.clear();
      target.log(frame.format, ...frame.args);
    }
    this.lastSpanCount = frame.args.length;
    return { skipped: false, dirtyRows, spanCount: frame.args.length, encodeMs: now() - t0, frame };
  }
}
