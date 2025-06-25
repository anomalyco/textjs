import { useState, type ReactNode } from "react";
import { AsciiFont, Badge, Box, KeyHint, Text, useInput, useTheme } from "@textjs/react";

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
    <Box className="flex-col grow px-2 py-1 gap-1">
      <Box className="flex-row gap-1 shrink-0">
        <Text bold color="fg">
          {title}
        </Text>
        <Text color="subtle">/ app/page.tsx</Text>
        <Box className="grow" />
        <Badge variant={count === 0 ? "default" : count > 0 ? "success" : "danger"}>{count === 0 ? "idle" : count > 0 ? "positive" : "negative"}</Badge>
      </Box>
      <Box className="flex-row gap-3 shrink-0" alignItems="center">
        {compact ? (
          <Text bold color={sign}>{`count = ${count}`}</Text>
        ) : (
          <AsciiFont text={String(count)} color={theme[sign]} />
        )}
        <Box className="flex-col">
          <Text color="muted">{"const [count, setCount] = useState(0)"}</Text>
          <Text color="subtle">{`renders · ${history.length}  ·  min ${min}  ·  max ${max}`}</Text>
        </Box>
      </Box>
      {compact ? null : (
        <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title=" history " titleColor={theme.subtle}>
          <Text color="accent" wrap="nowrap">
            {spark.padEnd(48, " ")}
          </Text>
        </Box>
      )}
      <Box className="flex-row gap-2 shrink-0">
        <KeyHint keys="↑/↓" label="±1" />
        <KeyHint keys="space" label="+10" />
        <KeyHint keys="r" label="reset" />
      </Box>
    </Box>
  );
}
