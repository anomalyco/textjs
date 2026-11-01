/** What a chapter script (`chapters/<slug>.ts(x)`) exports, and helpers for writing one. */
import { join } from "node:path";
import { REPO } from "./env";
import type { LiveSpec } from "./capture";
import type { Token } from "../stage/types";

export interface SceneSpec {
  /** Unique within the chapter; names capture folders and review frames. */
  id: string;
  /** Stage scene: title | course | pipeline | terminal | editor | live | logs | quiz. */
  kind: string;
  /** Narration markup (see lib/narration.ts): `{cue}` markers and `[display|spoken]` fixes. */
  narration?: string;
  /** Seconds before the narration starts (default 0.6) and after it ends (default 0.9). */
  lead?: number;
  tail?: number;
  /** Minimum scene length in seconds. */
  min?: number;
  /** Where the camera travels to reach this scene (default `right`; a new part of the chapter goes `down`). */
  move?: "right" | "down";
  /** Scene-kind props; cue references are names from `narration`. */
  props?: Record<string, unknown>;
  /** Live scenes: what to film. */
  live?: LiveSpec;
}

export interface ChapterScript {
  slug: string;
  scenes: SceneSpec[];
  /** Extra pronunciations for this chapter. */
  pronounce?: Record<string, string>;
}

const hl: typeof import("../../../packages/react/src/highlight") = await import(join(REPO, "packages/react/src/highlight.ts"));

/** Syntax-highlighted lines (the site's tokenizer, so colours match textjs.org). */
export function tokenize(code: string, language?: string): Token[][] {
  return hl.tokenize(code, language) as Token[][];
}

export interface CodeLine {
  kind: "add" | "del" | "ctx";
  tokens: Token[];
  hunk?: number;
  text: string;
}

/** A plain file as editor lines. */
export function fileLines(source: string, language: string): CodeLine[] {
  const text = source.replace(/\n$/, "").split("\n");
  const toks = tokenize(text.join("\n"), language);
  return text.map((t, i) => ({ kind: "ctx", tokens: toks[i] ?? [], text: t }));
}

/** A unified-diff code step (`+`/`-`/` ` prefixes, as in the lessons) as editor lines with hunk numbers. */
export function diffLines(source: string, language: string): CodeLine[] {
  const raw = source.replace(/\n$/, "").split("\n");
  const parsed = raw.map((line) => {
    const m = line[0];
    if (m === "+") return { kind: "add" as const, text: line.slice(1) };
    if (m === "-") return { kind: "del" as const, text: line.slice(1) };
    return { kind: "ctx" as const, text: m === " " ? line.slice(1) : line };
  });
  const toks = tokenize(parsed.map((l) => l.text).join("\n"), language);
  let hunk = -1;
  let prev = "ctx";
  return parsed.map((l, i) => {
    if (l.kind !== "ctx" && prev === "ctx") hunk++;
    prev = l.kind;
    return { ...l, tokens: toks[i] ?? [], ...(l.kind === "ctx" ? {} : { hunk }) };
  });
}

/** Index of the first line containing `match` (after `from`). Throws when missing, so scripts can't drift silently. */
export function lineOf(lines: Array<{ text: string }>, match: string, from = 0): number {
  const i = lines.findIndex((l, k) => k >= from && l.text.includes(match));
  if (i < 0) throw new Error(`No line contains ${JSON.stringify(match)}`);
  return i;
}

/** `[from, to]` line range between two matches (inclusive). */
export function linesBetween(lines: Array<{ text: string }>, a: string, b: string): [number, number] {
  const from = lineOf(lines, a);
  return [from, lineOf(lines, b, from)];
}

/** The file a diff step produces (what the reader has after applying it). */
export function applyDiff(source: string): string {
  return source
    .replace(/\n$/, "")
    .split("\n")
    .filter((l) => l[0] !== "-")
    .map((l) => (l[0] === "+" || l[0] === " " ? l.slice(1) : l))
    .join("\n");
}
