import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, useInput } from "@textjs/react";
import { EggFrame, Facts, Raster, seeded } from "../ui";

const W = 48;
const H = 30;
export const MAX_BEANS = 160;

export function beansOnToast(beans: number): Raster {
  const r = new Raster(W, H);
  // The slice: a domed top, a darker crust.
  r.ellipse(24, 9, 21, 8, "#9a6630");
  r.rect(3, 9, 42, 19, "#9a6630");
  r.ellipse(24, 10, 19, 6, "#d9a865");
  r.rect(5, 10, 38, 16, "#d9a865");
  // Sauce grows with the beans until it runs off the toast.
  const spread = Math.min(1.6, 0.55 + beans / 110);
  r.ellipse(24, 16, 15 * spread, 8 * spread, "#e85d26");
  const rand = seeded(11);
  for (let i = 0; i < beans; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    const x = 24 + Math.cos(a) * d * 14 * spread;
    const y = 16 + Math.sin(a) * d * 7.5 * spread;
    r.ellipse(x, y, 1.4, 0.9, "#f27435");
    r.px(x - 1, y - 1, "#ffb27a");
  }
  return r;
}

export function DavidEgg(): ReactNode {
  const [beans, setBeans] = useState(22);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setBeans((n) => Math.min(MAX_BEANS, n + 12));
  });
  const art = useMemo(() => beansOnToast(beans), [beans]);
  return (
    <EggFrame crumb="breakfast" hints={[{ keys: "Space", label: "more beans" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Image pixels={art} />
        <Facts
          rows={[
            ["Palette", "Heinz #e85d26 on toast #d9a865"],
            ["Locale", "en-GB"],
            ["Beans", beans >= MAX_BEANS ? `${beans} (proper set up)` : String(beans)],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
