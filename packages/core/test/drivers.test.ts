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
    expect(con.clears).toBe(1);
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
    expect(a1).toContain("font-size:13px;line-height:15px;margin:-1px 0;font-variant-ligatures:none;");
    expect(a1).toContain("font-family:ui-monospace");
    expect(a1).toContain("color:#22c55e;");
    expect(a1).toContain("background-color:#18181b;");
    expect(a1).toContain("font-weight:700;");
    expect(a1).toContain("text-decoration:underline;");
    expect(a2).toContain("color:#18181b;");
    expect(a2).toContain("background-color:#22c55e;");
    expect(a3).toContain("color:rgba(128,128,128,0.6);");
    const before = d.internedStyles;
    b.setCell(5, 0, "z", 0, 0, ATTR_DIM);
    d.render(b);
    expect(d.internedStyles).toBe(before);
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
