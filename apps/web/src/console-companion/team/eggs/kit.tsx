import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, Text, useInput } from "@textjs/react";
import { EggFrame, Facts, Pixels, Raster, seeded, sprite } from "../ui";

// Kitbob Langross: a perm, round glasses, a beard, a blue shirt.
const KITBOB = sprite(
  [
    "......hhhhhhhhhhhh......",
    "....hhhHhhhHhhhHhhhh....",
    "...hhHhhhHhhhHhhhHhhh...",
    "..hhhhHhhhhHhhhhHhhhhh..",
    "..hHhhhhhhhhhhhhhhhhHh..",
    ".hhhhhsssssssssssshhhhh.",
    ".hhHhssssssssssssssHhhh.",
    ".hhhhkkkkksssskkkkkhhhh.",
    ".hhhhkGGGkkkkkkGGGkhhhh.",
    ".hHhhkkkkksssskkkkkhHhh.",
    "..hhhssssssSSssssssshh..",
    "..hhhbsssssSSsssssbshh..",
    "...hhbbbbbbbbbbbbbbbh...",
    "....hbbbbbmmmmbbbbbbh...",
    ".....bbbbbbbbbbbbbbb....",
    "......bbbbbbbbbbbbb.....",
    "........bbbbbbbbb.......",
    "....wwwwwwssssswwwww....",
    "..wwwwwwwwwswwwwwwwwww..",
    ".wwwwwwwwwwwwwwwwwwwwww.",
    "wwwwwwwwwwwwwwwwwwwwwwww",
  ],
  { h: "#6b4a2e", H: "#8a6440", s: "#e8b796", S: "#cc9878", k: "#151515", G: "#cfe3ff", b: "#7a5636", m: "#9a5040", w: "#5f8fbf" },
);

const W = 40;
const H = 24;
export const MAX_TREES = 9;

export function painting(trees: number): Raster {
  const r = new Raster(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const sky = `#${[120 + t * 60, 170 + t * 40, 220].map((v) => Math.round(Math.min(255, v)).toString(16).padStart(2, "0")).join("")}`;
    r.rect(0, y, W, 1, sky);
  }
  // A mountain with snow, then the meadow.
  for (let x = 0; x < W; x++) {
    const peak = 4 + Math.abs(x - 24) * 0.8;
    for (let y = Math.round(peak); y < 16; y++) r.px(x, y, y < 9 && y < peak + 3 ? "#f4f6fb" : "#6d7a99");
  }
  r.rect(0, 15, W, H - 15, "#4f8a4a");
  r.rect(0, 15, W, 1, "#6aa35c");
  const rand = seeded(7);
  for (let i = 0; i < trees; i++) {
    const x = 3 + Math.round(rand() * (W - 6));
    const base = 18 + Math.round(rand() * 5);
    const h = 6 + Math.round(rand() * 4);
    for (let k = 0; k < h; k++) {
      const half = Math.floor((k * 3) / h) + (Math.floor(k / 3) % 2);
      r.rect(x - half, base - h + k, half * 2 + 1, 1, k % 2 ? "#1f5a33" : "#2a7041");
    }
    r.rect(x, base, 1, 1, "#5a3b22");
  }
  return r;
}

export function KitEgg(): ReactNode {
  const [trees, setTrees] = useState(0);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setTrees((n) => Math.min(MAX_TREES, n + 1));
  });
  const canvas = useMemo(() => painting(trees), [trees]);
  return (
    <EggFrame crumb="kitbob langross" hints={[{ keys: "Space", label: "happy little tree" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Box className="flex-col shrink-0 items-center gap-1">
          <Pixels pixels={KITBOB} reserve={2} besides={W + 8} />
          <Text bold>Kitbob Langross</Text>
        </Box>
        <Box className="flex-col shrink-0 items-center">
          <Box className="flex-col shrink-0" backgroundColor="#7a5432" padding={0} paddingX={1}>
            <Image pixels={canvas} />
          </Box>
          <Text color="#7a5432">{"  ╱" + " ".repeat(W - 6) + "╲  "}</Text>
          <Text color="#7a5432">{" ╱" + " ".repeat(W - 4) + "╲ "}</Text>
          <Facts
            rows={[
              ["Trees", `${trees} happy, little`],
              ["Poster", "There Won't Be Blog"],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}
