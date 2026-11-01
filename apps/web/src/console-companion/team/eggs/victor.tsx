import type { ReactNode } from "react";
import { Box, Image, Text } from "@textjs/react";
import { EggFrame, Pixels, sprite } from "../ui";

// A torii gate.
const TORII = sprite(
  [
    "kk..................................kk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    "..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "......rrr.........rr.........rrr......",
    "......rrr.........rr.........rrr......",
    "..rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    "......rrr....................rrr......",
    ".....kkkkk..................kkkkk.....",
  ],
  { k: "#1d1d1f", r: "#d0342c" },
);

export function VictorEgg(): ReactNode {
  return (
    <EggFrame crumb="#meditation">
      <Box className="flex-col grow items-center justify-center gap-1">
        <Pixels pixels={TORII} reserve={2} />
        <Text color="muted">Astral plane · 4th Jhana · gracias amigo</Text>
      </Box>
    </EggFrame>
  );
}
