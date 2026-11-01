/**
 * Checks the Learn chapters' code against Acme Deploys as the course builds it (`test/fixtures/acme-deploys`).
 * The fixture's `app/deployments/page.test.tsx` is the Testing chapter's file and runs with the rest of `bun test`.
 */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@textjs/react/testing";
import { BROKEN_TEST, TESTING_SUITE } from "../src/learn/apps/chapters";
import { splitChapter } from "../src/learn/ChapterBody";
import { getChapter } from "../src/learn/course";
import { applyDiff, parseDiff } from "../src/learn/DiffCode";
import { DEPLOYMENTS } from "./fixtures/acme-deploys/lib/deployments";
import DeploymentsPage from "./fixtures/acme-deploys/app/deployments/page";

const APP = join(import.meta.dir, "fixtures/acme-deploys");

function markdown(slug: string): string {
  const chapter = getChapter(slug);
  if (!chapter) throw new Error(`no chapter ${slug}`);
  return chapter.markdown;
}

/** The file the reader has after every code step for `file`. Later steps may only append. */
export function lessonFile(md: string, file: string): string {
  let out = "";
  for (const s of splitChapter(md)) {
    if (s.type !== "diff" || s.file !== file) continue;
    const lines = parseDiff(s.source);
    if (out && lines.some((l) => l.kind !== "add")) throw new Error(`${file}: a later step edits existing lines`);
    out = out ? `${out}\n\n${applyDiff(lines)}` : applyDiff(lines);
  }
  if (!out) throw new Error(`no code steps for ${file}`);
  return `${out}\n`;
}

/** Fenced blocks (not diff steps) as `{ lang, file, source }`. */
function fences(md: string): Array<{ lang: string; file?: string; source: string }> {
  return [...md.matchAll(/^```([a-z-]+)(?:@(\S+))?\n([\s\S]*?)\n```[ \t]*$/gm)].map((m) => ({ lang: m[1] as string, file: m[2], source: m[3] as string }));
}

const fixture = (file: string): string => readFileSync(join(APP, file), "utf8");

describe("Testing chapter", () => {
  afterEach(() => {
    mock.restore();
    return cleanup();
  });

  const source = lessonFile(markdown("testing"), "app/deployments/page.test.tsx");

  test("its test file is the course app's app/deployments/page.test.tsx", () => {
    expect(fixture("app/deployments/page.test.tsx")).toBe(source);
  });

  test("the console's run lists the lesson's tests", () => {
    const names = [...source.matchAll(/^test\("([^"]+)"/gm)].map((m) => m[1] as string);
    expect(names).toEqual(["lists every deployment", "↓ moves the highlight", "4 sorts by build time"]);
    for (const name of names) expect(TESTING_SUITE.map((t) => t.name)).toContain(name);
  });

  test("the console's failure quotes the lesson's assertion and the row the app renders", async () => {
    expect(source).toContain(BROKEN_TEST.assertion);
    spyOn(globalThis, "fetch").mockResolvedValue(Response.json(DEPLOYMENTS));
    const app = await render(<DeploymentsPage />);
    await app.waitForText("feat: stream cells downward");
    expect(app.lines().find((line) => line.includes("›"))).toBe(BROKEN_TEST.received);
  });
});
