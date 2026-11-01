import { useState, type ReactNode } from "react";
import { Box, Image, Text, useInterval, useViewport } from "@textjs/react";
import { EggFrame, Facts, sprite } from "../ui";

// A witch on a broom, flying right.
const WITCH = sprite(
  [
    "..........k.........",
    ".........kk.........",
    "........kkk.........",
    ".......kkpkk........",
    "....kkkkkkkkkk......",
    "........sss.........",
    "......hhsss.........",
    ".....hhrrrrr........",
    ".....hrrrrrrrs......",
    "yyy.bbbbbbbbbbbbbbbb",
    "yyyyrrrrrrr.........",
    "yyy...kk..kk........",
  ],
  { k: "#1d1a24", p: "#8f5bd8", s: "#e7b48f", h: "#2b1d16", r: "#5b2c86", b: "#8a5a32", y: "#d9b54a" },
);

const CLAUSES = ["§ 4.2  Limitation of liability", "§ 7.1  Indemnification", "§ 9.3  Governing law", "§ 12.4 Assignment"];

export function TasEgg(): ReactNode {
  const vp = useViewport();
  const span = Math.max(0, vp.cols - WITCH.width - 6);
  const [x, setX] = useState(0);
  useInterval(() => setX((v) => Math.min(span, v + 3)), x < span ? 200 : null);
  return (
    <EggFrame crumb="legal">
      <Box className="flex-col grow justify-center gap-1">
        <Box className="flex-row shrink-0" paddingLeft={x}>
          <Image pixels={WITCH} />
        </Box>
        <Box className="flex-col shrink-0">
          {CLAUSES.map((c) => (
            <Text key={c} color="danger" strikethrough wrap="nowrap">
              {c}
            </Text>
          ))}
        </Box>
        <Facts
          rows={[
            ["Status", "Flying away from the redlines"],
            ["Snacks", "Plantain chips, sweet and spicy"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
