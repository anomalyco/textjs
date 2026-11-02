import type { ReactNode } from "react";
import { renderAsciiFont } from "@textjs/react";
import type { Look } from "../index";

/**
 * A3 "Paper": `%c`, the format directive every frame is built from, set in ink on a vermilion seal.
 * Drawn on a 32-unit grid: solid-dot percent, a slash at the cap height and a lowercase c on the x-height.
 */
function Mark({ size }: { size: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7.5" fill="#ff4a1c" />
      <g fill="#181715" stroke="#181715" strokeLinecap="round">
        <circle cx="8.1" cy="11.6" r="2.75" stroke="none" />
        <circle cx="14.3" cy="20.6" r="2.75" stroke="none" />
        <path d="M16.1 8.9 6.3 23.3" strokeWidth="2.8" fill="none" />
        <path d="M25.69 15.5A3.4 3.4 0 1 0 25.69 20.7" strokeWidth="2.9" fill="none" />
      </g>
    </svg>
  );
}

/**
 * `%c` in the block font's 5-row pixels. A console cell is about twice as tall as it is wide, so the
 * percent's dots are two cells wide (square) and clear of the slash; the c sits on a 3-row x-height.
 */
const PERCENT = ["##...#.", "....#..", "...#...", "..#....", ".#...##"];
const C = ["....", "....", ".###", "#...", ".###"];

const banner = ((): string[] => {
  const text = renderAsciiFont("TEXT.JS");
  // `%` and `c` one column apart, then the same gap as `▼ TEXT.JS` (one column, a two-column space, one column).
  return PERCENT.map((p, i) => `${p}.${C[i]}....`.replace(/#/g, "█").replace(/\./g, " ") + (text[i] ?? "")).map((row) => row.replace(/\s+$/, ""));
})();

export const look: Look = { id: "a3", name: "Paper", Mark, banner };
