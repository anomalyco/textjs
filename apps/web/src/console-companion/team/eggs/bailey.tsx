import type { ReactNode } from "react";
import { Box, Image } from "@textjs/react";
import { EggFrame, Facts, Pixels, sprite } from "../ui";

// A glass of pinot grigio and a bunch of grapes.
const PROVISIONS = sprite(
  [
    "..gggggggggg.....................t....",
    ".g..........g...................tl....",
    ".g..........g..................tll....",
    ".g..........g.................t.......",
    ".gwwwwwwwwwwg..............GGGqG......",
    ".gwwwwwwwwwwg.............GqGGGqGG....",
    ".gwWwwwwwwwwg............GGGqGGGqGG...",
    "..gwwwwwwwwg.............GqGGGqGGGq...",
    "..gwWwwwwwwg..............GGqGGGqGG...",
    "...gwwwwwwg...............qGGGqGGGq...",
    "....gwwwwg.................GqGGGqG....",
    ".....gggg..................GGGqGGG....",
    "......gg....................qGGGq.....",
    "......gg....................GGqGG.....",
    "......gg.....................GGq......",
    "......gg......................G.......",
    "......gg..............................",
    "...gggggggg...........................",
  ],
  { g: "#dfe9ee", w: "#f1e7a6", W: "#fbf5d0", t: "#6b4a2e", l: "#5e9a4a", G: "#9cc653", q: "#6f9f36" },
);

export function BaileyEgg(): ReactNode {
  return (
    <EggFrame crumb="villa provisions">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={PROVISIONS} besides={52} />
        <Facts
          rows={[
            ["1. Liquid grapes", "Pinot grigio, chilled"],
            ["2. Actual grapes", "Seedless"],
            ["3. Sheet masks", "For the villa spa"],
            ["4. Banana", "$10.00 (1 Google Workspace seat)"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
