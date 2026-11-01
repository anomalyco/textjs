import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, useInterval, useTimeout } from "@textjs/react";
import { EggFrame, Facts, Pixels, sprite } from "../ui";

// A sloth hanging from a branch.
const SLOTH = [
  "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "........cc..cc......cc..cc........",
  "........bb..bb......bb..bb........",
  "........bb..bb......bb..bb........",
  "........bbb.bbb....bbb.bbb........",
  ".........bbbbbbbbbbbbbbbb.........",
  "........bbbbbbbbbbbbbbbbbb........",
  ".......bbbbbbbbbbbbbbbbbbbb.......",
  ".......bbbbbffffffffffbbbbb.......",
  "......bbbbffDDffffffDDffbbbb......",
  "......bbbffDEDffffffDEDffbbb......",
  "......bbbffDDffffffffDDffbbb......",
  "......bbbbfffffnnnnfffffbbbb......",
  ".......bbbbffffmmmmffffbbbb.......",
  "........bbbbbffffffffbbbbb........",
  ".........bbbbbbbbbbbbbbbb.........",
  "..........bbbbbbbbbbbbbb..........",
  "............bbbbbbbbbb............",
];
const PALETTE = { w: "#7a5534", W: "#5c3f26", c: "#e8e2d0", b: "#8a7560", f: "#d9c9a8", D: "#4a3a2a", E: "#141414", n: "#2b2118", m: "#6b4a3a" };

export function sloth(blink: boolean): ReturnType<typeof sprite> {
  return sprite(blink ? SLOTH.map((row) => row.replace(/E/g, "D")) : SLOTH, PALETTE);
}

export function JamieEgg(): ReactNode {
  const [blink, setBlink] = useState(false);
  // Once every 4 seconds.
  useInterval(() => setBlink(true), 4000);
  useTimeout(() => setBlink(false), blink ? 300 : null);
  const art = useMemo(() => sloth(blink), [blink]);
  return (
    <EggFrame crumb="morning!">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={art} besides={42} />
        <Facts
          rows={[
            ["Greeting", "Morning!"],
            ["Blink rate", "1 per 4 s"],
            ["Figma", "Visiting in good spirit"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
