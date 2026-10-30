import { useMemo, type ReactNode } from "react";
import { Box, KeyHint, Text, useInput } from "@textjs/react";
import type { StyledFrame } from "@textjs/core";
import { DOCS, getDoc } from "../../docs/registry";
import { PREVIEWS, previewLabel } from "../../docs/previews";
import { siteStore } from "../store";
import { useSite } from "../useSite";

/** Rows above the example: one header line. */
export const EXAMPLE_HEADER_ROWS = 1;

/** Console grid while an example runs: exactly its preview spec plus the header. */
export function exampleGrid(id: string): { cols: number; rows: number } | null {
  const spec = PREVIEWS[id];
  return spec ? { cols: spec.cols, rows: spec.rows + EXAMPLE_HEADER_ROWS } : null;
}

export function exampleHeader(docSlug: string, id: string): string {
  const doc = getDoc(docSlug) ?? DOCS[0];
  return `▼ Docs › ${doc?.nav ?? doc?.title ?? "Docs"} › ${previewLabel(id)}`;
}

/**
 * The example's own cells of a companion frame (header row dropped, cropped to
 * the preview size), or `null` when the frame isn't showing this example yet.
 */
export function exampleFrame(frame: StyledFrame | null, header: string, id: string): StyledFrame | null {
  const spec = PREVIEWS[id];
  if (!frame || !spec) return null;
  const first = (frame.rows[0] ?? []).map((s) => s.text).join("");
  if (!first.includes(header)) return null;
  const rows = frame.rows.slice(EXAMPLE_HEADER_ROWS, EXAMPLE_HEADER_ROWS + spec.rows);
  return { width: Math.min(frame.width, spec.cols), height: rows.length, rows };
}

/** A docs example running full-size in the console, with one line of context. */
export function ExampleTab({ id }: { id: string }): ReactNode {
  const site = useSite();
  const spec = PREVIEWS[id];
  const app = useMemo(() => spec?.render() ?? null, [spec]);

  // Last in line: only an Esc the example itself didn't use goes back to the docs.
  useInput(
    (e) => {
      if (e.key !== "escape" || e.ctrl || e.meta || e.alt || e.shift) return;
      e.stopPropagation();
      siteStore.exitExample(id);
    },
    { priority: -100 },
  );

  if (!spec) return null;
  return (
    <Box className="flex-col shrink-0" width={spec.cols} height={spec.rows + EXAMPLE_HEADER_ROWS}>
      <Box className="flex-row h-1 shrink-0 px-1 gap-2">
        <Box className="grow shrink overflow-hidden">
          <Text bold color="fg" wrap="truncate-end">
            {exampleHeader(site.docSlug, id)}
          </Text>
        </Box>
        <Box className="shrink-0">
          <KeyHint keys="esc" label="back to docs" />
        </Box>
      </Box>
      <Box className="flex-col shrink-0" width={spec.cols} height={spec.rows}>
        {app}
      </Box>
    </Box>
  );
}
