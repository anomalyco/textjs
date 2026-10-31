import { describe, expect, test } from "bun:test";
import { ATTR_INVERSE } from "@textjs/core";
import { Box, Text, Textarea } from "../src/index";
import { createTestRoot, type TestRoot } from "./helpers";

function cursor(t: TestRoot): { x: number; y: number } {
  t.frame();
  const b = t.root.renderer.buffer;
  for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) if ((b.getCell(x, y)?.attrs ?? 0) & ATTR_INVERSE) return { x, y };
  return { x: -1, y: -1 };
}

describe("<Textarea>", () => {
  test("recalls history only at a buffer edge and restores the unfinished draft", async () => {
    const t = await createTestRoot({ width: 25, height: 5 });
    await t.render(<Textarea autoFocus history={["first", "second\nline"]} defaultValue="draft" />);
    await t.press("ArrowUp");
    expect(t.lines()[0]).toBe("draft");
    await t.press("ArrowUp");
    expect(t.lines()).toEqual(["second", "line"]);
    await t.press("ArrowUp");
    expect(t.lines()[0]).toBe("first");
    await t.press("End");
    await t.press("ArrowDown");
    expect(t.lines()).toEqual(["second", "line"]);
    await t.press("ArrowDown");
    expect(t.lines()[0]).toBe("draft");
    await t.unmount();
  });

  test("word chords and grapheme deletion preserve pasted tabs and combining sequences", async () => {
    const t = await createTestRoot();
    const word = "e" + "\u0301".repeat(20);
    const submitted: string[] = [];
    await t.render(<Textarea autoFocus defaultValue={`a\t${word} two`} onSubmit={(v) => submitted.push(v)} />);
    await t.press("b", { altKey: true });
    await t.press("d", { altKey: true });
    await t.press("Backspace");
    await t.press("Backspace");
    await t.press("Enter");
    expect(submitted).toEqual(["a\t"]);
    await t.unmount();
  });
  test("Enter submits; Shift+Enter, Alt+Enter and Ctrl+J insert newlines", async () => {
    const t = await createTestRoot({ width: 20, height: 8 });
    const submits: string[] = [];
    await t.render(<Textarea autoFocus onSubmit={(v) => submits.push(v)} />);
    await t.type("one");
    await t.press("Enter", { shiftKey: true });
    await t.type("two");
    await t.press("Enter", { altKey: true });
    await t.type("three");
    await t.emitKey("j", { ctrl: true });
    await t.type("four");
    expect(t.lines()).toEqual(["one", "two", "three", "four"]);
    await t.press("Enter");
    expect(submits).toEqual(["one\ntwo\nthree\nfour"]);
    await t.unmount();
  });

  test("multi-line cursor movement and editing", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    await t.render(<Textarea autoFocus defaultValue={"alpha\nbe\ngamma"} />);
    expect(cursor(t)).toEqual({ x: 5, y: 2 });
    await t.press("ArrowUp");
    expect(cursor(t)).toEqual({ x: 2, y: 1 });
    // The goal column survives the short middle line.
    await t.press("ArrowUp");
    expect(cursor(t)).toEqual({ x: 5, y: 0 });
    await t.press("ArrowLeft");
    await t.type("X");
    expect(t.lines()[0]).toBe("alphXa");
    await t.press("ArrowDown");
    expect(cursor(t)).toEqual({ x: 2, y: 1 });
    await t.press("ArrowDown");
    expect(cursor(t)).toEqual({ x: 5, y: 2 });
    await t.press("Home");
    expect(cursor(t)).toEqual({ x: 0, y: 2 });
    await t.press("Backspace");
    expect(t.lines()).toEqual(["alphXa", "begamma"]);
    await t.press("End");
    expect(cursor(t)).toEqual({ x: 7, y: 1 });
    await t.unmount();
  });

  test("multi-line paste, min/max rows and cursor-following vertical scroll", async () => {
    const t = await createTestRoot({ width: 20, height: 10 });
    await t.render(
      <Box flexDirection="column">
        <Text>top</Text>
        <Textarea autoFocus minRows={2} maxRows={3} />
        <Text>bottom</Text>
      </Box>,
    );
    expect(t.lines().slice(0, 4)).toEqual(["top", "", "", "bottom"]);
    await t.paste("l1\r\nl2\nl3\nl4\nl5");
    // 5 lines clamped to 3 visible rows, scrolled to the cursor on the last line.
    expect(t.lines().slice(0, 5)).toEqual(["top", "l3", "l4", "l5", "bottom"]);
    await t.press("ArrowUp", { metaKey: true });
    expect(t.lines().slice(0, 5)).toEqual(["top", "l1", "l2", "l3", "bottom"]);
    expect(cursor(t)).toEqual({ x: 0, y: 1 });
    await t.unmount();
  });

  test("soft-wraps long lines", async () => {
    const t = await createTestRoot({ width: 10, height: 6 });
    await t.render(<Textarea autoFocus maxRows={4} />);
    await t.type("hello wide world");
    expect(t.lines().slice(0, 3)).toEqual(["hello wide", "world"]);
    await t.unmount();
  });

  test("up/down use visual rows and cell columns, not UTF-16 units or logical line starts", async () => {
    const t = await createTestRoot({ width: 8, height: 7 });
    await t.render(<Textarea autoFocus maxRows={6} />);
    await t.paste("abcdefghijk\n日本abc");
    expect(cursor(t)).toEqual({ x: 7, y: 2 });
    await t.press("ArrowUp");
    expect(cursor(t)).toEqual({ x: 3, y: 1 });
    await t.press("ArrowUp");
    expect(cursor(t)).toEqual({ x: 7, y: 0 });
    await t.press("ArrowDown");
    await t.press("ArrowDown");
    expect(cursor(t)).toEqual({ x: 7, y: 2 });
    await t.unmount();
  });
});
