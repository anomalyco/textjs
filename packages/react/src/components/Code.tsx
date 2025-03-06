import { useMemo, type ReactNode } from "react";
import type { WrapMode } from "@textjs/core";
import { tokenize, type Token, type TokenKind } from "../highlight";
import { useTheme, type TextTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Text } from "./Text";

export interface CodeProps extends Omit<BoxProps, "children" | "ref"> {
  code: string;
  /** `ts`, `tsx`, `js`, `json`, `bash`, `css`, `md`, `python`, `rust`, `go`… */
  language?: string;
  showLineNumbers?: boolean;
  /** 1-based line numbers to highlight. */
  highlightLines?: readonly number[];
  /** Clip to this many rows, with a "more lines" footer. */
  maxHeight?: number;
  /** Number of the first line (default `1`). */
  startLine?: number;
  /** Line overflow handling (default `"nowrap"`, clipped). */
  wrap?: WrapMode;
}

export function tokenColor(theme: TextTheme, kind: TokenKind): string | undefined {
  const s = theme.syntax;
  switch (kind) {
    case "keyword":
      return s.keyword;
    case "string":
      return s.string;
    case "comment":
      return s.comment;
    case "number":
      return s.number;
    case "type":
      return s.type;
    case "function":
      return s.function;
    case "tag":
      return s.tag;
    case "attribute":
      return s.attribute;
    case "punctuation":
      return s.punctuation;
    case "operator":
      return s.operator;
    case "constant":
      return s.constant;
    case "variable":
      return s.variable;
    default:
      return undefined;
  }
}

function renderTokens(tokens: readonly Token[], theme: TextTheme): ReactNode[] {
  return tokens.map((t, i) =>
    t.kind === "plain" ? (
      t.text
    ) : (
      <Text key={i} color={tokenColor(theme, t.kind)} italic={t.kind === "comment"}>
        {t.text}
      </Text>
    ),
  );
}

/** Syntax-highlighted source with optional line numbers and highlighted lines. */
export function Code({
  code,
  language,
  showLineNumbers = false,
  highlightLines,
  maxHeight,
  startLine = 1,
  wrap = "nowrap",
  ...boxProps
}: CodeProps): ReactNode {
  const theme = useTheme();
  const lines = useMemo(() => tokenize(code.replace(/\t/g, "  ").replace(/\n$/, ""), language), [code, language]);
  const hl = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const limit = maxHeight !== undefined ? Math.max(1, maxHeight) : lines.length;
  const clipped = lines.length > limit;
  const shown = clipped ? lines.slice(0, Math.max(1, limit - 1)) : lines;
  const gutter = String(startLine + lines.length - 1).length;
  return (
    <Box flexDirection="column" flexShrink={0} {...boxProps}>
      {shown.map((tokens, i) => {
        const n = startLine + i;
        const on = hl.has(n);
        return (
          <Box key={i} flexDirection="row" flexShrink={0} overflow="hidden" bg={on ? theme.selection : undefined}>
            {showLineNumbers ? (
              <Text color={on ? theme.fg : theme.subtle} wrap="nowrap" flexShrink={0}>
                {`${String(n).padStart(gutter)} `}
              </Text>
            ) : null}
            {showLineNumbers ? (
              <Text color={on ? theme.accent : theme.border} wrap="nowrap" flexShrink={0}>
                {on ? "▌" : "│"}
              </Text>
            ) : null}
            <Text wrap={wrap} flexShrink={wrap === "nowrap" ? 0 : 1} flexGrow={1} color={theme.fg}>
              {showLineNumbers ? " " : ""}
              {renderTokens(tokens, theme)}
            </Text>
          </Box>
        );
      })}
      {clipped ? <Text color={theme.subtle} italic>{`… ${lines.length - shown.length} more lines`}</Text> : null}
    </Box>
  );
}
