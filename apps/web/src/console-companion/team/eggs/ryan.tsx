import { useState, type ReactNode } from "react";
import { Box, Image, Text, useInput } from "@textjs/react";
import { EggFrame, Facts, Pixels, sprite } from "../ui";

// Wilderness Explorer Ryan: a bush hat with a Starlink dish, a neckerchief and badges.
const RYAN = sprite(
  [
    "..........wwwwwwwwwwww....",
    ".........wwwwwwwwwwwwww...",
    "........wwwwwwwWWwwwwww...",
    "........wwwwwwwwwwwwwww...",
    "..............kk..........",
    ".............kkkk.........",
    "........ttttttttttt.......",
    "......tttttttttttttt......",
    "....TTTTTTTTTTTTTTTTTT....",
    "...TTTThhhhhhhhhhhhTTTT...",
    ".......hsssssssssssh......",
    "......hsssssssssssssh.....",
    "......ssseesssssseesss....",
    ".....srrssssssssssssrrs...",
    ".....srrsssssSSsssssrrs...",
    "......sssssssssssssss.....",
    "......ssssmmmmmmmsssss....",
    ".......sssssssssssss......",
    ".........sssssssss........",
    "......oooooooooooooo......",
    "....kkkooooooooooookkk....",
    "..kkkyyyyyooooooyyyykkk...",
    ".kkyyyyyyyyoooyyyyyyykk...",
    ".kyyy1yyy2yyoyyy3yyyyyk...",
    "kkyyyyyyyyyyoyyyy4yyyykk..",
  ],
  {
    w: "#eef0f2",
    W: "#9aa2ab",
    k: "#2a2a2a",
    t: "#c9b07a",
    T: "#b39a62",
    h: "#6b4226",
    s: "#efc0a0",
    S: "#d9a284",
    e: "#2b2b2b",
    r: "#f0a0a0",
    m: "#b05a4a",
    o: "#e06a2c",
    y: "#d8c99a",
    "1": "#3f9b5c",
    "2": "#d8392b",
    "3": "#4a86c8",
    "4": "#e2b33a",
  },
);

const GOLD = "#e6b422";

export function RyanEgg(): ReactNode {
  const [cokes, setCokes] = useState(8);
  useInput((e) => {
    if (e.input !== "c") return;
    e.stopPropagation();
    setCokes((n) => Math.min(24, n + 1));
  });
  return (
    <EggFrame
      crumb="vogel"
      hints={[{ keys: "c", label: "crack a coke" }]}
      side={
        <Text color={GOLD} wrap="nowrap">
          {"  ★ Premium Verified"}
        </Text>
      }
    >
      <Box className="flex-row grow items-center justify-center gap-6">
        <Pixels pixels={RYAN} besides={50} />
        <Facts
          rows={[
            ["Status", "Slack Premium Verified", GOLD],
            ["Voter eligibility", "Pending"],
            ["Starlink hat", "Connected"],
            [
              "Cokes today",
              <Box key="c" className="flex-row h-1 shrink-0 gap-1">
                <Text color="#e41e2b" wrap="nowrap">
                  {"▮".repeat(cokes)}
                </Text>
                <Text color="muted">{String(cokes)}</Text>
              </Box>,
            ],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
