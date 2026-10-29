import { beforeAll, describe, expect, test } from "bun:test";
import {
  ATTR_BOLD,
  ATTR_ITALIC,
  CellBuffer,
  createNode,
  createRawText,
  getYoga,
  initYoga,
  isYogaReady,
  paintScene,
  unpackRGBA,
  type ComputedRect,
  type SceneNode,
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

describe("Yoga loader", () => {
  test("initYoga is a singleton", async () => {
    const a = await initYoga();
    const b = await initYoga();
    expect(a).toBe(b);
    expect(isYogaReady()).toBe(true);
    expect(getYoga()).toBe(a);
  });
});

describe("layout", () => {
  test("defaults to CSS row direction with computed geometry", () => {
    const a = box({ width: 4, height: 2 });
    const b = box({ flexGrow: 1, border: true, padding: 1 });
    const root = box({ width: 20, height: 6 }, a, b);
    root.calculateLayout(20, 6);
    expect(a.layout).toMatchObject({ x: 0, y: 0, width: 4, height: 2 });
    expect(b.layout).toMatchObject({ x: 4, y: 0, width: 16, height: 6, contentX: 6, contentY: 2, contentWidth: 12, contentHeight: 2 });
  });

  test("column layout, gap, margin, absolute positioning", () => {
    const a = box({ height: 1 });
    const b = box({ height: 2, marginTop: 1 });
    const abs = box({ position: "absolute", top: 2, left: 5, width: 3, height: 1 });
    const root = box({ flexDirection: "column", width: 10, height: 10, gap: 1 }, a, b, abs);
    root.calculateLayout(10, 10);
    expect(a.layout.y).toBe(0);
    expect(b.layout.y).toBe(3);
    expect(abs.layout).toMatchObject({ x: 5, y: 2, width: 3, height: 1 });
  });

  test("text measure wraps to available width", () => {
    const t = text({}, "the quick brown fox jumps");
    const root = box({ width: 10, height: 10, flexDirection: "column" }, t);
    root.calculateLayout(10, 10);
    expect(t.layout.height).toBe(3);
    expect(t.layout.width).toBe(10);
  });

  test("setText re-measures and only dirties when content changes", () => {
    const raw = createRawText("short");
    const t = createNode("text");
    t.appendChild(raw);
    const root = box({ width: 8, height: 10, flexDirection: "column" }, t);
    root.calculateLayout(8, 10);
    expect(t.layout.height).toBe(1);
    raw.setText("now it is much longer");
    expect(root.calculateLayout(8, 10)).toBe(true);
    expect(t.layout.height).toBe(3);
    raw.setText("now it is much longer");
    expect(root.calculateLayout(8, 10)).toBe(false);
  });

  test("updateProps leaves Yoga clean when only paint props change", () => {
    const child = box({ width: 5, height: 2, bg: "#111111" });
    const root = box({ width: 10, height: 4 }, child);
    root.calculateLayout(10, 4);
    child.updateProps({ width: 5, height: 2, bg: "#222222", bold: true, scrollY: 3 });
    expect(root.yoga?.isDirty()).toBe(false);
    expect(root.calculateLayout(10, 4)).toBe(false);
    child.updateProps({ width: 6, height: 2, bg: "#222222" });
    expect(root.yoga?.isDirty()).toBe(true);
    root.calculateLayout(10, 4);
    expect(child.layout.width).toBe(6);
  });

  test("insertBefore / removeChild keep Yoga order in sync", () => {
    const a = box({ width: 1, height: 1 });
    const b = box({ width: 2, height: 1 });
    const c = box({ width: 3, height: 1 });
    const root = box({ width: 10, height: 1 }, a, c);
    root.insertBefore(b, c);
    root.calculateLayout(10, 1);
    expect([a.layout.x, b.layout.x, c.layout.x]).toEqual([0, 1, 3]);
    root.removeChild(a);
    root.calculateLayout(10, 1);
    expect([b.layout.x, c.layout.x]).toEqual([0, 2]);
    expect(root.countYogaNodes()).toBe(3);
  });

  test("display none removes nodes from layout and paint", () => {
    const hidden = text({ display: "none" }, "HIDDEN");
    const root = box({ width: 10, height: 1 }, hidden, text({}, "shown"));
    expect(render(root, 10, 1).toPlainString()).toBe("shown     ");
  });
});

describe("painting", () => {
  test("rich inline <Text> spans", () => {
    const t = text({ fg: "#a1a1aa" }, "Hello ", text({ bold: true, fg: "#22c55e" }, "world", text({ italic: true }, "!")), " ok");
    const root = box({ width: 20, height: 1 }, t);
    const buf = render(root, 20, 1);
    expect(buf.toPlainString().trimEnd()).toBe("Hello world! ok");
    expect(buf.fg[0]).toBe(0xa1a1aaff);
    expect(buf.attrs[0]).toBe(0);
    expect(buf.fg[6]).toBe(0x22c55eff);
    expect(buf.attrs[6]).toBe(ATTR_BOLD);
    expect(buf.fg[11]).toBe(0x22c55eff);
    expect(buf.attrs[11]).toBe(ATTR_BOLD | ATTR_ITALIC);
    expect(buf.fg[13]).toBe(0xa1a1aaff);
    expect(buf.attrs[13]).toBe(0);
  });

  test("rich spans wrap across lines keeping their styles", () => {
    const t = text({}, "aaaa ", text({ bold: true }, "bbbb cccc"), " dddd");
    const root = box({ width: 9, height: 4, flexDirection: "column" }, t);
    const buf = render(root, 9, 4);
    expect(buf.toPlainLines(true)).toEqual(["aaaa bbbb", "cccc dddd", "", ""]);
    expect(buf.attrs[9]).toBe(ATTR_BOLD);
    expect(buf.attrs[14]).toBe(0);
  });

  test("box inherits fg into text, bg fills", () => {
    const root = box({ width: 6, height: 2, bg: "#18181b", fg: "#fafafa", bold: true }, text({}, "hi"));
    const buf = render(root, 6, 2);
    expect(buf.bg[11]).toBe(0x18181bff);
    expect(buf.fg[0]).toBe(0xfafafaff);
    expect(buf.attrs[0]).toBe(ATTR_BOLD);
  });

  test("CJK / emoji take 2 columns while ▼ takes 1, borders stay aligned", () => {
    const lines = ["▼ Text.js", "你好世界", "🚀 ship it", "👨‍👩‍👧 fam", "⠋ loading"];
    const root = box({ width: 14, height: 7, border: true, flexDirection: "column" }, ...lines.map((l) => text({}, l)));
    const buf = render(root, 14, 7);
    const rows = buf.toPlainLines();
    expect(rows[1]).toBe("│▼ Text.js   │");
    expect(rows[2]).toBe("│你好世界    │");
    expect(rows[3]).toBe("│🚀 ship it  │");
    for (let y = 0; y < 7; y++) {
      const right = buf.cellText(y * 14 + 13);
      expect(["│", "┐", "┘"]).toContain(right);
    }
  });

  test("text alignment and truncation", () => {
    const root = box(
      { width: 10, height: 3, flexDirection: "column" },
      text({ textAlign: "center" }, "mid"),
      text({ textAlign: "right" }, "end"),
      text({ wrap: "truncate-end" }, "truncate this please"),
    );
    expect(render(root, 10, 3).toPlainLines()).toEqual(["   mid    ", "       end", "truncate …"]);
  });

  test("borders with titles", () => {
    const root = box({ width: 16, height: 3, border: "rounded", title: "Files", titleAlign: "center", bottomTitle: "3 items", bottomTitleAlign: "right" });
    expect(render(root, 16, 3).toPlainLines()).toEqual(["╭─── Files ────╮", "│              │", "╰──── 3 items ─╯"]);
  });

  test("zIndex modal with backdropDim dims everything beneath", () => {
    const bg = box({ width: 20, height: 6, bg: "#ffffff", fg: "#ffffff", flexDirection: "column" }, text({}, "background text"));
    const modal = box(
      { position: "absolute", top: 2, left: 4, width: 12, height: 3, zIndex: 10, backdropDim: 0.65, bg: "#18181b", border: true, borderColor: "#22c55e" },
      text({ fg: "#fafafa" }, "Modal"),
    );
    const root = box({ width: 20, height: 6 }, modal, bg);
    const buf = render(root, 20, 6);
    const rows = buf.toPlainLines();
    expect(rows[0]).toBe("background text     ");
    expect(rows[3]?.slice(4, 16)).toBe("│Modal     │");
    const bgCell = unpackRGBA(buf.bg[0] ?? 0);
    expect(bgCell.r).toBeLessThan(100);
    const fgCell = unpackRGBA(buf.fg[0] ?? 0);
    expect(fgCell.r).toBeLessThan(100);
    expect(buf.bg[3 * 20 + 6]).toBe(0x18181bff);
    expect(buf.fg[3 * 20 + 5]).toBe(0xfafafaff);
  });

  test("deep zIndex overlays paint above later siblings", () => {
    const overlay = box({ position: "absolute", top: 0, left: 0, width: 5, height: 1, zIndex: 5, bg: "#ff0000" }, text({}, "TOP"));
    const first = box({ width: 10, height: 1 }, box({ width: 10, height: 1 }, overlay));
    const later = box({ position: "absolute", top: 0, left: 0, width: 10, height: 1 }, text({}, "underneath"));
    const root = box({ width: 10, height: 1 }, first, later);
    const buf = render(root, 10, 1);
    expect(buf.toPlainString()).toBe("TOP  neath");
  });

  test("sibling zIndex ordering", () => {
    const a = box({ position: "absolute", width: 3, height: 1, zIndex: 2 }, text({}, "AAA"));
    const b = box({ position: "absolute", width: 3, height: 1, zIndex: 1 }, text({}, "BBB"));
    const root = box({ width: 3, height: 1 }, a, b);
    expect(render(root, 3, 1).toPlainString()).toBe("AAA");
  });

  test("ScrollBox clips, translates and culls offscreen children", () => {
    const items = Array.from({ length: 50 }, (_, i) => text({}, `item ${i}`));
    const scroll = box({ width: 12, height: 5, border: true, overflow: "scroll", flexDirection: "column", scrollY: 10 }, ...items);
    const root = box({ width: 12, height: 7, flexDirection: "column" }, scroll, text({}, "footer"));
    root.calculateLayout(12, 7);
    const buf = new CellBuffer(12, 7);
    const stats = paintScene(root, buf);
    expect(buf.toPlainLines()).toEqual([
      "┌──────────┐",
      "│item 10   │",
      "│item 11   │",
      "│item 12   │",
      "└──────────┘",
      "footer      ",
      "            ",
    ]);
    expect(scroll.layout.scrollHeight).toBe(50);
    expect(stats.culled).toBeGreaterThanOrEqual(46);
    expect(items[0]?.painted).toBe(false);
    expect(items[11]?.painted).toBe(true);
    expect(items[11]?.screenRect.y).toBe(2);

    scroll.updateProps({ ...scroll.props, scrollY: 1000 });
    paintScene(root, buf);
    expect(buf.toPlainLines()[3]).toBe("│item 49   │");
  });

  test("overflow hidden clips wide content horizontally", () => {
    const root = box({ width: 6, height: 1, overflow: "hidden" }, box({ width: 20, height: 1, flexShrink: 0 }, text({ wrap: "nowrap" }, "abcdefghijklmnop")));
    expect(render(root, 6, 1).toPlainString()).toBe("abcdef");
  });

  test("customPaint receives screen rect and focus", () => {
    let seen: ComputedRect | null = null;
    let focused = false;
    const custom = box({
      width: 6,
      height: 2,
      customPaint: (buf, rect, isFocused) => {
        seen = { ...rect };
        focused = isFocused;
        buf.drawText(rect.x, rect.y, "custom", 0xff0000ff, 0);
      },
    });
    const root = box({ width: 10, height: 3, padding: 1 }, custom);
    root.calculateLayout(10, 3);
    const buf = new CellBuffer(10, 3);
    paintScene(root, buf, { focusedNode: custom });
    expect(buf.toPlainLines()[1]).toBe(" custom   ");
    expect(seen).toMatchObject({ x: 1, y: 1, width: 6, height: 2 });
    expect(focused).toBe(true);
  });

  test("wireframe overlay and highlighted node", () => {
    const inner = box({ width: 8, height: 3, wireframeLabel: "Card" });
    const root = box({ width: 12, height: 5, padding: 1, wireframeLabel: "Root" }, inner);
    root.calculateLayout(12, 5);
    const buf = new CellBuffer(12, 5);
    paintScene(root, buf, { wireframe: true });
    const rows = buf.toPlainLines();
    expect(rows[0]).toBe("┌Root╌╌╌╌╌╌┐");
    expect(rows[1]).toBe("╎┌Card╌╌┐  ╎");
    expect(rows[2]).toBe("╎╎      ╎  ╎");
    paintScene(root, buf, { highlightedNode: inner });
    expect(buf.toPlainLines()[0]).toBe("  Card 8×3  ");
    expect(unpackRGBA(buf.bg[2 * 12 + 2] ?? 0).b).toBeGreaterThan(0);
  });
});

describe("incremental layout & prop optimizations", () => {
  test("lazy Yoga allocation skips raw-text and inline spans, allocating on demand when needed", () => {
    const raw = createRawText("span");
    const inline = createNode("text", { bold: true });
    inline.appendChild(raw);
    expect(raw.yoga).toBeNull();
    expect(inline.yoga).toBeNull();

    const outer = createNode("text");
    outer.appendChild(inline);
    expect(outer.yoga).toBeNull();

    const root = box({ width: 20, height: 2 }, outer);
    expect(outer.yoga).not.toBeNull();
    expect(inline.yoga).toBeNull();
    expect(raw.yoga).toBeNull();
    expect(root.countYogaNodes()).toBe(2);

    // Raw text directly inside a box still gets a Yoga node on attach.
    const directRaw = createRawText("direct");
    expect(directRaw.yoga).toBeNull();
    root.appendChild(directRaw);
    expect(directRaw.yoga).not.toBeNull();
    expect(root.countYogaNodes()).toBe(3);
    root.destroy();
    expect(root.countYogaNodes()).toBe(0);

    // Standalone text root laid out directly allocates Yoga on calculateLayout.
    const standalone = text({}, "standalone");
    expect(standalone.yoga).toBeNull();
    expect(standalone.calculateLayout(12, 2)).toBe(true);
    expect(standalone.yoga).not.toBeNull();
    expect(standalone.layout.width).toBe(12);
    standalone.destroy();
  });

  test("sparse updateProps handles unchanged, added, modified and removed layout/border/style props", () => {
    const child = box({ width: 8, height: 3, paddingLeft: 2, border: "single", fg: "#ff0000" });
    const root = box({ width: 20, height: 10, flexDirection: "column" }, child);
    root.calculateLayout(20, 10);
    expect(child.layout).toMatchObject({ width: 8, height: 3, contentX: 3, contentWidth: 4 });

    // Identical prop values in a new object early-out without dirtying Yoga.
    child.updateProps({ width: 8, height: 3, paddingLeft: 2, border: "single", fg: "#ff0000" });
    expect(root.yoga?.isDirty()).toBe(false);
    expect(root.calculateLayout(20, 10)).toBe(false);

    // Removing paddingLeft and border shrinks content offset back to 0 and stretches width to 20.
    child.updateProps({ height: 4 });
    expect(root.yoga?.isDirty()).toBe(true);
    expect(root.calculateLayout(20, 10)).toBe(true);
    expect(child.layout).toMatchObject({ width: 20, height: 4, contentX: 0, contentWidth: 20 });
    expect(child.resolved.fg).toBeNull();
    expect(child.resolved.borderStyle).toBe("none");
    root.destroy();
  });

  test("text changes skip Yoga relayout when measured size is unchanged and relayout when lines change", () => {
    const spinnerRaw = createRawText("⠋ working");
    const spinner = createNode("text", { wrap: "nowrap", flexShrink: 0 });
    spinner.appendChild(spinnerRaw);

    const streamRaw = createRawText("hello");
    const stream = createNode("text");
    stream.appendChild(streamRaw);

    const footer = text({}, "footer");
    const root = box({ width: 12, height: 8, flexDirection: "column" }, spinner, stream, footer);
    expect(root.calculateLayout(12, 8)).toBe(true);
    expect(footer.layout.y).toBe(2);

    // Same-width spinner frame & 1-line text growth inside stretched column skip Yoga WASM relayout.
    spinnerRaw.setText("⠙ working");
    streamRaw.setText("hello world");
    expect(root.calculateLayout(12, 8)).toBe(false);
    expect(footer.layout.y).toBe(2);

    // Wrapping onto a second line changes measured height and triggers relayout, shifting footer down.
    streamRaw.setText("hello world again");
    expect(root.calculateLayout(12, 8)).toBe(true);
    expect(stream.layout.height).toBe(2);
    expect(footer.layout.y).toBe(3);

    // Verify buffer output matches a forced full relayout on an independent buffer.
    const incrementalBuf = new CellBuffer(12, 8);
    paintScene(root, incrementalBuf);
    root.calculateLayout(12, 8, true);
    const forcedBuf = new CellBuffer(12, 8);
    paintScene(root, forcedBuf);
    expect(incrementalBuf.toPlainString()).toBe(forcedBuf.toPlainString());
    root.destroy();
  });

  test("damage-band partial paint matches full paint cell-for-cell across partial edits and external writes", () => {
    const headerRaw = createRawText("▼ Status: idle");
    const bodyRaw = createRawText("typing: a");
    const rowBox = box({ height: 3, border: "rounded", paddingX: 1, borderColor: "#22c55e" }, text({ fg: "#fafafa" }, bodyRaw));
    const root = box(
      { width: 24, height: 6, flexDirection: "column", bg: "#09090b" },
      box({ height: 1, bg: "#18181b" }, text({ fg: "#fafafa", bold: true }, headerRaw)),
      rowBox,
      text({ fg: "#a1a1aa" }, "footer line"),
    );

    const inc = new CellBuffer(24, 6);
    root.calculateLayout(24, 6);
    paintScene(root, inc);

    // 1. Idle paint skips work and keeps buffer intact.
    const idleStats = paintScene(root, inc);
    expect(idleStats.painted).toBe(0);

    // 2. 1-row leaf edit in a row box skips Yoga WASM and repaints only the damaged band.
    bodyRaw.setText("typing: hello world");
    expect(root.calculateLayout(24, 6)).toBe(false);
    paintScene(root, inc);

    // 3. Visual-only box prop edit (borderColor) also repaints incrementally.
    rowBox.updateProps({ height: 3, border: "rounded", paddingX: 1, borderColor: "#3b82f6" });
    expect(root.calculateLayout(24, 6)).toBe(false);
    paintScene(root, inc);

    const ref = new CellBuffer(24, 6);
    root.calculateLayout(24, 6, true);
    paintScene(root, ref);
    expect(Array.from(inc.chars)).toEqual(Array.from(ref.chars));
    expect(Array.from(inc.fg)).toEqual(Array.from(ref.fg));
    expect(Array.from(inc.bg)).toEqual(Array.from(ref.bg));
    expect(Array.from(inc.attrs)).toEqual(Array.from(ref.attrs));

    // 4. External mutation to `inc` invalidates incremental assumption and restores full scene on next paint.
    inc.setCell(0, 5, "X", 0xff0000ff, 0);
    paintScene(root, inc);
    expect(Array.from(inc.chars)).toEqual(Array.from(ref.chars));
    root.destroy();
  });
});

describe("painted / screenRect bookkeeping (DevTools inspector inputs)", () => {
  test("band repaints keep flags from the last full paint; moves and scrolls force a full paint", () => {
    const lines = [0, 1, 2, 3, 4].map((i) => text({}, `line ${i}`));
    const scroller = box({ height: 3, overflow: "hidden", flexDirection: "column" }, ...lines);
    const root = box({ width: 10, height: 6, flexDirection: "column" }, scroller, text({}, "footer"));
    root.calculateLayout(10, 6, true);
    const buf = new CellBuffer(10, 6);
    paintScene(root, buf);
    expect(lines.map((l) => l.painted)).toEqual([true, true, true, false, false]);

    // Text-only change: incremental band paint. Nodes outside the band keep accurate flags.
    (lines[1]!.children[0] as SceneNode).setText("LINE 1");
    root.calculateLayout(10, 6);
    paintScene(root, buf);
    expect(lines.map((l) => l.painted)).toEqual([true, true, true, false, false]);

    // Scrolling moves nodes, which always takes the full path and refreshes every flag.
    scroller.updateProps({ ...scroller.props, scrollY: 2 });
    root.calculateLayout(10, 6);
    paintScene(root, buf);
    expect(lines.map((l) => l.painted)).toEqual([false, false, true, true, true]);
    expect(lines[2]!.screenRect.y).toBe(0);

    lines[4]!.destroy();
    expect(lines[4]!.painted).toBe(false);
    expect(lines[4]!.isDestroyed).toBe(true);
  });
});
