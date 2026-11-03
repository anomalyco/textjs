import { describe, expect, test } from "bun:test";
import { CellBuffer, CssConsoleDriver } from "../src/index";
import { applyStandIns, measureStandIns } from "../src/drivers/stand-ins";
import { FakeConsole } from "./fixtures";

/** Consolas on Windows 10: 7px cells, WGL4 glyphs fit, everything else falls back 1.8 cells wide. */
const WGL4 = new Set([..."M _▄▀█▌▐▒►◄▼▲♦◊√×abcdefghijklmnopqrstuvwxyz0123456789│─╭╮╰╯"]);
const consolas = (text: string): number => {
  let w = 0;
  for (const ch of text) w += WGL4.has(ch) ? 7 : 12.6;
  return w;
};

describe("glyph stand-ins", () => {
  test("only glyphs the font can't fit get stand-ins", () => {
    const s = measureStandIns(consolas, 7);
    expect(s).not.toBeNull();
    if (s === null) return;
    expect(applyStandIns("▁▂▃▄▅▆▇█", s)).toBe("__▄▄▄███");
    expect(applyStandIns("████▋  ▏", s)).toBe("████▌   ");
    expect(applyStandIns("▶ ok ✓ no ✗ ▸◀", s)).toBe("► ok √ no × ►◄");
    expect(applyStandIns("▖▗▘▝▙▚▞", s)).toBe("▄▄▀▀█▒▒");
    // Braille by quadrant: ⠋ (dots 1 2 4) fills the top, ⡇ the left column, ⣀ the bottom, ⣿ everything.
    expect(applyStandIns("⠋⡇⣀⣿⠀", s)).toBe("▀▌▄█ ");
    expect(applyStandIns("plain ascii", s)).toBe("plain ascii");
  });

  test("fonts that fit every glyph, or within a fifth of a cell, need none", () => {
    expect(measureStandIns((t) => [...t].length * 7, 7)).toBeNull();
    // macOS draws braille 1.14 cells wide (Apple Braille next to Menlo): left as is.
    expect(measureStandIns((t) => [...t].reduce((w, ch) => w + (ch >= "\u2800" && ch <= "\u28ff" ? 8 : 7), 0), 7)).toBeNull();
    expect(measureStandIns(() => Number.NaN, 7)).toBeNull();
  });

  test("a stand-in that doesn't fit either isn't used", () => {
    const s = measureStandIns((t) => (t === "✓" || t === "√" ? 12 : [...t].length * 7), 7);
    expect(s).toBeNull();
  });

  test("CssConsoleDriver draws stand-ins in the console frame only", () => {
    const b = new CellBuffer(8, 1);
    b.drawText(0, 0, "▁▃▅▇ ✓", 0x22c55eff, 0);
    const con = new FakeConsole();
    new CssConsoleDriver({ console: con, measureText: consolas }).render(b);
    expect(con.last.format.replaceAll("%c", "")).toStartWith("_▄▄█ √");
    expect(b.cellText(0)).toBe("▁");
    const raw = new FakeConsole();
    new CssConsoleDriver({ console: raw, measureText: false }).render(b);
    expect(raw.last.format.replaceAll("%c", "")).toStartWith("▁▃▅▇ ✓");
  });
});
