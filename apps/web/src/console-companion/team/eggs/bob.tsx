import type { ReactNode } from "react";
import { Box, Image, Text } from "@textjs/react";
import { EggFrame, Pixels, sepia, sprite } from "../ui";

const BOB = sprite(
  [
    "........hhhhhhhhh.......",
    "......hhhHHHHHHHhhh.....",
    ".....hhHHHHHHHHHHHhh....",
    ".....hhHhhhhhhhhhHHh....",
    "....hhhsssssssssshhh....",
    "....hhsssssssssssshh....",
    "....hsshhhsssshhhssh....",
    "....hsseesssssseessh....",
    "...SsssssssSsssssssS....",
    "...SssssssSSSsssssssS...",
    "....ssssssssssssssss....",
    "....sbbssmmmmmmssbbs....",
    ".....bbbsssssssbbbb.....",
    ".....bbbbbbbbbbbbbb.....",
    "......bbbbbbbbbbbb......",
    "........ssssssss........",
    "....wwwwwssssssswwww....",
    "..wwwwwwwwwsswwwwwwwww..",
    ".wwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww",
  ],
  { h: "#5c3a1e", H: "#7a5030", s: "#e2b08c", S: "#c99272", e: "#2a2a2a", m: "#a35a48", b: "#8d6a52", w: "#3c78c8" },
);

const PHOTO = sepia(BOB);
const PAPER = "#f2ede2";

export function BobEgg(): ReactNode {
  return (
    <EggFrame crumb="old pics of bob">
      <Box className="flex-col grow items-center justify-center gap-1">
        <Box className="flex-col shrink-0 items-center" backgroundColor={PAPER} paddingX={3} paddingTop={1}>
          <Box className="flex-col shrink-0" backgroundColor="#5a4a38" paddingX={2} paddingTop={1}>
            <Pixels pixels={PHOTO} reserve={6} />
          </Box>
          <Text color="#3b3026" bg={PAPER} italic marginTop={1}>
            Kitchen, ca. 2000
          </Text>
          <Text bg={PAPER}> </Text>
        </Box>
        <Text color="muted">Ommmmmmmmm · Mayfair</Text>
      </Box>
    </EggFrame>
  );
}
