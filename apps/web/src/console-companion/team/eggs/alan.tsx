import { useState, type ReactNode } from "react";
import { Box, Image, Text, useInput } from "@textjs/react";
import { EggFrame, Pixels, sprite } from "../ui";

// Alan: black cap, sunglasses, beard, black tee.
export const ALAN = sprite(
  [
    ".......kkkkkkkkkk.......",
    ".....kkkkkkkkkkkkkk.....",
    "....kkkkkkkkkkkkkkkk....",
    "....kkkkkkkkkkkkkkkkkkkk",
    "....hssssssssssssssh....",
    "....sssssssssssssssS....",
    "....gggggggssgggggggS...",
    "....ggGGGggssggGGGggS...",
    "....sgggggssssgggggsS...",
    "....sssssssSSssssssS....",
    "....bsssssssssssssbS....",
    "....bbssbbbbbbbbssbb....",
    ".....bbbbbmmmmbbbbb.....",
    ".....bbbbbbbbbbbbbb.....",
    "......bbbbbbbbbbbb......",
    "........ssssssss........",
    "....kkkkkssssssskkkk....",
    "..kkkkkkkkkkkkkkkkkkkk..",
    ".kkkkkkkkkkkkkkkkkkkkkk.",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkk",
  ],
  { k: "#17171a", h: "#2a1f19", s: "#e0aa86", S: "#c48d6a", g: "#101010", G: "#3a3f4a", b: "#3a2a20", m: "#8f4a3c" },
);

// Big Al: flat cap, purple aviators, mustache, cigar, gold chain, purple velour tracksuit.
export const BIG_AL = sprite(
  [
    "........cccccccccc..........",
    "......cccccccccccccc........",
    ".....cccCcccccccCcccc.......",
    "....kkkkkkkkkkkkkkkkkk......",
    "....hsssssssssssssssh.......",
    "...hssssssssssssssssSh......",
    "...sllllllllsslllllllS......",
    "...slLLLLLLlsslLLLLLlS......",
    "...sllLLLLllssllLLLllS......",
    "...ssslllllssssllllssS......",
    "...sssssssssSSsssssssS......",
    "....ssssssssSSssssssS.......",
    "....sshhhhhhhhhhhhsS........",
    "....ssshhhh..hhhhssSbbbbbbOy",
    ".....sssssmmmmmsssbbbbbbb...",
    "......sssssssssssS..........",
    "........ssssssss............",
    "....PPPPPGsssssGPPPP........",
    "..PPPPPPPPGGGGGPPPPPPP......",
    ".PPWPPPPPPPPPPPPPPPPWPP.....",
    "PPPWPPPPPPPpPPPPPPPPWPPP....",
    "PPPWPPPPPPPpPPPPPPPPWPPP....",
  ],
  {
    c: "#4a3a5c",
    C: "#6a5480",
    k: "#2b2236",
    h: "#2a1d16",
    s: "#e3ad87",
    S: "#c58e69",
    l: "#4b1f75",
    L: "#a96ee0",
    m: "#9b4b3c",
    b: "#6b4226",
    O: "#ff7a1a",
    y: "#b9b9b9",
    G: "#e6b422",
    P: "#6a2fa0",
    p: "#4b1f75",
    W: "#efe9f5",
  },
);

export function AlanEgg({ word }: { word: string }): ReactNode {
  const [big, setBig] = useState(word === "bigal");
  useInput((e) => {
    if (e.key !== "return") return;
    e.stopPropagation();
    setBig((b) => !b);
  });
  return (
    <EggFrame crumb={big ? "big al" : "alan"} hints={[{ keys: "Enter", label: big ? "back to alan" : "transform" }]}>
      <Box className="flex-col grow items-center justify-center gap-1">
        <Pixels pixels={big ? BIG_AL : ALAN} reserve={3} />
        {big ? (
          <Box className="flex-col shrink-0 items-center">
            <Text bold color="#b57ee8">
              alan "big al" rice
            </Text>
            <Text color="muted">"The goat's gone out to pasture. Gabish."</Text>
          </Box>
        ) : (
          <Box className="flex-col shrink-0 items-center">
            <Text bold>Alan</Text>
            <Text color="muted">Normal Alan</Text>
          </Box>
        )}
      </Box>
    </EggFrame>
  );
}
