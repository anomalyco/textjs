import type { ReactNode } from "react";
import { Box, Image } from "@textjs/react";
import { EggFrame, Facts, Pixels, sprite } from "../ui";

// The green rubber fish mask, facing left.
const MASK = sprite(
  [
    "...........gggggggggg.......",
    "........ggggggGGGGggggg.....",
    "......gggggGGGGGGGGGgggg....",
    ".....ggggGGGGGGGGGGGGGggg...",
    "....gggGGGyyyyGGGGGGGGGggg..",
    "...ggkkGGyyykkyyGGGGGGGGgg..",
    "...gkkkGGyykkkkyyGGGGGGGggg.",
    "...gggGGGyykkkkyyGGGGGGGGgg.",
    "..ggkkGGGGyyyyyyGGGGGGGGGgg.",
    "..ggggGGGGGGGGGGGGGGGGGGGggg",
    "..gggGGGGGGGGGGGGGGGGGGGGggg",
    ".ggggGGGGGGGGGGGGGGGGGGGGggg",
    "YYYYYYgGGGGGGGGGGGGGGGGGGggg",
    "YYYYYYYYgGGGGGGGGGGGGGGGgggg",
    "YYkkkkYYYgGGGGGGGGGGGGGggggg",
    "YYYYYYYYYgGGGGGGGGGGGGgggggg",
    ".YYYYYYYgGGGGGGGGGGGGgggggg.",
    "...gggggGGGGGGGGGGGgggggggg.",
    ".....gggggggggggggggggggg...",
    "........gggggggggggggg......",
  ],
  { g: "#2f7d2a", G: "#47a338", y: "#f2d43a", Y: "#f0d24a", k: "#1a1a1a" },
);

export function JackEgg(): ReactNode {
  return (
    <EggFrame crumb="jack">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={MASK} besides={48} />
        <Facts
          rows={[
            ["Item", "Green fish mask (无异味)"],
            ["Taobao cart", "99+"],
            ["Camouflage", "Unbeatable in forest"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
