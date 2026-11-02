import type { ReactNode } from "react";
import { renderAsciiFont } from "@textjs/react";
import type { Look } from "../index";

/**
 * The T from Text.js's block font (`packages/react/src/fonts.ts`), five cells wide and five tall,
 * drawn as separate cells. 3-unit cells on a 4-unit pitch, so at 20px every cell and gap lands on
 * whole device pixels at 2x.
 */
const T = ["#####", "..#..", "..#..", "..#..", "..#.."];

function Mark({ size }: { size: number }): ReactNode {
  const cells: ReactNode[] = [];
  T.forEach((row, y) =>
    Array.from(row).forEach((c, x) => {
      if (c === "#") cells.push(<rect key={`${x}-${y}`} x={0.5 + x * 4} y={0.5 + y * 4} width={3} height={3} />);
    }),
  );
  return (
    <svg className="a1-mark" width={size} height={size} viewBox="0 0 20 20" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {cells}
    </svg>
  );
}

export const look: Look = { id: "a1", name: "Cells", Mark, banner: renderAsciiFont("TEXT.JS", "block") };
