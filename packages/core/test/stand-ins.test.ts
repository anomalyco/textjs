import { describe, expect, test } from "bun:test";
import { CellBuffer, CssConsoleDriver } from "../src/index";
import { createStandInResolver } from "../src/drivers/stand-ins";
import { FakeConsole } from "./fixtures";

/** Consolas on Windows 10: 7px cells, WGL4 glyphs fit, everything else falls back 1.8 cells wide. */
const WGL4 = new Set([..."M _▄▀█▌▐▒►◄▼▲♦◊√×abcdefghijklmnopqrstuvwxyz0123456789│─╭╮╰╯"]);
const consolas = (text: string): number => {
  let w = 0;
  for (const ch of text) w += WGL4.has(ch) ? 7 : 12.6;
  return w;
};

/** Every glyph with a stand-in, every braille pattern, and neighbours that have none. */
const ALL = "▁▂▃▅▆▇▉▊▋▍▎▏▔▕▖▗▘▙▚▛▜▝▞▟▶▸◀◂▾▴▽△◆◇✓✔✕✖✗✘" + String.fromCharCode(...Array.from({ length: 256 }, (_, i) => 0x2800 + i));
const NEIGHBOURS = "▀▄█▌▐░▒▓▼▲►◄─│╭╮╰╯→←↑↓ abc";

/**
 * The eager measurement this replaced (`measureStandIns` before 1.6): probes
 * every pair up front and returns the map it applies. Kept as the reference
 * the lazy resolver must match glyph for glyph.
 */
function eagerStandIns(measure: (t: string) => number): Map<string, string> {
  const cell = measure("M".repeat(32)) / 32;
  const used = new Map<string, string>();
  if (!(cell > 0)) return used;
  const fits = (g: string) => {
    const w = measure(g);
    return Number.isFinite(w) && Math.abs(w - cell) <= cell * 0.2;
  };
  const pairs = "▁_▂_▃▄▅▄▆█▇█▉█▊█▋▌▍▌▎▌▏ ▔▀▕▐▖▄▗▄▘▀▙█▚▒▛█▜█▝▀▞▒▟█▶►▸►◀◄◂◄▾▼▴▲▽▼△▲◆♦◇◊✓√✔√✕×✖×✗×✘×";
  for (let i = 0; i < pairs.length; i += 2) if (!fits(pairs[i]!) && fits(pairs[i + 1]!)) used.set(pairs[i]!, pairs[i + 1]!);
  if (fits("⣿")) return used;
  for (let bits = 0; bits < 256; bits++) {
    const [ul, ur, ll, lr] = [bits & 0x03, bits & 0x18, bits & 0x44, bits & 0xa0].map((b) => (b ? 1 : 0)) as [number, number, number, number];
    const n = ul + ur + ll + lr;
    const block = n === 0 ? " " : n > 2 ? "█" : n === 1 ? (ul || ur ? "▀" : "▄") : ul && ur ? "▀" : ll && lr ? "▄" : ul && ll ? "▌" : ur && lr ? "▐" : "▒";
    if (fits(block)) used.set(String.fromCharCode(0x2800 + bits), block);
  }
  return used;
}

/** A measurer that counts its calls. */
function counted(measure: (t: string) => number): { measure: (t: string) => number; calls: string[] } {
  const calls: string[] = [];
  return { calls, measure: (t) => (calls.push(t), measure(t)) };
}

const FONTS: Record<string, (t: string) => number> = {
  consolas,
  // Every glyph fits.
  menlo: (t) => [...t].length * 7,
  // macOS draws braille 1.14 cells wide (Apple Braille next to Menlo): left as is.
  macBraille: (t) => [...t].reduce((w, ch) => w + (ch >= "\u2800" && ch <= "\u28ff" ? 8 : 7), 0),
  // ✓ misfits, and so does its stand-in.
  noCheck: (t) => (t === "✓" || t === "√" ? 12 : [...t].length * 7),
  // Braille misfits, and only some blocks fit.
  halfBlocks: (t) => [...t].reduce((w, ch) => w + ((ch >= "\u2800" && ch <= "\u28ff") || ch === "▌" || ch === "▐" ? 12.6 : 7), 0),
  broken: () => Number.NaN,
};

describe("glyph stand-ins", () => {
  test("only glyphs the font can't fit get stand-ins", () => {
    const s = createStandInResolver(() => consolas);
    expect(s.apply("▁▂▃▄▅▆▇█")).toBe("__▄▄▄███");
    expect(s.apply("████▋  ▏")).toBe("████▌   ");
    expect(s.apply("▶ ok ✓ no ✗ ▸◀")).toBe("► ok √ no × ►◄");
    // <Spinner variant="pulse">
    expect(s.apply("▽▼△▲")).toBe("▼▼▲▲");
    expect(s.apply("▖▗▘▝▙▚▞")).toBe("▄▄▀▀█▒▒");
    // Braille by quadrant: ⠋ (dots 1 2 4) fills the top, ⡇ the left column, ⣀ the bottom, ⣿ everything.
    expect(s.apply("⠋⡇⣀⣿⠀")).toBe("▀▌▄█ ");
    expect(s.apply("plain ascii")).toBe("plain ascii");
  });

  test("fonts that fit every glyph, or within a fifth of a cell, need none", () => {
    for (const font of [FONTS.menlo, FONTS.macBraille, FONTS.broken]) expect(createStandInResolver(() => font!).apply(ALL)).toBe(ALL);
    expect(createStandInResolver(() => null).apply(ALL)).toBe(ALL);
  });

  test("a stand-in that doesn't fit either isn't used", () => {
    expect(createStandInResolver(() => FONTS.noCheck!).apply("✓ ✔")).toBe("✓ ✔");
  });

  test("matches the eager measurement glyph for glyph in every font", () => {
    for (const [name, font] of Object.entries(FONTS)) {
      const eager = eagerStandIns(font);
      const expected = [...ALL + NEIGHBOURS].map((g) => eager.get(g) ?? g).join("");
      expect([name, createStandInResolver(() => font).apply(ALL + NEIGHBOURS)]).toEqual([name, expected]);
    }
  });

  test("measures nothing until a candidate appears, then each glyph once", () => {
    let loads = 0;
    const m = counted(consolas);
    const s = createStandInResolver(() => (loads++, m.measure));
    expect(s.apply("ascii █▀▄▌▐░▒▓ ▼▲►◄ ─│╭╮╰╯ →←↑↓")).toBe("ascii █▀▄▌▐░▒▓ ▼▲►◄ ─│╭╮╰╯ →←↑↓");
    expect([loads, m.calls.length]).toEqual([0, 0]);
    expect(s.apply("✓")).toBe("√");
    // The cell, the glyph and its stand-in.
    expect(m.calls).toEqual(["M".repeat(32), "✓", "√"]);
    s.apply("✓✓ ✓");
    expect(m.calls).toHaveLength(3);
    // One glyph speaks for braille, then each block a pattern needs.
    s.apply("⠋⠙⠹⠋");
    expect(m.calls.slice(3)).toEqual(["⣿", "▀", "█"]);
    expect(loads).toBe(1);
  });

  test("where ✓ fits, its stand-in is never measured", () => {
    const m = counted(FONTS.menlo!);
    createStandInResolver(() => m.measure).apply("✓ ⣿⠋");
    expect(m.calls).toEqual(["M".repeat(32), "✓", "⣿"]);
  });
});

describe("CssConsoleDriver stand-ins", () => {
  test("draws stand-ins in the console frame only", () => {
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

  test("frames without candidates measure nothing", () => {
    const b = new CellBuffer(40, 4);
    b.drawText(0, 0, "╭──────╮ ▼ Text.js", 0xfafafaff, 0);
    b.drawText(0, 1, "│ █▀▀ █│ ░▒▓ ▌▐ ►◄▲", 0x22c55eff, 0x09090bff);
    b.drawText(0, 2, "╰──────╯ ↑ ↓ count", 0x71717aff, 0);
    b.drawText(0, 3, "漢字 café 🙂", 0xfafafaff, 0);
    const m = counted(consolas);
    const driver = new CssConsoleDriver({ console: new FakeConsole(), measureText: m.measure });
    driver.render(b);
    driver.render(b, { force: true });
    expect(m.calls).toEqual([]);
  });

  test("a candidate in a grapheme cell is still replaced", () => {
    const b = new CellBuffer(6, 1);
    b.drawText(0, 0, "✓\ufe0e ok", 0xfafafaff, 0);
    const con = new FakeConsole();
    new CssConsoleDriver({ console: con, measureText: consolas }).render(b);
    expect(con.last.format.replaceAll("%c", "")).toStartWith("√\ufe0e ok");
  });

  test("every row matches the raw frame with the eager stand-ins applied", () => {
    const b = new CellBuffer(64, 8);
    const rows = ["▁▂▃▄▅▆▇█▇▆▅▄▃▂▁ ok", "██████▋  ▏ 42%", "▖▗▘▙▚▛▜▝▞▟ ░▒▓", "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ ⣿⣀⡇⢸", "▶ run ✓ ok ✗ no ▸ ◀ ✔ ✘ ◆ ◇", "▾ ▴ ▽ △ ✕ ✖ ▔▕", "plain ascii 100% w: W", "╭─ ▼ ─╮ │█│ ↑↓"];
    rows.forEach((r, y) => b.drawText(0, y, r, y % 2 ? 0x22c55eff : 0xfafafaff, y % 3 ? 0x09090bff : 0));
    const eager = eagerStandIns(consolas);
    const con = new FakeConsole();
    new CssConsoleDriver({ console: con, measureText: consolas }).render(b);
    const raw = new FakeConsole();
    new CssConsoleDriver({ console: raw, measureText: false }).render(b);
    expect(con.last.format).toBe([...raw.last.format].map((g) => eager.get(g) ?? g).join(""));
    expect(con.last.args).toEqual(raw.last.args);
  });

  /** Runs `fn` with `OffscreenCanvas` measuring Consolas (or with no canvas and no `document`), counting canvases and calls. */
  function withCanvas(canvas: boolean, fn: (log: { canvases: number; calls: string[] }) => void): void {
    const g = globalThis as { OffscreenCanvas?: unknown; document?: unknown };
    const saved = { OffscreenCanvas: g.OffscreenCanvas, document: g.document };
    const log = { canvases: 0, calls: [] as string[] };
    try {
      delete g.document;
      g.OffscreenCanvas = canvas
        ? class {
            getContext() {
              log.canvases++;
              let font = "";
              return {
                get font() {
                  return font;
                },
                set font(v: string) {
                  font = v;
                },
                measureText: (t: string) => (log.calls.push(`${font}|${t}`), { width: consolas(t) * (parseFloat(font) / 12) }),
              };
            }
          }
        : undefined;
      fn(log);
    } finally {
      g.OffscreenCanvas = saved.OffscreenCanvas;
      if (saved.document !== undefined) g.document = saved.document;
    }
  }

  const sparkline = new CellBuffer(8, 1);
  sparkline.drawText(0, 0, "▁▃▅▇ ✓", 0x22c55eff, 0);
  const frame = (typography: { fontFamily: string; fontSize: number }, buf = sparkline) => {
    const con = new FakeConsole();
    new CssConsoleDriver({ console: con, typography }).render(buf);
    return con.last.format.replaceAll("%c", "");
  };

  test("the canvas measurer's verdicts are shared per font size and family", () => {
    withCanvas(true, (log) => {
      const { calls } = log;
      const plain = new CellBuffer(8, 1);
      plain.drawText(0, 0, "█▀▄ ok", 0x22c55eff, 0);
      const font = { fontFamily: "StandInTest, monospace", fontSize: 12 };

      expect(frame(font, plain)).toStartWith("█▀▄ ok");
      expect([log.canvases, calls.length]).toEqual([0, 0]);

      expect(frame(font)).toStartWith("_▄▄█ √");
      const first = calls.length;
      expect(first).toBeGreaterThan(0);
      expect(calls.every((c) => c.startsWith("12px StandInTest, monospace|"))).toBe(true);
      expect(frame(font)).toStartWith("_▄▄█ √");
      expect([log.canvases, calls.length]).toEqual([1, first]);

      expect(frame({ ...font, fontSize: 14 })).toStartWith("_▄▄█ √");
      expect(calls.slice(first).every((c) => c.startsWith("14px StandInTest, monospace|"))).toBe(true);
      const second = calls.length;
      expect(second).toBeGreaterThan(first);
      expect(frame({ ...font, fontFamily: "OtherStandInTest" })).toStartWith("_▄▄█ √");
      expect(calls.slice(second).every((c) => c.startsWith("12px OtherStandInTest|"))).toBe(true);
      expect(log.canvases).toBe(3);
    });
  });

  test("without a canvas nothing is cached, so a canvas installed later still measures", () => {
    const font = { fontFamily: "NoCanvasTest", fontSize: 12 };
    withCanvas(false, () => expect(frame(font)).toStartWith("▁▃▅▇ ✓"));
    withCanvas(true, (log) => {
      expect(frame(font)).toStartWith("_▄▄█ √");
      expect(log.calls.length).toBeGreaterThan(0);
    });
  });

  test("at most 16 fonts are cached, oldest dropped first", () => {
    withCanvas(true, (log) => {
      const font = (size: number) => ({ fontFamily: "CapTest", fontSize: size });
      for (let size = 101; size <= 117; size++) frame(font(size));
      const measured = log.calls.length;
      for (let size = 102; size <= 117; size++) frame(font(size));
      expect(log.calls.length).toBe(measured);
      frame(font(101));
      expect(log.calls.length).toBeGreaterThan(measured);
    });
  });
});
