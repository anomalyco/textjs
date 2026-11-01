import type { ReactNode } from "react";
import { Box, Image, useViewport } from "@textjs/react";
import { EggFrame, Facts, Pixels, sprite } from "../ui";

// A Maßkrug of Helles.
const STEIN = sprite(
  [
    "...ffffffffff.....",
    "..ffffffffffff....",
    ".ffffffffffffff...",
    ".gffffffffffffg...",
    ".gbbbbbbbbbbbbgggg",
    ".gbybbbbbbbbbbg..g",
    ".gbybbbybbbbbbg..g",
    ".gbybbbbbbbybbg..g",
    ".gbybbbbbbbbbbg..g",
    ".gbybbybbbbbbbg..g",
    ".gbybbbbbbbbbbg..g",
    ".gbybbbbbybbbbg..g",
    ".gbybbbbbbbbbbgggg",
    ".gbbbbbbbbbbbbg...",
    ".gggggggggggggg...",
    "..gggggggggggg....",
  ],
  { f: "#fbf6e9", g: "#cfe0e4", b: "#f2b632", y: "#ffe08a" },
);

export function SebastianEgg(): ReactNode {
  const vp = useViewport();
  return (
    <EggFrame crumb="Entwicklerwerkzeugkonsolenansicht">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={STEIN} besides={62} />
        <Facts
          rows={[
            ["Zeichenzellenpuffergröße", `${vp.cols} × ${vp.rows} Zellen`],
            ["Einzelbildprotokollierungsaufruf", "console.log"],
            ["Mindestbildwiederholungsabstand", "66 ms"],
            ["Flughafenwartezeitgetränk", "1 × Helles (08:00 Uhr)"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
