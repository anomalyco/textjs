/**
 * `@textjs/react/terminal` — run the same app in a real terminal.
 *
 * ```ts
 * import { renderToTerminal } from "@textjs/react/terminal";
 * const app = await renderToTerminal(<App />);
 * await app.waitUntilExit();
 * ```
 *
 * Frames are rendered by the regular renderer, then diffed row by row into
 * truecolor ANSI (wrapped in synchronized-output markers so they never tear).
 * Keyboard, bracketed paste and mouse wheel come from raw-mode stdin.
 */

import type { ReactNode } from "react";
import {
  ANSI_BIDI_EXPLICIT,
  ANSI_BIDI_IMPLICIT,
  initYoga,
  InputEngine,
  renderToAnsi,
  txError,
  type CellBuffer,
  type ConsoleTarget,
  type KeyInputEvent,
  type PasteInputEvent,
  type WheelInputEvent,
} from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ConsoleRootOptions } from "./root";

export interface TerminalInput {
  isTTY?: boolean;
  setRawMode?(raw: boolean): unknown;
  setEncoding?(encoding: "utf8"): unknown;
  on(event: "data", listener: (chunk: string | Uint8Array) => void): unknown;
  off?(event: "data", listener: (chunk: string | Uint8Array) => void): unknown;
  removeListener?(event: "data", listener: (chunk: string | Uint8Array) => void): unknown;
  resume?(): unknown;
  pause?(): unknown;
}

export interface TerminalOutput {
  columns?: number;
  rows?: number;
  write(chunk: string): unknown;
  on?(event: "resize", listener: () => void): unknown;
  off?(event: "resize", listener: () => void): unknown;
  removeListener?(event: "resize", listener: () => void): unknown;
}

export interface TerminalOptions extends Omit<ConsoleRootOptions, "console" | "input" | "width" | "height" | "responsive" | "viewport" | "registerGlobal"> {
  /** Default `process.stdin`. */
  stdin?: TerminalInput;
  /** Default `process.stdout`. */
  stdout?: TerminalOutput;
  /** Fixed size (default: the terminal size, following resizes). */
  cols?: number;
  rows?: number;
  /** Use the alternate screen so the scrollback is restored on exit (default `true`). */
  altScreen?: boolean;
  /** Mouse wheel scrolling (default `true`). */
  mouse?: boolean;
  /** Ctrl+C unmounts and restores the terminal (default `true`). */
  exitOnCtrlC?: boolean;
  /** Frame rate cap (default `60`). */
  fps?: number;
  /**
   * Hold `console.*` output while the app owns the screen (stray logs would
   * tear the frame) and replay it after exit (default `true`).
   */
  patchConsole?: boolean;
}

export interface TerminalRoot {
  readonly root: ConsoleRoot;
  rerender(element: ReactNode): void;
  /** Unmount, restore the terminal and stop reading stdin. */
  unmount(): void;
  waitUntilExit(): Promise<void>;
}

const ESC = "\u001b";
const CSI = `${ESC}[`;

type TerminalEvent = KeyInputEvent | PasteInputEvent | WheelInputEvent;

function key(name: string, mods: Partial<Pick<KeyInputEvent, "ctrl" | "alt" | "shift" | "meta">> = {}, input = ""): KeyInputEvent {
  return {
    type: "key",
    key: name,
    input,
    code: "",
    repeat: false,
    ctrl: mods.ctrl ?? false,
    alt: mods.alt ?? false,
    shift: mods.shift ?? false,
    meta: mods.meta ?? false,
  };
}

function modsFromParam(p: number | undefined): { shift: boolean; alt: boolean; ctrl: boolean; meta: boolean } {
  const m = Math.max(0, (p ?? 1) - 1);
  return { shift: (m & 1) !== 0, alt: (m & 2) !== 0, ctrl: (m & 4) !== 0, meta: (m & 8) !== 0 };
}

const CSI_LETTER: Readonly<Record<string, string>> = { A: "up", B: "down", C: "right", D: "left", H: "home", F: "end", P: "f1", Q: "f2", R: "f3", S: "f4" };
const CSI_TILDE: Readonly<Record<number, string>> = {
  1: "home",
  2: "insert",
  3: "delete",
  4: "end",
  5: "pageup",
  6: "pagedown",
  7: "home",
  8: "end",
  11: "f1",
  12: "f2",
  13: "f3",
  14: "f4",
  15: "f5",
  17: "f6",
  18: "f7",
  19: "f8",
  20: "f9",
  21: "f10",
  23: "f11",
  24: "f12",
};

function printable(ch: string, mods: { alt?: boolean } = {}): KeyInputEvent {
  const upper = ch.length === 1 && ch >= "A" && ch <= "Z";
  if (ch === " ") return key("space", mods, mods.alt ? "" : " ");
  return key(ch.toLowerCase(), { ...mods, shift: upper }, mods.alt ? "" : ch);
}

function controlChar(code: number): KeyInputEvent | null {
  // In raw mode the Return key sends CR. LF is Ctrl+J (a newline in multiline editors).
  if (code === 13) return key("return");
  if (code === 9) return key("tab");
  if (code === 127 || code === 8) return key("backspace");
  if (code === 27) return key("escape");
  if (code === 0) return key("space", { ctrl: true });
  if (code >= 1 && code <= 26) return key(String.fromCharCode(96 + code), { ctrl: true });
  return null;
}

/** Incremental parser for raw terminal input (keys, bracketed paste, SGR mouse wheel). */
export class TerminalInputParser {
  private pasting: string | null = null;
  private pending = "";

  /** Parse a chunk; incomplete escape sequences wait for the next chunk (call `flush()` after a short idle). */
  push(chunk: string): TerminalEvent[] {
    const out: TerminalEvent[] = [];
    let s = this.pending + chunk;
    this.pending = "";
    let i = 0;
    while (i < s.length) {
      if (this.pasting !== null) {
        const end = s.indexOf(`${CSI}201~`, i);
        if (end < 0) {
          this.pasting += s.slice(i);
          i = s.length;
          break;
        }
        this.pasting += s.slice(i, end);
        out.push({ type: "paste", text: this.pasting.replace(/\r\n?/g, "\n") });
        this.pasting = null;
        i = end + 6;
        continue;
      }
      const ch = s[i] as string;
      if (ch !== ESC) {
        const code = ch.charCodeAt(0);
        if (code < 32 || code === 127) {
          const ev = controlChar(code);
          if (ev) out.push(ev);
          i++;
          continue;
        }
        const cp = s.codePointAt(i) as number;
        const g = String.fromCodePoint(cp);
        out.push(printable(g));
        i += g.length;
        continue;
      }
      // Escape sequences.
      if (i + 1 >= s.length) {
        this.pending = s.slice(i);
        break;
      }
      const next = s[i + 1] as string;
      if (next === "[") {
        const m = /^\x1b\[(<?)([\d;]*)([A-Za-z~])/.exec(s.slice(i));
        if (!m) {
          if (/^\x1b\[[<\d;]*$/.test(s.slice(i))) {
            this.pending = s.slice(i);
            break;
          }
          out.push(key("escape"));
          i++;
          continue;
        }
        i += m[0].length;
        const params = (m[2] as string).split(";").map((p) => (p === "" ? undefined : Number(p)));
        const final = m[3] as string;
        if (m[1] === "<") {
          const b = params[0] ?? 0;
          if ((b & 64) !== 0 && final === "M") {
            const dir = (b & 3) === 0 ? -1 : (b & 3) === 1 ? 1 : 0;
            if (dir !== 0) {
              out.push({ type: "wheel", deltaX: 0, deltaY: dir * 48, rows: dir * 3, cols: 0, ctrl: (b & 16) !== 0, meta: false, shift: (b & 4) !== 0, alt: (b & 8) !== 0 });
            }
          }
          continue;
        }
        if (final === "~" && params[0] === 200) {
          this.pasting = "";
          continue;
        }
        if (final === "Z") {
          out.push(key("tab", { shift: true }));
          continue;
        }
        if (final === "u") {
          const code = params[0] ?? 0;
          const mods = modsFromParam(params[1]);
          const base = controlChar(code);
          if (base && code !== 0) out.push({ ...base, ...mods, ctrl: base.ctrl || mods.ctrl });
          else if (code >= 32 && code <= 0x10ffff) {
            const c = String.fromCodePoint(code);
            out.push(key(c === " " ? "space" : c.toLowerCase(), mods, mods.ctrl || mods.meta || mods.alt ? "" : mods.shift ? c.toUpperCase() : c));
          }
          continue;
        }
        if (final === "~") {
          const name = CSI_TILDE[params[0] ?? 0];
          if (name) out.push(key(name, modsFromParam(params[1])));
          continue;
        }
        const name = CSI_LETTER[final];
        if (name) out.push(key(name, modsFromParam(params[1])));
        continue;
      }
      if (next === "O" && i + 2 < s.length) {
        const name = CSI_LETTER[s[i + 2] as string];
        out.push(name ? key(name) : key("escape"));
        i += name ? 3 : 1;
        continue;
      }
      if (next === ESC) {
        out.push(key("escape"));
        i++;
        continue;
      }
      // Alt+key.
      const code = next.charCodeAt(0);
      const ctrl = controlChar(code);
      if (ctrl) out.push({ ...ctrl, alt: true });
      else {
        const cp = s.codePointAt(i + 1) as number;
        out.push(printable(String.fromCodePoint(cp), { alt: true }));
        i += String.fromCodePoint(cp).length - 1;
      }
      i += 2;
    }
    s = "";
    return out;
  }

  /** Resolve a lone pending `ESC` as the Escape key. */
  flush(): TerminalEvent[] {
    if (this.pending === "") return [];
    const p = this.pending;
    this.pending = "";
    return p === ESC ? [key("escape")] : [key("escape"), ...this.push(p.slice(1))];
  }

  get hasPending(): boolean {
    return this.pending !== "";
  }
}

/** Parse a complete chunk of raw terminal input into key / paste / wheel events. */
export function parseTerminalInput(data: string): TerminalEvent[] {
  const p = new TerminalInputParser();
  return [...p.push(data), ...p.flush()];
}

/** Row-diffing ANSI writer: emits only rows that changed since the last frame. */
export class TerminalFrameWriter {
  private rows: string[] = [];
  constructor(private readonly write: (chunk: string) => void) {}

  invalidate(): void {
    this.rows = [];
  }

  /** Write the changed rows of `buffer`. Returns the number of rows written. */
  render(buffer: CellBuffer): number {
    // `renderToTerminal` switches bidi mode once; a per-frame prefix would make row 0 look changed.
    const lines = renderToAnsi(buffer, { lineSeparator: "\n", trimEnd: false, bidiMode: false }).split("\n");
    let out = "";
    let changed = 0;
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y] as string;
      if (this.rows[y] === line) continue;
      out += `${CSI}${y + 1};1H${line}`;
      changed++;
    }
    if (this.rows.length > lines.length) out += `${CSI}${lines.length + 1};1H${CSI}0m${CSI}J`;
    this.rows = lines;
    if (changed > 0 || out !== "") this.write(`${CSI}?2026h${out}${CSI}?2026l`);
    return changed;
  }
}

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug"] as const;
type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

const nullConsole: ConsoleTarget = { clear() {}, log() {} };

function proc(): { stdin?: TerminalInput; stdout?: TerminalOutput; on?(e: string, l: () => void): unknown; off?(e: string, l: () => void): unknown } | undefined {
  return (globalThis as unknown as { process?: ReturnType<typeof proc> }).process;
}

/** Mount `element` full-screen in a terminal. */
export async function renderToTerminal(element: ReactNode, options: TerminalOptions = {}): Promise<TerminalRoot> {
  const p = proc();
  const {
    stdin = p?.stdin,
    stdout = p?.stdout,
    cols,
    rows,
    altScreen = true,
    mouse = true,
    exitOnCtrlC = true,
    fps = 60,
    patchConsole = true,
    onExit,
    ...rootOptions
  } = options;
  if (!stdout) throw txError("TX010");
  await initYoga();
  const write = (s: string): void => void stdout.write(s);
  const size = (): [number, number] => [cols ?? (stdout.columns || 80), rows ?? (stdout.rows || 24)];
  const [c0, r0] = size();
  const engine = new InputEngine({ document: null });
  const writer = new TerminalFrameWriter(write);
  let restored = false;

  const root = createConsoleRootSync({
    ...rootOptions,
    width: c0,
    height: r0,
    console: nullConsole,
    input: engine,
    registerGlobal: false,
    minFrameInterval: Math.max(1, Math.round(1000 / fps)),
    onFrame: (frame) => {
      rootOptions.onFrame?.(frame);
      if (!restored) writer.render(root.renderer.buffer);
    },
    onExit: (error) => {
      restore();
      onExit?.(error);
    },
  });

  const parser = new TerminalInputParser();
  const decoder = new TextDecoder();
  let escTimer: ReturnType<typeof setTimeout> | null = null;
  const dispatch = (events: TerminalEvent[]): void => {
    for (const e of events) {
      if (e.type === "key" && exitOnCtrlC && e.ctrl && e.key === "c") {
        unmount();
        return;
      }
      if (e.type === "key") engine.emit("key", e);
      else if (e.type === "paste") engine.emit("paste", e);
      else engine.emit("wheel", e);
    }
  };
  const onData = (chunk: string | Uint8Array): void => {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    if (escTimer !== null) clearTimeout(escTimer);
    dispatch(parser.push(text));
    if (parser.hasPending) escTimer = setTimeout(() => dispatch(parser.flush()), 30);
  };
  const onResize = (): void => {
    const [c, r] = size();
    writer.invalidate();
    write(`${CSI}2J`);
    root.renderer.resize(c, r);
    root.renderer.requestRender(true);
  };
  const onProcessExit = (): void => restore();

  const held: Array<[method: ConsoleMethod, args: unknown[]]> = [];
  const originals = new Map<ConsoleMethod, (...args: unknown[]) => void>();
  if (patchConsole) {
    for (const m of CONSOLE_METHODS) {
      const original = console[m] as (...args: unknown[]) => void;
      originals.set(m, original);
      console[m] = (...args: unknown[]) => void held.push([m, args]);
    }
  }

  function restore(): void {
    if (restored) return;
    restored = true;
    if (escTimer !== null) clearTimeout(escTimer);
    if (stdin) {
      (stdin.off ?? stdin.removeListener)?.call(stdin, "data", onData);
      stdin.setRawMode?.(false);
      stdin.pause?.();
    }
    (stdout!.off ?? stdout!.removeListener)?.call(stdout, "resize", onResize);
    p?.off?.("exit", onProcessExit);
    let s = `${CSI}0m`;
    if (mouse) s += `${CSI}?1006l${CSI}?1000l`;
    s += `${CSI}?2004l${CSI}?25h${ANSI_BIDI_IMPLICIT}`;
    s += altScreen ? `${CSI}?1049l` : `${CSI}${size()[1]};1H\n`;
    write(s);
    for (const [m, original] of originals) console[m] = original as Console[ConsoleMethod];
    for (const [m, args] of held) originals.get(m)?.apply(console, args);
    held.length = 0;
  }

  function unmount(): void {
    if (!root.unmounted) root.unmount();
    restore();
  }

  // Enter full-screen mode.
  let enter = "";
  if (altScreen) enter += `${CSI}?1049h`;
  // Cells are in visual order: explicit bidi mode stops VTE-style terminals from reordering them.
  enter += `${CSI}?25l${CSI}2J${CSI}H${CSI}?2004h${ANSI_BIDI_EXPLICIT}`;
  if (mouse) enter += `${CSI}?1000h${CSI}?1006h`;
  write(enter);
  if (stdin) {
    stdin.setEncoding?.("utf8");
    if (stdin.isTTY) stdin.setRawMode?.(true);
    stdin.on("data", onData);
    stdin.resume?.();
  }
  if (cols === undefined || rows === undefined) stdout.on?.("resize", onResize);
  p?.on?.("exit", onProcessExit);

  root.render(element);
  root.flushSyncRender();
  return {
    root,
    rerender: (el) => root.render(el),
    unmount,
    waitUntilExit: () => root.waitUntilExit(),
  };
}
