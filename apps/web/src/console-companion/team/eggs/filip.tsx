import { useState, type ReactNode } from "react";
import { Box, Text, useInput, useInterval, useTimeout } from "@textjs/react";
import { EggFrame, Facts } from "../ui";

export const ROUTE_CELLS = 40;

export function FilipEgg(): ReactNode {
  const [at, setAt] = useState(4);
  const [said, setSaid] = useState(0);
  useInterval(() => setAt((x) => Math.min(ROUTE_CELLS - 1, x + 1)), at < ROUTE_CELLS - 1 ? 1500 : null);
  // A different delay restarts the timer, so each click keeps the line up.
  useTimeout(() => setSaid(0), said > 0 ? 2500 + (said % 2) : null);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setAt((x) => Math.max(0, x - 1));
    setSaid((n) => n + 1);
  });
  const landed = at >= ROUTE_CELLS - 1;
  return (
    <EggFrame crumb="first flight" hints={[{ keys: "Space", label: "click the plane" }]}>
      <Box className="flex-col grow items-center justify-center">
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-row h-1 shrink-0 gap-1">
            <Text bold>PL</Text>
            <Text color="subtle" wrap="nowrap">
              {"─".repeat(at)}
            </Text>
            <Text color="accent">✈</Text>
            <Text color="subtle" wrap="nowrap">
              {"─".repeat(Math.max(0, ROUTE_CELLS - 1 - at))}
            </Text>
            <Text bold>CR</Text>
            <Text color="muted">{landed ? "  Landed" : "  Flight 1 (lifetime)"}</Text>
          </Box>
          <Text color="warning">{said > 0 ? "don't click while i'm in the air" : " "}</Text>
          <Box className="flex-col shrink-0">
            {[
              ["08:45", "Bakery"],
              ["09:00", "Bakery taken (grandmas)"],
              ["15:00", "Dinner"],
            ].map(([t, what]) => (
              <Box key={t} className="flex-row h-1 shrink-0 gap-3">
                <Text color="muted">{t}</Text>
                <Text>{what}</Text>
              </Box>
            ))}
          </Box>
          <Facts rows={[["Checked bag", "Gate-checked"]]} />
        </Box>
      </Box>
    </EggFrame>
  );
}
