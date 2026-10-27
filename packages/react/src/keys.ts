/**
 * Key combo strings: `"ctrl+k"`, `"shift+tab"`, `"G"`, `"?"`, `"g g"`.
 *
 * - `+` joins modifiers (`ctrl`, `alt`/`option`, `shift`, `meta`/`cmd`, `mod`).
 *   `mod` is `meta` or `ctrl`, whichever the user holds.
 * - A space separates the steps of a sequence (`"g g"`).
 * - A comma separates alternatives (`"j, down"`).
 * - Named keys: `up down left right return enter escape esc tab backspace
 *   delete pageup pagedown home end space insert f1…f12 comma plus`.
 * - An uppercase letter implies `shift` (`"G"` = `"shift+g"`). Other printable
 *   characters match the produced text regardless of `shift` (`"?"`).
 */

import { txError, type KeyInputEvent } from "@textjs/core";

export interface KeyStroke {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** `meta` or `ctrl`. */
  mod: boolean;
  /** Printable non-letter: match the produced character and ignore `shift`. */
  char: boolean;
}

/** One alternative: a sequence of strokes. */
export type KeySequence = readonly KeyStroke[];

const ALIASES: Readonly<Record<string, string>> = {
  enter: "return",
  esc: "escape",
  del: "delete",
  pgup: "pageup",
  pgdn: "pagedown",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  comma: ",",
  plus: "+",
  spacebar: "space",
};

const NAMED = new Set([
  "up",
  "down",
  "left",
  "right",
  "return",
  "escape",
  "tab",
  "backspace",
  "delete",
  "pageup",
  "pagedown",
  "home",
  "end",
  "space",
  "insert",
]);

const cache = new Map<string, readonly KeySequence[]>();

function parseStroke(src: string): KeyStroke {
  const parts = src.length > 1 && src.endsWith("++") ? [...src.slice(0, -2).split("+"), "+"] : src.split("+");
  const stroke: KeyStroke = { key: "", ctrl: false, alt: false, shift: false, meta: false, mod: false, char: false };
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i] as string;
    const p = raw.toLowerCase();
    const last = i === parts.length - 1;
    if (!last) {
      if (p === "ctrl" || p === "control") stroke.ctrl = true;
      else if (p === "alt" || p === "option" || p === "opt") stroke.alt = true;
      else if (p === "shift") stroke.shift = true;
      else if (p === "meta" || p === "cmd" || p === "command" || p === "super") stroke.meta = true;
      else if (p === "mod") stroke.mod = true;
      else throw txError("TX006", raw, src);
      continue;
    }
    const named = ALIASES[p] ?? p;
    if (NAMED.has(named) || /^f\d{1,2}$/.test(named)) stroke.key = named;
    else if (raw.length === 1 && raw >= "A" && raw <= "Z") {
      stroke.key = p;
      stroke.shift = true;
    } else if (named.length === 1 && /[a-z]/.test(named)) stroke.key = named;
    else if ([...named].length === 1) {
      stroke.key = named;
      stroke.char = !stroke.ctrl && !stroke.meta && !stroke.mod && !stroke.alt;
    } else throw txError("TX007", raw, src);
  }
  if (stroke.key === "") throw txError("TX008", src);
  return stroke;
}

/** Parse `"ctrl+k, g g"` into alternatives of key sequences (cached). */
export function parseKeys(spec: string | readonly string[]): readonly KeySequence[] {
  const key = typeof spec === "string" ? spec : spec.join(",");
  const hit = cache.get(key);
  if (hit) return hit;
  const alts: KeySequence[] = [];
  for (const alt of splitAlternatives(key)) {
    const steps = alt.trim().split(/\s+/).filter(Boolean);
    if (steps.length > 0) alts.push(steps.map(parseStroke));
  }
  const out = Object.freeze(alts);
  if (cache.size > 500) cache.clear();
  cache.set(key, out);
  return out;
}

function splitAlternatives(spec: string): string[] {
  // A lone "," (or one directly after "+") is the comma key, not a separator.
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < spec.length; i++) {
    const ch = spec[i] as string;
    if (ch === ",") {
      const prev = cur.trimEnd();
      if (prev === "" || prev.endsWith("+")) {
        cur += ch;
        continue;
      }
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim() !== "") out.push(cur);
  return out;
}

/** Whether a key event matches a single stroke. */
export function matchStroke(e: Pick<KeyInputEvent, "key" | "input" | "ctrl" | "alt" | "shift" | "meta">, s: KeyStroke): boolean {
  if (s.char) {
    if (e.ctrl || e.meta || e.alt) return false;
    if (s.key === "space") return e.key === "space";
    return e.input === s.key || e.key === s.key;
  }
  if (e.key !== s.key) return false;
  if (s.mod) {
    if (!(e.ctrl || e.meta)) return false;
  } else if (e.ctrl !== s.ctrl || e.meta !== s.meta) return false;
  return e.alt === s.alt && e.shift === s.shift;
}

/** Whether a key event matches any single-stroke alternative of `spec`. */
export function matchesKey(e: Pick<KeyInputEvent, "key" | "input" | "ctrl" | "alt" | "shift" | "meta">, spec: string | readonly string[]): boolean {
  for (const seq of parseKeys(spec)) if (seq.length === 1 && matchStroke(e, seq[0] as KeyStroke)) return true;
  return false;
}

const isApple: boolean =
  typeof navigator !== "undefined"
    ? /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    : (globalThis as { process?: { platform?: string } }).process?.platform === "darwin";

const GLYPHS: Readonly<Record<string, string>> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  return: "↵",
  escape: "esc",
  tab: "tab",
  backspace: "⌫",
  delete: "del",
  pageup: "pgup",
  pagedown: "pgdn",
  home: "home",
  end: "end",
  space: "space",
  insert: "ins",
};

export interface FormatKeysOptions {
  /** Use macOS modifier glyphs (`⌃⌥⇧⌘`). Defaults to the current platform. */
  apple?: boolean;
  /** Join alternatives with this string (default `" "` … `"/"`). */
  separator?: string;
}

function formatStroke(s: KeyStroke, apple: boolean): string {
  let mods = "";
  // A bare uppercase letter already reads as Shift; with other modifiers, spell it out.
  const letter = s.key.length === 1 && /[a-z]/.test(s.key);
  const showShift = s.shift && (!letter || s.ctrl || s.alt || s.meta || s.mod);
  if (apple) {
    if (s.ctrl) mods += "⌃";
    if (s.alt) mods += "⌥";
    if (showShift) mods += "⇧";
    if (s.meta || s.mod) mods += "⌘";
  } else {
    if (s.ctrl || s.mod) mods += "ctrl+";
    if (s.alt) mods += "alt+";
    if (showShift) mods += "shift+";
    if (s.meta) mods += "meta+";
  }
  let key = GLYPHS[s.key] ?? s.key;
  if (key.length === 1 && /[a-z]/.test(key) && (s.shift || mods !== "")) key = key.toUpperCase();
  return mods + key;
}

/** Human-readable keys: `"mod+k"` → `"⌘K"`, `"j, down"` → `"j/↓"`, `"g g"` → `"g g"`. */
export function formatKeys(spec: string | readonly string[], options: FormatKeysOptions = {}): string {
  const apple = options.apple ?? isApple;
  return parseKeys(spec)
    .map((seq) => seq.map((s) => formatStroke(s, apple)).join(" "))
    .join(options.separator ?? "/");
}

/** Build the key event a combo string describes (used by test drivers). */
export function keyEventFromCombo(combo: string): KeyInputEvent {
  const seq = parseKeys(combo)[0];
  if (!seq || seq.length !== 1) throw txError("TX009", combo);
  const s = seq[0] as KeyStroke;
  const printable = !NAMED.has(s.key) && !/^f\d+$/.test(s.key);
  const ctrl = s.ctrl || s.mod;
  const plain = !ctrl && !s.meta;
  let input = "";
  if (s.key === "space") input = " ";
  else if (printable && plain) input = s.shift && /[a-z]/.test(s.key) ? s.key.toUpperCase() : s.key;
  return {
    type: "key",
    key: s.key,
    input,
    code: "",
    repeat: false,
    ctrl,
    meta: s.meta,
    shift: s.shift,
    alt: s.alt,
  };
}
