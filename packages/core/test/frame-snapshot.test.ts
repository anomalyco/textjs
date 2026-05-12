import { describe, expect, test } from "bun:test";
import { ATTR_BOLD, CellBuffer, extractStyledFrame } from "../src/index";

describe("extractStyledFrame row caching", () => {
  test("reuses StyledSpan[] references for unchanged rows and updates modified rows", () => {
    const buf = new CellBuffer(16, 4);
    buf.drawText(0, 0, "header", 0x22c55eff, 0, ATTR_BOLD);
    buf.drawText(0, 1, "line one", 0xffffffff, 0);
    buf.drawText(0, 2, "line two", 0xffffffff, 0);
    buf.drawText(0, 3, "footer", 0xa1a1aaff, 0);

    const f1 = extractStyledFrame(buf);
    buf.drawText(0, 2, "line TWO!", 0xef4444ff, 0);
    const f2 = extractStyledFrame(buf);

    expect(f2.rows[0]).toBe(f1.rows[0]);
    expect(f2.rows[1]).toBe(f1.rows[1]);
    expect(f2.rows[2]).not.toBe(f1.rows[2]);
    expect(f2.rows[3]).toBe(f1.rows[3]);
    expect(f2.rows[2]?.[0]?.text).toBe("line TWO!");

    // Separate buffers maintain independent caches without colliding.
    const other = new CellBuffer(16, 4);
    other.drawText(0, 0, "different", 0xffffffff, 0);
    const fo = extractStyledFrame(other);
    expect(fo.rows[0]?.[0]?.text).toContain("different");

    const f3 = extractStyledFrame(buf);
    expect(f3.rows[0]).toBe(f2.rows[0]);
    expect(f3.rows[2]).toBe(f2.rows[2]);
  });

  test("invalidates cached rows when style options or dimensions change", () => {
    const buf = new CellBuffer(8, 2);
    buf.drawText(0, 0, "dim", 0, 0, 2);
    const a = extractStyledFrame(buf);
    const b = extractStyledFrame(buf, { dimOpacity: 0.25 });
    expect(b.rows[0]).not.toBe(a.rows[0]);
    expect(b.rows[0]?.[0]?.fgCss).not.toBe(a.rows[0]?.[0]?.fgCss);

    buf.resize(10, 3);
    const c = extractStyledFrame(buf);
    expect(c.width).toBe(10);
    expect(c.height).toBe(3);
    expect(c.rows.length).toBe(3);
  });
});
