/** Renders this port's version of a shot (test harness + in-memory API) as a `Grid`. */

import { mountShop } from "../test/app";
import type { Grid } from "./grid";
import type { Shot } from "./shots";

const hex = (c: number): string | null => ((c & 0xff) === 0 ? null : `#${(c >>> 8).toString(16).padStart(6, "0")}`);

export async function renderOurs(shot: Shot): Promise<Grid> {
  const h = await mountShop({ size: { cols: shot.cols, rows: shot.rows } });
  try {
    // A fresh ssh account: nothing saved yet.
    h.api.state.tokens = [];
    h.api.state.user.email = null;
    h.api.state.user.name = null;
    await h.t.waitFor(() => h.store.s.phase === "ready" && !h.screen().includes("terminal ") || h.screen().includes("~ featured ~") || h.screen().includes("is too small"), "ready");
    await h.t.waitFor(() => h.store.s.phase === "ready", "ready");
    await h.t.settle(20);
    await h.press(...(shot.ours ?? shot.ssh));
    await h.t.settle(30);
    h.screen();
    const buf = h.t.root.renderer.buffer;
    const grid: Grid = { cols: shot.cols, rows: shot.rows, cells: [] };
    for (let y = 0; y < shot.rows; y++) {
      const row: Grid["cells"][number] = [];
      for (let x = 0; x < shot.cols; x++) {
        const c = buf.getCell(x, y);
        if (!c) continue;
        if (c.char === "") continue;
        row.push([c.char || " ", hex(c.fg), hex(c.bg), (c.attrs & 1) !== 0]);
      }
      grid.cells.push(row);
    }
    return grid;
  } finally {
    await h.stop();
  }
}

/**
 * This port's account menu has two more rows ("payment methods", "profile"). To compare with
 * the ssh capture, take them out of the menu column and close the gap.
 */
export function withoutExtraMenuRows(text: string, cols: number): string {
  const rows = text.split("\n");
  const r0 = rows.findIndex((l) => l.includes(" order history"));
  if (r0 < 0) return text;
  const stacked = cols < 80;
  const x0 = stacked ? 0 : (rows[r0] as string).indexOf("order history") - 2;
  const x1 = stacked ? cols : x0 + 22;
  const col = rows.map((l) => l.padEnd(cols).slice(x0, x1));
  const rp = col.findIndex((l) => l.trim() === "payment methods");
  if (rp < 0) return text;
  col.splice(rp, 2);
  const last = col.findIndex((l) => l.trim() === "debug info");
  col.splice(last + 1, 0, " ".repeat(x1 - x0), " ".repeat(x1 - x0));
  return rows.map((l, i) => (l.padEnd(cols).slice(0, x0) + col[i] + l.padEnd(cols).slice(x1)).trimEnd()).join("\n").replace(/\n+$/, "");
}
