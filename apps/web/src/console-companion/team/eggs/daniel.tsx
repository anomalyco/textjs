import { useState, type ReactNode } from "react";
import { Box, Spacer, Text, useInput, useInterval, useTheme } from "@textjs/react";
import { EggFrame } from "../ui";

const ROWS: ReadonlyArray<readonly [string, string, "success" | "warning" | "accent", string]> = [
  ["Hens", "Operational", "success", "4 laying"],
  ["Coop cleaning", "Overdue", "warning", "Since joining Anomaly"],
  ["Costa Rica villa bed", "Listed", "accent", "Airbnb"],
];

export function DanielEgg(): ReactNode {
  const theme = useTheme();
  const [eggs, setEggs] = useState(12);
  const [collected, setCollected] = useState(0);
  useInterval(() => setEggs((n) => n + 1), 1000);
  useInput((e) => {
    if (e.input !== "c") return;
    e.stopPropagation();
    setCollected((c) => c + eggs);
    setEggs(0);
  });
  const shown = Math.min(eggs, 30);
  return (
    <EggFrame crumb="coop status" hints={[{ keys: "c", label: "collect eggs" }]}>
      <Box className="flex-col grow items-center justify-center">
        <Box className="flex-col shrink-0 gap-1" width={76}>
          <Box className="flex-row h-1 shrink-0 gap-1">
            <Text color="warning">●</Text>
            <Text bold>Daniel's Chicken Coop</Text>
            <Spacer />
            <Text color="warning">Degraded cleanliness</Text>
          </Box>
          <Box className="flex-col shrink-0" border borderStyle="rounded" borderColor={theme.border} paddingX={1}>
            <Box className="flex-row h-1 shrink-0">
              <Text width={24}>Egg production</Text>
              <Text color="success" width={14}>
                Operational
              </Text>
              <Text color="#f1e4c3" wrap="nowrap">
                {"o".repeat(shown) + (eggs > shown ? "+" : "")}
              </Text>
              <Spacer />
              <Text color="muted">{String(eggs)}</Text>
            </Box>
            {ROWS.map(([name, status, color, note]) => (
              <Box key={name} className="flex-row h-1 shrink-0">
                <Text width={24}>{name}</Text>
                <Text color={color} width={14}>
                  {status}
                </Text>
                <Text color="muted">{note}</Text>
              </Box>
            ))}
          </Box>
          <Text color="subtle">{collected > 0 ? `${collected} eggs collected` : "Eggs are collected manually."}</Text>
        </Box>
      </Box>
    </EggFrame>
  );
}
