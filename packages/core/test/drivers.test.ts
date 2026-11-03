import { describe, expect, test } from "bun:test";
import {
  ATTR_ALLOW_LINK,
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_UNDERLINE,
  AnsiDriver,
  CellBuffer,
  CssConsoleDriver,
  escapeConsoleText,
  extractStyledFrame,
  renderToAnsi,
} from "../src/index";
import { FakeConsole } from "./fixtures";

const GREEN = 0x22c55eff;
const BG = 0x18181bff;

/** Simulate Chromium's format-string parsing: returns rendered text and consumed `%c` args. */
function chromiumFormat(format: string, args: string[]): { text: string; styles: number } {
  let text = "";
  let styles = 0;
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === "%" && i + 1 < format.length) {
      const next = format[i + 1];
      if (next === "%") {
        text += "%";
        i++;
        continue;
      }
      if (next === "c" || next === "s" || next === "d" || next === "i" || next === "o" || next === "O" || next === "f") {
        if (next === "c") styles++;
        else text += String(args[styles] ?? "");
        i++;
        continue;
      }
    }
    text += ch;
  }
  return { text, styles };
}

describe("escapeConsoleText", () => {
  test("escapes every %", () => {
    expect(escapeConsoleText("100% %s %c %d")).toBe("100%% %%s %%c %%d");
  });

  test("defuses Chromium's linkifier", () => {
    expect(escapeConsoleText("Visit https://textjs.org today")).toBe("Visit https:\u2060//textjs.org today");
    expect(escapeConsoleText("see www.textjs.org")).toBe("see www\u2060.textjs.org");
    expect(escapeConsoleText("https://textjs.org", true)).toBe("https://textjs.org");
  });

  test("defuses path:line, host:port and data: links", () => {
    expect(escapeConsoleText("at src/scene.ts:53")).toBe("at src/scene.ts:\u206053");
    expect(escapeConsoleText("http://localhost:3000")).toBe("http:\u2060//localhost:\u20603000");
    expect(escapeConsoleText("data:text/plain")).toBe("data\u2060:text/plain");
    expect(escapeConsoleText("time 12:30, ratio 3:1")).toBe("time 12:30, ratio 3:1");
    expect(escapeConsoleText("src/scene.ts:53", true)).toBe("src/scene.ts:53");
  });
});

describe("CssConsoleDriver", () => {
  test("one clear + one log per dirty frame", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(20, 4);
    b.drawText(0, 0, "hello", GREEN, 0);
    const r = d.render(b);
    expect(r.skipped).toBe(false);
    expect(con.clears).toBe(1);
    expect(con.logs.length).toBe(1);
    expect(r.dirtyRows).toBe(4);
  });

  test("append mode clears only on the first frame and after invalidate()", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(20, 2);
    for (let i = 0; i < 5; i++) {
      b.drawText(0, 0, `frame ${i}`, GREEN, 0);
      d.render(b);
    }
    expect(con.clears).toBe(1);
    expect(con.logs.length).toBe(5);
    d.invalidate();
    d.render(b);
    expect(con.clears).toBe(2);
  });

  test("append mode starts over after maxFrames", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, maxFrames: 3 });
    const b = new CellBuffer(20, 1);
    for (let i = 0; i < 7; i++) {
      b.drawText(0, 0, `frame ${i}`, GREEN, 0);
      d.render(b);
    }
    expect(con.clears).toBe(3);
  });

  test("forced identical frames never repeat the exact same message", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(20, 1);
    b.drawText(0, 0, "same", GREEN, 0);
    d.render(b);
    d.render(b, { force: true });
    d.render(b, { force: true });
    const [f0, f1, f2] = con.logs.map((l) => l[0]);
    expect(f1).not.toBe(f0);
    expect(f2).not.toBe(f1);
  });

  test("curtain span leads the frame only when writing to a console", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, curtain: true });
    const b = new CellBuffer(4, 2);
    b.fillRect(0, 0, 4, 2, BG);
    d.render(b);
    expect(con.last.format.startsWith("%c\u200b%c\n%c")).toBe(true);
    expect(con.last.args[0]).toBe("margin-top:100vh;");
    expect(con.last.args[1]).toBe("");
    expect(con.last.args[2]).not.toContain("100vh");
    const plain = new FakeConsole();
    new CssConsoleDriver({ console: plain }).render(b);
    expect(plain.last.args.some((a) => a.includes("100vh"))).toBe(false);
  });

  test("unmerged row breaks reset %c to empty CSS so DevTools never creates phantom empty spans", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, curtain: true });
    const b = new CellBuffer(6, 3);
    b.drawText(0, 0, "row000", GREEN, BG);
    b.drawText(0, 1, "row111", 0xffffffff, 0x09090bff);
    b.drawText(0, 2, "row222", GREEN, BG);
    d.render(b);
    const { format, args } = con.last;
    const chunks = format.split("%c").slice(1);
    expect(chunks.length).toBe(args.length);
    for (let i = 0; i < chunks.length; i++) {
      const style = args[i] ?? "";
      const text = chunks[i] ?? "";
      if (style.length > 0) {
        // Every styled %c token must split into non-empty lines so DevTools never builds empty inline-blocks.
        for (const line of text.split("\n")) expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  test("frame mode clears before every frame", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, clear: "frame" });
    const b = new CellBuffer(20, 1);
    for (let i = 0; i < 3; i++) {
      b.drawText(0, 0, `frame ${i}`, GREEN, 0);
      d.render(b);
    }
    expect(con.clears).toBe(3);
  });

  test("unchanged frame makes zero console calls", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(20, 4);
    b.drawText(0, 0, "hello", GREEN, 0);
    d.render(b);
    con.clears = 0;
    con.logs = [];
    for (let i = 0; i < 50; i++) {
      b.clear();
      b.drawText(0, 0, "hello", GREEN, 0);
      const r = d.render(b);
      expect(r.skipped).toBe(true);
      expect(r.frame).toBeNull();
    }
    expect(con.clears).toBe(0);
    expect(con.logs.length).toBe(0);
    d.render(b, { force: true });
    expect(con.clears).toBe(0);
    expect(con.logs.length).toBe(1);
  });

  test("% escaping and URL defense survive Chromium formatting exactly", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(32, 2);
    b.drawText(0, 0, "100% %s %c %d", GREEN, BG);
    b.drawText(0, 1, "Visit https://textjs.org today", 0, 0, ATTR_BOLD);
    d.render(b);
    const { format, args } = con.last;
    const parsed = chromiumFormat(format, args);
    expect(parsed.styles).toBe(args.length);
    const lines = parsed.text.split("\n");
    expect(lines[0]).toBe("100% %s %c %d".padEnd(32));
    expect(lines[1]).toBe("Visit https:\u2060//textjs.org today".padEnd(33));
    expect(lines[1]?.replaceAll("\u2060", "")).toBe("Visit https://textjs.org today".padEnd(32));
    expect(format.includes("https://")).toBe(false);
  });

  test("ATTR_ALLOW_LINK keeps URLs clickable", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(24, 1);
    b.drawText(0, 0, "https://textjs.org", 0, 0, ATTR_ALLOW_LINK);
    d.render(b);
    expect(con.last.format).toContain("https://textjs.org");
  });

  test("re-encodes only dirty rows and reuses cached spans", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(10, 5);
    for (let y = 0; y < 5; y++) b.drawText(0, y, `row ${y}`, GREEN, 0);
    d.render(b);
    b.drawText(0, 2, "ROW!", 0xff0000ff, 0);
    const r = d.render(b);
    expect(r.dirtyRows).toBe(1);
    expect(chromiumFormat(con.last.format, con.last.args).text.split("\n")[2]).toBe("ROW!2     ");
  });

  test("merges identical styles across row boundaries", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(10, 6);
    b.fillRect(0, 0, 10, 6, BG);
    const r = d.render(b);
    expect(r.spanCount).toBe(1);
    expect(con.last.format.startsWith("%c")).toBe(true);
    expect(con.last.format.split("%c").length - 1).toBe(1);
    expect(con.last.format.split("\n").length).toBe(6);
  });

  test("style strings carry typography and decorations, interned", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, typography: { fontSize: 13, lineHeight: 15 } });
    const b = new CellBuffer(6, 1);
    b.drawText(0, 0, "ab", GREEN, BG, ATTR_BOLD | ATTR_UNDERLINE);
    b.drawText(2, 0, "cd", GREEN, BG, ATTR_INVERSE);
    b.drawText(4, 0, "ef", 0, 0, ATTR_DIM);
    d.render(b);
    const [a1, a2, a3] = con.last.args;
    expect(a1).toStartWith('font-family:"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace;');
    expect(a1).toContain("font-size:13px;line-height:17px;margin-top:-1px;margin-bottom:-1px;");
    expect(a1).not.toMatch(/(^|;)(font|margin|padding|text-decoration):/);
    expect(a1).not.toContain("font-variant-ligatures");
    expect(a1).toContain("color:#22c55e;");
    expect(a1).toContain("background-color:#18181b;");
    expect(a1).toContain("font-weight:700;");
    expect(a1).toContain("text-decoration-line:underline;");
    expect(a2).toContain("color:#18181b;");
    expect(a2).toContain("background-color:#22c55e;");
    expect(a3).toContain("color:#80808099;");
    const before = d.internedStyles;
    b.setCell(5, 0, "z", 0, 0, ATTR_DIM);
    d.render(b);
    expect(d.internedStyles).toBe(before);
  });

  test("blank cells fold into the open span when the background matches", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(12, 1);
    b.clear(BG);
    b.drawText(0, 0, "ab", GREEN, BG, ATTR_BOLD);
    b.drawText(4, 0, "cd", 0xffffffff, BG);
    b.drawText(8, 0, "  ", 0, 0x334155ff);
    d.render(b);
    expect(chromiumFormat(con.last.format, con.last.args).text).toBe("ab  cd      ");
    expect(con.last.args.length).toBe(4);
    const off = new FakeConsole();
    new CssConsoleDriver({ console: off, coalesceWhitespace: false }).render(b);
    expect(off.last.args.length).toBe(6);
  });

  test("underlined and inverse blanks keep their own span", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(6, 1);
    b.clear(BG);
    b.drawText(0, 0, "a", GREEN, BG);
    b.drawText(1, 0, " ", GREEN, BG, ATTR_UNDERLINE);
    b.drawText(3, 0, " ", GREEN, BG, ATTR_INVERSE);
    d.render(b);
    expect(con.last.args.length).toBe(5);
    expect(con.last.args[3]).toContain("background-color:#22c55e;");
  });

  test("Chromium spans extend their background 1px under an opaque right neighbour", () => {
    const SEAL = "padding-right:1px;margin-right:-1px;";
    const b = new CellBuffer(9, 1);
    b.drawText(0, 0, "ab", GREEN, BG, ATTR_BOLD);
    b.drawText(2, 0, "cd", 0xffffffff, BG);
    b.drawText(4, 0, "ef", 0xffffffff, 0x33415580);
    b.drawText(6, 0, "gh", 0xffffffff, 0);
    b.drawText(8, 0, "i", 0xffffffff, BG);
    const con = new FakeConsole();
    new CssConsoleDriver({ console: con }).render(b);
    const sealed = con.last.args.map((css) => css.endsWith(SEAL));
    // A translucent or missing neighbour would show the overlap; the row's last span seals so rows still merge.
    expect(sealed).toEqual([true, false, false, false, true]);
    expect(chromiumFormat(con.last.format, con.last.args).text).toBe("abcdefghi");

    const ff = new FakeConsole();
    new CssConsoleDriver({ console: ff, browser: "firefox" }).render(b);
    expect(ff.last.args.some((css) => css.includes(SEAL))).toBe(false);
  });

  test("a fitted right-to-left span folds the seal into its fit", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "שלום", 0xffffffff, BG);
    // Latin cells are 7px and Hebrew glyphs 6.9px: 4 cells pad by 25/64px (27.6px rounds up to 1767 LayoutUnits of 1792).
    const measure = (t: string): number => (t.startsWith("M") ? 7 : 6.9) * [...t].filter((ch) => ch !== "\u202D" && ch !== "\u202C").length;
    const [span] = new CssConsoleDriver({ console: new FakeConsole(), measureText: measure }).compileRow(b, 0);
    expect(span?.css).toEndWith("padding-right:1px;margin-right:-1px;padding-right:1.390625px;margin-right:-1px;");
  });

  test("sealed rows still merge across row boundaries", () => {
    const con = new FakeConsole();
    const b = new CellBuffer(6, 3);
    b.clear(BG);
    for (let y = 0; y < 3; y++) {
      b.drawText(0, y, "ab", 0xffffffff, BG);
      b.drawText(3, y, "x", GREEN, BG, ATTR_BOLD);
      b.drawText(4, y, "yz", 0xffffffff, BG);
    }
    new CssConsoleDriver({ console: con }).render(b);
    // white | bold | white (row end + next row start) | bold | white | bold | white
    expect(con.last.args.length).toBe(7);
  });

  test("wide chars emit once, continuation cells are skipped", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(6, 1);
    b.drawText(0, 0, "你好▼", 0, 0);
    d.render(b);
    expect(chromiumFormat(con.last.format, con.last.args).text).toBe("你好▼ ");
  });

  test("resize forces a full re-encode", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con });
    const b = new CellBuffer(4, 2);
    d.render(b);
    b.resize(5, 3);
    const r = d.render(b);
    expect(r.skipped).toBe(false);
    expect(r.dirtyRows).toBe(3);
  });
});

describe("AnsiDriver", () => {
  test("renders truecolor SGR", () => {
    const b = new CellBuffer(4, 1);
    b.drawText(0, 0, "hi", GREEN, BG, ATTR_BOLD);
    const out = renderToAnsi(b);
    expect(out).toContain("\u001b[0;1;38;2;34;197;94;48;2;24;24;27mhi");
    expect(out.endsWith("\u001b[0m")).toBe(true);
  });

  test("writes only on change", () => {
    const chunks: string[] = [];
    const d = new AnsiDriver((c) => chunks.push(c));
    const b = new CellBuffer(2, 1);
    expect(d.render(b)).toBe(true);
    expect(d.render(b)).toBe(false);
    expect(chunks.length).toBe(1);
  });
});

describe("extractStyledFrame", () => {
  test("produces merged styled spans", () => {
    const b = new CellBuffer(6, 2);
    b.drawText(0, 0, "ab", GREEN, BG, ATTR_BOLD);
    b.drawText(2, 0, "你", 0, 0);
    const f = extractStyledFrame(b);
    expect(f.width).toBe(6);
    expect(f.height).toBe(2);
    const row = f.rows[0] ?? [];
    expect(row[0]).toMatchObject({ text: "ab", width: 2, fgCss: "#22c55e", bgCss: "#18181b", bold: true });
    expect(row[1]).toMatchObject({ text: "你  ", width: 4, fgCss: null, bold: false });
    expect(f.rows[1]?.length).toBe(1);
  });
});
