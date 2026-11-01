import type { ReactNode } from "react";
import { Box, Text } from "@textjs/app";
import { HEIGHT, WIDTH } from "../lib/frame";
import { palette } from "../lib/theme";
import type { Line, Span } from "../lib/ui";

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

/** Paints pre-laid-out lines (see `lib/ui.ts`) as one `<Text>` row each. */
export function Screen({ lines }: { lines: Line[] }): ReactNode {
  const rows = lines.slice(0, HEIGHT);
  while (rows.length < HEIGHT) rows.push([]);
  return (
    <Box flexDirection="column" width={WIDTH} height={HEIGHT} bg={palette.background} fg={palette.body} flexShrink={0} overflow="hidden">
      {rows.map((line, y) => (
        <Row key={y} line={line} />
      ))}
    </Box>
  );
}
