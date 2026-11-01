import { useEffect, useMemo, type ReactNode } from "react";
import { Box, KeyHint, Text, useFocusManager, useInput } from "@textjs/react";
import type { StyledFrame } from "@textjs/core";
import { DOCS, getDoc } from "../../docs/registry";
import { PREVIEWS, previewLabel } from "../../docs/previews";
import { siteStore, type CompanionTab } from "../store";
import { useSite } from "../useSite";

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
  const spec = PREVIEWS[id];
  if (!spec) return null;
  return tab === "home" ? { ...HOME_EXAMPLE_GRID } : { cols: spec.cols, rows: spec.rows };
}

/** Console grid while an example runs: exactly its size plus the header. */
export function exampleGrid(id: string, tab: CompanionTab = "docs"): { cols: number; rows: number } | null {
  const size = exampleSize(id, tab);
  return size ? { cols: size.cols, rows: size.rows + EXAMPLE_HEADER_ROWS } : null;
}

export function exampleHeader(docSlug: string, id: string): string {
  const doc = getDoc(docSlug) ?? DOCS[0];
  return `▼ Docs › ${doc?.nav ?? doc?.title ?? "Docs"} › ${previewLabel(id)}`;
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

/** An example running full-size in the console, with one line of context. */
export function ExampleTab({ id }: { id: string }): ReactNode {
  const site = useSite();
  const focus = useFocusManager();
  const spec = PREVIEWS[id];
  const size = exampleSize(id, site.tab);
  const app = useMemo(() => spec?.render() ?? null, [spec]);
  const home = site.tab === "home";

  // Examples like forms and controls move focus with Tab, as they do in their own sandbox.
  useEffect(() => {
    focus.enableFocus();
    return () => focus.disableFocus();
  }, [focus]);

  // Last in line: only an Esc the example itself didn't use goes back to the page's view.
  useInput(
    (e) => {
      if (e.key !== "escape" || e.ctrl || e.meta || e.alt || e.shift) return;
      e.stopPropagation();
      siteStore.exitExample(id);
    },
    { priority: -100 },
  );

  if (!spec || !size) return null;
  return (
    <Box className="flex-col shrink-0" width={size.cols} height={size.rows + EXAMPLE_HEADER_ROWS}>
      <Box className="flex-row h-1 shrink-0 px-1 gap-2">
        <Box className="grow shrink overflow-hidden">
          <Text bold color="fg" wrap="truncate-end">
            {home ? homeExampleHeader(id) : exampleHeader(site.docSlug, id)}
          </Text>
        </Box>
        <Box className="shrink-0">
          <KeyHint keys="Esc" label={home ? "back to counter" : "back to docs"} />
        </Box>
      </Box>
      <Box className="flex-col shrink-0" width={size.cols} height={size.rows}>
        {app}
      </Box>
    </Box>
  );
}
