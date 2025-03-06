/**
 * Streaming-safe Markdown block + inline parser. Incomplete constructs (an
 * unclosed code fence, a dangling `**`) degrade gracefully instead of throwing
 * or swallowing the remainder of the document.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  /** Link target (`[text](url)` or a bare URL). */
  href?: string;
}

export type TableAlign = "left" | "center" | "right";

export interface ListItem {
  text: string;
  depth: number;
  marker: string;
  ordered: boolean;
  checked?: boolean;
}

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; code: string; closed: boolean }
  | { type: "quote"; blocks: MarkdownBlock[] }
  | { type: "list"; items: ListItem[] }
  | { type: "table"; header: string[]; align: TableAlign[]; rows: string[][] }
  | { type: "hr" };

const FENCE = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)?.*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] as string;
    if (ch === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function isBlockStart(line: string, next: string | undefined): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    HR.test(line) ||
    QUOTE.test(line) ||
    LIST.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEP.test(next) && next.includes("-"))
  );
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (line.trim().length === 0) {
      i++;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] as string;
      const language = fence[2] ?? "";
      const body: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        const l = lines[i] as string;
        const t = l.trim();
        if (t.startsWith(marker[0]!.repeat(marker.length)) && t.replace(new RegExp(`^\\${marker[0]}+`), "").trim() === "") {
          closed = true;
          i++;
          break;
        }
        body.push(l);
        i++;
      }
      blocks.push({ type: "code", language, code: body.join("\n"), closed });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: (heading[1] as string).length, text: heading[2] as string });
      i++;
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length) {
        const m = QUOTE.exec(lines[i] as string);
        if (!m) break;
        inner.push(m[1] as string);
        i++;
      }
      blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }
    if (LIST.test(line)) {
      const items: ListItem[] = [];
      let baseIndent = -1;
      while (i < lines.length) {
        const l = lines[i] as string;
        const m = LIST.exec(l);
        if (m) {
          const indent = (m[1] as string).replace(/\t/g, "  ").length;
          if (baseIndent < 0) baseIndent = indent;
          let text = m[3] as string;
          let checked: boolean | undefined;
          const task = /^\[([ xX])\]\s+(.*)$/.exec(text);
          if (task) {
            checked = task[1] !== " ";
            text = task[2] as string;
          }
          const marker = m[2] as string;
          items.push({ text, depth: Math.max(0, Math.floor((indent - baseIndent) / 2)), marker, ordered: /\d/.test(marker), checked });
          i++;
          continue;
        }
        // Lazy continuation lines belong to the previous item.
        if (l.trim().length > 0 && /^\s+/.test(l) && items.length > 0 && !isBlockStart(l.trim(), undefined)) {
          const last = items[items.length - 1] as ListItem;
          last.text += ` ${l.trim()}`;
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", items });
      continue;
    }
    const next = lines[i + 1];
    if (line.includes("|") && next !== undefined && TABLE_SEP.test(next) && next.includes("-")) {
      const header = splitRow(line);
      const align: TableAlign[] = splitRow(next).map((c) => {
        const l = c.startsWith(":");
        const r = c.endsWith(":");
        return l && r ? "center" : r ? "right" : "left";
      });
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length) {
        const l = lines[i] as string;
        if (l.trim().length === 0 || !l.includes("|")) break;
        rows.push(splitRow(l));
        i++;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length) {
      const l = lines[i] as string;
      if (l.trim().length === 0 || isBlockStart(l, lines[i + 1])) break;
      para.push(l.trim());
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

type Style = Omit<InlineSpan, "text">;

const URL_RE = /^https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/;

/** Parse inline Markdown into styled spans. Unclosed markers are kept literally. */
export function parseInline(text: string, style: Style = {}): InlineSpan[] {
  const out: InlineSpan[] = [];
  let buf = "";
  const flush = (): void => {
    if (buf.length > 0) {
      const last = out[out.length - 1];
      if (last && sameStyle(last, style)) last.text += buf;
      else out.push({ ...style, text: buf });
      buf = "";
    }
  };
  const emit = (spans: InlineSpan[]): void => {
    flush();
    for (const s of spans) {
      const last = out[out.length - 1];
      if (last && sameStyle(last, s)) last.text += s.text;
      else out.push(s);
    }
  };
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i] as string;
    if (ch === "\\" && i + 1 < n && /[\\`*_{}[\]()#+\-.!~|>]/.test(text[i + 1] as string)) {
      buf += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === "`") {
      let ticks = 1;
      while (text[i + ticks] === "`") ticks++;
      const fence = "`".repeat(ticks);
      const end = text.indexOf(fence, i + ticks);
      if (end > i) {
        emit([{ ...style, code: true, text: text.slice(i + ticks, end).trim() || " " }]);
        i = end + ticks;
        continue;
      }
    }
    if ((ch === "*" || ch === "_") && text[i + 1] === ch) {
      const marker = ch + ch;
      const end = text.indexOf(marker, i + 2);
      if (end > i + 2) {
        emit(parseInline(text.slice(i + 2, end), { ...style, bold: true }));
        i = end + 2;
        continue;
      }
    }
    if (ch === "~" && text[i + 1] === "~") {
      const end = text.indexOf("~~", i + 2);
      if (end > i + 2) {
        emit(parseInline(text.slice(i + 2, end), { ...style, strike: true }));
        i = end + 2;
        continue;
      }
    }
    if (ch === "*" || (ch === "_" && (i === 0 || /[\s(]/.test(text[i - 1] as string)))) {
      const end = findItalicEnd(text, i + 1, ch);
      if (end > i + 1) {
        emit(parseInline(text.slice(i + 1, end), { ...style, italic: true }));
        i = end + 1;
        continue;
      }
    }
    if (ch === "[") {
      const close = text.indexOf("](", i + 1);
      if (close > i) {
        const end = text.indexOf(")", close + 2);
        if (end > close) {
          const label = text.slice(i + 1, close);
          const href = text.slice(close + 2, end).trim().split(/\s+/)[0] ?? "";
          emit(parseInline(label, { ...style, href }));
          i = end + 1;
          continue;
        }
      }
    }
    if (ch === "h" && (i === 0 || /[\s(]/.test(text[i - 1] as string))) {
      const m = URL_RE.exec(text.slice(i, i + 2048));
      if (m) {
        emit([{ ...style, href: m[0], text: m[0] }]);
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

function findItalicEnd(text: string, from: number, marker: string): number {
  if (/\s/.test(text[from] ?? " ")) return -1;
  for (let k = from; k < text.length; k++) {
    if (text[k] === marker && text[k + 1] !== marker && !/\s/.test(text[k - 1] as string)) {
      if (marker === "_" && k + 1 < text.length && /\w/.test(text[k + 1] as string)) continue;
      return k;
    }
  }
  return -1;
}

function sameStyle(a: Style, b: Style): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.code === b.code && a.strike === b.strike && a.href === b.href;
}

/** Plain text of inline Markdown (for measuring table cells). */
export function inlinePlainText(text: string): string {
  return parseInline(text)
    .map((s) => s.text)
    .join("");
}
