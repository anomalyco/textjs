import { useState, type ReactNode } from "react";
import { AsciiFont, Box, Text, themes, useInput, useTheme } from "@textjs/react";
import { siteStore } from "../store";
import { useSite } from "../useSite";

export function HomeTab(): ReactNode {
  const theme = useTheme();
  const site = useSite();
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.ctrl || e.meta || e.alt) return;
    if (e.key === "up") setCount((c) => c + 1);
    else if (e.key === "down") setCount((c) => c - 1);
    else if (e.input === "r") setCount(0);
    else if (e.input === "t" || e.input === "T") siteStore.cycleTheme();
    else return;
    e.stopPropagation();
  });

  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <AsciiFont text="▼ TEXT.JS" color={theme.fg} />
      <Text color="muted">React 19 in console.log</Text>
      <Box className="flex-col items-center shrink-0" marginTop={2}>
        <AsciiFont text={String(count)} font="compact" color={count < 0 ? theme.danger : count > 0 ? theme.success : theme.fg} />
      </Box>
      <Text color="subtle" marginTop={1}>
        {themes[site.theme].name}
      </Text>
    </Box>
  );
}
