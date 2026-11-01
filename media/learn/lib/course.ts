/**
 * The course itself (`apps/web/src/learn/course.ts`): titles, summaries, hints, quizzes and the chapter markdown,
 * so videos never drift from the lessons. Vite's `?raw` imports are mapped to text for Bun.
 */
import { plugin } from "bun";
import { join } from "node:path";
import { REPO } from "./env";

plugin({
  name: "raw-imports",
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, (args) => ({ path: join(args.resolveDir ?? args.importer.replace(/\/[^/]+$/, ""), args.path.replace(/\?raw$/, "")), namespace: "raw" }));
    build.onLoad({ filter: /.*/, namespace: "raw" }, async (args) => ({ contents: `export default ${JSON.stringify(await Bun.file(args.path).text())};`, loader: "js" }));
  },
});

type CourseModule = typeof import("../../../apps/web/src/learn/course");
const course: CourseModule = await import(join(REPO, "apps/web/src/learn/course.ts"));

export const { CHAPTERS, COURSE_TITLE, COURSE_APP, getChapter, chapterNumber, chapterIndex } = course;
export type Chapter = (typeof CHAPTERS)[number];

export interface CodeBlock {
  /** `bash`, `tsx`, ... */
  language: string;
  file?: string;
  diff: boolean;
  source: string;
}

/** The fenced code blocks of a chapter, in order (```lang@file and ```diff-lang@file). */
export function codeBlocks(chapter: Chapter): CodeBlock[] {
  const out: CodeBlock[] = [];
  for (const m of chapter.markdown.matchAll(/^```([a-z-]+)(?:@(\S+))?\n([\s\S]*?)\n```[ \t]*$/gm)) {
    const lang = m[1]!;
    const diff = lang.startsWith("diff-");
    out.push({ language: diff ? lang.slice(5) : lang, file: m[2], diff, source: m[3]! });
  }
  return out;
}
