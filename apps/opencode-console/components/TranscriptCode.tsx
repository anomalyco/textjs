import { memo, useMemo } from "react";
import { Box, Text, tokenize, type Token } from "@textjs/app";
import { useTokens } from "../lib/native-theme";

export function SyntaxRun({ pieces, language }: { pieces: readonly Token[]; language?: string }) {
  const t = useTokens();
  const tokens = pieces.flatMap((p) =>
    p.kind === "plain" && language
      ? p.text
          .split(/(\s+|;)/)
          .filter(Boolean)
          .map((text) => ({ ...p, text }))
      : [p],
  );
  return (
    <>
      {tokens.map((p, i) => {
        const kind = !language
          ? "plain"
          : p.text === ";"
            ? "operator"
            : p.kind === "plain" && /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(p.text)
              ? "variable"
              : p.kind;
        return (
          <Text
            key={i}
            italic={p.kind === "keyword" && (p.text === "const" || p.text === "let")}
            color={(t[`syntax.${kind}` as keyof typeof t] as string) ?? t.text}
          >
            {p.text}
          </Text>
        );
      })}
    </>
  );
}

export const TranscriptCode = memo(function TranscriptCode({
  code,
  language,
  numbers,
  limit,
}: {
  code: string;
  language?: string;
  numbers?: boolean;
  limit?: number;
}) {
  const t = useTokens();
  const lines = useMemo(
    () => tokenize(limit === undefined ? code : code.split("\n", limit + 1).join("\n"), language),
    [code, language, limit],
  );
  const gutter = Math.max(2, String(lines.length).length + 1);
  return (
    <Box flexDirection="column" flexShrink={0}>
      {lines.slice(0, limit).map((pieces, i) => (
        <Box key={i} flexDirection="row" minHeight={1} flexShrink={0}>
          {numbers && <Text flexShrink={0} color={t.muted}>{`${String(i + 1).padStart(gutter)} `}</Text>}
          <Text flexShrink={1}>
            <SyntaxRun pieces={pieces} language={language} />
          </Text>
        </Box>
      ))}
      {limit !== undefined && lines.length > limit && <Text color={t.muted}>…</Text>}
    </Box>
  );
});
