import { describe, expect, test } from "bun:test";
import {
  ELLIPSIS,
  graphemeWidth,
  isPrintableAscii,
  isSimpleNarrowString,
  LruCache,
  measureText,
  segmentGraphemes,
  sliceColumns,
  stringWidth,
  TAB_WIDTH,
  truncateText,
  wrapText,
  type Grapheme,
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

  test("skips map delete+set churn when far from capacity, promotes past half capacity", () => {
    const c = new LruCache<string, number>(64);
    for (let i = 0; i < 40; i++) c.set(`k${i}`, i);
    // Past half capacity (40 >= 32), accessing k0 promotes it so filling to 64+24 keeps k0.
    expect(c.get("k0")).toBe(0);
    for (let i = 40; i < 65; i++) c.set(`k${i}`, i);
    expect(c.get("k0")).toBe(0);
    expect(c.get("k1")).toBeUndefined();
  });
});

describe("narrow BMP fast path vs Intl.Segmenter slow path", () => {
  const refSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

  function slowSegment(text: string): Grapheme[] {
    const out: Grapheme[] = [];
    for (const seg of refSegmenter.segment(text)) {
      const g = seg.segment;
      if (g === "\t") {
        for (let t = 0; t < TAB_WIDTH; t++) out.push({ grapheme: " ", width: 1, codePoint: 0x20, isMulti: false });
      } else if (g === "\n" || g === "\r\n") {
        out.push({ grapheme: "\n", width: 0, codePoint: 0x0a, isMulti: false });
      } else if (g !== "\r") {
        const cp = g.codePointAt(0) ?? 0;
        const isMulti = g.length > (cp > 0xffff ? 2 : 1);
        out.push({ grapheme: g, width: graphemeWidth(g), codePoint: cp, isMulti });
      }
    }
    return out;
  }

  function slowWidth(text: string): number {
    let max = 0;
    let line = 0;
    for (const g of slowSegment(text)) {
      if (g.codePoint === 0x0a) {
        if (line > max) max = line;
        line = 0;
      } else line += g.width;
    }
    return line > max ? line : max;
  }

  test("matches Intl.Segmenter exactly across narrow TUI BMP and complex Unicode corpus", () => {
    const narrowFastCorpus = [
      "",
      "▼ OpenCode · Profiling Session — 100×32",
      "┌──────┬──────┐\n│ col1 │ col2 │\n└──────┴──────┘",
      "╭─ ts ─╮ ▀▄█▌▐░▒▓ ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏",
      "← ↑ → ↓ ⇧ ‹prev› «quote» “smart” ‘quotes’ • bullet … ellipsis ✓ ✔ ✗ ✘ €100",
      "Latin-1 & Ext: café naïve über Łódź Crème brûlée\twith\ttabs\r\nand\rcarriage",
    ];
    for (const s of narrowFastCorpus) {
      expect(isSimpleNarrowString(s)).toBe(true);
      expect(segmentGraphemes(s)).toEqual(slowSegment(s));
      expect(stringWidth(s)).toBe(slowWidth(s));
    }

    const fallbackCorpus = [
      "combining: cafe\u0301 a\u0308\u0304 o\u20d7",
      "emoji & ZWJ: 🚀 😀 👍🏽 👨‍👩‍👧 👩‍💻 🏳️‍🌈 🇺🇸 ❤️ 1️⃣ ▼\uFE0F",
      "CJK & Hangul: 你好世界 こんにちは カタカナ 한글 \u3000 ＡＢＣ",
      "wide BMP symbols: ✅ ✨ ❌ ⚡ ☕ ⌚ ⏳ ⭐",
      "zero-width & soft-hyphen: a\u200Bb c\u00ADd e\u2060f \uFEFFg",
      "mixed line: ▼ Session · cafe\u0301 · 你好 · 👨‍👩‍👧 · ✅ · ⠋",
    ];
    for (const s of fallbackCorpus) {
      expect(isSimpleNarrowString(s)).toBe(false);
      expect(segmentGraphemes(s)).toEqual(slowSegment(s));
      expect(stringWidth(s)).toBe(slowWidth(s));
    }
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

