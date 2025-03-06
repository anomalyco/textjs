import { useMemo, type ReactNode } from "react";
import { stringWidth } from "@textjs/core";
import { parseInline, parseMarkdown, type InlineSpan, type MarkdownBlock, type TableAlign } from "../markdown";
import { useTheme, type TextTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { Code } from "./Code";
import { Divider } from "./primitives";
import { Text } from "./Text";

export interface MarkdownProps extends Omit<BoxProps, "children" | "ref"> {
  /** Markdown source (alternatively pass `content`). */
  children?: string;
  content?: string;
  /** Clip fenced code blocks to this many rows. */
  codeMaxHeight?: number;
  /** Show line numbers in fenced code blocks. */
  codeLineNumbers?: boolean;
}

function renderInline(spans: readonly InlineSpan[], theme: TextTheme): ReactNode[] {
  const out: ReactNode[] = [];
  spans.forEach((s, i) => {
    if (s.code) {
      out.push(
        <Text key={i} color={theme.syntax.attribute} bg={theme.elevated}>
          {s.text}
        </Text>,
      );
      return;
    }
    const styled = s.bold || s.italic || s.strike || s.href !== undefined;
    if (!styled) {
      out.push(s.text);
      return;
    }
    out.push(
      <Text
        key={i}
        bold={s.bold}
        italic={s.italic}
        strikethrough={s.strike}
        underline={s.href !== undefined}
        allowLink={s.href !== undefined}
        color={s.href !== undefined ? theme.accent : s.bold ? theme.fg : undefined}
      >
        {s.text}
      </Text>,
    );
    if (s.href !== undefined && s.href !== s.text && s.href.length > 0) {
      out.push(
        <Text key={`${i}:href`} color={theme.subtle} allowLink>
          {` (${s.href})`}
        </Text>,
      );
    }
  });
  return out;
}

function pad(text: string, width: number, align: TableAlign): [string, string] {
  const gap = Math.max(0, width - stringWidth(text));
  if (align === "right") return [" ".repeat(gap), ""];
  if (align === "center") return [" ".repeat(Math.floor(gap / 2)), " ".repeat(gap - Math.floor(gap / 2))];
  return ["", " ".repeat(gap)];
}

const BULLETS = ["•", "◦", "▪"];

function Block({ block, theme, codeMaxHeight, codeLineNumbers }: { block: MarkdownBlock; theme: TextTheme; codeMaxHeight?: number; codeLineNumbers: boolean }): ReactNode {
  switch (block.type) {
    case "heading": {
      const color = block.level === 1 ? theme.accent : block.level === 2 ? theme.fg : theme.muted;
      return (
        <Text bold color={color} underline={block.level === 1}>
          {renderInline(parseInline(block.text), theme)}
        </Text>
      );
    }
    case "paragraph":
      return <Text>{renderInline(parseInline(block.text), theme)}</Text>;
    case "hr":
      return <Divider />;
    case "code":
      return (
        <Box flexDirection="column" flexShrink={0} bg={theme.codeBg} border="rounded" borderColor={theme.border} title={block.language || "code"} titleColor={theme.muted} bottomTitle={block.closed ? undefined : "streaming…"} bottomTitleColor={theme.subtle} paddingX={1}>
          <Code code={block.code} language={block.language} maxHeight={codeMaxHeight} showLineNumbers={codeLineNumbers} />
        </Box>
      );
    case "quote":
      return (
        <Box flexDirection="column" flexShrink={0} border="single" borderTop={false} borderRight={false} borderBottom={false} borderColor={theme.border} paddingLeft={1} color={theme.muted}>
          {block.blocks.map((b, i) => (
            <Box key={i} marginTop={i > 0 ? 1 : 0} flexDirection="column" flexShrink={0}>
              <Block block={b} theme={theme} codeMaxHeight={codeMaxHeight} codeLineNumbers={codeLineNumbers} />
            </Box>
          ))}
        </Box>
      );
    case "list": {
      let counter = 0;
      return (
        <Box flexDirection="column" flexShrink={0}>
          {block.items.map((item, i) => {
            if (item.ordered && item.depth === 0) counter = counter === 0 ? Number.parseInt(item.marker, 10) || 1 : counter + 1;
            const marker =
              item.checked !== undefined ? (item.checked ? "[✓]" : "[ ]") : item.ordered ? `${item.depth === 0 ? counter : Number.parseInt(item.marker, 10) || 1}.` : (BULLETS[item.depth % BULLETS.length] as string);
            return (
              <Box key={i} flexDirection="row" flexShrink={0} paddingLeft={item.depth * 2}>
                <Text color={item.checked ? theme.success : theme.accent} wrap="nowrap" flexShrink={0}>
                  {`${marker} `}
                </Text>
                <Text flexShrink={1} strikethrough={item.checked === true} color={item.checked ? theme.subtle : undefined}>
                  {renderInline(parseInline(item.text), theme)}
                </Text>
              </Box>
            );
          })}
        </Box>
      );
    }
    case "table": {
      const cols = Math.max(block.header.length, ...block.rows.map((r) => r.length));
      const parsedHeader = block.header.map((c) => parseInline(c));
      const parsedRows = block.rows.map((r) => Array.from({ length: cols }, (_, c) => parseInline(r[c] ?? "")));
      const plain = (spans: InlineSpan[]): string => spans.map((s) => s.text).join("");
      const widths = Array.from({ length: cols }, (_, c) =>
        Math.max(1, stringWidth(plain(parsedHeader[c] ?? [])), ...parsedRows.map((r) => stringWidth(plain(r[c] ?? [])))),
      );
      const row = (cells: InlineSpan[][], header: boolean, key: string): ReactNode => (
        <Text key={key} wrap="nowrap" flexShrink={0}>
          {widths.map((w, c) => {
            const spans = cells[c] ?? [];
            const [l, r] = pad(plain(spans), w, block.align[c] ?? "left");
            return (
              <Text key={c}>
                <Text color={theme.border}>{c === 0 ? "│ " : " │ "}</Text>
                {l}
                {header ? (
                  <Text bold color={theme.fg}>
                    {renderInline(spans, theme)}
                  </Text>
                ) : (
                  renderInline(spans, theme)
                )}
                {r}
                {c === widths.length - 1 ? <Text color={theme.border}> │</Text> : null}
              </Text>
            );
          })}
        </Text>
      );
      const rule = (l: string, m: string, r: string): string => l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
      return (
        <Box flexDirection="column" flexShrink={0} overflow="hidden">
          <Text color={theme.border} wrap="nowrap">
            {rule("┌", "┬", "┐")}
          </Text>
          {row(parsedHeader, true, "h")}
          <Text color={theme.border} wrap="nowrap">
            {rule("├", "┼", "┤")}
          </Text>
          {parsedRows.map((r, i) => row(r, false, `r${i}`))}
          <Text color={theme.border} wrap="nowrap">
            {rule("└", "┴", "┘")}
          </Text>
        </Box>
      );
    }
    default:
      return null;
  }
}

/** Render Markdown, including partial documents streamed from an LLM. */
export function Markdown({ children, content, codeMaxHeight, codeLineNumbers = false, ...boxProps }: MarkdownProps): ReactNode {
  const theme = useTheme();
  const source = content ?? children ?? "";
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <Box flexDirection="column" flexShrink={0} {...boxProps}>
      {blocks.map((b, i) => (
        <Box key={i} flexDirection="column" flexShrink={0} marginTop={i > 0 ? 1 : 0}>
          <Block block={b} theme={theme} codeMaxHeight={codeMaxHeight} codeLineNumbers={codeLineNumbers} />
        </Box>
      ))}
    </Box>
  );
}
