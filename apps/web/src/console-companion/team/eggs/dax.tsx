import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, useInput } from "@textjs/react";
import { EggFrame, Facts, Raster } from "../ui";

const SKIN = "#d6a07a";
const SHADE = "#b98260";
const BEARD = "#2a201b";

/** `angle` is the garage light's angle in degrees, −60 to 60. */
export function daxPortrait(angle: number): Raster {
  const r = new Raster(34, 32);
  const cx = 17;
  const a = (angle * Math.PI) / 180;
  // Shoulders.
  r.ellipse(cx, 33, 16, 5, "#141414");
  r.rect(cx - 4, 24, 9, 4, SKIN);
  // Ears, dome, shading on the side away from the light.
  r.ellipse(cx - 12, 15, 2, 3, SHADE).ellipse(cx + 12, 15, 2, 3, SHADE);
  r.ellipse(cx, 13, 12, 13, SKIN);
  r.ellipse(cx - Math.sign(angle || 1) * 7, 13, 5, 12, SHADE);
  r.ellipse(cx - Math.sign(angle || 1) * 4, 12, 7, 12, SKIN);
  // Beard and mustache.
  r.ellipse(cx, 21, 11, 8, BEARD);
  r.rect(cx - 11, 15, 2, 6, BEARD).rect(cx + 10, 15, 2, 6, BEARD);
  r.rect(cx - 2, 21, 5, 1, "#8c4a3c");
  // Brows and eyes.
  r.rect(cx - 7, 11, 5, 1, BEARD).rect(cx + 3, 11, 5, 1, BEARD);
  r.rect(cx - 6, 13, 2, 2, "#1f1f1f").rect(cx + 5, 13, 2, 2, "#1f1f1f");
  r.rect(cx, 15, 1, 3, SHADE);
  // The shine.
  const hx = cx + Math.sin(a) * 8;
  const hy = 13 - Math.cos(a) * 10;
  r.ellipse(hx, hy, 2.6, 1.3, "#fff4e0");
  r.px(hx, hy - 2, "#ffffff")
    .px(hx, hy + 2, "#ffffff")
    .px(hx - 4, hy, "#ffffff")
    .px(hx + 4, hy, "#ffffff");
  return r;
}

export function DaxEgg(): ReactNode {
  const [angle, setAngle] = useState(15);
  useInput((e) => {
    if (e.key === "left") setAngle((x) => Math.max(-60, x - 15));
    else if (e.key === "right") setAngle((x) => Math.min(60, x + 15));
    else return;
    e.stopPropagation();
  });
  const face = useMemo(() => daxPortrait(angle), [angle]);
  return (
    <EggFrame crumb="garage" hints={[{ keys: "← →", label: "move the light" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Image pixels={face} />
        <Facts
          rows={[
            ["Light angle", `${angle}°`],
            ["Studio", "Garage"],
            ["Dinner", "After 8pm"],
            ["Yoga", "Avoided"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
