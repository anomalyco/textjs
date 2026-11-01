import { useMemo, useState, type ReactNode } from "react";
import { Box, Image, Spacer, Text, useInput, useInterval } from "@textjs/react";
import { EggFrame, Facts, Raster } from "../ui";

/** The hands' angle from upright: Ludvig pins at +PIN, you'd pin at −PIN (you won't). */
export const PIN = 78;
const TICK_MS = 120;
const PUSH = 5;

/** One tick of Ludvig's arm: he lets you get close, then he doesn't. */
export function ludvigStep(angle: number, ticks: number): number {
  return Math.min(PIN, angle + Math.max(angle < -40 ? 8 : 0, 1 + ticks * 0.08));
}

/** Your push. The hands never get past −60°. */
export function pushBack(angle: number): number {
  return Math.max(-60, angle - PUSH);
}

export function arms(angle: number): Raster {
  const W = 56;
  const r = new Raster(W, 30);
  const px = 28;
  const py = 21;
  const a = (angle * Math.PI) / 180;
  const hx = px + Math.sin(a) * 13;
  const hy = py - Math.cos(a) * 13;
  // Upper arms, then forearms, then the clasped fists.
  r.line(15, py, 5, 29, "#1c1c1c", 5);
  r.line(41, py, 51, 29, "#3b6fb6", 5);
  r.line(15, py, hx, hy, "#d6a07a", 4);
  r.line(41, py, hx, hy, "#f0c4a2", 4);
  r.ellipse(15, py, 2.5, 2, "#1c1c1c");
  r.ellipse(41, py, 2.5, 2, "#3b6fb6");
  r.ellipse(hx - 1, hy, 2.5, 2.5, "#c99068");
  r.ellipse(hx + 1, hy, 2.5, 2.5, "#e6b593");
  // The table.
  r.rect(0, py + 2, W, 7, "#7a5432");
  r.rect(0, py + 2, W, 1, "#9a6c42");
  r.rect(px - 1, py + 2, 2, 1, "#c0c0c0");
  return r;
}

export function LudvigEgg(): ReactNode {
  const [angle, setAngle] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [wins, setWins] = useState(0);
  const running = angle < PIN;
  useInterval(
    () => {
      const next = ludvigStep(angle, elapsed);
      setElapsed((t) => t + 1);
      setAngle(next);
      if (next >= PIN) setWins((w) => w + 1);
    },
    running ? TICK_MS : null,
  );
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    if (!running) {
      setAngle(0);
      setElapsed(0);
    } else setAngle(pushBack);
  });
  const art = useMemo(() => arms(angle), [angle]);
  return (
    <EggFrame crumb="arm wrestling" hints={[{ keys: "Space", label: running ? "push" : "rematch" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Box className="flex-col shrink-0" width={art.width}>
          <Box className="flex-row h-1 shrink-0">
            <Text bold>LUDVIG</Text>
            <Spacer />
            <Text bold>YOU</Text>
          </Box>
          <Image pixels={art} />
          <Box className="flex-row h-1 shrink-0 justify-center">
            <Text color={running ? "muted" : "fg"} bold={!running}>
              {running ? "Mash Space" : "Ludvig wins"}
            </Text>
          </Box>
        </Box>
        <Facts
          rows={[
            ["Record", `${wins}–0`],
            ["Status", "Undefeated"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
