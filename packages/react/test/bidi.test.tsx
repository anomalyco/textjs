import { afterEach, describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ATTR_INVERSE, CellBuffer, extractStyledFrame, type SceneNode } from "@textjs/core";
import { ConsoleMirror } from "../src/dom";
import { CURSOR_SPACE, renderCursor } from "../src/components/field";
import { Box, Input, Text } from "../src/index";
import type { TextTheme } from "../src/theme";
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

describe("Input cursor on a space in RTL text", () => {
  test("numbers keep their order while the cursor sits between them, in every blink phase", async () => {
    const app = await render(<Input autoFocus />, { cols: 14, rows: 1 });
    await app.type("שלום 12 34");
    expect(app.lines()[0]?.trim()).toBe("34 12 םולש");
    // Onto the space between the numbers: the cursor's no-break space must not join "12" and "34" (W4).
    for (let i = 0; i < 3; i++) await app.press("left");
    expect(app.lines()[0]?.trim()).toBe("34\u00a012 םולש");
  });

  test("the blank cursor cell is isolated in every mode; letters never are", () => {
    const theme = { selection: "#333333" } as TextTheme;
    for (const mode of ["block", "hollow", "off"] as const) {
      expect((renderCursor(CURSOR_SPACE, mode, theme) as ReactElement<{ dir?: string }>).props.dir).toBe("auto");
      const letter = renderCursor("ب", mode, theme);
      expect(typeof letter === "string" || (letter as ReactElement<{ dir?: string }>).props.dir === undefined).toBe(true);
    }
    expect(renderCursor(CURSOR_SPACE, "hidden", theme)).toBe("");
  });

  test("an LTR Input stays on the zero-cost path", async () => {
    const app = await render(<Input autoFocus />, { cols: 14, rows: 1 });
    await app.type("hello 12 34");
    expect(app.lines()[0]).toBe("hello 12 34");
    const texts: SceneNode[] = [];
    const walk = (n: SceneNode): void => {
      if (n.type === "text") texts.push(n);
      for (const c of n.children) walk(c);
    };
    walk(app.root.rootNode);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t.getTextModel().needsBidi).toBe(false);
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
