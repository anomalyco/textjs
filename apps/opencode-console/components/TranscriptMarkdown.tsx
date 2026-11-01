import { memo, useMemo } from "react";
import { Markdown, ThemeProvider, useTheme } from "@textjs/next";
import { useTokens } from "../lib/native-theme";

/** Keep the kit's incremental block parser, row reconciliation and fence
 * tokenizer. Its inline code, strong and link colors come from the local
 * theme; the surrounding block supplies ordinary Markdown text color. */
export const TranscriptMarkdown = memo(function TranscriptMarkdown({ content, expanded }: { content: string; expanded: boolean }) {
  const theme = useTheme(),
    t = useTokens();
  const markdown = useMemo(
    () => ({
      ...theme,
      fg: t["markdown.strong"],
      accent: t["markdown.link"],
      elevated: t.bg,
      syntax: { ...theme.syntax, attribute: t["markdown.code"] },
    }),
    [theme, t],
  );
  return (
    <ThemeProvider theme={markdown}>
      <Markdown content={content} fg={t["markdown.text"]} paddingLeft={3} codeMaxHeight={expanded ? undefined : 24} />
    </ThemeProvider>
  );
});
