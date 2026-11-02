/**
 * A tiny lipgloss: styled spans laid out into fixed-width lines, so every screen can
 * reproduce the SSH shop's Bubble Tea views cell for cell. `<Screen>` turns the
 * lines into `<Text>` rows for the console renderer.
 */

import { stringWidth } from "@textjs/core";

export interface Style {
  fg?: string;
  bg?: string;
  bold?: boolean;
  /** Keep DevTools' URL linkifier on for this span. */
  link?: boolean;
}

export interface Span extends Style {
  text: string;
}

export type Line = Span[];

export const span = (text: string, style: Style = {}): Span => ({ text, ...style });

export function width(line: Line | string): number {
  if (typeof line === "string") return stringWidth(line);
  let w = 0;
  for (const s of line) w += stringWidth(s.text);
  return w;
}

/** Text → lines of one span each (splitting on `\n`). */
export function lines(text: string, style: Style = {}): Line[] {
  return text.split("\n").map((t) => (t ? [span(t, style)] : []));
}

/** Pad (or clip) a line to exactly `w` columns. `fill` styles the padding. */
export function fit(line: Line, w: number, align: "left" | "center" | "right" = "left", fill: Style = {}): Line {
  const lw = width(line);
  if (lw > w) return clip(line, w);
  const gap = w - lw;
  if (gap === 0) return line;
  const left = align === "left" ? 0 : align === "right" ? gap : Math.floor(gap / 2);
  const out: Line = [];
  if (left > 0) out.push(span(" ".repeat(left), fill));
  out.push(...line);
  if (gap - left > 0) out.push(span(" ".repeat(gap - left), fill));
  return out;
}

/** Truncate a line to `w` columns. */
export function clip(line: Line, w: number): Line {
  const out: Line = [];
  let used = 0;
  for (const s of line) {
    if (used >= w) break;
    const sw = stringWidth(s.text);
    if (used + sw <= w) {
      out.push(s);
      used += sw;
      continue;
    }
    let t = "";
    for (const ch of s.text) {
      const cw = stringWidth(ch);
      if (used + cw > w) break;
      t += ch;
      used += cw;
    }
    if (t) out.push({ ...s, text: t });
    break;
  }
  return out;
}

export const blank = (): Line => [];

/** Concatenate lines horizontally. */
export function concat(...parts: Array<Line | Span | string>): Line {
  const out: Line = [];
  for (const p of parts) {
    if (typeof p === "string") out.push(span(p));
    else if (Array.isArray(p)) out.push(...p);
    else out.push(p);
  }
  return out;
}

/** The Go TUI's `wordWrap`: greedy, collapses whitespace. */
export function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const out: string[] = [];
  let cur = words[0] as string;
  for (const word of words.slice(1)) {
    const test = `${cur} ${word}`;
    if (stringWidth(test) <= maxWidth) cur = test;
    else {
      out.push(cur);
      cur = word;
    }
  }
  out.push(cur);
  return out;
}

/** lipgloss `Width(n)` wrapping: per paragraph word wrap, hard-breaking words longer than `n`. */
export function wrap(text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    for (const l of wordWrap(para, maxWidth)) {
      let rest = l;
      while (stringWidth(rest) > maxWidth) {
        const head = clip([span(rest)], maxWidth)[0]?.text ?? "";
        out.push(head);
        rest = rest.slice(head.length);
      }
      out.push(rest);
    }
  }
  return out;
}

/** `wrap`, then narrowed to the tightest width that keeps the same line count (CSS `text-wrap: balance`). */
export function balance(text: string, maxWidth: number): string[] {
  const out = wrap(text, maxWidth);
  if (out.length < 2) return out;
  let lo = 1;
  let hi = maxWidth;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (wrap(text, mid).length <= out.length) hi = mid;
    else lo = mid + 1;
  }
  return wrap(text, hi);
}

export interface Block {
  lines: Line[];
  width: number;
}

export const block = (ls: Line[], w: number): Block => ({ lines: ls, width: w });

/** `lipgloss.JoinHorizontal(Top, …)` for fixed-width blocks. */
export function hjoin(...blocks: Block[]): Line[] {
  const h = Math.max(0, ...blocks.map((b) => b.lines.length));
  const out: Line[] = [];
  for (let y = 0; y < h; y++) {
    const row: Line = [];
    for (const b of blocks) row.push(...fit(b.lines[y] ?? [], b.width));
    out.push(row);
  }
  return out;
}

/** `lipgloss.Place` in a `w × h` area. */
export function place(ls: Line[], w: number, h: number, align: "left" | "center" = "center", valign: "top" | "center" = "center"): Line[] {
  const inner = Math.max(0, ...ls.map(width));
  const top = valign === "center" ? Math.floor(Math.max(0, h - ls.length) / 2) : 0;
  const left = align === "center" ? Math.floor(Math.max(0, w - inner) / 2) : 0;
  const out: Line[] = [];
  for (let i = 0; i < top; i++) out.push([]);
  for (const l of ls) out.push(fit(concat(" ".repeat(left), l), w));
  while (out.length < h) out.push([]);
  return out.slice(0, h);
}

/** `lipgloss.JoinVertical(Center, …)`: centers each line within the widest one (lipgloss rounds the left gap). */
export function centerLines(ls: Line[], w = Math.max(0, ...ls.map(width))): Line[] {
  return ls.map((l) => {
    const gap = Math.max(0, w - width(l));
    const left = Math.round(gap / 2);
    return concat(" ".repeat(left), l, " ".repeat(gap - left));
  });
}

/** Indent every line. */
export function indent(ls: Line[], n: number): Line[] {
  return ls.map((l) => concat(" ".repeat(n), l));
}

/** Window `ls` to `h` rows starting at `offset` (a Bubble Tea viewport). */
export function viewport(ls: Line[], h: number, offset = 0): Line[] {
  const max = Math.max(0, ls.length - h);
  const o = Math.min(Math.max(0, offset), max);
  const out = ls.slice(o, o + h);
  while (out.length < h) out.push([]);
  return out;
}

/** Keep `[top, top + size)` visible within a viewport of height `h`. */
export function scrollInto(offset: number, h: number, top: number, size: number): number {
  if (top < offset) return top;
  if (top + size > offset + h) return top + size - h;
  return offset;
}

/** `lipgloss.NormalBorder()` box: `inner` columns between the borders, 1 column of left padding. */
export function box(content: Line[], inner: number, borderColor: string, base: Style = {}): Line[] {
  const b: Style = { fg: borderColor };
  const out: Line[] = [[span(`┌${"─".repeat(inner)}┐`, b)]];
  for (const l of content) out.push(concat(span("│", b), fit(concat(span(" ", base), l), inner, "left", base), span("│", b)));
  out.push([span(`└${"─".repeat(inner)}┘`, b)]);
  return out;
}

export function lineText(line: Line): string {
  return line.map((s) => s.text).join("");
}

export function toPlain(ls: Line[]): string {
  return ls.map((l) => lineText(l).replace(/\s+$/, "")).join("\n");
}
