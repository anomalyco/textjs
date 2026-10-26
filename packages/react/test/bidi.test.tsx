import { afterEach, describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ATTR_INVERSE, CellBuffer, extractStyledFrame } from "@textjs/core";
import { ConsoleMirror } from "../src/dom";
import { Box, Input, Text } from "../src/index";
import { cleanup, render } from "../src/testing";

afterEach(cleanup);

describe("<Text dir>", () => {
  test("RTL paragraphs reorder and align to the start (right) by default", async () => {
    const app = await render(
      <Box flexDirection="column" width={12}>
        <Text>שלום עולם</Text>
        <Text dir="rtl">hello!</Text>
        <Text dir="ltr">שלום!</Text>
        <Text align="left">שלום</Text>
      </Box>,
      { cols: 12, rows: 4 },
    );
    expect(app.lines().slice(0, 4)).toEqual(["   םלוע םולש", "      !hello", "םולש!", "םולש"]);
  });

  test("nested dir isolates a span", async () => {
    const app = await render(
      <Text>
        user <Text dir="auto">שלום!</Text> replied
      </Text>,
      { cols: 30, rows: 1 },
    );
    expect(app.lines()[0]).toBe("user !םולש replied");
  });

  test("Input keeps a logical cursor in RTL text", async () => {
    const app = await render(<Input autoFocus />, { cols: 10, rows: 1 });
    await app.type("שלום");
    const inverseAt = (): number[] => {
      const xs: number[] = [];
      for (let x = 0; x < 10; x++) if (((app.cell(x, 0)?.attrs ?? 0) & ATTR_INVERSE) !== 0) xs.push(x);
      return xs;
    };
    // Cursor at the logical end: its blank (NBSP) cell resolves to the paragraph's RTL direction, so it sits at the visual left end.
    expect(app.lines()[0]).toBe("\u00a0םולש");
    expect(inverseAt()).toEqual([0]);
    // ← moves back one logical character, onto "ם", which is drawn leftmost.
    await app.press("left");
    expect(app.lines()[0]).toBe("םולש");
    expect(inverseAt()).toEqual([0]);
    expect(app.cell(0, 0)?.char).toBe("ם");
    // ← again: "ו" (logical index 2), one cell to the right.
    await app.press("left");
    expect(inverseAt()).toEqual([1]);
    expect(app.cell(1, 0)?.char).toBe("ו");
  });
});

describe("<ConsoleMirror>", () => {
  test("pins RTL spans to visual order with bidi-override", () => {
    const buf = new CellBuffer(12, 2);
    buf.drawText(0, 0, "abc", 0xffffffff, 0);
    buf.drawText(0, 1, "םולש", 0xffffffff, 0x000000ff);
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(buf)} />);
    expect(html.match(/unicode-bidi:bidi-override/g)?.length).toBe(1);
    expect(html).toContain("direction:ltr");
  });
});
