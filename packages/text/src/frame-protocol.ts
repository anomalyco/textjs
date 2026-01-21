/**
 * `@textjs/next/frame-protocol` — the wire format `text dev` uses to mirror a
 * running app's console frames to editors (the VS Code Live Preview) and to
 * forward keyboard input back.
 *
 * Browser tab ──(Vite HMR socket: `textjs:frame`)──▶ dev server ──(SSE `/__textjs/frames`)──▶ editor
 * Editor ──(POST `/__textjs/input`)──▶ dev server ──(HMR: `textjs:input`)──▶ browser tab
 *
 * Frames are row deltas: only rows whose spans changed since the previous
 * message are sent, each with a small per-message style table. Pure and
 * dependency-free so the editor bundle can share it.
 */

import type { StyledFrame, StyledSpan } from "@textjs/core";

export const FRAME_PROTOCOL_VERSION = 1;

/** Server-sent events stream of {@link WireFrame} messages (dev only, loopback only). */
export const FRAMES_PATH = "/__textjs/frames";
/** `POST` an {@link InputMessage} as JSON. */
export const INPUT_PATH = "/__textjs/input";
/** `GET` a {@link DevStatus} JSON document. */
export const STATUS_PATH = "/__textjs/status";

/** Browser → server: an encoded frame. */
export const HMR_FRAME_EVENT = "textjs:frame";
/** Server → browser: `{ active: boolean }`, whether anyone is watching. */
export const HMR_MIRROR_EVENT = "textjs:mirror";
/** Server → browser: an {@link InputMessage}. */
export const HMR_INPUT_EVENT = "textjs:input";
/** Browser → server: sent on boot and reconnect; the server replies with {@link HMR_MIRROR_EVENT}. */
export const HMR_HELLO_EVENT = "textjs:hello";
/** Required on `POST /__textjs/input` (with a JSON body) so cross-site simple requests are rejected. */
export const MIRROR_HEADER = "x-textjs-mirror";

export const FLAG_BOLD = 1;
export const FLAG_DIM = 2;
export const FLAG_ITALIC = 4;
export const FLAG_UNDERLINE = 8;
export const FLAG_STRIKETHROUGH = 16;
export const FLAG_INVERSE = 32;
export const FLAG_ALLOW_LINK = 64;

/** `[fgCss, bgCss, flags]` — `null` colors use the theme default. */
export type WireStyle = [fg: string | null, bg: string | null, flags: number];
/** `[text, styleIndex]`, or `[text, styleIndex, width]` when the column width differs from `text.length`. */
export type WireSpan = [text: string, style: number] | [text: string, style: number, width: number];

export interface FrameMeta {
  /** Current pathname of the app. */
  path?: string;
  title?: string;
  /** Whether the page has keyboard focus. */
  focused?: boolean;
}

export interface WireFrame {
  v: typeof FRAME_PROTOCOL_VERSION;
  /** Monotonic per-source sequence number. */
  seq: number;
  /** Source identifier (one per browser tab). */
  source?: string;
  width: number;
  height: number;
  /** `true` when `rows` covers every row (receivers drop previous state). */
  full: boolean;
  styles: WireStyle[];
  /** `[y, spans]` for each changed row. */
  rows: Array<[y: number, spans: WireSpan[]]>;
  meta?: FrameMeta;
}

export interface DevStatus {
  name: "textjs";
  version: string;
  /** Absolute project root. */
  root: string;
  /** Browser tabs currently connected to the HMR socket. */
  clients: number;
  /** Browser tabs running the app (announced via `textjs:hello`). */
  sources: number;
  /** Editors subscribed to the frame stream. */
  watchers: number;
  /** Size of the most recent frame, if any. */
  grid: { width: number; height: number } | null;
  path: string | null;
}

export type InputMessage =
  | {
      type: "key";
      key: string;
      code?: string;
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      repeat?: boolean;
    }
  | { type: "paste"; text: string }
  | { type: "wheel"; deltaX: number; deltaY: number; deltaMode: number }
  | { type: "navigate"; href: string };

// ---------------------------------------------------------------------------
// Spans
// ---------------------------------------------------------------------------

export function spanFlags(s: StyledSpan): number {
  return (
    (s.bold ? FLAG_BOLD : 0) |
    (s.dim ? FLAG_DIM : 0) |
    (s.italic ? FLAG_ITALIC : 0) |
    (s.underline ? FLAG_UNDERLINE : 0) |
    (s.strikethrough ? FLAG_STRIKETHROUGH : 0) |
    (s.inverse ? FLAG_INVERSE : 0) |
    (s.allowLink ? FLAG_ALLOW_LINK : 0)
  );
}

/** A {@link StyledSpan} rebuilt from wire data. Packed colors are not transmitted (they read `0`). */
export function toStyledSpan(text: string, width: number, style: WireStyle): StyledSpan {
  const [fgCss, bgCss, f] = style;
  return {
    text,
    width,
    fg: 0,
    bg: 0,
    attrs: f,
    fgCss,
    bgCss,
    bold: (f & FLAG_BOLD) !== 0,
    dim: (f & FLAG_DIM) !== 0,
    italic: (f & FLAG_ITALIC) !== 0,
    underline: (f & FLAG_UNDERLINE) !== 0,
    strikethrough: (f & FLAG_STRIKETHROUGH) !== 0,
    inverse: (f & FLAG_INVERSE) !== 0,
    allowLink: (f & FLAG_ALLOW_LINK) !== 0,
  };
}

function rowKey(spans: readonly StyledSpan[]): string {
  let k = "";
  for (const s of spans) k += `${s.fgCss ?? ""}\u0001${s.bgCss ?? ""}\u0001${spanFlags(s)}\u0001${s.width}\u0001${s.text}\u0002`;
  return k;
}

// ---------------------------------------------------------------------------
// Encoder / decoder
// ---------------------------------------------------------------------------

export interface EncodeOptions {
  meta?: FrameMeta;
  source?: string;
}

/**
 * Stateful encoder: the first call (and the first after `reset()` or a resize)
 * emits a full frame, later calls emit only changed rows. Returns `null` when
 * nothing changed and no meta changed.
 */
export class FrameEncoder {
  private keys: string[] = [];
  private width = -1;
  private height = -1;
  private seq = 0;
  private metaKey = "";

  reset(): void {
    this.keys = [];
    this.width = -1;
    this.height = -1;
    this.metaKey = "";
  }

  encode(frame: StyledFrame, options: EncodeOptions = {}): WireFrame | null {
    const full = frame.width !== this.width || frame.height !== this.height;
    if (full) {
      this.width = frame.width;
      this.height = frame.height;
      this.keys = new Array<string>(frame.height).fill("\u0000");
    }
    const styles: WireStyle[] = [];
    const styleIds = new Map<string, number>();
    const rows: WireFrame["rows"] = [];
    for (let y = 0; y < frame.height; y++) {
      const spans = frame.rows[y] ?? [];
      const key = rowKey(spans);
      if (!full && key === this.keys[y]) continue;
      this.keys[y] = key;
      const wire: WireSpan[] = [];
      for (const s of spans) {
        const flags = spanFlags(s);
        const sk = `${s.fgCss ?? ""}\u0001${s.bgCss ?? ""}\u0001${flags}`;
        let id = styleIds.get(sk);
        if (id === undefined) {
          id = styles.length;
          styles.push([s.fgCss, s.bgCss, flags]);
          styleIds.set(sk, id);
        }
        wire.push(s.width === s.text.length ? [s.text, id] : [s.text, id, s.width]);
      }
      rows.push([y, wire]);
    }
    const metaKey = options.meta ? JSON.stringify(options.meta) : "";
    const metaChanged = metaKey !== this.metaKey;
    this.metaKey = metaKey;
    if (rows.length === 0 && !metaChanged) return null;
    const out: WireFrame = { v: FRAME_PROTOCOL_VERSION, seq: ++this.seq, width: frame.width, height: frame.height, full, styles, rows };
    if (options.source !== undefined) out.source = options.source;
    if (options.meta) out.meta = options.meta;
    return out;
  }
}

/** Encode a complete frame without delta state (for late subscribers). */
export function encodeFullFrame(frame: StyledFrame, options: EncodeOptions & { seq?: number } = {}): WireFrame {
  const out = new FrameEncoder().encode(frame, options) as WireFrame;
  if (options.seq !== undefined) out.seq = options.seq;
  return out;
}

/** Applies {@link WireFrame} messages to rebuild the current {@link StyledFrame}. */
export class FrameDecoder {
  frame: StyledFrame | null = null;
  meta: FrameMeta = {};
  seq = 0;

  /** Returns the updated frame, or `null` when a delta arrives before any full frame. */
  apply(msg: WireFrame): StyledFrame | null {
    if (msg.v !== FRAME_PROTOCOL_VERSION) throw new Error(`Unsupported frame protocol v${String(msg.v)} (expected v${FRAME_PROTOCOL_VERSION}).`);
    let rows: StyledSpan[][];
    if (msg.full || this.frame === null || this.frame.width !== msg.width || this.frame.height !== msg.height) {
      if (!msg.full) return null;
      rows = Array.from({ length: msg.height }, () => []);
    } else rows = this.frame.rows.slice();
    for (const [y, spans] of msg.rows) {
      if (y < 0 || y >= msg.height) continue;
      rows[y] = spans.map(([text, id, width]) => toStyledSpan(text, width ?? text.length, msg.styles[id] ?? [null, null, 0]));
    }
    this.frame = { width: msg.width, height: msg.height, rows };
    this.seq = msg.seq;
    if (msg.meta) this.meta = { ...this.meta, ...msg.meta };
    return this.frame;
  }

  reset(): void {
    this.frame = null;
    this.meta = {};
    this.seq = 0;
  }
}

/** Plain text of a frame (trailing whitespace trimmed), for tests and copy. */
export function frameToText(frame: StyledFrame): string {
  return frame.rows
    .map((r) => r.map((s) => s.text).join("").replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const MAX_TEXT = 64 * 1024;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validate an untrusted {@link InputMessage}. Returns a clean copy or `null`. */
export function parseInputMessage(value: unknown): InputMessage | null {
  if (!isObj(value)) return null;
  const b = (k: string): boolean => value[k] === true;
  switch (value.type) {
    case "key": {
      const key = value.key;
      if (typeof key !== "string" || key.length === 0 || key.length > 32) return null;
      const code = typeof value.code === "string" && value.code.length <= 32 ? value.code : undefined;
      const msg: InputMessage = { type: "key", key, ctrlKey: b("ctrlKey"), metaKey: b("metaKey"), shiftKey: b("shiftKey"), altKey: b("altKey") };
      if (code !== undefined) msg.code = code;
      if (b("repeat")) msg.repeat = true;
      return msg;
    }
    case "paste":
      return typeof value.text === "string" && value.text.length <= MAX_TEXT ? { type: "paste", text: value.text } : null;
    case "wheel": {
      const n = (k: string): number => (typeof value[k] === "number" && Number.isFinite(value[k]) ? Math.max(-10_000, Math.min(10_000, value[k] as number)) : 0);
      const mode = value.deltaMode === 1 || value.deltaMode === 2 ? value.deltaMode : 0;
      return { type: "wheel", deltaX: n("deltaX"), deltaY: n("deltaY"), deltaMode: mode };
    }
    case "navigate": {
      const href = value.href;
      // Same-app paths only: never let a forwarded message send the tab elsewhere.
      if (typeof href !== "string" || href.length > 2048 || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
      return { type: "navigate", href };
    }
    default:
      return null;
  }
}

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function isCssColor(v: unknown): boolean {
  return v === null || (typeof v === "string" && HEX_COLOR.test(v));
}

/** Validate an untrusted {@link WireFrame} (structure, bounds and hex-only colors). */
export function isWireFrame(value: unknown): value is WireFrame {
  if (!isObj(value)) return false;
  if (value.v !== FRAME_PROTOCOL_VERSION || typeof value.seq !== "number" || typeof value.full !== "boolean") return false;
  const { width, height } = value;
  if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) < 1 || (height as number) < 1 || (width as number) > 1000 || (height as number) > 1000) return false;
  if (!Array.isArray(value.styles) || !Array.isArray(value.rows)) return false;
  for (const s of value.styles) {
    if (!Array.isArray(s) || s.length !== 3) return false;
    if (!isCssColor(s[0]) || !isCssColor(s[1]) || typeof s[2] !== "number") return false;
  }
  for (const r of value.rows) {
    if (!Array.isArray(r) || r.length !== 2 || !Number.isInteger(r[0]) || !Array.isArray(r[1])) return false;
    for (const sp of r[1] as unknown[]) {
      if (!Array.isArray(sp) || typeof sp[0] !== "string" || !Number.isInteger(sp[1])) return false;
      if (sp.length > 2 && !Number.isInteger(sp[2])) return false;
    }
  }
  return value.meta === undefined || isObj(value.meta);
}
