import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLED_FONTS } from "../src/all";
import { slant } from "../src/fonts/slant";
import { standard } from "../src/fonts/standard";
import { FigletParseError, LAYOUT, parseFont, renderFiglet } from "../src/index";

const pkg = join(import.meta.dir, "..");

/** A 2-row test font: every character is drawn with its own letter, `$` hardblank. */
function tinyFont(header: string, extra = ""): string {
  let src = `${header}\ncomment line 1\ncomment line 2\n`;
  for (let c = 32; c <= 126; c++) {
    const ch = c === 32 ? "$" : String.fromCharCode(c) === "@" ? "a" : String.fromCharCode(c);
    src += `${ch}${ch}@\n${ch}${ch}@@\n`;
  }
  for (let i = 0; i < 7; i++) src += "D@\nD@@\n";
  return src + extra;
}

describe("parseFont", () => {
  test("reads the header, comments and derives Full_Layout from Old_Layout", () => {
    const font = parseFont(tinyFont("flf2a$ 2 1 4 15 2"), "Tiny");
    expect(font.name).toBe("Tiny");
    expect(font.header).toMatchObject({ hardblank: "$", height: 2, baseline: 1, maxLength: 4, oldLayout: 15, commentLines: 2, printDirection: 0 });
    expect(font.header.fullLayout).toBe(15 | LAYOUT.H_SMUSHING);
    expect(font.comment).toBe("comment line 1\ncomment line 2");
    expect(parseFont(tinyFont("flf2a$ 2 1 4 0 2")).header.fullLayout).toBe(LAYOUT.H_FITTING);
    expect(parseFont(tinyFont("flf2a$ 2 1 4 -1 2")).header.fullLayout).toBe(0);
    expect(parseFont(tinyFont("flf2a$ 2 1 4 -1 2 1 24463")).header).toMatchObject({ printDirection: 1, fullLayout: 24463 });
  });

  test("strips endmarks and trailing whitespace, keeps the 7 Deutsch characters", () => {
    const font = parseFont(tinyFont("flf2a$ 2 1 4 0 2"));
    expect(font.glyph("A")).toEqual(["AA", "AA"]);
    expect(font.glyph(" ")).toEqual(["$$", "$$"]);
    expect(font.glyph("ß")).toEqual(["D", "D"]);
    expect(font.codes.length).toBe(95 + 7);
  });

  test("reads decimal, octal, hex and negative code tags; later definitions win", () => {
    const extra = "0x263A  SMILE\nsm@\nsm@@\n0101 octal A\noc@\noc@@\n-2 private\nn@\nn@@\n9731\nsn@\nsn@@\n";
    const font = parseFont(tinyFont("flf2a$ 2 1 4 0 2", extra));
    expect(font.glyph(0x263a)).toEqual(["sm", "sm"]);
    expect(font.glyph("A")).toEqual(["oc", "oc"]);
    expect(font.glyph(-2)).toEqual(["n", "n"]);
    expect(font.glyph(9731)).toEqual(["sn", "sn"]);
  });

  test("renders undefined characters as the missing character (empty, or code 0)", () => {
    const plain = parseFont(tinyFont("flf2a$ 2 1 4 -1 2"));
    expect(renderFiglet(plain, "A\u263aB")).toEqual(["AABB", "AABB"]);
    const withZero = parseFont(tinyFont("flf2a$ 2 1 4 -1 2", "0\n??@\n??@@\n"));
    expect(renderFiglet(withZero, "A\u263aB")).toEqual(["AA??BB", "AA??BB"]);
  });

  test("rejects files that are not FIGfonts", () => {
    expect(() => parseFont("hello\nworld\n")).toThrow(FigletParseError);
    expect(() => parseFont("flf2a$ 6 5\n")).toThrow(FigletParseError);
  });

  test("accepts CRLF files and TOIlet tlf2a signatures", () => {
    const crlf = parseFont(tinyFont("flf2a$ 2 1 4 -1 2").replace(/\n/g, "\r\n"));
    expect(renderFiglet(crlf, "AB")).toEqual(["AABB", "AABB"]);
    expect(parseFont(tinyFont("tlf2a$ 2 1 4 -1 2")).header.signature).toBe("tlf2a");
  });
});

describe("bundled fonts", () => {
  test("parse lazily, on first use", () => {
    const fresh = BUNDLED_FONTS.find((f) => f.id === "term")?.font;
    expect(fresh?.name).toBe("Term");
    expect(fresh?.render("hi")).toEqual(["hi"]);
  });

  test("keep their credits verbatim", () => {
    expect(standard.comment).toContain("Standard by Glenn Chappell & Ian Chai");
    expect(slant.comment).toContain("Permission is hereby given to modify this font");
    for (const { id, font } of BUNDLED_FONTS) {
      const original = new TextDecoder("latin1").decode(readFileSync(join(pkg, "fonts", `${id}.flf`)));
      const lines = original.split("\n");
      expect(font.comment).toBe(lines.slice(1, 1 + font.header.commentLines).join("\n"));
    }
  });

  test("ship one module per font, each importing only the parser", () => {
    const modules = readdirSync(join(pkg, "src", "fonts"));
    expect(modules.length).toBe(BUNDLED_FONTS.length);
    expect(BUNDLED_FONTS.length).toBeGreaterThanOrEqual(15);
    for (const file of modules) {
      const src = readFileSync(join(pkg, "src", "fonts", file), "utf8");
      expect([...src.matchAll(/^import .* from "(.*)";$/gm)].map((m) => m[1])).toEqual(["../parse"]);
      expect(src).toContain("/* @__PURE__ */ defineFont(");
    }
  });

  test("draw only cell-width sub-characters (printable ASCII and Latin-1) for printable input", () => {
    const printable = (code: number): boolean => (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
    for (const { font } of BUNDLED_FONTS) {
      for (const code of font.codes) {
        // bubble, digital and term draw U+0080–U+009F as themselves; that input is never printable.
        if (code >= 0x80 && code <= 0x9f) continue;
        for (const row of font.glyph(code) ?? []) {
          for (const ch of row) {
            if (ch === font.header.hardblank) continue;
            expect(printable(ch.codePointAt(0) as number)).toBe(true);
          }
        }
      }
    }
  });
});

describe("renderFiglet options", () => {
  test("unlimited width never wraps", () => {
    const rows = renderFiglet(standard, "The quick brown fox jumps over the lazy dog");
    expect(rows.length).toBe(6);
    expect(rows[0]!.length).toBeGreaterThan(200);
  });

  test("width bounds every row and wraps at word breaks", () => {
    const rows = renderFiglet(standard, "Text.js renders in the console", { width: 40 });
    expect(rows.length % 6).toBe(0);
    expect(rows.length).toBeGreaterThan(6);
    for (const r of rows) expect(r.length).toBeLessThanOrEqual(40);
  });

  test("align with unlimited width aligns rows within the widest row", () => {
    const left = renderFiglet(standard, "W\ni");
    const right = renderFiglet(standard, "W\ni", { align: "right" });
    const center = renderFiglet(standard, "W\ni", { align: "center" });
    const widest = Math.max(...left.map((r) => r.length));
    for (const r of right) expect(r.length).toBe(widest);
    expect(center[8]!.length).toBeLessThan(widest);
    expect(center[8]!.trimStart().length).toBe(left[8]!.trimStart().length);
  });

  test("right-to-left fonts align right by default", () => {
    const { font } = BUNDLED_FONTS.find((f) => f.id === "ivrit")!;
    const rows = renderFiglet(font, "a\nab");
    const widest = Math.max(...rows.map((r) => r.length));
    for (const r of rows) expect(r.length).toBe(widest);
  });

  test("returns nothing for empty text and full-height blank lines for newlines", () => {
    expect(renderFiglet(standard, "")).toEqual([]);
    expect(renderFiglet(standard, "\n")).toEqual(["", "", "", "", "", ""]);
  });
});

describe("vertical layout", () => {
  const rows = (s: string): string[] => s.split("\n");
  /** 3-row font where `_`, `-`, `|` and `o` sit on different rows. */
  const font = parseFont(sourceWithLayout(0));

  test("full height stacks lines like FIGlet", () => {
    expect(renderFiglet(font, "o\no")).toEqual(rows(" \no\n \n \no\n "));
  });

  test("fitting moves lines together until they touch", () => {
    expect(renderFiglet(font, "o\no", { verticalLayout: "fitted" })).toEqual(rows(" \no\no\n "));
    expect(renderFiglet(font, "_\n-", { verticalLayout: "fitted" })).toEqual(rows(" \n \n_\n-\n \n "));
  });

  test("smushing joins touching rows with the vertical rules", () => {
    const withRules = parseFont(sourceWithLayout(LAYOUT.V_SMUSHING | LAYOUT.V_LINE));
    expect(renderFiglet(withRules, "_\n-", { verticalLayout: "default" })).toEqual(rows(" \n \n=\n \n "));
    expect(renderFiglet(font, "_\n-", { verticalLayout: "universal" })).toEqual(rows(" \n \n-\n \n "));
  });

  test("vertical line supersmushing slides bars through each other", () => {
    const sup = parseFont(sourceWithLayout(LAYOUT.V_SMUSHING | LAYOUT.V_SUPER));
    expect(renderFiglet(sup, "|\n|", { verticalLayout: "default" })).toEqual(rows("|\n|\n|"));
    const eq = parseFont(sourceWithLayout(LAYOUT.V_SMUSHING | LAYOUT.V_EQUAL));
    expect(renderFiglet(eq, "|\n|", { verticalLayout: "default" })).toEqual(rows("|\n|\n|\n|\n|"));
  });

  function sourceWithLayout(fullLayout: number): string {
    let src = `flf2a$ 3 2 3 -1 0 0 ${fullLayout}\n`;
    for (let c = 32; c <= 126; c++) {
      const ch = String.fromCharCode(c);
      const glyph = ch === "_" ? [" ", " ", "_"] : ch === "-" ? ["-", " ", " "] : ch === "|" ? ["|", "|", "|"] : ch === "o" ? [" ", "o", " "] : ["$", "$", "$"];
      src += glyph.map((g, i) => (i === 2 ? `${g}@@` : `${g}@`)).join("\n") + "\n";
    }
    return src;
  }
});
