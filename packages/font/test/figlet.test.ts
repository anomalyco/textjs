import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLED_FONTS } from "../src/all";
import { renderFiglet, type FigletOptions } from "../src/index";
import type { FigletFont } from "../src/parse";

interface ReferenceCase {
  font: string;
  args: string[];
  input: string;
  output: string;
}

const fixtures = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "references.json"), "utf8")) as {
  generator: string;
  cases: ReferenceCase[];
};

const FONTS = new Map<string, FigletFont>(BUNDLED_FONTS.map((f) => [f.id, f.font]));

/** Translate a `figlet` command line into `renderFiglet` options. */
function optionsFor(args: readonly string[]): FigletOptions {
  const opts: FigletOptions = { width: 79 };
  const flags: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a === "-w") opts.width = Number(args[++i]) - 1;
    else if (a === "-m") opts.layout = Number(args[++i]);
    else for (const f of a.slice(1)) flags.push(f);
  }
  for (const f of flags) {
    if (f === "W") opts.layout = "full";
    else if (f === "k") opts.layout = "fitted";
    else if (f === "S") opts.layout = "smushed";
    else if (f === "o") opts.layout = "universal";
    else if (f === "s") opts.layout = "default";
    else if (f === "c") opts.align = "center";
    else if (f === "r") opts.align = "right";
    else if (f === "l") opts.align = "left";
    else if (f === "R") opts.direction = "rtl";
    else if (f === "L") opts.direction = "ltr";
    else if (f === "p") opts.paragraph = true;
    else throw new Error(`unsupported flag -${f}`);
  }
  return opts;
}

describe(`renderFiglet matches ${fixtures.generator}`, () => {
  test("fixtures cover every bundled font and layout mode", () => {
    expect(new Set(fixtures.cases.map((c) => c.font))).toEqual(new Set(FONTS.keys()));
    expect(fixtures.cases.length).toBeGreaterThan(200);
  });

  for (const c of fixtures.cases) {
    const label = `${c.font} ${c.args.join(" ") || "(default)"} ${JSON.stringify(c.input.length > 24 ? c.input.slice(0, 24) + "…" : c.input)}`;
    test(label, () => {
      const font = FONTS.get(c.font) as FigletFont;
      const rows = renderFiglet(font, c.input, optionsFor(c.args));
      expect(rows.map((r) => r + "\n").join("")).toBe(c.output);
    });
  }
});
