import { useMemo, type ReactNode } from "react";
import { splitHeadingId } from "../docs/meta";
import { MarkdownDoc } from "../site/Markdown";
import { DiffCode } from "./DiffCode";

export type Segment = { type: "markdown"; source: string } | { type: "diff"; language: string; file?: string; source: string };

const DIFF_FENCE = /^```diff-([a-z]+)(?:@(\S+))?\n([\s\S]*?)\n```[ \t]*$/gm;

/** Split chapter markdown into prose and `diff-<lang>@file` code steps. */
export function splitChapter(markdown: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const m of markdown.matchAll(DIFF_FENCE)) {
    const before = markdown.slice(at, m.index).trim();
    if (before) out.push({ type: "markdown", source: before });
    out.push({ type: "diff", language: m[1] as string, file: m[2], source: m[3] as string });
    at = (m.index ?? 0) + m[0].length;
  }
  const rest = markdown.slice(at).trim();
  if (rest) out.push({ type: "markdown", source: rest });
  return out;
}

export function ChapterBody({ markdown }: { markdown: string }): ReactNode {
  const segments = useMemo(() => splitChapter(markdown), [markdown]);
  return (
    <div className="learn-body">
      {segments.map((s, i) =>
        s.type === "markdown" ? (
          <MarkdownDoc key={i} source={s.source} />
        ) : (
          <div key={i} className="prose">
            <DiffCode source={s.source} language={s.language} file={s.file} />
          </div>
        ),
      )}
    </div>
  );
}

/** `## Heading` titles of a chapter, in order (the "In this chapter" list). */
export function chapterHeadings(markdown: string): string[] {
  return [...markdown.replace(/```[\s\S]*?```/g, "").matchAll(/^## (.+)$/gm)].map((m) => splitHeadingId(m[1] as string).text);
}
