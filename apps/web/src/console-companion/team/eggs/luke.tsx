import { useState, type ReactNode } from "react";
import { Box, Text, useInterval } from "@textjs/react";
import { EggFrame, Facts } from "../ui";

export const LEGS = 6;
const LEG_CELLS = 7;

export function LukeEgg(): ReactNode {
  // Which leg the plane is on, 0–5, then 6 at SJO.
  const [leg, setLeg] = useState(0);
  useInterval(() => setLeg((l) => Math.min(LEGS, l + 1)), leg < LEGS ? 1500 : null);
  const segments: ReactNode[] = [];
  for (let i = 0; i < LEGS; i++) {
    const here = i === leg;
    segments.push(
      <Text key={`l${i}`} color={i < leg ? "accent" : "subtle"} wrap="nowrap">
        {here ? `${"─".repeat(3)}✈${"─".repeat(LEG_CELLS - 4)}` : "─".repeat(LEG_CELLS)}
      </Text>,
    );
    if (i < LEGS - 1)
      segments.push(
        <Text key={`s${i}`} color={i < leg ? "accent" : "muted"} wrap="nowrap">
          ●
        </Text>,
      );
  }
  return (
    <EggFrame crumb="hona">
      <Box className="flex-col grow items-center justify-center">
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-row h-1 shrink-0 gap-1">
            <Text bold>BNE</Text>
            <Box className="flex-row h-1 shrink-0">{segments}</Box>
            <Text bold>SJO</Text>
            <Text color="muted">{leg >= LEGS ? "  Landed" : `  Leg ${leg + 1} of ${LEGS}`}</Text>
          </Box>
          <Facts
            rows={[
              ["US ESTA", "Approved"],
              ["Villa hydration", "4 slabs of Red Bull (96 cans)"],
              ["Reading", "Throne of Glass (9 books)"],
              ["Australian internet", "Down (storm)"],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}
