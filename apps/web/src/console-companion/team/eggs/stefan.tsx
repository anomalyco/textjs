import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, useInput } from "@textjs/react";
import { EggFrame, Facts, Raster } from "../ui";

export const EAR_SIZES = ["L", "XL", "XXL", "3XL", "4XL", "5XL"] as const;

const SKIN = "#e9b896";
const EAR_IN = "#cf8f70";
const HAIR = "#3a281d";
const SHIRT = "#e2702b";

export function stefanPortrait(size: number): Raster {
  const earRx = 3 + size * 2;
  const earRy = 5 + size;
  const headRx = 9;
  const W = 2 * (headRx + 2 * earRx) + 1;
  const cx = Math.floor(W / 2);
  const r = new Raster(W, 30);
  const earX = headRx + earRx - 2;
  for (const side of [-1, 1]) {
    r.ellipse(cx + side * earX, 13, earRx, earRy, SKIN);
    r.ellipse(cx + side * (earX + 1), 13, Math.max(1, earRx - 3), Math.max(2, earRy - 3), EAR_IN);
  }
  // Neck and shirt.
  r.rect(cx - 4, 22, 9, 4, SKIN);
  r.ellipse(cx, 30, 15, 4, SHIRT);
  r.rect(cx - 3, 25, 7, 1, SKIN);
  // Head and hair.
  r.ellipse(cx, 13, headRx, 11, SKIN);
  r.ellipse(cx, 6, headRx, 5, HAIR);
  r.rect(cx - headRx + 1, 6, 2, 3, HAIR);
  r.rect(cx + headRx - 2, 6, 2, 3, HAIR);
  // Brows, eyes, nose, smile.
  r.rect(cx - 6, 10, 4, 1, HAIR).rect(cx + 3, 10, 4, 1, HAIR);
  r.rect(cx - 5, 12, 2, 2, "#2b2b2b").rect(cx + 4, 12, 2, 2, "#2b2b2b");
  r.rect(cx, 14, 1, 3, "#c98d6c");
  r.rect(cx - 3, 19, 7, 1, "#9b4535")
    .px(cx - 4, 18, "#9b4535")
    .px(cx + 4, 18, "#9b4535");
  return r;
}

export function StefanEgg(): ReactNode {
  const [size, setSize] = useState(2);
  useInput((e) => {
    if (e.key === "up") setSize((s) => Math.min(EAR_SIZES.length - 1, s + 1));
    else if (e.key === "down") setSize((s) => Math.max(0, s - 1));
    else return;
    e.stopPropagation();
  });
  const face = useMemo(() => stefanPortrait(size), [size]);
  return (
    <EggFrame crumb="enterprise" hints={[{ keys: "↑ ↓", label: "ear size" }]}>
      <Box className="flex-col grow items-center justify-center gap-1">
        <Image pixels={face} />
        <Facts
          rows={[
            ["Support tier", "We're all ears"],
            ["Ear size", EAR_SIZES[size] as string],
            ["Manchester United", "Do not bring up"],
            ["Signed", "from Stefan's Ears"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
