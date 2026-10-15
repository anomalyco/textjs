/**
 * A `huh.Form` look-alike: groups of text inputs, laid out in columns, with the
 * SSH shop's form theme (thick accent bar on the focused field, `> ` prompt, brand cursor).
 */

import { palette } from "./theme";
import { span, type Line } from "./ui";

export type Validator = (value: string) => string | null;

export interface FieldDef {
  key: string;
  title: string;
  validate?: Validator;
}

export interface FormState {
  values: Record<string, string>;
  /** Flat index of the focused field. */
  focus: number;
  cursor: number;
}

export const notEmpty =
  (name: string): Validator =>
  (v) =>
    v.trim() === "" ? `${name} cannot be empty` : null;

export const emailValidator: Validator = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "not a valid email address");

export const compose =
  (...vs: Validator[]): Validator =>
  (v) => {
    for (const f of vs) {
      const e = f(v);
      if (e) return e;
    }
    return null;
  };

export function initForm(groups: FieldDef[][], values: Record<string, string> = {}): FormState {
  const all: Record<string, string> = {};
  for (const g of groups) for (const f of g) all[f.key] = values[f.key] ?? "";
  const first = groups[0]?.[0]?.key ?? "";
  return { values: all, focus: 0, cursor: (all[first] ?? "").length };
}

const flat = (groups: FieldDef[][]): FieldDef[] => groups.flat();

export type FormEvent = { type: "none" } | { type: "error"; message: string } | { type: "submit"; values: Record<string, string> };

/** Apply one key (Bubble Tea name + printable input). */
export function formKey(groups: FieldDef[][], state: FormState, key: string, input: string): { state: FormState; event: FormEvent } {
  const fields = flat(groups);
  const field = fields[state.focus];
  if (!field) return { state, event: { type: "none" } };
  const value = state.values[field.key] ?? "";
  const setValue = (v: string, cursor: number): FormState => ({ ...state, values: { ...state.values, [field.key]: v }, cursor });
  const focusAt = (i: number): FormState => ({ ...state, focus: i, cursor: (state.values[fields[i]?.key ?? ""] ?? "").length });

  switch (key) {
    case "enter":
    case "tab": {
      const err = field.validate?.(value) ?? null;
      if (err) return { state, event: { type: "error", message: err } };
      if (state.focus < fields.length - 1) return { state: focusAt(state.focus + 1), event: { type: "none" } };
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i] as FieldDef;
        const e = f.validate?.(state.values[f.key] ?? "") ?? null;
        if (e) return { state: focusAt(i), event: { type: "error", message: e } };
      }
      return { state, event: { type: "submit", values: state.values } };
    }
    case "shift+tab":
    case "up":
      return { state: focusAt(Math.max(0, state.focus - 1)), event: { type: "none" } };
    case "down":
      return { state: focusAt(Math.min(fields.length - 1, state.focus + 1)), event: { type: "none" } };
    case "left":
      return { state: { ...state, cursor: Math.max(0, state.cursor - 1) }, event: { type: "none" } };
    case "right":
      return { state: { ...state, cursor: Math.min(value.length, state.cursor + 1) }, event: { type: "none" } };
    case "home":
    case "ctrl+a":
      return { state: { ...state, cursor: 0 }, event: { type: "none" } };
    case "end":
    case "ctrl+e":
      return { state: { ...state, cursor: value.length }, event: { type: "none" } };
    case "backspace":
      if (state.cursor === 0) return { state, event: { type: "none" } };
      return { state: setValue(value.slice(0, state.cursor - 1) + value.slice(state.cursor), state.cursor - 1), event: { type: "none" } };
    case "delete":
      return { state: setValue(value.slice(0, state.cursor) + value.slice(state.cursor + 1), state.cursor), event: { type: "none" } };
    case "ctrl+u":
      return { state: setValue(value.slice(state.cursor), 0), event: { type: "none" } };
    case "ctrl+w": {
      const before = value.slice(0, state.cursor).replace(/\S+\s*$/, "");
      return { state: setValue(before + value.slice(state.cursor), before.length), event: { type: "none" } };
    }
  }
  if (input) return { state: insert(state, groups, input), event: { type: "none" } };
  return { state, event: { type: "none" } };
}

export function insert(state: FormState, groups: FieldDef[][], text: string): FormState {
  const field = flat(groups)[state.focus];
  if (!field) return state;
  const clean = text.replace(/[\r\n\t]+/g, " ");
  const value = state.values[field.key] ?? "";
  return { ...state, values: { ...state.values, [field.key]: value.slice(0, state.cursor) + clean + value.slice(state.cursor) }, cursor: state.cursor + clean.length };
}

/** Render one input (title + `> value`), `width` columns wide. */
export function fieldLines(def: FieldDef, value: string, focused: boolean, cursor: number, cursorOn: boolean, width: number, opts: { mask?: boolean } = {}): Line[] {
  const bar = focused ? span("┃", { fg: palette.accent }) : span(" ");
  const shown = opts.mask ? "•".repeat(value.length) : value;
  const room = Math.max(1, width - 4 - 1);
  // Scroll long values so the cursor stays visible (bubbles/textinput).
  let start = 0;
  if (focused && cursor > room) start = cursor - room;
  const visible = shown.slice(start, start + room + 1);
  const c = cursor - start;
  const input: Line = [bar, span(" "), span("> ", { fg: palette.accent })];
  if (focused) {
    input.push(span(visible.slice(0, c), { fg: palette.accent }));
    const under = visible[c] ?? " ";
    input.push(span(under, cursorOn ? { fg: palette.background, bg: palette.brand } : { fg: palette.accent }));
    input.push(span(visible.slice(c + 1), { fg: palette.accent }));
  } else input.push(span(visible.slice(0, room + 1), { fg: palette.accent }));
  return [[bar, span(" "), span(def.title, { fg: palette.body })], input];
}

/** `huh.LayoutColumns(n)` (or `LayoutStack` with `columns = 1`). */
export function formLines(groups: FieldDef[][], state: FormState, cursorOn: boolean, width: number, columns = groups.length, opts: { masked?: string[] } = {}): Line[] {
  const fields = flat(groups);
  const renderGroup = (g: FieldDef[], w: number): Line[] => {
    const out: Line[] = [];
    g.forEach((f, i) => {
      const idx = fields.indexOf(f);
      if (i > 0) out.push([]);
      out.push(...fieldLines(f, state.values[f.key] ?? "", idx === state.focus, state.cursor, cursorOn, w, { mask: opts.masked?.includes(f.key) }));
    });
    return out;
  };
  if (columns <= 1) {
    const out: Line[] = [];
    groups.forEach((g, i) => {
      if (i > 0) out.push([]);
      out.push(...renderGroup(g, width));
    });
    return out;
  }
  const colWidth = Math.floor(width / columns);
  const cols = groups.map((g) => renderGroup(g, colWidth));
  const h = Math.max(...cols.map((c) => c.length));
  const out: Line[] = [];
  for (let y = 0; y < h; y++) {
    const row: Line = [];
    cols.forEach((c, i) => {
      const l = c[y] ?? [];
      row.push(...l);
      if (i < cols.length - 1) {
        let w = 0;
        for (const s of l) w += [...s.text].length;
        row.push(span(" ".repeat(Math.max(0, colWidth - w))));
      }
    });
    out.push(row);
  }
  return out;
}

export function focusedKey(groups: FieldDef[][], state: FormState): string {
  return flat(groups)[state.focus]?.key ?? "";
}
