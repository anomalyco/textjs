/**
 * Wire protocol for server-rendered console routes (`export const runtime = "server"`).
 *
 * Server ──(SSE `GET /__textjs/live`)──▶ frame player: {@link LiveServerMessage}
 * Player ──(`POST /__textjs/live`, JSON {@link LiveInput}[])──▶ server
 *
 * Frames are exact cell deltas: only rows whose hash changed since the last
 * message are sent, as runs of `[styleIndex, text]` against an append-only
 * per-connection style table of packed `[fg, bg, attrs]`. The player writes
 * them into its own `CellBuffer` and encodes `console.log` frames with the
 * same `CssConsoleDriver` the client renderer uses, so a server-rendered
 * frame is byte-for-byte the frame the client would have logged.
 *
 * Browser-safe and dependency-light: the frame player bundles this module.
 */

import { ATTR_WIDE_CONT, CHAR_CONTINUATION, GRAPHEME_POOL_FLAG, type CellBuffer } from "@textjs/core";

export const LIVE_PROTOCOL_VERSION = 1;
/** SSE stream (GET) and input endpoint (POST), relative to `basePath`. */
export const LIVE_PATH = "/__textjs/live";
/** Session id header required on input POSTs (a custom header forces a CORS preflight cross-origin). */
export const LIVE_SESSION_HEADER = "x-textjs-live";

/** `[fg, bg, attrs]` (packed `0xRRGGBBAA` colors, attribute bitmask without `ATTR_WIDE_CONT`). */
export type LiveStyle = [fg: number, bg: number, attrs: number];
/** `[y, runs, graphemes?]`: `runs` alternates style index and text. */
export type LiveRow = [y: number, runs: Array<number | string>, graphemes?: string[]];

/** A console-only bar over the last row of the frame, drawn by the player. */
export interface LiveBanner {
  text: string;
  fg: string;
  bg: string;
}

/** A banner from the server, or `null` when it is missing or malformed. */
export function parseLiveBanner(value: unknown): LiveBanner | null {
  if (typeof value !== "object" || value === null) return null;
  const { text, fg, bg } = value as Record<string, unknown>;
  if (typeof text !== "string" || typeof fg !== "string" || typeof bg !== "string" || text.length > 200 || fg.length > 64 || bg.length > 64) return null;
  return { text, fg, bg };
}

export interface LiveFrame {
  t: "f";
  w: number;
  h: number;
  /** Keyframe: reset the style table and buffer before applying. */
  k?: 1;
  /** Styles appended to the table, in index order. */
  s?: LiveStyle[];
  r: LiveRow[];
}

export type LiveServerMessage =
  | { t: "hello"; v: number; sid: string; resumed: boolean }
  | LiveFrame
  /** The app navigated: mirror it into the address bar. */
  | { t: "url"; href: string; replace?: boolean }
  /** The app went back / forward (`router.back()`): move the browser's history by `delta`. */
  | { t: "go"; delta: number }
  | { t: "title"; title: string }
  /** The bar over the console frame's last row (the focus hint), or `null` to remove it. */
  | { t: "banner"; banner: LiveBanner | null }
  /** The next route renders on the client: load it as a document. */
  | { t: "load"; href: string }
  | { t: "error"; message: string };

export interface LiveKeyInput {
  type: "key";
  key: string;
  input: string;
  code: string;
  repeat: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

export type LiveInput =
  | LiveKeyInput
  | { type: "paste"; text: string }
  | { type: "wheel"; deltaX: number; deltaY: number; rows: number; cols: number; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }
  | { type: "resize"; cols: number; rows: number }
  | { type: "focus"; focused: boolean }
  /** Browser Back / Forward (`delta` entries from the previous one, when known). */
  | { type: "nav"; href: string; delta?: number };

export const MAX_COLS = 400;
export const MAX_ROWS = 200;
const MAX_KEY = 64;
const MAX_PASTE = 256 * 1024;

const clampInt = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : null;
const finite = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? Math.max(-1e6, Math.min(1e6, v)) : 0);
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);

/**
 * `true` for a same-origin app path: one leading `/`, no `//` or `/\` prefix
 * (which browsers resolve to another host), no backslashes or control characters.
 */
export function isAppPath(href: string): boolean {
  return href.startsWith("/") && !/^\/[/\\]/.test(href) && !/[\u0000-\u001f\u007f\\]/.test(href);
}

/** Validate one untrusted input event (returns `null` when malformed). */
export function parseLiveInput(raw: unknown): LiveInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as Record<string, unknown>;
  switch (m.type) {
    case "key": {
      const key = str(m.key, MAX_KEY);
      if (key === null || key.length === 0) return null;
      return {
        type: "key",
        key,
        input: str(m.input, MAX_KEY) ?? "",
        code: str(m.code, MAX_KEY) ?? "",
        repeat: m.repeat === true,
        ctrl: m.ctrl === true,
        meta: m.meta === true,
        shift: m.shift === true,
        alt: m.alt === true,
      };
    }
    case "paste": {
      const text = str(m.text, MAX_PASTE);
      return text === null ? null : { type: "paste", text: text.replace(/\r\n?/g, "\n") };
    }
    case "wheel":
      return {
        type: "wheel",
        deltaX: finite(m.deltaX),
        deltaY: finite(m.deltaY),
        rows: finite(m.rows),
        cols: finite(m.cols),
        ctrl: m.ctrl === true,
        meta: m.meta === true,
        shift: m.shift === true,
        alt: m.alt === true,
      };
    case "resize": {
      const cols = clampInt(m.cols, 1, MAX_COLS);
      const rows = clampInt(m.rows, 1, MAX_ROWS);
      return cols === null || rows === null ? null : { type: "resize", cols, rows };
    }
    case "focus":
      return typeof m.focused === "boolean" ? { type: "focus", focused: m.focused } : null;
    case "nav": {
      const href = str(m.href, 2048);
      if (href === null || !isAppPath(href)) return null;
      const delta = clampInt(m.delta, -1000, 1000);
      return delta === null || delta === 0 ? { type: "nav", href } : { type: "nav", href, delta };
    }
    default:
      return null;
  }
}

/** Format one SSE event. */
export function sseEvent(message: LiveServerMessage, id?: string): string {
  return `${id !== undefined ? `id: ${id}\n` : ""}data: ${JSON.stringify(message)}\n\n`;
}

// ---------------------------------------------------------------------------
// Cell codec
// ---------------------------------------------------------------------------

/** Run text markers: a wide-grapheme continuation cell, a pooled grapheme, an escaped code point. */
const M_CONT = "\u0000";
const M_POOL = "\u0001";
const M_ESC = "\u0002";
const STYLE_TABLE_CAP = 4096;

/** Server half: diffs a `CellBuffer` against what this connection has been sent. */
export class LiveFrameEncoder {
  private styles = new Map<string, number>();
  private prev = new Uint32Array(0);
  private width = -1;
  private height = -1;
  private keyframe = true;

  /** Make the next frame a keyframe (a new or resumed connection). */
  reset(): void {
    this.keyframe = true;
  }

  /** Encode rows changed since the last call, or `null` when nothing changed. */
  encode(buf: CellBuffer): LiveFrame | null {
    const W = buf.width;
    const H = buf.height;
    if (W !== this.width || H !== this.height || this.styles.size > STYLE_TABLE_CAP) this.keyframe = true;
    const key = this.keyframe;
    if (key) {
      this.keyframe = false;
      this.width = W;
      this.height = H;
      this.prev = new Uint32Array(H);
      this.styles = new Map();
    }
    const hashes = buf.getRowHashes();
    const newStyles: LiveStyle[] = [];
    const rows: LiveRow[] = [];
    for (let y = 0; y < H; y++) {
      const h = hashes[y] as number;
      if (!key && h === this.prev[y]) continue;
      this.prev[y] = h;
      rows.push(this.encodeRow(buf, y, newStyles));
    }
    if (rows.length === 0) return null;
    const frame: LiveFrame = { t: "f", w: W, h: H, r: rows };
    if (key) frame.k = 1;
    if (newStyles.length > 0) frame.s = newStyles;
    return frame;
  }

  private encodeRow(buf: CellBuffer, y: number, newStyles: LiveStyle[]): LiveRow {
    const W = buf.width;
    const cells = buf.readCells();
    const C = cells.chars;
    const F = cells.fg;
    const B = cells.bg;
    const A = cells.attrs;
    const runs: Array<number | string> = [];
    let graphemes: string[] | undefined;
    let curF = -1;
    let curB = -1;
    let curA = -1;
    let text = "";
    for (let i = y * W, end = i + W; i < end; i++) {
      const f = F[i] as number;
      const b = B[i] as number;
      const rawA = A[i] as number;
      const a = rawA & ~ATTR_WIDE_CONT;
      if (f !== curF || b !== curB || a !== curA) {
        if (text.length > 0) runs.push(text);
        text = "";
        curF = f;
        curB = b;
        curA = a;
        const k = `${f},${b},${a}`;
        let idx = this.styles.get(k);
        if (idx === undefined) {
          idx = this.styles.size;
          this.styles.set(k, idx);
          newStyles.push([f, b, a]);
        }
        runs.push(idx);
      }
      const c = C[i] as number;
      if (rawA & ATTR_WIDE_CONT) text += M_CONT;
      else if (c >= GRAPHEME_POOL_FLAG) {
        text += M_POOL;
        (graphemes ??= []).push(cells.graphemePool[c & 0x7fffffff] ?? " ");
      } else if (c < 0x20 || c === 0x7f || (c >= 0xd800 && c <= 0xdfff)) text += `${M_ESC}${c.toString(16)};`;
      else text += c < 0x10000 ? String.fromCharCode(c) : String.fromCodePoint(c);
    }
    if (text.length > 0) runs.push(text);
    return graphemes ? [y, runs, graphemes] : [y, runs];
  }
}

/** Player half: applies {@link LiveFrame}s to a `CellBuffer`. */
export class LiveFrameDecoder {
  private styles: LiveStyle[] = [];

  /** Apply a frame. Returns `false` when it can't be applied (a delta before any keyframe). */
  apply(buf: CellBuffer, frame: LiveFrame): boolean {
    if (frame.k === 1) {
      this.styles = [];
      if (buf.width !== frame.w || buf.height !== frame.h) buf.resize(frame.w, frame.h);
      buf.clear();
    } else if (buf.width !== frame.w || buf.height !== frame.h) return false;
    if (frame.s) for (const s of frame.s) this.styles.push(s);
    const W = buf.width;
    const C = buf.chars;
    const F = buf.fg;
    const B = buf.bg;
    const A = buf.attrs;
    for (const row of frame.r) {
      const y = row[0];
      if (y < 0 || y >= buf.height) continue;
      const runs = row[1];
      const graphemes = row[2];
      let gi = 0;
      let i = y * W;
      const end = i + W;
      let f = 0;
      let b = 0;
      let a = 0;
      for (let r = 0; r < runs.length; r++) {
        const item = runs[r] as number | string;
        if (typeof item === "number") {
          const s = this.styles[item];
          if (s === undefined) return false;
          f = s[0];
          b = s[1];
          a = s[2];
          continue;
        }
        for (let k = 0; k < item.length && i < end; ) {
          const cp = item.codePointAt(k) as number;
          let code: number;
          let attrs = a;
          if (cp === 0) {
            code = CHAR_CONTINUATION;
            attrs = a | ATTR_WIDE_CONT;
            k++;
          } else if (cp === 1) {
            code = buf.internGrapheme(graphemes?.[gi++] ?? " ");
            k++;
          } else if (cp === 2) {
            const semi = item.indexOf(";", k);
            if (semi < 0) return false;
            code = Number.parseInt(item.slice(k + 1, semi), 16) >>> 0;
            k = semi + 1;
          } else {
            code = cp;
            k += cp > 0xffff ? 2 : 1;
          }
          C[i] = code;
          F[i] = f;
          B[i] = b;
          A[i] = attrs;
          i++;
        }
      }
      buf.markRowsDirty(y);
    }
    return true;
  }
}
