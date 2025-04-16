import { describe, expect, test } from "bun:test";
import {
  ELLIPSIS,
  graphemeWidth,
  isPrintableAscii,
  LruCache,
  measureText,
  segmentGraphemes,
  sliceColumns,
  stringWidth,
  truncateText,
  wrapText,
} from "../src/index";

describe("graphemeWidth", () => {
  test("ASCII and control", () => {
    expect(graphemeWidth("a")).toBe(1);
    expect(graphemeWidth("\u0007")).toBe(0);
    expect(graphemeWidth("")).toBe(0);
  });

  test("zero-width characters", () => {
    expect(graphemeWidth("\u200B")).toBe(0);
    expect(graphemeWidth("\u2060")).toBe(0);
    expect(graphemeWidth("\uFE0F")).toBe(0);
    expect(graphemeWidth("\u0301")).toBe(0);
  });

  test("TUI glyphs are strictly one column", () => {
    for (const g of ["▼", "▲", "●", "◆", "▪", "─", "│", "╭", "█", "▓", "⠋", "⣿", "←", "⇧", "▶"]) {
      expect(graphemeWidth(g)).toBe(1);
    }
    expect(graphemeWidth("▼\uFE0F")).toBe(1);
  });

  test("East Asian wide and emoji are two columns", () => {
    for (const g of ["你", "好", "あ", "カ", "한", "Ａ", "🚀", "😀", "👍🏽", "👨‍👩‍👧", "🇺🇸", "❤️", "1️⃣", "\u3000"]) {
      expect(graphemeWidth(g)).toBe(2);
    }
    expect(graphemeWidth("\u{20000}")).toBe(2);
  });

  test("combining sequences take base width", () => {
    expect(graphemeWidth("e\u0301")).toBe(1);
  });
});

describe("segmentGraphemes", () => {
  test("keeps ZWJ clusters together", () => {
    const gs = segmentGraphemes("a👨‍👩‍👧b");
    expect(gs.map((g) => g.grapheme)).toEqual(["a", "👨‍👩‍👧", "b"]);
    expect(gs[1]?.isMulti).toBe(true);
    expect(gs[1]?.width).toBe(2);
    expect(gs[0]?.codePoint).toBe(0x61);
  });

  test("expands tabs and normalizes CRLF", () => {
    expect(segmentGraphemes("a\tb").map((g) => g.grapheme).join("")).toBe("a  b");
    expect(segmentGraphemes("a\r\nb").map((g) => g.grapheme)).toEqual(["a", "\n", "b"]);
    expect(segmentGraphemes("你\t好").map((g) => g.grapheme).join("")).toBe("你  好");
  });
});

describe("stringWidth", () => {
  test("fast ASCII path", () => {
    expect(isPrintableAscii("hello world")).toBe(true);
    expect(isPrintableAscii("a\nb")).toBe(false);
    expect(stringWidth("hello world")).toBe(11);
  });

  test("mixed content", () => {
    expect(stringWidth("你好 world")).toBe(10);
    expect(stringWidth("▼ Text.js")).toBe(9);
    expect(stringWidth("🚀🚀")).toBe(4);
    expect(stringWidth("a\tb")).toBe(4);
    expect(stringWidth("ab\nabcd")).toBe(4);
  });

  test("measureText", () => {
    expect(measureText("ab\n你好世界")).toEqual({ width: 8, height: 2 });
  });
});

describe("wrapText", () => {
  test("word wraps and trims break spaces", () => {
    expect(wrapText("the quick brown fox", 10)).toEqual(["the quick", "brown fox"]);
    expect(wrapText("hello world", 5)).toEqual(["hello", "world"]);
  });

  test("hard-breaks long words", () => {
    expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  test("preserves explicit newlines and blank lines", () => {
    expect(wrapText("a\n\nb", 10)).toEqual(["a", "", "b"]);
  });

  test("wide characters never split", () => {
    const lines = wrapText("你好世界你好", 5);
    expect(lines).toEqual(["你好", "世界", "你好"]);
    for (const l of lines) expect(stringWidth(l)).toBeLessThanOrEqual(5);
  });

  test("nowrap keeps lines intact", () => {
    expect(wrapText("a long line here", 4, "nowrap")).toEqual(["a long line here"]);
  });

  test("truncation modes", () => {
    expect(wrapText("abcdefghij", 6, "truncate-end")).toEqual([`abcde${ELLIPSIS}`]);
    expect(wrapText("abcdefghij", 6, "truncate-start")).toEqual([`${ELLIPSIS}fghij`]);
    expect(wrapText("abcdefghij", 6, "truncate-middle")).toEqual([`abc${ELLIPSIS}ij`]);
    expect(wrapText("short", 6, "truncate-end")).toEqual(["short"]);
    expect(stringWidth(wrapText("你好世界", 5, "truncate-end")[0] ?? "")).toBeLessThanOrEqual(5);
    expect(truncateText("hello world", 8)).toBe(`hello w${ELLIPSIS}`);
  });

  test("results are cached and frozen", () => {
    const a = wrapText("cache me please", 6);
    const b = wrapText("cache me please", 6);
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
  });
});

describe("sliceColumns", () => {
  test("slices by display columns and pads split wide chars", () => {
    expect(sliceColumns("hello", 1, 3)).toBe("el");
    expect(sliceColumns("你好世界", 2, 6)).toBe("好世");
    expect(sliceColumns("你好世界", 1, 5)).toBe(" 好 ");
  });
});

describe("LruCache", () => {
  test("evicts least recently used", () => {
    const c = new LruCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a");
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    expect(c.size).toBe(2);
  });
});

describe("bounded caches", () => {
  test("long strings are measured and wrapped correctly without being cached", () => {
    const long = "é".repeat(2000);
    expect(stringWidth(long)).toBe(2000);
    const lines = wrapText(long, 100);
    expect(lines.length).toBe(20);
    expect(wrapText(long, 100)).not.toBe(lines);
    const short = "héllo wörld";
    expect(wrapText(short, 5)).toBe(wrapText(short, 5));
  });
});

