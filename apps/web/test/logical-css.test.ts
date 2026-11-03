import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The site mirrors under <html dir="rtl">, so layout uses logical properties (margin-inline-start, inset-inline-end,
// text-align: start). A deliberate physical value needs `physical: <reason>` in a comment on its line or the line above.
const SRC = join(import.meta.dir, "../src");
const CSS_FILES = ["styles.css", "pages/home/home.css", "pages/resources.css", "learn/learn.css", "merch/merch.css"];
const TSX_GLOBS = ["App.tsx", "{i18n,pages,site,learn,merch}/**/*.tsx"].map((g) => new Bun.Glob(g));
const CSS = {
  physical: /margin-left|margin-right|padding-left|padding-right|border-left|border-right|(?<![-\w])left:|(?<![-\w])right:|text-align:\s*(left|right)|float:\s*(left|right)|border-(top|bottom)-(left|right)-radius/,
  escape: /\/\*\s*physical: \S/,
};
const TSX = { physical: /(?<![-\w.])(left|right):|marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|textAlign:\s*["'](left|right)/, escape: /\/\/\s*physical: \S/ };

function physicalLines(text: string, rule: { physical: RegExp; escape: RegExp }): string[] {
  const lines = text.split("\n");
  return lines.flatMap((line, i) => (rule.physical.test(line) && !rule.escape.test(line) && !rule.escape.test(lines[i - 1] ?? "") ? [`${i + 1}: ${line.trim()}`] : []));
}

const scan = (files: string[], rule: { physical: RegExp; escape: RegExp }): string[] => files.flatMap((f) => physicalLines(readFileSync(join(SRC, f), "utf8"), rule).map((l) => `${f}:${l}`));

describe("logical CSS", () => {
  test("stylesheets use logical properties", () => {
    expect(scan(CSS_FILES, CSS)).toEqual([]);
  });

  test("inline styles use logical properties", () => {
    const files = TSX_GLOBS.flatMap((g) => [...g.scanSync(SRC)]).sort();
    expect(files).toContain("App.tsx");
    expect(files.length).toBeGreaterThan(20);
    expect(scan(files, TSX)).toEqual([]);
  });

  test("flags physical properties and honors the escape hatch", () => {
    for (const bad of ["margin-left: 4px;", "left: 0;", "text-align: right;", "border-top-left-radius: 2px;", "float: left;", "border-right-color: red;", "padding-right: 0"]) {
      expect(physicalLines(`  ${bad}`, CSS)).toHaveLength(1);
    }
    for (const ok of ["inset-inline-start: 0;", "margin-inline-end: 4px;", "text-align: start;", "scroll-margin-top: 0;", "left: 50%; /* physical: centered */"]) {
      expect(physicalLines(`  ${ok}`, CSS)).toEqual([]);
    }
    expect(physicalLines("  /* physical: a down chevron */\n  border-right: 1px solid;", CSS)).toEqual([]);
    expect(physicalLines("<span style={{ marginLeft: 4 }} />", TSX)).toHaveLength(1);
    expect(physicalLines("<td style={{ textAlign: \"left\" }} />", TSX)).toHaveLength(1);
    expect(physicalLines("<div style={{ borderRight: 0 }} />", TSX)).toHaveLength(1);
    expect(physicalLines("<span style={{ marginInlineStart: 4 }} />\nconst x = r.left;", TSX)).toEqual([]);
    expect(physicalLines("// physical: pointer coordinates\nsetPos({ left: x });", TSX)).toEqual([]);
  });
});
