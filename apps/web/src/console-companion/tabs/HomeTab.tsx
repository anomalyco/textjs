import { useState, type ReactNode } from "react";
import { AsciiFont, Box, Text, themes, useInput, useTheme } from "@textjs/react";
import { THEME_ORDER } from "../store";
import { useSite } from "../useSite";

export function HomeTab(): ReactNode {
  const theme = useTheme();
  const site = useSite();
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    else if (e.key === "down") setCount((c) => c - 1);
    else if (e.key === "space") setCount((c) => c + 10);
    else if (e.input === "r") setCount(0);
    else return;
    e.stopPropagation();
  });

  const countColor = count < 0 ? theme.danger : count > 0 ? theme.success : theme.fg;

  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <AsciiFont text="▼ TEXT.JS" color={theme.fg} />
      <Text color="muted">React 19 in console.log</Text>
      <Box className="flex-row gap-2 mt-2">
        <Box className="flex-col border rounded px-2 items-center justify-center" width={22} height={9} borderColor={theme.border} title=" useState " titleColor={theme.subtle}>
          <AsciiFont text={String(count)} font="compact" color={countColor} />
        </Box>
        <Box className="flex-col border rounded px-2 justify-center" width={22} height={9} borderColor={theme.border} title=" theme " titleColor={theme.subtle}>
          {THEME_ORDER.map((id) => {
            const on = id === site.theme;
            return (
              <Text key={id} color={on ? "accent" : "subtle"} bold={on} wrap="nowrap">
                {`${on ? "●" : "○"} ${themes[id].name}`}
              </Text>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
