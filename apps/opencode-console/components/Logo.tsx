import type { ReactNode } from "react";
import { Box, Text, useTheme } from "@textjs/next";

/** The two-tone `opencode` mark from the OpenCode TUI (`packages/tui/src/logo.ts`). */
export const LOGO = {
  left: ["                   ", "█▀▀█ █▀▀█ █▀▀█ █▀▀▄", "█__█ █__█ █^^^ █__█", "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀~~▀"],
  right: ["             ▄     ", "█▀▀▀ █▀▀█ █▀▀█ █▀▀█", "█___ █__█ █__█ █^^^", "▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀"],
} as const;

/** Mix `fg` into `bg` by `amount` (the TUI's `tint`). */
export function tint(bg: string, fg: string, amount: number): string {
  const parse = (hex: string): number[] => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6);
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) || 0);
  };
  const a = parse(bg);
  const b = parse(fg);
  return `#${a.map((v, i) => Math.round(v + ((b[i] as number) - v) * amount).toString(16).padStart(2, "0")).join("")}`;
}

interface Run {
  text: string;
  fg?: string;
  bg?: string;
}

/** `_` = shadow cell, `^` = ▀ over shadow, `~` = ▀ in shadow; runs are merged to keep spans few. */
function runs(line: string, fg: string, shadow: string): Run[] {
  const out: Run[] = [];
  for (const ch of line) {
    const run: Run =
      ch === "_" ? { text: " ", fg, bg: shadow } : ch === "^" ? { text: "▀", fg, bg: shadow } : ch === "~" ? { text: "▀", fg: shadow } : ch === " " ? { text: " " } : { text: ch, fg };
    const last = out[out.length - 1];
    if (last && last.fg === run.fg && last.bg === run.bg) last.text += run.text;
    else out.push(run);
  }
  return out;
}

function Line({ line, fg, bold }: { line: string; fg: string; bold: boolean }): ReactNode {
  const theme = useTheme();
  const shadow = tint(theme.bg, fg, 0.25);
  return (
    <Text wrap="nowrap" flexShrink={0} bold={bold}>
      {runs(line, fg, shadow).map((r, i) => (
        <Text key={i} fg={r.fg} bg={r.bg}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
}

export function Logo(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col shrink-0">
      {LOGO.left.map((line, i) => (
        <Box key={i} className="flex-row h-1 gap-1">
          <Line line={line} fg={theme.muted} bold={false} />
          <Line line={LOGO.right[i] as string} fg={theme.fg} bold />
        </Box>
      ))}
    </Box>
  );
}
