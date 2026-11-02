import type { ReactNode } from "react";
import { renderAsciiFont } from "@textjs/react";
import type { Look } from "../index";

/**
 * A2 "Prompt": the console input prompt, a chevron and a block caret, as it sits at the bottom of
 * every DevTools console. The chevron carries the accent (`--a2-prompt`), the caret the text color.
 */
function Mark({ size }: { size: number }): ReactNode {
  return (
    <svg className="a2-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon className="a2-mark-chevron" points="1,4 5.5,4 13.5,12 5.5,20 1,20 9,12" />
      <rect className="a2-mark-caret" x="16" y="4" width="7" height="16" />
    </svg>
  );
}

/**
 * The same prompt in the block font's 5 rows. Console cells are about twice as tall as they are wide,
 * so the chevron steps two columns per row (a 45° stroke) and the 4×5 caret keeps the mark's proportions.
 */
const PROMPT = ["##......####", "..##....####", "....##..####", "..##....####", "##......####"];

function banner(): string[] {
  const letters = renderAsciiFont("TEXT.JS");
  return PROMPT.map((row, r) => `${row}....`.replace(/#/g, "█").replace(/\./g, " ") + (letters[r] ?? ""));
}

export const look: Look = { id: "a2", name: "Prompt", Mark, banner: banner() };
