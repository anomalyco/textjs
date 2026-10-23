import { describe, expect, test } from "bun:test";
import rule, { findUnsupportedGlyphs } from "../src/rules/no-unsupported-glyphs.ts";
import { CONSOLE, FILE, tester } from "./tester.ts";

describe("findUnsupportedGlyphs", () => {
  test("flags braille, Menlo-missing symbols and narrow + VS16", () => {
    expect(findUnsupportedGlyphs("⠋ loading").map((f) => f.kind)).toEqual(["braille"]);
    expect(findUnsupportedGlyphs("▪⬝⬝").map((f) => [f.kind, f.index])).toEqual([
      ["missing", 1],
      ["missing", 2],
    ]);
    expect(findUnsupportedGlyphs("▶\uFE0F play")).toEqual([{ kind: "emojiPresentation", index: 0, text: "▶\uFE0F" }]);
  });

  test("allows cell-exact glyphs and properly wide emoji", () => {
    for (const s of ["▼ Text.js", "▘▝▗▖", "─│╭╮", "▪··", "←↑→↓", "✓ ✗", "⭐ ⬛ ✅ 🚀 ❤️ 你好", "⬅️"]) expect(findUnsupportedGlyphs(s)).toEqual([]);
    expect(findUnsupportedGlyphs("⠋", true)).toEqual([]);
  });
});

tester().run("no-unsupported-glyphs", rule, {
  valid: [
    { filename: FILE, code: `${CONSOLE}export const A = () => <Text>▼ ready · ▪·· ▘▝▗▖ ✓</Text>;` },
    // Not a console file.
    { filename: FILE, code: `const SPINNERS = ["⠋", "⠙"];` },
    // Escapes are values, but type positions and import paths are skipped.
    { filename: FILE, code: `${CONSOLE}type Frame = "⠋";\nimport x from "./⠋";` },
    { filename: FILE, code: `${CONSOLE}const F = ["⠋", "⠙"];`, options: [{ allowBraille: true }] },
  ],
  invalid: [
    {
      filename: FILE,
      code: `${CONSOLE}export const A = () => <Text>⠋ loading</Text>;`,
      errors: [{ messageId: "braille", data: { glyph: "⠋", code: "U+280B" }, line: 2, column: 30, endColumn: 31 }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}const frames = ["▪⬝⬝", "⬝▪⬝"];`,
      errors: [
        { messageId: "missing", column: 19, suggestions: [{ messageId: "replace", output: `${CONSOLE}const frames = ["▪·⬝", "⬝▪⬝"];` }] },
        { messageId: "missing", column: 20, suggestions: [{ messageId: "replace", output: `${CONSOLE}const frames = ["▪⬝·", "⬝▪⬝"];` }] },
        { messageId: "missing", column: 25, suggestions: [{ messageId: "replace", output: `${CONSOLE}const frames = ["▪⬝⬝", "·▪⬝"];` }] },
        { messageId: "missing", column: 27, suggestions: [{ messageId: "replace", output: `${CONSOLE}const frames = ["▪⬝⬝", "⬝▪·"];` }] },
      ],
    },
    {
      filename: FILE,
      code: `${CONSOLE}export const A = () => <Text>{\`▶\uFE0F \${name}\`} ◀\uFE0F</Text>;`,
      output: `${CONSOLE}export const A = () => <Text>{\`▶ \${name}\`} ◀</Text>;`,
      errors: [{ messageId: "emojiPresentation" }, { messageId: "emojiPresentation" }],
    },
    {
      // Escaped glyphs are reported on the whole literal, without a fix.
      filename: FILE,
      code: `${CONSOLE}const s = "\\u25B6\\uFE0F \\u2800";`,
      errors: [{ messageId: "emojiPresentation", column: 11 }, { messageId: "braille", column: 11 }],
    },
    {
      filename: FILE,
      code: `${CONSOLE}export const A = () => <Text color="muted" title="⬤ on" />;`,
      errors: [{ messageId: "missing", suggestions: [{ messageId: "replace", output: `${CONSOLE}export const A = () => <Text color="muted" title="● on" />;` }] }],
    },
  ],
});
