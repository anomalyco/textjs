import { useMemo, type ReactNode } from "react";
import type { ColorInput, LayoutProps } from "@textjs/core";
import { renderAsciiFont, type AsciiFontName, type AsciiFontRenderer } from "../fonts";
import { useTheme } from "../theme";
import { Box } from "./Box";
import { Text } from "./Text";

export interface AsciiFontProps extends LayoutProps {
  text: string;
  /**
   * `"block"` (5 rows, default), `"compact"` (3 rows, half blocks) or a FIGlet font from
   * `@textjs/font` (`font={slant}`), which ignores `letterSpacing`.
   */
  font?: AsciiFontName | AsciiFontRenderer;
  color?: ColorInput;
  bg?: ColorInput;
  letterSpacing?: number;
}

/** Big pixel lettering for headers: `▼ TEXT.JS`. Supports A–Z, 0–9, `. - / :`, space and `▼`. */
export function AsciiFont({ text, font = "block", color, bg, letterSpacing = 1, ...layout }: AsciiFontProps): ReactNode {
  const theme = useTheme();
  const rows = useMemo(
    () => (typeof font === "object" ? font.render(text) : renderAsciiFont(text, font, letterSpacing)),
    [text, font, letterSpacing],
  );
  return (
    <Box flexDirection="column" flexShrink={0} {...layout}>
      {rows.map((row, i) => (
        <Text key={i} wrap="nowrap" color={color ?? theme.fg} bg={bg}>
          {row.length > 0 ? row : " "}
        </Text>
      ))}
    </Box>
  );
}
