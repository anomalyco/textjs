import type { ReactNode } from "react";
import { BarChart, Box, Text } from "@textjs/react";
import { EggFrame, Facts } from "../ui";

export const AGES = [
  { label: 'Actual ("old af")', value: 31 },
  { label: "Stefan's guess", value: 22 },
  { label: "Filip's guess", value: 20 },
];

export function DanEgg(): ReactNode {
  return (
    <EggFrame crumb="dan">
      <Box className="flex-col grow items-center justify-center">
        <Box className="flex-col shrink-0 gap-1" width={72}>
          <Text bold>Age in years</Text>
          <BarChart data={AGES} max={31} formatValue={(v) => `${v}`} />
          <Text color="subtle" marginBottom={1}>
            Linear scale from 0
          </Text>
          <Facts rows={[["Dax's classification", '"a young one"']]} />
        </Box>
      </Box>
    </EggFrame>
  );
}
