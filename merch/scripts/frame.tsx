/**
 * Captures the first frame textjs.org renders into the DevTools console (the home companion at
 * 104×32): the source for the Frame Tee back print. Writes the plain text and every styled run
 * (color, weight) exactly as the console.log call carries them. Run with `bun run frame`.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { CompanionApp } from "../../apps/web/src/console-companion/App";
import { siteStore } from "../../apps/web/src/console-companion/store";
import { mount } from "../../apps/web/test/helpers";

const COLS = 104;
const ROWS = 32;

await act(async () => {
  siteStore.reset();
  siteStore.syncRoute("/");
});
const h = await mount(<CompanionApp />, { cols: COLS, rows: ROWS, tabFocus: false });
h.frame();
const [format, ...styles] = h.console.logs.at(-1) as [string, ...string[]];

interface Run {
  row: number;
  col: number;
  text: string;
  color: string;
  bold: boolean;
}

// Walk the format string: `%c` takes the next style argument, `%%` is a literal percent sign.
const runs: Run[] = [];
let style = "";
let next = 0;
let row = 0;
let col = 0;
let text = "";
let start = 0;
const flush = (): void => {
  if (text.trim()) {
    const color = /(?:^|;)color:([^;]+)/.exec(style)?.[1] ?? "#ededed";
    runs.push({ row, col: start, text, color, bold: style.includes("font-weight:700") });
  }
  text = "";
  start = col;
};
for (let i = 0; i < format.length; i++) {
  const ch = format[i] as string;
  if (ch === "%" && format[i + 1] === "c") {
    flush();
    style = styles[next++] ?? "";
    i++;
    continue;
  }
  if (ch === "%" && format[i + 1] === "%") i++;
  if (ch === "\n") {
    flush();
    row++;
    col = 0;
    start = 0;
    continue;
  }
  // Two code units for astral characters still occupy one cell.
  const cp = format.codePointAt(i) as number;
  if (cp > 0xffff) i++;
  text += String.fromCodePoint(cp);
  col++;
}
flush();

const out = join(import.meta.dir, "..", "artwork");
writeFileSync(join(out, "frame.txt"), `${h.frame()}\n`);
writeFileSync(join(out, "frame.json"), `${JSON.stringify({ cols: COLS, rows: ROWS, runs }, null, 1)}\n`);
await h.unmount();
process.exit(0);
