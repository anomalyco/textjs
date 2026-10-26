/**
 * Frame extraction for agents: plain text, styled runs and text search, all in
 * cell coordinates (wide graphemes such as CJK and emoji occupy two columns).
 */

import {
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  ATTR_WIDE_CONT,
  type CellBuffer,
  type PackedColor,
} from "@textjs/core";

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StyledRun {
  /** Column of the first cell. */
  x: number;
  /** Width in cells. */
  width: number;
  text: string;
  /** `#rrggbb` (or `#rrggbbaa` when translucent); `null` = terminal default. */
  fg: string | null;
  bg: string | null;
  /** Subset of `bold dim italic underline strikethrough inverse`. */
  attrs?: string[];
}

export interface StyledRow {
  y: number;
  runs: StyledRun[];
}

export interface TextMatch {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The full (trimmed) row the match is on. */
  line: string;
}

const ATTR_NAMES: ReadonlyArray<[number, string]> = [
  [ATTR_BOLD, "bold"],
  [ATTR_DIM, "dim"],
  [ATTR_ITALIC, "italic"],
  [ATTR_UNDERLINE, "underline"],
  [ATTR_STRIKETHROUGH, "strikethrough"],
  [ATTR_INVERSE, "inverse"],
];

const STYLE_MASK = ATTR_BOLD | ATTR_DIM | ATTR_ITALIC | ATTR_UNDERLINE | ATTR_STRIKETHROUGH | ATTR_INVERSE;

export function colorHex(c: PackedColor): string | null {
  if (c === 0) return null;
  const v = c >>> 0;
  const rgb = (v >>> 8).toString(16).padStart(6, "0");
  const a = v & 0xff;
  return a === 0xff ? `#${rgb}` : `#${rgb}${a.toString(16).padStart(2, "0")}`;
}

export function attrNames(attrs: number): string[] {
  const out: string[] = [];
  for (const [bit, name] of ATTR_NAMES) if ((attrs & bit) !== 0) out.push(name);
  return out;
}

/** Clamp `region` to the buffer (the whole buffer when omitted). */
export function clampRegion(buffer: CellBuffer, region?: Partial<Region>): Region {
  const x = Math.max(0, Math.min(buffer.width, Math.floor(region?.x ?? 0)));
  const y = Math.max(0, Math.min(buffer.height, Math.floor(region?.y ?? 0)));
  const width = Math.max(0, Math.min(buffer.width - x, Math.floor(region?.width ?? buffer.width - x)));
  const height = Math.max(0, Math.min(buffer.height - y, Math.floor(region?.height ?? buffer.height - y)));
  return { x, y, width, height };
}

interface RowCells {
  text: string;
  /** `cols[i]` = column of the grapheme starting at string index `i` (UTF-16 units); `cols[text.length]` = end column. */
  cols: Int32Array;
}

/** A row slice as text plus a string-index → column map. */
function rowCells(buffer: CellBuffer, y: number, x0: number, x1: number): RowCells {
  let text = "";
  const colsList: number[] = [];
  for (let x = x0; x < x1; x++) {
    const cell = buffer.getCell(x, y);
    if (!cell) break;
    if ((cell.attrs & ATTR_WIDE_CONT) !== 0) {
      // A wide grapheme cut by the region's left edge renders as a blank.
      if (x === x0) {
        colsList.push(x);
        text += " ";
      }
      continue;
    }
    const ch = cell.char === "" || cell.char.charCodeAt(0) < 0x20 ? " " : cell.char;
    for (let i = 0; i < ch.length; i++) colsList.push(x);
    text += ch;
  }
  colsList.push(x1);
  return { text, cols: Int32Array.from(colsList) };
}

/** Plain text of `region`, one line per row (trailing spaces and blank rows trimmed). */
export function frameText(buffer: CellBuffer, region?: Partial<Region>): string {
  const r = clampRegion(buffer, region);
  const lines: string[] = [];
  for (let y = r.y; y < r.y + r.height; y++) lines.push(rowCells(buffer, y, r.x, r.x + r.width).text.trimEnd());
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

/** Run-length encoded styled rows for `region`. Rows that are entirely blank default-styled cells are omitted. */
export function styledRows(buffer: CellBuffer, region?: Partial<Region>): StyledRow[] {
  const r = clampRegion(buffer, region);
  const rows: StyledRow[] = [];
  for (let y = r.y; y < r.y + r.height; y++) {
    const runs: StyledRun[] = [];
    let cur: (StyledRun & { key: string }) | null = null;
    for (let x = r.x; x < r.x + r.width; x++) {
      const cell = buffer.getCell(x, y);
      if (!cell) break;
      if ((cell.attrs & ATTR_WIDE_CONT) !== 0) {
        if (cur) cur.width++;
        continue;
      }
      const ch = cell.char === "" || cell.char.charCodeAt(0) < 0x20 ? " " : cell.char;
      const attrs = cell.attrs & STYLE_MASK;
      const key = `${cell.fg}|${cell.bg}|${attrs}`;
      if (cur && cur.key === key) {
        cur.text += ch;
        cur.width++;
        continue;
      }
      if (cur) runs.push(stripKey(cur));
      cur = { key, x, width: 1, text: ch, fg: colorHex(cell.fg), bg: colorHex(cell.bg), ...(attrs ? { attrs: attrNames(attrs) } : {}) };
    }
    if (cur) runs.push(stripKey(cur));
    rows.push({ y, runs });
  }
  return rows;
}

function stripKey(run: StyledRun & { key: string }): StyledRun {
  const { key: _key, ...rest } = run;
  return rest;
}

export interface FindOptions {
  /** Treat `query` as a regular expression (JavaScript syntax, no flags but `i`). */
  regex?: boolean;
  ignoreCase?: boolean;
  /** Max matches (default 50). */
  limit?: number;
}

/** Find `query` in the frame, row by row (matches never span rows). */
export function findText(buffer: CellBuffer, query: string, options: FindOptions = {}): TextMatch[] {
  const limit = options.limit ?? 50;
  const out: TextMatch[] = [];
  if (query === "") return out;
  let re: RegExp;
  if (options.regex) re = new RegExp(query, options.ignoreCase ? "gi" : "g");
  else re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options.ignoreCase ? "gi" : "g");
  for (let y = 0; y < buffer.height && out.length < limit; y++) {
    const row = rowCells(buffer, y, 0, buffer.width);
    re.lastIndex = 0;
    for (let m = re.exec(row.text); m !== null && out.length < limit; m = re.exec(row.text)) {
      if (m[0] === "") {
        re.lastIndex++;
        continue;
      }
      const x = row.cols[m.index] as number;
      const end = row.cols[m.index + m[0].length] as number;
      // A match ending inside a wide grapheme extends to cover it.
      const width = Math.max(1, end - x);
      out.push({ x, y, width, height: 1, line: row.text.trimEnd() });
    }
  }
  return out;
}

/** Whether `text` appears anywhere in the frame (row by row). */
export function frameContains(buffer: CellBuffer, text: string): boolean {
  for (let y = 0; y < buffer.height; y++) if (rowCells(buffer, y, 0, buffer.width).text.includes(text)) return true;
  return false;
}
