/**
 * Real Text.js frames for motion-graphics scenes: renders an element offscreen with `@textjs/react/testing`,
 * presses keys, and returns the styled frame (the same cells the console would show).
 */
import type { ReactNode } from "react";
import { join } from "node:path";
import { REPO } from "./env";
import type { TuiFrame } from "../stage/types";

const testing: typeof import("../../../packages/react/src/testing") = await import(join(REPO, "packages/react/src/testing.tsx"));
const core: typeof import("../../../packages/core/src/index") = await import(join(REPO, "packages/core/src/index.ts"));
/** Components for chapter scripts (what `@textjs/next` re-exports). */
export const ui: typeof import("../../../packages/react/src/index") = await import(join(REPO, "packages/react/src/index.ts"));

export async function renderFrame(
  element: ReactNode,
  opts: { cols: number; rows: number; keys?: string[]; trim?: boolean; theme?: import("../../../packages/react/src/theme").ThemeName },
): Promise<TuiFrame> {
  const app = await testing.render(element, { cols: opts.cols, rows: opts.rows, ...(opts.theme ? { theme: opts.theme } : {}) });
  for (const k of opts.keys ?? []) await app.press(k);
  const frame = core.extractStyledFrame(app.root.renderer.buffer);
  await app.unmount();
  let rows = frame.rows.map((row) =>
    row.map((s) => ({
      text: s.text,
      fg: s.fgCss,
      bg: s.bgCss,
      ...(s.bold ? { bold: true } : {}),
      ...(s.dim ? { dim: true } : {}),
      ...(s.italic ? { italic: true } : {}),
      ...(s.underline ? { underline: true } : {}),
      ...(s.strikethrough ? { strikethrough: true } : {}),
    })),
  );
  let width = frame.width;
  if (opts.trim !== false) {
    const blank = (row: typeof rows[number]): boolean => row.every((s) => !s.text.trim() && !s.bg);
    while (rows.length && blank(rows[rows.length - 1]!)) rows.pop();
    while (rows.length && blank(rows[0]!)) rows.shift();
    // Trim the right edge to the widest content.
    let used = 0;
    for (const row of rows) {
      let x = 0;
      let last = 0;
      for (const s of row) {
        x += s.text.length;
        if (s.text.trim() || s.bg) last = x - (s.text.length - s.text.trimEnd().length);
      }
      used = Math.max(used, last);
    }
    width = used;
    rows = rows.map((row) => {
      const out: typeof row = [];
      let x = 0;
      for (const s of row) {
        if (x >= width) break;
        const take = s.text.slice(0, width - x);
        out.push({ ...s, text: take });
        x += s.text.length;
      }
      return out;
    });
  }
  return { width, height: rows.length, rows };
}
