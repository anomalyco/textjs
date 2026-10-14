import { memo, type ReactNode } from "react";
import { tokenize } from "@textjs/react";
import { CopyButton } from "../site/CodeBlock";

export type DiffKind = "add" | "del" | "ctx";

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/** Unified-diff style source: each line starts with `+`, `-` or a space. */
export function parseDiff(source: string): DiffLine[] {
  return source
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => {
      const mark = line[0];
      if (mark === "+") return { kind: "add", text: line.slice(1) };
      if (mark === "-") return { kind: "del", text: line.slice(1) };
      return { kind: "ctx", text: mark === " " ? line.slice(1) : line };
    });
}

/** The code after the change (what the copy button copies). */
export function applyDiff(lines: readonly DiffLine[]): string {
  return lines
    .filter((l) => l.kind !== "del")
    .map((l) => l.text)
    .join("\n");
}

const MARK: Record<DiffKind, string> = { add: "+", del: "-", ctx: " " };

/** A code step with added and removed lines highlighted. */
export const DiffCode = memo(function DiffCode({ source, language, file }: { source: string; language: string; file?: string }): ReactNode {
  const lines = parseDiff(source);
  const lang = language === "text" || language === "txt" ? undefined : language;
  const tokens = tokenize(lines.map((l) => l.text).join("\n"), lang);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  return (
    <div className="codeblock learn-diff">
      <div className="codeblock-head">
        <span>{file ?? language}</span>
        <span className="learn-diff-stat">
          {added ? <span className="add">{`+${added}`}</span> : null}
          {removed ? <span className="del">{`-${removed}`}</span> : null}
        </span>
        <span className="lang">{language}</span>
        <CopyButton text={applyDiff(lines)} />
      </div>
      <pre className="code">
        <code>
          {lines.map((l, i) => (
            <span key={i} className={`line ${l.kind}`}>
              <span className="mark" aria-hidden="true">
                {MARK[l.kind]}
              </span>
              {l.kind === "add" ? <span className="sr-only">Added: </span> : l.kind === "del" ? <span className="sr-only">Removed: </span> : null}
              {(tokens[i] ?? []).map((t, j) =>
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
    </div>
  );
});
