import { memo, type ReactNode } from "react";
import { tokenize } from "@textjs/react";

export interface HighlightedCodeProps {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  highlight?: readonly number[];
  className?: string;
}

/** Syntax-highlighted code for the website, using the same tokenizer as `<Code>` in the console. */
export const HighlightedCode = memo(function HighlightedCode({ code, language, lineNumbers = false, highlight, className }: HighlightedCodeProps): ReactNode {
  const lang = language === "text" || language === "txt" ? undefined : language;
  const lines = tokenize(code.replace(/\n$/, ""), lang);
  const hl = new Set(highlight ?? []);
  return (
    <pre className={`code ${className ?? ""}`}>
      <code>
        {lines.map((tokens, i) => (
          <span key={i} className={`line${hl.has(i + 1) ? " hl" : ""}`}>
            {lineNumbers ? <span className="ln">{i + 1}</span> : null}
            {tokens.map((t, j) =>
              t.kind === "plain" ? (
                t.text
              ) : (
                <span key={j} className={`tk-${t.kind}`}>
                  {t.text}
                </span>
              ),
            )}
          </span>
        ))}
      </code>
    </pre>
  );
});
