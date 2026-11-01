import { memo, useMemo, useRef, type ReactNode } from "react";
import { stringWidth } from "@textjs/core";
import { Box, Divider, Text, parseInline, parseMarkdown, useMeasure, useViewport, type MarkdownBlock } from "@textjs/next";
import { useTokens } from "../lib/native-theme";
import { TranscriptCode } from "./TranscriptCode";

function Inline({ text }: { text: string }) {
  const t = useTokens();
  return (
    <>
      {parseInline(text).map((p, i) => (
        <Text
          key={i}
          bold={p.bold}
          italic={p.italic}
          strikethrough={p.strike}
          underline={!!p.href}
          allowLink={!!p.href}
          color={
            p.code
              ? t["markdown.code"]
              : p.bold
                ? t["markdown.strong"]
                : p.italic
                  ? t["markdown.emphasis"]
                  : p.href
                    ? t["markdown.linkText"]
                    : undefined
          }
        >
          {p.text}
        </Text>
      ))}
    </>
  );
}

type Grid = Extract<MarkdownBlock, { type: "table" }>;
function GridTable({ block }: { block: Grid }) {
  const t = useTokens(),
    vp = useViewport(),
    [ref, size] = useMeasure();
  const rows = [block.header, ...block.rows],
    n = block.header.length,
    padding = 2;
  const available = Math.max(n * 3, (size.width || vp.cols - 7) - n - 1);
  const widths = block.header.map(
    (_, i) =>
      rows.reduce(
        (w, r) =>
          Math.max(
            w,
            stringWidth(
              parseInline(r[i] ?? "")
                .map((p) => p.text)
                .join(""),
            ),
          ),
        1,
      ) + padding,
  );
  const extra = available - widths.reduce((a, b) => a + b, 0);
  if (extra > 0) for (let i = 0; i < n; i++) widths[i]! += Math.floor(extra / n) + (i < extra % n ? 1 : 0);
  else if (extra < 0) {
    // Fit wide cells without squeezing short headers below their content width.
    const floor = widths.map((w) => Math.max(3, Math.min(w, Math.floor(available / n))));
    let over = -extra;
    while (over > 0) {
      let widest = -1;
      for (let i = 0; i < n; i++) if (widths[i]! > floor[i]! && (widest < 0 || widths[i]! > widths[widest]!)) widest = i;
      if (widest < 0) break;
      const shrink = Math.min(over, widths[widest]! - floor[widest]!);
      widths[widest]! -= shrink;
      over -= shrink;
    }
  }
  const border = "#888888"; // OpenTUI TextTable's default grid border.
  const line = (a: string, b: string, c: string) => a + widths.map((w) => "─".repeat(w)).join(b) + c;
  const content: ReactNode[] = [
    <Text key="top" wrap="nowrap" color={border}>
      {line("┌", "┬", "┐")}
    </Text>,
  ];
  rows.forEach((row, i) => {
    content.push(
      <Box key={i} flexDirection="row" flexShrink={0}>
        {widths.map((w, j) => (
          <Box
            key={j}
            width={w + 1}
            flexShrink={0}
            flexDirection="column"
            paddingX={1}
            border="single"
            borderTop={false}
            borderRight={false}
            borderBottom={false}
            borderColor={border}
          >
            <Text
              align={block.align[j] === "center" ? "center" : block.align[j] === "right" ? "end" : "start"}
              bold={i === 0}
              color={i === 0 ? t["markdown.heading"] : t["markdown.text"]}
            >
              <Inline text={row[j] ?? ""} />
            </Text>
          </Box>
        ))}
        <Box width={1} border="single" borderTop={false} borderRight={false} borderBottom={false} borderColor={border} />
      </Box>,
    );
    content.push(
      <Text key={`rule${i}`} color={border} wrap="nowrap">
        {i === rows.length - 1 ? line("└", "┴", "┘") : line("├", "┼", "┤")}
      </Text>,
    );
  });
  return (
    <Box ref={ref} flexDirection="column" width="100%" flexShrink={0} overflow="hidden">
      {content}
    </Box>
  );
}

const Block = memo(function Block({
  block,
  expanded,
  quote = false,
}: {
  block: MarkdownBlock;
  expanded: boolean;
  quote?: boolean;
}): ReactNode {
  const t = useTokens();
  switch (block.type) {
    case "paragraph":
      return (
        <Text color={t["markdown.text"]} italic={quote}>
          <Inline text={block.text} />
        </Text>
      );
    case "heading":
      return (
        <Text bold color={t["markdown.heading"]}>
          <Inline text={block.text} />
        </Text>
      );
    case "code":
      return <TranscriptCode code={block.code} language={block.language} limit={expanded ? undefined : 60} />;
    case "list":
      return (
        <Box flexDirection="column" flexShrink={0}>
          {block.items.map((item, i) => (
            <Box key={i} paddingLeft={item.depth * 2} flexDirection="row">
              <Text flexShrink={0} color={item.ordered ? t["markdown.listEnumeration"] : t["markdown.listItem"]}>{`${item.marker} `}</Text>
              <Text flexShrink={1} color={t["markdown.text"]}>
                {item.checked !== undefined ? (item.checked ? "[x] " : "[ ] ") : ""}
                <Inline text={item.text} />
              </Text>
            </Box>
          ))}
        </Box>
      );
    case "quote":
      return (
        <Box
          flexDirection="column"
          border="single"
          borderRight={false}
          borderBottom={false}
          borderTop={false}
          borderColor={t.text}
          paddingLeft={1}
          gap={1}
        >
          {block.blocks.map((b, i) => (
            <Block key={i} block={b} quote expanded={expanded} />
          ))}
        </Box>
      );
    case "table":
      return <GridTable block={block} />;
    case "hr":
      return <Divider color={t["markdown.horizontalRule"]} />;
  }
});

/** Use the kit parser, retaining closed blocks before the last blank line.
 * An incomplete fence/quote/table isn't a safe split: the prefix is accepted
 * only if parsing it independently reproduces the leading blocks by identity. */
export const TranscriptMarkdown = memo(function TranscriptMarkdown({ content, expanded }: { content: string; expanded: boolean }) {
  const cache = useRef<{ prefix: string; stable: MarkdownBlock[]; tail: MarkdownBlock[] }>({ prefix: "", stable: [], tail: [] });
  const blocks = useMemo(() => {
    const source = content.trim(),
      c = cache.current;
    if (!source.startsWith(c.prefix)) {
      c.prefix = "";
      c.stable = [];
      c.tail = [];
    }
    const suffix = source.slice(c.prefix.length),
      tail = parseMarkdown(suffix, c.tail),
      all = c.stable.concat(tail);
    c.tail = tail;
    const cut = suffix.lastIndexOf("\n\n");
    if (cut > 0 && tail.length > 1) {
      const prefix = parseMarkdown(suffix.slice(0, cut), tail);
      if (prefix.length && prefix.length < tail.length && prefix.every((b, i) => b === tail[i] && (b.type !== "code" || b.closed))) {
        c.prefix += suffix.slice(0, cut + 2);
        c.stable = c.stable.concat(prefix);
        c.tail = tail.slice(prefix.length);
      }
    }
    return all;
  }, [content]);
  return (
    <Box flexDirection="column" paddingLeft={3} gap={1} flexShrink={0}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} expanded={expanded} />
      ))}
    </Box>
  );
});
