import type { StyledFrame } from "@textjs/core";
import type { CompanionTab, Hint } from "../console-companion/store";

export interface PreviewMeta {
  cols: number;
  rows: number;
  /** Display name (defaults to the capitalized id). */
  label?: string;
  /** Keys shown in the preview header (Playground demos use their picker hints). */
  hints?: readonly Hint[];
}

export const PREVIEW_META: Readonly<Record<string, PreviewMeta>> = {
  counter: { cols: 72, rows: 16, hints: [{ keys: "↑ ↓", label: "count" }, { keys: "r", label: "reset" }] },
  layout: { cols: 64, rows: 14 },
  spinner: { cols: 56, rows: 10 },
  form: { cols: 84, rows: 19, hints: [{ keys: "Tab", label: "next field" }, { keys: "Enter", label: "submit" }] },
  scrollbox: { label: "ScrollBox", cols: 60, rows: 12 },
  modal: { cols: 72, rows: 14 },
  streaming: { cols: 80, rows: 24 },
  diff: { cols: 72, rows: 12 },
  ascii: { label: "AsciiFont", cols: 64, rows: 11 },
  fonts: { label: "Font gallery", cols: 100, rows: 19 },
  theme: { cols: 96, rows: 9 },
  dashboard: { cols: 100, rows: 26 },
  snake: { cols: 96, rows: 24 },
  table: { cols: 72, rows: 13 },
  tree: { cols: 56, rows: 11 },
  charts: { cols: 72, rows: 14 },
  controls: { cols: 72, rows: 14 },
  keymap: { cols: 80, rows: 18 },
  bidi: { label: "Bidirectional text", cols: 48, rows: 6 },
};

export function previewLabel(id: string): string {
  return PREVIEW_META[id]?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Rows above the example: one header line. */
export const EXAMPLE_HEADER_ROWS = 1;

/** Home's Components section runs each of its examples on one stage of this size. */
export const HOME_EXAMPLE_GRID = { cols: 76, rows: 16 } as const;

/** Pages that can hand an example to the console: the docs, and Home's Components section. */
export function runsExamples(tab: CompanionTab): tab is "docs" | "home" {
  return tab === "docs" || tab === "home";
}

/** The example's own cells: its preview spec in the docs, the Components stage on Home. */
export function exampleSize(id: string, tab: CompanionTab = "docs"): { cols: number; rows: number } | null {
  const spec = PREVIEW_META[id];
  if (!spec) return null;
  return tab === "home" ? { ...HOME_EXAMPLE_GRID } : { cols: spec.cols, rows: spec.rows };
}

/** Console grid while an example runs: exactly its size plus the header. */
export function exampleGrid(id: string, tab: CompanionTab = "docs"): { cols: number; rows: number } | null {
  const size = exampleSize(id, tab);
  return size ? { cols: size.cols, rows: size.rows + EXAMPLE_HEADER_ROWS } : null;
}

/**
 * The line above a docs example running in the console. The page finds its example's frames by this line, so it
 * uses only the example's label: the console stays English on translated pages, and it must fit the example's width.
 */
export function exampleHeader(id: string): string {
  return `▼ Docs › ${previewLabel(id)}`;
}

export const HOME_EXAMPLE_PREFIX = "▼ Text.js › Components › ";

export function homeExampleHeader(id: string): string {
  return `${HOME_EXAMPLE_PREFIX}${previewLabel(id)}`;
}

/** Whether a companion frame is showing one of Home's examples (the hero mirror skips those). */
export function isHomeExampleFrame(frame: StyledFrame): boolean {
  return (frame.rows[0] ?? []).map((s) => s.text).join("").includes(HOME_EXAMPLE_PREFIX);
}

/**
 * The example's own cells of a companion frame (header row dropped, cropped to
 * the example's size), or `null` when the frame isn't showing this example yet.
 */
export function exampleFrame(frame: StyledFrame | null, header: string, id: string, tab: CompanionTab = "docs"): StyledFrame | null {
  const size = exampleSize(id, tab);
  if (!frame || !size) return null;
  const first = (frame.rows[0] ?? []).map((s) => s.text).join("");
  if (!first.includes(header)) return null;
  const rows = frame.rows.slice(EXAMPLE_HEADER_ROWS, EXAMPLE_HEADER_ROWS + size.rows);
  return { width: Math.min(frame.width, size.cols), height: rows.length, rows };
}
