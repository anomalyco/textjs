import type { ReactNode } from "react";
import { Box, Image, Text } from "@textjs/react";
import { EggFrame, Facts, Raster } from "../ui";

/** Frank's video tile: an empty wall and the back of his chair. */
export function emptyTile(): Raster {
  const W = 34;
  const H = 36;
  const r = new Raster(W, H);
  // A soft vertical gradient in bands, like a webcam's wall.
  for (let y = 0; y < H; y++) {
    const t = Math.floor(y / 4) / (H / 4);
    const c = [206 - t * 36, 197 - t * 34, 180 - t * 30].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    r.rect(0, y, W, 1, `#${c}`);
  }
  // Rounded corners.
  for (const [cx, cy] of [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ] as const)
    r.px(cx, cy, null);
  // The chair back, bottom right.
  r.rect(21, 25, 12, 11, "#1d2023");
  r.ellipse(27, 25, 6, 3, "#1d2023");
  r.rect(22, 25, 1, 10, "#33383d");
  r.rect(30, 27, 1, 2, "#4a5056").rect(30, 31, 1, 2, "#4a5056");
  return r;
}

const TILE = emptyTile();

export function FrankEgg(): ReactNode {
  return (
    <EggFrame crumb="little frank">
      <Box className="flex-row grow items-center justify-center gap-6">
        <Box className="flex-col shrink-0">
          <Image pixels={TILE} />
          <Text color="muted">Frank Wang</Text>
        </Box>
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-col shrink-0">
            <Box className="flex-row h-1 shrink-0 gap-1">
              <Text bold>dax</Text>
              <Text>we're a gaming company now!</Text>
            </Box>
            <Box className="flex-row h-1 shrink-0 gap-1">
              <Text bold>frank</Text>
            </Box>
          </Box>
          <Facts
            rows={[
              ["Camera", "On"],
              ["Snack", "><(((º>  Red bean fish"],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}
