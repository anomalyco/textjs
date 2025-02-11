import { describe, expect, test } from "bun:test";
import {
  ATTR_BOLD,
  ATTR_WIDE_CONT,
  CellBuffer,
  GRAPHEME_POOL_FLAG,
  packRGBA,
  parseColor,
  unpackRGBA,
} from "../src/index";

const RED = 0xef4444ff;
const BLUE = 0x3b82f6ff;

describe("CellBuffer basics", () => {
  test("initializes to spaces and default colors", () => {
    const b = new CellBuffer(4, 2);
    expect(b.toPlainLines()).toEqual(["    ", "    "]);
    expect(b.fg[0]).toBe(0);
    expect(b.bg[0]).toBe(0);
  });

  test("clear resets cells and grapheme pool", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "👨‍👩‍👧", RED, 0);
    expect(b.graphemePool.length).toBe(1);
    b.clear(BLUE);
    expect(b.graphemePool.length).toBe(0);
    expect(b.bg[3]).toBe(BLUE);
    expect(b.toPlainString()).toBe("    ");
  });

  test("resize reallocates", () => {
    const b = new CellBuffer(2, 2);
    b.resize(5, 3);
    expect(b.chars.length).toBe(15);
    expect(b.toPlainLines().length).toBe(3);
  });

  test("stores single code points inline and clusters in the pool", () => {
    const b = new CellBuffer(6, 1);
    b.drawText(0, 0, "a🚀👨‍👩‍👧", 0, 0);
    expect(b.chars[0]).toBe(0x61);
    expect(b.chars[1]).toBe(0x1f680);
    expect(((b.chars[3] ?? 0) & GRAPHEME_POOL_FLAG) >>> 0).toBe(GRAPHEME_POOL_FLAG);
    expect(b.toPlainString()).toBe("a🚀👨‍👩‍👧 ");
  });
});

describe("wide characters", () => {
  test("marks continuation cells", () => {
    const b = new CellBuffer(4, 1);
    expect(b.drawText(0, 0, "你好", 0, 0)).toBe(4);
    expect((b.attrs[1] ?? 0) & ATTR_WIDE_CONT).toBe(ATTR_WIDE_CONT);
    expect((b.attrs[3] ?? 0) & ATTR_WIDE_CONT).toBe(ATTR_WIDE_CONT);
    expect(b.toPlainString()).toBe("你好");
  });

  test("overwriting the head clears the continuation", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "你", 0, 0);
    b.setCell(0, 0, "x", 0, 0);
    expect(b.toPlainString()).toBe("x   ");
    expect((b.attrs[1] ?? 0) & ATTR_WIDE_CONT).toBe(0);
  });

  test("overwriting the continuation clears the head", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "你", 0, 0);
    b.setCell(1, 0, "x", 0, 0);
    expect(b.toPlainString()).toBe(" x  ");
  });

  test("wide char overlapping the next wide head clears its tail", () => {
    const b = new CellBuffer(5, 1);
    b.drawText(1, 0, "好", 0, 0);
    b.drawText(0, 0, "你", 0, 0);
    expect(b.toPlainString()).toBe("你   ");
  });

  test("wide char at the clip edge becomes a space", () => {
    const b = new CellBuffer(3, 1);
    b.drawText(2, 0, "你", 0, 0);
    expect(b.toPlainString()).toBe("   ");
    expect((b.attrs[2] ?? 0) & ATTR_WIDE_CONT).toBe(0);
  });

  test("fillRect repairs split wide chars at edges", () => {
    const b = new CellBuffer(6, 1);
    b.drawText(0, 0, "你好世", 0, 0);
    b.fillRect(1, 0, 2, 1, RED);
    expect(b.toPlainString()).toBe("    世");
    b.drawText(0, 0, "你好世", 0, 0);
    b.fillRect(3, 0, 2, 1, RED, 0x2d);
    expect(b.toPlainString()).toBe("你 -- ");
  });
});

describe("scissor", () => {
  test("clips writes and nests by intersection", () => {
    const b = new CellBuffer(6, 3);
    b.pushScissor(1, 1, 4, 1);
    b.pushScissor(0, 0, 3, 3);
    expect(b.getScissor()).toEqual({ x: 1, y: 1, width: 2, height: 1 });
    b.fillRect(0, 0, 6, 3, RED, 0x23);
    b.popScissor();
    b.drawText(0, 1, "abcdef", 0, 0);
    b.popScissor();
    expect(b.toPlainLines()).toEqual(["      ", " bcde ", "      "]);
    expect(b.getScissor()).toEqual({ x: 0, y: 0, width: 6, height: 3 });
    expect(b.intersectsScissor(10, 10, 2, 2)).toBe(false);
  });
});

describe("blending", () => {
  test("translucent bg blends over existing bg", () => {
    const b = new CellBuffer(1, 1);
    b.fillRect(0, 0, 1, 1, 0xffffffff);
    b.setCell(0, 0, "x", 0xff0000ff, packRGBA(0, 0, 0, 128));
    const bg = unpackRGBA(b.bg[0] ?? 0);
    expect(bg.a).toBe(255);
    expect(bg.r).toBeLessThan(130);
    expect(bg.r).toBeGreaterThan(120);
  });

  test("transparent bg keeps existing bg", () => {
    const b = new CellBuffer(1, 1);
    b.fillRect(0, 0, 1, 1, BLUE);
    b.setCell(0, 0, "x", RED, 0);
    expect(b.bg[0]).toBe(BLUE);
  });

  test("dimRect darkens fg and bg without erasing characters", () => {
    const b = new CellBuffer(4, 1);
    b.fillRect(0, 0, 4, 1, 0xffffffff);
    b.drawText(0, 0, "ab", 0xffffffff, 0, ATTR_BOLD);
    b.dimRect(0, 0, 4, 1, parseColor("rgba(0,0,0,0.65)"));
    expect(b.toPlainString()).toBe("ab  ");
    expect(unpackRGBA(b.bg[0] ?? 0).r).toBeLessThan(100);
    expect(unpackRGBA(b.fg[0] ?? 0).r).toBeLessThan(100);
    expect(b.attrs[0]).toBe(ATTR_BOLD);
  });

  test("dimRect over default background yields translucent overlay", () => {
    const b = new CellBuffer(1, 1);
    const overlay = parseColor("rgba(0,0,0,0.5)");
    b.dimRect(0, 0, 1, 1, overlay);
    expect(b.bg[0]).toBe(overlay);
    expect((b.fg[0] ?? 0) & 255).toBe(255);
  });
});

describe("drawBox", () => {
  const styles = {
    single: ["┌──┐", "│  │", "└──┘"],
    rounded: ["╭──╮", "│  │", "╰──╯"],
    double: ["╔══╗", "║  ║", "╚══╝"],
    heavy: ["┏━━┓", "┃  ┃", "┗━━┛"],
    dashed: ["┌╌╌┐", "╎  ╎", "└╌╌┘"],
    ascii: ["+--+", "|  |", "+--+"],
  } as const;
  for (const [style, expected] of Object.entries(styles)) {
    test(`style ${style}`, () => {
      const b = new CellBuffer(4, 3);
      b.drawBox({ x: 0, y: 0, width: 4, height: 3, style: style as keyof typeof styles });
      expect(b.toPlainLines()).toEqual([...expected]);
    });
  }

  test("none draws nothing", () => {
    const b = new CellBuffer(3, 3);
    b.drawBox({ x: 0, y: 0, width: 3, height: 3, style: "none" });
    expect(b.toPlainString()).toBe("   \n   \n   ");
  });

  test("per-side borders", () => {
    const b = new CellBuffer(4, 3);
    b.drawBox({ x: 0, y: 0, width: 4, height: 3, left: false, right: false });
    expect(b.toPlainLines()).toEqual(["────", "    ", "────"]);
  });

  test("titles align left, center and right", () => {
    const mk = (align: "left" | "center" | "right"): string => {
      const b = new CellBuffer(16, 3);
      b.drawBox({ x: 0, y: 0, width: 16, height: 3, style: "rounded", title: "Hi", titleAlign: align, bottomTitle: "v1", bottomTitleAlign: "right", titleColor: RED });
      return b.toPlainLines().join("\n");
    };
    expect(mk("left").split("\n")[0]).toBe("╭─ Hi ─────────╮");
    expect(mk("center").split("\n")[0]).toBe("╭───── Hi ─────╮");
    expect(mk("right").split("\n")[0]).toBe("╭───────── Hi ─╮");
    expect(mk("left").split("\n")[2]).toBe("╰───────── v1 ─╯");
  });
});

describe("row hashes", () => {
  test("change only for modified rows", () => {
    const b = new CellBuffer(10, 3);
    b.drawText(0, 0, "hello", RED, 0);
    const h1 = b.computeRowHashes().slice();
    b.setCell(2, 1, "x", 0, 0);
    const h2 = b.computeRowHashes();
    expect(h2[0]).toBe(h1[0] ?? -1);
    expect(h2[1]).not.toBe(h1[1] ?? -1);
    expect(h2[2]).toBe(h1[2] ?? -1);
  });

  test("sensitive to color and attrs, stable across pool resets", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "👨‍👩‍👧", RED, 0);
    const h = b.computeRowHashes()[0];
    b.clear();
    b.drawText(0, 0, "a", 0, 0);
    b.clear();
    b.drawText(0, 0, "👨‍👩‍👧", RED, 0);
    expect(b.computeRowHashes()[0]).toBe(h ?? -1);
    b.setCell(3, 0, " ", 0, BLUE);
    expect(b.computeRowHashes()[0]).not.toBe(h ?? -1);
  });
});
