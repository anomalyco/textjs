import { useState, type ReactNode } from "react";
import { AsciiFont, Box, KeyHint, Text, useInput, useTheme } from "@textjs/react";

export interface CounterDemoProps {
  title?: string;
  /** Compact layout for small docs previews. */
  compact?: boolean;
}

const SPARK = " ▁▂▃▄▅▆▇█";

export function CounterDemo({ title = "counter", compact = false }: CounterDemoProps): ReactNode {
  const theme = useTheme();
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<number[]>([0]);

  const update = (next: number): void => {
    setCount(next);
    setHistory((h) => [...h.slice(-47), next]);
  };

  useInput((e) => {
    if (e.key === "up" || e.input === "+" || e.input === "k") update(count + 1);
    else if (e.key === "down" || e.input === "-" || e.input === "j") update(count - 1);
    else if (e.key === "space") update(count + 10);
    else if (e.input === "r" || e.input === "0") update(0);
    else return;
    e.stopPropagation();
  });

  const min = Math.min(...history);
  const max = Math.max(...history);
  const spark = history
    .map((v) => {
      const t = max === min ? 0.5 : (v - min) / (max - min);
      return SPARK[Math.max(1, Math.round(t * 8))] ?? "▁";
    })
    .join("");

  const sign = count > 0 ? "success" : count < 0 ? "danger" : "fg";

  return (
    <Box className="flex-col grow px-2 py-1 gap-2">
      <Box className="flex-row gap-1 shrink-0">
        <Text bold color="fg">
          {title}
        </Text>
        <Text color="subtle">/ app/page.tsx</Text>
      </Box>
      <Box className="flex-row gap-3 shrink-0" alignItems="center">
        {compact ? (
          <Text bold color={sign}>{`count = ${count}`}</Text>
        ) : (
          <AsciiFont text={String(count)} color={theme[sign]} />
        )}
        <Text color="subtle">{"useState(0)"}</Text>
      </Box>
      {compact ? null : (
        <Text color="accent" wrap="nowrap">
          {spark}
        </Text>
      )}
      <Box className="flex-row gap-2 shrink-0">
        <KeyHint keys="↑/↓" label="count" />
        <KeyHint keys="r" label="reset" />
      </Box>
    </Box>
  );
}
