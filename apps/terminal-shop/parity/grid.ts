/** A captured screen: one `[char, fg, bg, bold]` per cell (colors as `#rrggbb`, `null` = terminal default). */
export interface Grid {
  cols: number;
  rows: number;
  cells: Array<Array<[string, string | null, string | null, boolean]>>;
}

export function toText(grid: Grid): string {
  return grid.cells
    .map((row) => row.map((c) => c[0]).join("").trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}
