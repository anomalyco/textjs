import { useState, type ReactNode } from "react";
import { AsciiFont, Box, Text, useInput, useTheme } from "@textjs/react";

export function CounterDemo(): ReactNode {
  const theme = useTheme();
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up" || e.input === "+" || e.input === "k") setCount((c) => c + 1);
    else if (e.key === "down" || e.input === "-" || e.input === "j") setCount((c) => c - 1);
    else if (e.input === "r" || e.input === "0") setCount(0);
    else return;
    e.stopPropagation();
  });

  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <AsciiFont text={String(count)} color={count > 0 ? theme.success : count < 0 ? theme.danger : theme.fg} />
      <Text color="subtle">useState(0)</Text>
    </Box>
  );
}
