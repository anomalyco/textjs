import { useState, type ReactNode } from "react";
import { Box, Text, useInput, useInterval, useTheme } from "@textjs/react";
import { EggFrame, Facts } from "../ui";

const HAND = [
  ["A", 11],
  ["K", 10],
  ["Q", 10],
  ["J", 10],
  ["10", 10],
] as const;
// Balatro: a Straight Flush (shown as Royal Flush) scores 100 chips × 8 mult, plus each card's chips.
export const BASE_CHIPS = 100;
export const MULT = 8;
export const CHIPS = BASE_CHIPS + HAND.reduce((n, [, c]) => n + c, 0);

function Card({ rank, lit }: { rank: string; lit: boolean }): ReactNode {
  const theme = useTheme();
  const pad = rank.length === 2 ? "" : " ";
  return (
    <Box className="flex-col shrink-0" border borderStyle="rounded" borderColor={lit ? theme.accent : theme.border} width={9} marginTop={lit ? 0 : 1}>
      <Text color="#d8392b" wrap="nowrap">{`${rank}▼${pad}    `}</Text>
      <Text color="#d8392b" wrap="nowrap">
        {"   ▼   "}
      </Text>
      <Text color="#d8392b" wrap="nowrap">{`    ${pad}▼${rank}`}</Text>
    </Box>
  );
}

export function BrendanEgg(): ReactNode {
  // −1 before the hand is played, then cards scored one by one, then 5 for the total.
  const [step, setStep] = useState(-1);
  useInterval(() => setStep((s) => s + 1), step >= 0 && step < HAND.length ? 300 : null);
  useInput((e) => {
    if (e.key !== "space") return;
    e.stopPropagation();
    setStep((s) => (s < 0 || s >= HAND.length ? 0 : s));
  });
  const scored = HAND.slice(0, Math.max(0, step)).reduce((n, [, c]) => n + c, 0);
  const chips = step < 0 ? BASE_CHIPS : BASE_CHIPS + scored;
  const done = step >= HAND.length;
  return (
    <EggFrame crumb="g'day" hints={[{ keys: "Space", label: "play hand" }]}>
      <Box className="flex-col grow items-center justify-center">
        <Box className="flex-col shrink-0 gap-1">
          <Box className="flex-row shrink-0 gap-1">
            {HAND.map(([rank], i) => (
              <Card key={rank} rank={rank} lit={step > i} />
            ))}
          </Box>
          <Box className="flex-row h-1 shrink-0 gap-1">
            <Text bold>Royal Flush</Text>
            <Text color="#4a9be8" bold>
              {String(chips)}
            </Text>
            <Text color="muted">×</Text>
            <Text color="#e8483a" bold>
              {String(MULT)}
            </Text>
            {done ? <Text bold>{`= ${(chips * MULT).toLocaleString("en-US")}`}</Text> : null}
          </Box>
          <Facts
            rows={[
              ["In-flight entertainment", "Balatro, whole flight"],
              ["Fridge", "Running"],
            ]}
          />
        </Box>
      </Box>
    </EggFrame>
  );
}
