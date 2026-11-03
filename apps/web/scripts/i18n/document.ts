/**
 * Documents: Markdown translated block by block. A block's id is a hash of its English text, so a translation
 * stays attached to its block wherever it moves and goes stale the moment the English changes.
 *
 * Translation files hold prose blocks only, each after a `<!-- s:<id> -->` marker. `assemble` walks the English
 * source and takes code fences, frontmatter, comments and changelog version headers from it verbatim, so code
 * can't be mistranslated. A prose block without a current translation is emitted in English after an
 * `<!-- i18n:en -->` line, and headings keep their English anchor as `{#id}`.
 */

import { createHash } from "node:crypto";
import { slugify } from "../../src/docs/meta";

export type BlockKind = "verbatim" | "heading" | "prose";

export interface Block {
  kind: BlockKind;
  text: string;
  /** Hash of the English text (prose and headings). */
  id: string;
}

export function blockId(text: string): string {
  return createHash("sha256").update(text.trim().replace(/\s+/g, " ")).digest("hex").slice(0, 10);
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}#{1,6}\s/;
/** `## [1.3.0] - 2026-11-03` and `## Unreleased`: release headers are data, not prose. */
const VERSION_HEADER = /^##\s+\[?(\d[\w.-]*|Unreleased)\]?(\s+-\s+\d{4}-\d{2}-\d{2})?\s*$/i;

/** Splits Markdown into blocks: fences, frontmatter, headings and blank-line separated prose. */
export function segment(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  const push = (kind: BlockKind, text: string): void => {
    blocks.push({ kind, text, id: kind === "verbatim" ? "" : blockId(text) });
  };
  let i = 0;
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) {
      push("verbatim", lines.slice(0, end + 1).join("\n"));
      i = end + 1;
    }
  }
  let para: string[] = [];
  const flush = (): void => {
    if (para.length === 0) return;
    const text = para.join("\n");
    push(/^\s*(<!--[\s\S]*-->|[-*_]{3,})\s*$/.test(text) ? "verbatim" : "prose", text);
    para = [];
  };
  while (i < lines.length) {
    const line = lines[i] as string;
    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const marker = (fence[1] as string)[0] as string;
      const body = [line];
      i++;
      while (i < lines.length) {
        const l = lines[i] as string;
        body.push(l);
        i++;
        if (new RegExp(`^\\s{0,3}\\${marker}{3,}\\s*$`).test(l)) break;
      }
      push("verbatim", body.join("\n"));
      continue;
    }
    if (HEADING.test(line)) {
      flush();
      push(/^#\s/.test(line) || VERSION_HEADER.test(line) ? "verbatim" : "heading", line);
      i++;
      continue;
    }
    if (line.trim() === "") flush();
    else para.push(line);
    i++;
  }
  flush();
  return blocks;
}

/** `<!-- s:<id> -->` markers → translated text by id. */
export function parseTranslation(markdown: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = markdown.replace(/\r\n?/g, "\n").split(/^<!-- s:([0-9a-f]{10}) -->\n/m);
  for (let i = 1; i < parts.length; i += 2) out.set(parts[i] as string, (parts[i + 1] as string).trim());
  return out;
}

export function formatTranslation(entries: Iterable<[string, string]>): string {
  return `${[...entries].map(([id, text]) => `<!-- s:${id} -->\n${text.trim()}\n`).join("\n")}`;
}

export interface Assembled {
  markdown: string;
  /** Prose blocks and headings in the English source. */
  total: number;
  /** Of those, how many have a current translation. */
  translated: number;
}

const WARNING = /^>\s*\*\*(Warning|Caution)/;

export function assemble(english: string, translations: ReadonlyMap<string, string>): Assembled {
  const out: string[] = [];
  let total = 0;
  let translated = 0;
  for (const b of segment(english)) {
    if (b.kind === "verbatim") {
      out.push(b.text);
      continue;
    }
    total++;
    const text = translations.get(b.id);
    const flags: string[] = [];
    if (!text) flags.push("en");
    if (WARNING.test(b.text)) flags.push("warning");
    for (const f of flags) out.push(`<!-- i18n:${f} -->`);
    if (text) translated++;
    if (b.kind === "heading") {
      const [, hashes = "##", english = ""] = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(b.text) ?? [];
      const own = /\{#([\w-]+)\}\s*$/.exec(english);
      const id = own ? own[1] : slugify(english);
      const heading = (text ?? english).replace(/^\s{0,3}#{1,6}\s+/, "").replace(/\s*\{#[\w-]+\}\s*$/, "");
      out.push(`${hashes} ${heading} {#${id}}`);
    } else out.push(text ?? b.text);
  }
  return { markdown: `${out.join("\n\n")}\n`, total, translated };
}
