import type { ReactNode } from "react";
import { Box, Text } from "@textjs/app";
import { UNDERSIZED, type Layout } from "../lib/frame";
import { defaultTheme, palette } from "../lib/theme";
import { centerLines, place, span, type Line, type Span } from "../lib/ui";
import { useBlink, useLayout } from "./chrome";

function Run({ span }: { span: Span }): ReactNode {
  return (
    <Text fg={span.fg} bg={span.bg} bold={span.bold} allowLink={span.link}>
      {span.text}
    </Text>
  );
}

function Row({ line }: { line: Line }): ReactNode {
  return (
    <Text height={1} wrap="nowrap" flexShrink={0}>
      {line.length === 0 ? " " : line.map((s, x) => <Run key={x} span={s} />)}
    </Text>
  );
}

/** `ResizeView`: what every page shows while the console is under 20 × 10. */
export function resizeLines(L: Layout, cursor: boolean): Line[] {
  const t = defaultTheme;
  const logo: Line = [span("terminal", { fg: palette.accent, bold: true }), span(" ", cursor ? { bg: palette.brand } : {})];
  return place(centerLines([[t.accent("your")], logo, [t.accent("is too small")]]), L.viewportWidth, L.viewportHeight);
}

/**
 * Paints pre-laid-out lines (see `lib/ui.ts`) over the whole console, one `<Text>` row each.
 * Undersized consoles get `ResizeView` instead (pages stay mounted, like the SSH shop, which
 * keeps its state and keys while the window is too small). `raw` skips that (the "connection
 * closed" screen isn't the shop's).
 */
export function Screen({ lines, raw = false }: { lines: Line[]; raw?: boolean }): ReactNode {
  const L = useLayout();
  if (!raw && L.size === UNDERSIZED) return <Resize layout={L} />;
  return <Paint lines={lines} layout={L} />;
}

function Resize({ layout }: { layout: Layout }): ReactNode {
  const cursor = useBlink();
  return <Paint lines={resizeLines(layout, cursor)} layout={layout} />;
}

function Paint({ lines, layout: L }: { lines: Line[]; layout: Layout }): ReactNode {
  const rows = lines.slice(0, L.viewportHeight);
  while (rows.length < L.viewportHeight) rows.push([]);
  return (
    <Box flexDirection="column" width={L.viewportWidth} height={L.viewportHeight} bg={palette.background} fg={palette.body} flexShrink={0} overflow="hidden">
      {rows.map((line, y) => (
        <Row key={y} line={line} />
      ))}
    </Box>
  );
}
