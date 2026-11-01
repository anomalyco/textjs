import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, Text, useInput } from "@textjs/react";
import { EggFrame, Facts, Pixels, Raster } from "../ui";

export const WEDGES = 8;

/** A wheel of brie from above on a board, with `left` of its 8 wedges remaining. */
export function brie(left: number): Raster {
  const r = new Raster(44, 30);
  r.rect(0, 22, 44, 8, "#8a5a32");
  r.rect(0, 22, 44, 1, "#a9733f");
  r.rect(2, 26, 40, 1, "#7a4e2b");
  const cx = 22;
  const cy = 13;
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 44; x++) {
      const dx = (x - cx) / 18;
      const dy = (y - cy) / 12;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const wedge = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * WEDGES) % WEDGES;
      if (wedge >= left) continue;
      r.px(x, y, d > 0.78 ? "#f4eedf" : (x + y) % 7 === 0 ? "#efd99a" : "#f6e4ae");
    }
  return r;
}

export function JamesEgg(): ReactNode {
  const [left, setLeft] = useState(WEDGES);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setLeft((n) => Math.max(0, n - 1));
  });
  const art = useMemo(() => brie(left), [left]);
  return (
    <EggFrame crumb="brie" hints={[{ keys: "Space", label: "eat a wedge" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={art} besides={42} />
        <Box className="flex-col shrink-0 gap-1">
          <Facts
            rows={[
              ["Wheel", `${left}/${WEDGES} wedges`],
              ["Reserved for", "James"],
              ["Liquid Glass", "Off"],
              ["Chocolate muffins", left === 0 ? "David's now" : "Shared"],
            ]}
          />
          <Text color="muted">{left === 0 ? "Ate the whole thing." : " "}</Text>
        </Box>
      </Box>
    </EggFrame>
  );
}
