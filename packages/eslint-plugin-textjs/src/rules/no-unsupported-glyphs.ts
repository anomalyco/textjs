import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createRule, textjsImports } from "../utils.ts";

/**
 * Cell-exact replacements that exist in Menlo (the DevTools console font on
 * macOS) for glyphs it lacks.
 */
export const GLYPH_REPLACEMENTS: Readonly<Record<string, string>> = {
  "\u2B1D": "\u00B7", // ⬝ → ·
  "\u2B1E": "\u00B7", // ⬞ → ·
  "\u2B24": "\u25CF", // ⬤ → ●
  "\u2B25": "\u25C6", // ⬥ → ◆
  "\u2B26": "\u25C7", // ⬦ → ◇
  "\u2B27": "\u25C6", // ⬧ → ◆
  "\u2B28": "\u25C7", // ⬨ → ◇
  "\u2B05": "\u2190", // ⬅ → ←
  "\u2B06": "\u2191", // ⬆ → ↑
  "\u2B07": "\u2193", // ⬇ → ↓
  "\u2B95": "\u2192", // ⮕ → →
};

/** Wide emoji in U+2B00–2BFF that Text.js already measures as two cells. */
const WIDE_2B = new Set([0x2b1b, 0x2b1c, 0x2b50, 0x2b55]);

/** Code points Text.js always measures as one cell (`isStrictNarrow` in @textjs/core). */
function isStrictNarrow(cp: number): boolean {
  return (cp >= 0x2190 && cp <= 0x21ff) || (cp >= 0x2500 && cp <= 0x25ff) || (cp >= 0x2800 && cp <= 0x28ff);
}

type Kind = "braille" | "missing" | "emojiPresentation";

interface Finding {
  kind: Kind;
  /** Index in the string value. */
  index: number;
  /** The offending text (one code point, or a code point + U+FE0F). */
  text: string;
}

export function findUnsupportedGlyphs(value: string, allowBraille = false): Finding[] {
  const out: Finding[] = [];
  for (let i = 0; i < value.length; ) {
    const cp = value.codePointAt(i) ?? 0;
    const len = cp > 0xffff ? 2 : 1;
    const ch = value.slice(i, i + len);
    if (isStrictNarrow(cp) && value.charCodeAt(i + len) === 0xfe0f) {
      out.push({ kind: "emojiPresentation", index: i, text: `${ch}\uFE0F` });
      i += len + 1;
      continue;
    }
    if (cp >= 0x2800 && cp <= 0x28ff) {
      if (!allowBraille) out.push({ kind: "braille", index: i, text: ch });
    } else if (cp >= 0x2b00 && cp <= 0x2bff && !WIDE_2B.has(cp) && value.charCodeAt(i + len) !== 0xfe0f) {
      out.push({ kind: "missing", index: i, text: ch });
    }
    i += len;
  }
  return out;
}

const hex = (s: string): string => `U+${(s.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;

export default createRule<[{ allowBraille?: boolean }], "braille" | "missing" | "emojiPresentation" | "replace" | "removeVariationSelector">({
  name: "no-unsupported-glyphs",
  meta: {
    type: "problem",
    fixable: "code",
    hasSuggestions: true,
    docs: {
      description: "Disallow glyphs that aren't one cell wide in the DevTools console font.",
      recommended: true,
    },
    messages: {
      braille:
        "Braille {{glyph}} ({{code}}) isn't in Menlo, the DevTools console font on macOS: the fallback glyph is wider than a cell and skews the row. Use block or quadrant characters (▖▗▘▝, `marker=\"quadrant\"`).",
      missing: "{{glyph}} ({{code}}) isn't in Menlo, the DevTools console font on macOS: the fallback glyph is wider than a cell and skews the row.",
      emojiPresentation:
        "{{glyph}} with U+FE0F renders as a two-cell emoji, but Text.js lays it out as one cell. Drop the variation selector.",
      replace: "Replace {{glyph}} with {{replacement}}.",
      removeVariationSelector: "Remove U+FE0F.",
    },
    schema: [
      {
        type: "object",
        properties: { allowBraille: { type: "boolean", description: "Allow braille (for apps that only run with `text run` in a terminal)." } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowBraille: false }],
  create(context, [{ allowBraille = false }]) {
    const imports = textjsImports(context);
    if (!imports.isConsole) return {};
    const source = context.sourceCode;

    function check(node: TSESTree.Node, value: string, rawStart: number, raw: string): void {
      const cursor = new Map<string, number>();
      for (const f of findUnsupportedGlyphs(value, allowBraille)) {
        // Locate the glyph in the raw source when it appears literally (not as an escape).
        const rawIndex = raw.indexOf(f.text, cursor.get(f.text) ?? 0);
        const literal = rawIndex >= 0;
        if (literal) cursor.set(f.text, rawIndex + f.text.length);
        const range: [number, number] = literal ? [rawStart + rawIndex, rawStart + rawIndex + f.text.length] : node.range;
        const loc = literal ? { start: source.getLocFromIndex(range[0]), end: source.getLocFromIndex(range[1]) } : node.loc;
        const glyph = f.kind === "emojiPresentation" ? f.text.slice(0, -1) : f.text;
        const data = { glyph, code: hex(glyph), replacement: GLYPH_REPLACEMENTS[glyph] ?? "" };
        if (f.kind === "emojiPresentation") {
          context.report({
            loc,
            messageId: "emojiPresentation",
            data,
            fix: literal ? (fixer) => fixer.removeRange([range[1] - 1, range[1]]) : null,
          });
          continue;
        }
        const replacement = GLYPH_REPLACEMENTS[glyph];
        const suggest: TSESLint.SuggestionReportDescriptor<"replace">[] =
          literal && replacement ? [{ messageId: "replace", data, fix: (fixer) => fixer.replaceTextRange(range, replacement) }] : [];
        context.report({ loc, messageId: f.kind, data, suggest });
      }
    }

    function inTypeOrImport(node: TSESTree.Node): boolean {
      const p = node.parent;
      if (!p) return false;
      if (p.type === AST_NODE_TYPES.ImportDeclaration || p.type === AST_NODE_TYPES.ExportAllDeclaration || p.type === AST_NODE_TYPES.ExportNamedDeclaration) return true;
      if (p.type === AST_NODE_TYPES.TSLiteralType || p.type === AST_NODE_TYPES.ImportExpression) return true;
      return false;
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string" || inTypeOrImport(node)) return;
        check(node, node.value, node.range[0], node.raw);
      },
      TemplateElement(node) {
        const cooked = node.value.cooked;
        if (typeof cooked !== "string") return;
        check(node, cooked, node.range[0], source.text.slice(node.range[0], node.range[1]));
      },
      JSXText(node) {
        check(node, node.value, node.range[0], node.raw);
      },
    };
  },
});
