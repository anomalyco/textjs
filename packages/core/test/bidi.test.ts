import { beforeAll, describe, expect, test } from "bun:test";
import {
  ATTR_BOLD,
  CellBuffer,
  CssConsoleDriver,
  hasRtl,
  initYoga,
  paintScene,
  paragraphDirection,
  parseColor,
  renderToAnsi,
  reorderLine,
  segmentGraphemes,
  shapeArabicCodePoints,
  graphemesNeedBidi,
  type ConsoleTarget,
  type SceneNode,
  type SceneNodeProps,
} from "../src/index";
import { box, text } from "./fixtures";

beforeAll(async () => {
  await initYoga();
});

function render(root: SceneNode, w: number, h: number): CellBuffer {
  root.calculateLayout(w, h, true);
  const buf = new CellBuffer(w, h);
  paintScene(root, buf);
  return buf;
}

function rows(props: SceneNodeProps, content: Array<string | SceneNode>, w: number, h = 1): string[] {
  const t = text(props, ...content);
  const buf = render(box({ width: w, height: h, flexDirection: "column" }, t), w, h);
  return Array.from({ length: h }, (_, y) => buf.rowText(y));
}

const cps = (s: string): number[] => Array.from(s, (c) => c.codePointAt(0) as number);
const str = (c: number[]): string => String.fromCodePoint(...c);

describe("reorderLine", () => {
  test("Hebrew and Arabic reverse; numbers and embedded Latin keep their order", () => {
    expect(reorderLine("שלום עולם")).toBe("םלוע םולש");
    expect(reorderLine("abc שלום def")).toBe("abc םולש def");
    // W7: "123" follows the strong L of "abc", so the pair forms one LTR run.
    expect(reorderLine("שלום abc 123")).toBe("abc 123 םולש");
    expect(reorderLine("שלום 123 abc")).toBe("abc 123 םולש");
    expect(reorderLine("שלום 1-2")).toBe("1-2 םולש");
    expect(reorderLine("مرحبا ١٢٣")).toBe("١٢٣ ابحرم");
    expect(reorderLine("הספר עולה 25.50 ₪")).toBe("₪ 25.50 הלוע רפסה");
  });

  test("paired brackets resolve together and mirror at odd levels (N0, L4)", () => {
    expect(reorderLine("שלום (abc)")).toBe("(abc) םולש");
    expect(reorderLine("abc (שלום) def")).toBe("abc (םולש) def");
    expect(reorderLine("א [ב] ג")).toBe("ג [ב] א");
    expect(reorderLine("a < b", "rtl")).toBe("a < b");
    expect(reorderLine("א < ב")).toBe("ב > א");
  });

  test("explicit direction and P2/P3 detection", () => {
    expect(reorderLine("hello!", "rtl")).toBe("!hello");
    expect(reorderLine("שלום!", "ltr")).toBe("םולש!");
    expect(reorderLine("שלום!", "auto")).toBe("!םולש");
    expect(paragraphDirection("123 שלום")).toBe("rtl");
    expect(paragraphDirection("\u2067שלום\u2069 abc")).toBe("ltr");
    expect(paragraphDirection("1 + 2")).toBe("ltr");
  });

  test("pure LTR text is returned untouched", () => {
    const s = "plain ascii (with) [brackets] 123";
    expect(reorderLine(s)).toBe(s);
    expect(graphemesNeedBidi(segmentGraphemes("ünïcödé ▼ 漢字 🚀 — box ┌─┐"))).toBe(false);
    expect(graphemesNeedBidi(segmentGraphemes("x \u202Eabc"))).toBe(true);
    expect(graphemesNeedBidi(segmentGraphemes("plain"), "rtl")).toBe(true);
  });
});

describe("Arabic shaping", () => {
  test("letters take contextual presentation forms", () => {
    // م ر ح ب ا: initial meem, final reh, initial hah, medial beh, final alef.
    expect(shapeArabicCodePoints(cps("مرحبا"))).toEqual([0xfee3, 0xfeae, 0xfea3, 0xfe92, 0xfe8e]);
    // Isolated letters and non-joining neighbours.
    expect(shapeArabicCodePoints(cps("ب ا"))).toEqual([0xfe8f, 0x20, 0xfe8d]);
    // Harakat are transparent: beh-fatha-teh still joins.
    expect(shapeArabicCodePoints(cps("بَت"))).toEqual([0xfe91, 0x064e, 0xfe96]);
    // Persian letters (presentation forms A).
    expect(str(shapeArabicCodePoints(cps("پ")))).toBe("\ufb56");
  });

  test("ZWJ/ZWNJ join by position; emoji-internal ZWJ does not join the next letter", () => {
    const shapedRow = (s: string, w: number): string => rows({ textAlign: "left" }, [s], w)[0] as string;
    // Meem after a ZWJ emoji sequence: its neighbour is 💻 (non-joining), so it is initial, not medial.
    const emoji = shapedRow("👨‍💻مر", 4);
    expect(emoji).toContain("\ufee3");
    expect(emoji).not.toContain("\ufee4");
    // ZWJ then ZWNJ after beh: beh joins forward (initial), teh's neighbour is the ZWNJ (isolated).
    expect(Array.from(shapedRow("ب\u200d\u200cت", 2), (c) => c.codePointAt(0))).toEqual([0xfe95, 0xfe91, 0x200d, 0x200c]);
    // A trailing ZWJ still requests joining.
    expect(shapedRow("ب\u200d ", 2)).toBe(" \ufe91\u200d");
    // Letter + ZWJ is one cell; emoji ZWJ sequences are two.
    expect(segmentGraphemes("ب\u200d")[0]?.width).toBe(1);
    expect(segmentGraphemes("👨‍💻")[0]?.width).toBe(2);
  });

  test("shaping stays within level runs and reverses in LTR override runs (UAX #9 §3.5)", () => {
    // LRM, LRO ج ع PDF, RLO ل م PDF: levels 2 2 1 1, so the override run ج ع is displayed right of م ل.
    // Each pair joins only within its own run: ج final + ع initial (reversed, LTR run), ل initial + م final.
    const input = "\u200E\u202D\u062C\u0639\u202C\u202E\u0644\u0645\u202C";
    const visual = [0xfee2, 0xfedf, 0xfe9e, 0xfecb];
    expect(cps(reorderLine(input, "ltr", { shape: true }))).toEqual([0x200e, ...visual]);
    // The same through the scene painter.
    expect(rows({ dir: "ltr" }, [input], 4)).toEqual([str(visual)]);
  });

  test("shaped glyphs are emitted in visual order, one cell each", () => {
    expect(reorderLine("مرحبا", "auto", { shape: true })).toBe("\ufe8e\ufe92\ufea3\ufeae\ufee3");
    const [row] = rows({}, ["مرحبا"], 5);
    expect(row).toBe("\ufe8e\ufe92\ufea3\ufeae\ufee3");
  });
});

describe("scene rendering", () => {
  test("RTL paragraphs reorder and right-align by default", () => {
    expect(rows({}, ["שלום עולם"], 12)).toEqual(["   םלוע םולש"]);
    expect(rows({}, ["abc שלום def"], 14)).toEqual(["abc םולש def  "]);
    expect(rows({}, ["שלום abc 123"], 12)).toEqual(["abc 123 םולש"]);
  });

  test("align and dir props", () => {
    expect(rows({ textAlign: "left" }, ["שלום"], 6)).toEqual(["םולש  "]);
    expect(rows({ textAlign: "end" }, ["שלום"], 6)).toEqual(["םולש  "]);
    expect(rows({ textAlign: "end" }, ["abc"], 6)).toEqual(["   abc"]);
    expect(rows({ dir: "ltr" }, ["שלום abc"], 10)).toEqual(["םולש abc  "]);
    expect(rows({ dir: "rtl" }, ["hello!"], 8)).toEqual(["  !hello"]);
  });

  test("each paragraph picks its own direction", () => {
    expect(rows({}, ["hello\nשלום\n(1)"], 6, 3)).toEqual(["hello ", "  םולש", "(1)   "]);
  });

  test("wraps in logical order, then reorders each line", () => {
    expect(rows({}, ["אחת שתיים שלוש"], 9, 2)).toEqual(["םייתש תחא", "     שולש"]);
    expect(rows({}, ["one two שלוש ארבע five"], 10, 3)).toEqual(["one two   ", "עברא שולש ", "five      "]);
  });

  test("truncation keeps the ellipsis at the logical end", () => {
    expect(rows({ wrap: "truncate-end" }, ["אבגדהוזח"], 5)).toEqual(["…דגבא"]);
    expect(rows({ wrap: "truncate-start" }, ["אבגדהוזח"], 5)).toEqual(["חזוה…"]);
  });

  test("inline styles follow their characters", () => {
    const t = text({}, "שלום ", text({ bold: true }, "עולם"));
    const buf = render(box({ width: 9, height: 1 }, t), 9, 1);
    expect(buf.rowText(0)).toBe("םלוע םולש");
    for (let x = 0; x < 4; x++) expect((buf.attrs[x] as number) & ATTR_BOLD).toBe(ATTR_BOLD);
    for (let x = 4; x < 9; x++) expect((buf.attrs[x] as number) & ATTR_BOLD).toBe(0);
  });

  test("nested dir isolates a span (like HTML <bdi>)", () => {
    expect(rows({}, ["user ", "שלום!", " 3"], 13)).toEqual(["user 3 !םולש "]);
    expect(rows({}, ["user ", text({ dir: "auto" }, "שלום!"), " 3"], 13)).toEqual(["user !םולש 3 "]);
    // A leaf span that carries its own text is isolated too.
    const leaf = text({ dir: "auto" });
    leaf.text = "שלום!";
    expect(rows({}, ["user ", leaf, " 3"], 13)).toEqual(["user !םולש 3 "]);
  });

  test("updating dir repaints", () => {
    const t = text({}, "שלום!");
    const root = box({ width: 6, height: 1, flexDirection: "column" }, t);
    const buf = new CellBuffer(6, 1);
    root.calculateLayout(6, 1, true);
    paintScene(root, buf);
    expect(buf.rowText(0)).toBe(" !םולש");
    t.updateProps({ dir: "ltr" });
    root.calculateLayout(6, 1);
    paintScene(root, buf);
    expect(buf.rowText(0)).toBe("םולש! ");
  });

  test("an empty isolated span paints nothing instead of crashing", () => {
    expect(rows({}, [text({ dir: "auto" }, "")], 4)).toEqual(["    "]);
    expect(rows({}, [text({ dir: "rtl" }, text({ dir: "ltr" }, ""))], 4)).toEqual(["    "]);
    expect(rows({ dir: "rtl" }, [text({ dir: "auto" }, "")], 4)).toEqual(["    "]);
  });

  test("isolate controls never split style runs or pick the ellipsis style", () => {
    const red = parseColor("#ff0000");
    const blue = parseColor("#0000ff");
    // ג ד FSI א ב PDI ה ו ז ח truncated to 5 cells: the ellipsis follows ב (blue), not the PDI.
    const t = text({ wrap: "truncate-end" }, text({ fg: "#ff0000" }, "גד"), text({ fg: "#0000ff", dir: "auto" }, "אב"), "הוזח");
    const buf = render(box({ width: 5, height: 1 }, t), 5, 1);
    expect(buf.rowText(0)).toBe("…באדג");
    expect(buf.fg[0]).toBe(blue);
    expect([buf.fg[1], buf.fg[2]]).toEqual([blue, blue]);
    expect([buf.fg[3], buf.fg[4]]).toEqual([red, red]);
    // Bold isolated run between two plain runs keeps its own style on both sides of the isolate controls.
    const u = text({}, "שלום ", text({ bold: true, dir: "rtl" }, "עולם"), " טוב");
    const b2 = render(box({ width: 13, height: 1 }, u), 13, 1);
    expect(b2.rowText(0)).toBe("בוט םלוע םולש");
    for (let x = 0; x < 13; x++) expect(((b2.attrs[x] as number) & ATTR_BOLD) !== 0).toBe(x >= 4 && x < 8);
  });

  test("box titles are drawn in visual order, shaped, and truncated logically", () => {
    const top = (props: SceneNodeProps, w: number): string => render(box({ width: w, height: 3, border: true, ...props }), w, 3).rowText(0);
    expect(top({ title: "שלום abc" }, 14)).toBe("┌─ abc םולש ─┐");
    expect(top({ title: "مرحبا" }, 11)).toBe("┌─ \ufe8e\ufe92\ufea3\ufeae\ufee3 ─┐");
    // Truncation keeps the logical start (the rightmost glyphs in an RTL title).
    expect(top({ title: "אבגדהוז" }, 9)).toBe("┌─ …דגבא ");
    const bottom = render(box({ width: 10, height: 3, border: true, bottomTitle: "(שלום)" }), 10, 3).rowText(2);
    expect(bottom).toBe("└─ (םולש) ");
    // Pure-LTR titles take the unchanged drawText path.
    expect(top({ title: "Hello (1)" }, 15)).toBe("┌─ Hello (1) ─┐");
    const buf = new CellBuffer(8, 1);
    expect(buf.drawLogicalText(0, 0, "abc שלום", 0, 0, 0, 6)).toBe(6);
    expect(buf.rowText(0)).toBe("abc לש  ");
  });

  test("pure-LTR text models skip the bidi path", () => {
    const t = text({}, "Hello ▼ world ✓ 漢字");
    render(box({ width: 30, height: 1 }, t), 30, 1);
    expect(t.getTextModel().needsBidi).toBe(false);
    // LTR and auto isolates around LTR text cannot reorder anything; an RTL isolate can.
    expect(graphemesNeedBidi(segmentGraphemes("a \u2068b\u2069 \u2066c\u2069 \u202Ad\u202C"))).toBe(false);
    expect(graphemesNeedBidi(segmentGraphemes("a \u2067b\u2069"))).toBe(true);
    const iso = text({}, "12", text({ dir: "auto" }, "\u00a0"), "34", text({ dir: "ltr" }, "x"));
    expect(rows({}, [iso], 6)).toEqual(["12\u00a034x"]);
    expect(iso.getTextModel().needsBidi).toBe(false);
    const rtlIso = text({}, text({ dir: "rtl" }, "ab!"));
    expect(rows({}, [rtlIso], 4)).toEqual(["!ab "]);
    expect(rtlIso.getTextModel().needsBidi).toBe(true);
  });
});

describe("drivers pin visual order", () => {
  function frameOf(buf: CellBuffer): string {
    const logs: unknown[][] = [];
    const target: ConsoleTarget = { clear() {}, log: (...a: unknown[]) => void logs.push(a) };
    new CssConsoleDriver({ console: target, clear: "never" }).render(buf, { force: true });
    return String(logs[0]?.[0]);
  }

  test("CssConsoleDriver wraps RTL spans in LRO…PDF and leaves LTR frames byte-identical", () => {
    const ltr = new CellBuffer(12, 1);
    ltr.drawText(0, 0, "plain 100%", 0xffffffff, 0);
    expect(frameOf(ltr)).not.toContain("\u202D");

    const rtl = render(box({ width: 12, height: 1 }, text({}, "abc שלום")), 12, 1);
    const f = frameOf(rtl);
    expect(f).toContain("\u202Dabc םולש");
    expect(f).toContain("\u202C");
    // Every override is closed within its row.
    expect(f.split("\u202D").length).toBe(f.split("\u202C").length);
  });

  test("RTL spans are padded to the Latin cell grid and never merge across rows", () => {
    // Courier New-like fallback (0.6em) vs Menlo (0.602em) at 12px, as measured in Chromium.
    const measure = (t: string): number => {
      let w = 0;
      for (const ch of t) w += ch === "\u202D" || ch === "\u202C" ? 0 : hasRtl(ch) ? 7.201171875 : 7.224609375;
      return w;
    };
    const buf = render(box({ width: 8, height: 2, flexDirection: "column" }, text({}, "abc שלום"), text({}, "abcdefgh")), 8, 2);
    const logs: unknown[][] = [];
    const target: ConsoleTarget = { clear() {}, log: (...a: unknown[]) => void logs.push(a) };
    new CssConsoleDriver({ console: target, clear: "never", measureText: measure }).render(buf, { force: true });
    const [format, ...css] = logs[0] as string[];
    // 8 cells: ceil(8 × 7.2246 × 64) = 3699 LayoutUnits; natural ceil(57.703125 × 64) = 3693 → pad 6/64 px.
    const padded = css.filter((c) => c.includes("padding-right:0.09375px;"));
    expect(padded.length).toBe(1);
    // Row 1 has the same style but must open its own span instead of inheriting the padding.
    expect(format?.split("%c").length).toBe(css.length + 1);
    expect(format).toContain("\u202Dabc םולש\u202C");
    expect(css.length).toBeGreaterThanOrEqual(2);
    // Without a measurer the frame is pinned but unpadded.
    const plain: unknown[][] = [];
    new CssConsoleDriver({ console: { clear() {}, log: (...a: unknown[]) => void plain.push(a) }, clear: "never", measureText: false }).render(buf, { force: true });
    expect((plain[0] as string[]).some((c) => c.includes("padding-right"))).toBe(false);
  });

  test("RTL span fitting counts grid cells, not code points (ZWJ, VS16 and keycap emoji)", () => {
    const LATIN = 7.224609375;
    const HEBREW = 7.201171875;
    // An ideal font: emoji clusters advance exactly two Latin cells, Hebrew letters a fallback 0.6em.
    const measure = (t: string): number => {
      let w = 0;
      for (const g of segmentGraphemes(t.replace(/[\u202d\u202c]/g, ""))) w += hasRtl(g.grapheme) ? HEBREW : g.width * LATIN;
      return w;
    };
    const s = "שלום 👨‍👩‍👧‍👦 ❤️ 1️⃣";
    const buf = render(box({ width: 13, height: 1 }, text({}, s)), 13, 1);
    const driver = new CssConsoleDriver({ console: { clear() {}, log() {} }, clear: "never", measureText: measure });
    const [span, ...rest] = driver.compileRow(buf, 0);
    expect(rest).toEqual([]);
    expect(span?.cells).toBe(13);
    // Only the four Hebrew letters drift: ceil(13 × 7.2246 × 64) − ceil((4 × 7.2012 + 9 × 7.2246) × 64) = 6 LayoutUnits.
    expect(span?.css).toContain("padding-right:0.09375px;");
    // Wide CJK and blanks folded into the span count as cells too.
    const mixed = render(box({ width: 10, height: 1 }, text({ textAlign: "left" }, "漢字 שלום")), 10, 1);
    expect(driver.compileRow(mixed, 0).reduce((n, sp) => n + sp.cells, 0)).toBe(10);
  });

  test("negative fitting margins are capped at half a cell", () => {
    // Windows: Consolas Latin cells (6.6 px) next to a Courier New fallback for Hebrew (7.2 px).
    const measure = (t: string): number => {
      let w = 0;
      for (const ch of t) w += ch === "\u202D" || ch === "\u202C" ? 0 : hasRtl(ch) ? 7.2 : 6.6;
      return w;
    };
    const s = "אבגדהוזחטי".repeat(4);
    const buf = render(box({ width: 40, height: 1 }, text({}, s)), 40, 1);
    const [span] = new CssConsoleDriver({ console: { clear() {}, log() {} }, clear: "never", measureText: measure }).compileRow(buf, 0);
    // Uncapped this would be −24 px; half a 6.6 px cell is floor(211.2) / 64 = 3.296875 px.
    expect(span?.css).toContain("margin-right:-3.296875px;");
    // Drift within the cap is still corrected exactly: ceil(6.6 × 64) − ceil(7.2 × 64) = 423 − 461 = −38 LayoutUnits.
    const small = render(box({ width: 1, height: 1 }, text({}, "א")), 1, 1);
    const [one] = new CssConsoleDriver({ console: { clear() {}, log() {} }, clear: "never", measureText: measure }).compileRow(small, 0);
    expect(one?.css).toContain("margin-right:-0.59375px;");
  });

  test("AnsiDriver switches to explicit bidi mode and pins RTL rows", () => {
    const rtl = render(box({ width: 6, height: 2, flexDirection: "column" }, text({}, "שלום\nabc")), 6, 2);
    const out = renderToAnsi(rtl);
    expect(out.startsWith("\u001b[8l")).toBe(true);
    const [r0, r1] = out.slice(4).split("\n");
    expect(r0?.startsWith("\u202D")).toBe(true);
    expect(r1?.includes("\u202D")).toBe(false);
    expect(renderToAnsi(rtl, { bidi: "none" })).not.toContain("\u202D");
    const ltr = new CellBuffer(4, 1);
    ltr.drawText(0, 0, "abcd", 0, 0);
    expect(renderToAnsi(ltr)).not.toContain("\u001b[8l");
    // Long-lived writers switch the mode once themselves: rows are still pinned, but no prefix.
    const noMode = renderToAnsi(rtl, { bidiMode: false });
    expect(noMode).not.toContain("\u001b[8l");
    expect(noMode.startsWith("\u202D")).toBe(true);
    // Pooled clusters are checked in full, whatever their first code point.
    const pooled = new CellBuffer(2, 1);
    pooled.setCell(0, 0, "\u0301\u05d0", 0, 0);
    expect(pooled.chars[0]! >= 0x80000000).toBe(true);
    expect(renderToAnsi(pooled).includes("\u202D")).toBe(true);
  });

  test("hasRtl", () => {
    expect(hasRtl("abc")).toBe(false);
    expect(hasRtl("─│▼")).toBe(false);
    expect(hasRtl("a ש")).toBe(true);
    expect(hasRtl("٣")).toBe(true);
    expect(hasRtl("𐤀")).toBe(true);
  });
});
