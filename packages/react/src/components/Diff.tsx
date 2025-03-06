import { useMemo, type ReactNode } from "react";
import { diffTexts, parseUnifiedDiff, type DiffFile, type DiffLine } from "../diff";
import { tokenize, type Token } from "../highlight";
import { useTheme, type TextTheme } from "../theme";
import { Box, type BoxProps } from "./Box";
import { tokenColor } from "./Code";
import { Text } from "./Text";

export interface DiffInput {
  before: string;
  after: string;
  filename?: string;
}

export interface DiffProps extends Omit<BoxProps, "children" | "ref"> {
  /** A unified diff string, or `{ before, after, filename }` to diff in place. */
  patch: string | DiffInput;
  showLineNumbers?: boolean;
  /** Syntax-highlight lines (language inferred from the filename when omitted). */
  language?: string | false;
  /** Context lines around changes when diffing `{ before, after }` (default `3`). */
  context?: number;
  /** Clip to this many rows. */
  maxHeight?: number;
}

function languageOf(path: string): string | undefined {
  const m = /\.([A-Za-z0-9]+)$/.exec(path);
  return m ? m[1] : undefined;
}

function lineTokens(text: string, language: string | undefined): Token[] {
  if (!language) return [{ kind: "plain", text }];
  return tokenize(text, language)[0] ?? [];
}

function DiffRow({ line, gutter, theme, language, numbers }: { line: DiffLine; gutter: number; theme: TextTheme; language: string | undefined; numbers: boolean }): ReactNode {
  const add = line.kind === "add";
  const del = line.kind === "remove";
  const bg = add ? theme.diffAddBg : del ? theme.diffRemoveBg : undefined;
  const sign = add ? "+" : del ? "-" : " ";
  const signColor = add ? theme.success : del ? theme.danger : theme.subtle;
  const tokens = lineTokens(line.text.replace(/\t/g, "  "), language);
  return (
    <Box flexDirection="row" flexShrink={0} bg={bg} overflow="hidden">
      {numbers ? (
        <Text color={theme.subtle} wrap="nowrap" flexShrink={0} dim={!add && !del}>
          {`${line.oldLine === null ? "".padStart(gutter) : String(line.oldLine).padStart(gutter)} ${line.newLine === null ? "".padStart(gutter) : String(line.newLine).padStart(gutter)} `}
        </Text>
      ) : null}
      <Text color={signColor} bold wrap="nowrap" flexShrink={0}>
        {`${sign} `}
      </Text>
      <Text wrap="nowrap" flexShrink={0} color={add || del ? theme.fg : theme.muted}>
        {tokens.map((t, i) =>
          t.kind === "plain" ? (
            t.text
          ) : (
            <Text key={i} color={tokenColor(theme, t.kind)}>
              {t.text}
            </Text>
          ),
        )}
      </Text>
    </Box>
  );
}

function FileView({ file, theme, numbers, language, maxRows }: { file: DiffFile; theme: TextTheme; numbers: boolean; language: string | false | undefined; maxRows: number }): ReactNode {
  const path = file.newPath && file.newPath !== "/dev/null" ? file.newPath : file.oldPath;
  const lang = language === false ? undefined : (language ?? languageOf(path));
  let maxLine = 1;
  for (const h of file.hunks) for (const l of h.lines) maxLine = Math.max(maxLine, l.oldLine ?? 0, l.newLine ?? 0);
  const gutter = String(maxLine).length;
  const rows: ReactNode[] = [];
  let budget = maxRows;
  let hidden = 0;
  file.hunks.forEach((h, hi) => {
    if (budget <= 0) {
      hidden += h.lines.length + 1;
      return;
    }
    rows.push(
      <Text key={`h${hi}`} color={theme.info} dim wrap="truncate-end" bg={theme.surface}>
        {h.header}
      </Text>,
    );
    budget--;
    h.lines.forEach((l, li) => {
      if (budget <= 0) {
        hidden++;
        return;
      }
      rows.push(<DiffRow key={`${hi}:${li}`} line={l} gutter={gutter} theme={theme} language={lang} numbers={numbers} />);
      budget--;
    });
  });
  const status = file.oldPath === "/dev/null" ? "added" : file.newPath === "/dev/null" ? "deleted" : file.oldPath && file.newPath && file.oldPath !== file.newPath ? "renamed" : null;
  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box flexDirection="row" flexShrink={0} bg={theme.panel} paddingX={1}>
        <Text bold color={theme.fg} wrap="truncate-start" flexShrink={1}>
          {path || "diff"}
        </Text>
        {status ? <Text color={theme.subtle} wrap="nowrap" flexShrink={0}>{` ${status}`}</Text> : null}
        <Box flexGrow={1} />
        <Text wrap="nowrap" flexShrink={0}>
          <Text color={theme.success}>{`+${file.additions}`}</Text>
          <Text color={theme.danger}>{` -${file.deletions}`}</Text>
        </Text>
      </Box>
      {rows}
      {hidden > 0 ? <Text color={theme.subtle} italic>{`… ${hidden} more lines`}</Text> : null}
    </Box>
  );
}

/** A unified diff viewer with line numbers, tinted rows and syntax highlighting. */
export function Diff({ patch, showLineNumbers = true, language, context = 3, maxHeight, ...boxProps }: DiffProps): ReactNode {
  const theme = useTheme();
  const files = useMemo(() => {
    if (typeof patch === "string") return parseUnifiedDiff(patch);
    return [diffTexts(patch.before, patch.after, patch.filename ?? "", context)];
  }, [patch, context]);
  return (
    <Box flexDirection="column" flexShrink={0} gap={1} {...boxProps}>
      {files.length === 0 ? (
        <Text color={theme.subtle} italic>
          No changes
        </Text>
      ) : (
        files.map((f, i) => <FileView key={i} file={f} theme={theme} numbers={showLineNumbers} language={language} maxRows={maxHeight ?? Infinity} />)
      )}
    </Box>
  );
}
