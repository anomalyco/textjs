import { memo, useMemo, useRef, type NamedExoticComponent, type ReactNode } from "react";
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

function tokensEqual(a: readonly Token[], b: readonly Token[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ta = a[i] as Token;
    const tb = b[i] as Token;
    if (ta.kind !== tb.kind || ta.text !== tb.text) return false;
  }
  return true;
}

const EMPTY_HL: ReadonlySet<number> = new Set();

const CodeLine = memo(function CodeLine({
  tokens,
  lineNumber,
  gutter,
  on,
  showLineNumbers,
  wrap,
  theme,
}: {
  tokens: readonly Token[];
  lineNumber: number;
  gutter: number;
  on: boolean;
  showLineNumbers: boolean;
  wrap: WrapMode;
  theme: TextTheme;
}): ReactNode {
  return (
    <Box flexDirection="row" flexShrink={0} overflow="hidden" bg={on ? theme.selection : undefined}>
      {showLineNumbers ? (
        <Text color={on ? theme.fg : theme.subtle} wrap="nowrap" flexShrink={0}>
          {`${String(lineNumber).padStart(gutter)} `}
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
});

/** Syntax-highlighted source with optional line numbers and highlighted lines. */
export const Code: NamedExoticComponent<CodeProps> = memo(function Code({
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
  const prevLinesRef = useRef<Token[][]>([]);
  const lines = useMemo(() => {
    const clean = (code.includes("\t") ? code.replace(/\t/g, "  ") : code).replace(/\n$/, "");
    const next = tokenize(clean, language);
    const prev = prevLinesRef.current;
    const limit = Math.min(prev.length, next.length);
    for (let i = 0; i < limit; i++) {
      if (tokensEqual(prev[i] as Token[], next[i] as Token[])) {
        next[i] = prev[i] as Token[];
      }
    }
    prevLinesRef.current = next;
    return next;
  }, [code, language]);
  const hl = useMemo(() => (highlightLines && highlightLines.length > 0 ? new Set(highlightLines) : EMPTY_HL), [highlightLines]);
  const limit = maxHeight !== undefined ? Math.max(1, maxHeight) : lines.length;
  const clipped = lines.length > limit;
  const shown = clipped ? lines.slice(0, Math.max(1, limit - 1)) : lines;
  const gutter = String(startLine + lines.length - 1).length;
  return (
    <Box flexDirection="column" flexShrink={0} {...boxProps}>
      {shown.map((tokens, i) => {
        const n = startLine + i;
        return (
          <CodeLine
            key={i}
            tokens={tokens}
            lineNumber={n}
            gutter={gutter}
            on={hl.has(n)}
            showLineNumbers={showLineNumbers}
            wrap={wrap}
            theme={theme}
          />
        );
      })}
      {clipped ? <Text color={theme.subtle} italic>{`… ${lines.length - shown.length} more lines`}</Text> : null}
    </Box>
  );
});
