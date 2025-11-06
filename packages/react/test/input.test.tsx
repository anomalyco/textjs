import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { ATTR_INVERSE } from "@textjs/core";
import { Box, Input, Text, useInput } from "../src/index";
import { createTestRoot, type TestRoot } from "./helpers";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function cursorX(t: TestRoot, row = 0): number {
  t.frame();
  const buf = t.root.renderer.buffer;
  for (let x = 0; x < buf.width; x++) if ((buf.getCell(x, row)?.attrs ?? 0) & ATTR_INVERSE) return x;
  return -1;
}

describe("<Input>", () => {
  test("typing, cursor movement, editing shortcuts, paste and submit", async () => {
    const t = await createTestRoot({ width: 30, height: 2 });
    const changes: string[] = [];
    const submits: string[] = [];
    await t.render(<Input autoFocus onChange={(v) => changes.push(v)} onSubmit={(v) => submits.push(v)} />);
    await t.type("hello world");
    expect(t.frame()).toBe("hello world");
    expect(cursorX(t)).toBe(11);
    await t.press("ArrowLeft", { altKey: true });
    expect(cursorX(t)).toBe(6);
    await t.type("big ");
    expect(t.frame()).toBe("hello big world");
    await t.press("a", { ctrlKey: true });
    expect(cursorX(t)).toBe(0);
    await t.press("Delete");
    expect(t.frame()).toBe("ello big world");
    await t.press("e", { ctrlKey: true });
    expect(cursorX(t)).toBe(14);
    await t.press("Backspace");
    expect(t.frame()).toBe("ello big worl");
    // Ctrl+W is reserved by the browser engine (close tab); exercise the editor binding directly.
    await t.emitKey("w", { ctrl: true });
    expect(t.frame()).toBe("ello big");
    await t.press("Home");
    await t.press("ArrowRight");
    await t.press("ArrowRight", { altKey: true });
    expect(cursorX(t)).toBe(4);
    await t.press("k", { ctrlKey: true });
    expect(t.frame()).toBe("ello");
    await t.press("End");
    await t.paste(" pasted\ntext");
    expect(t.frame()).toBe("ello pasted text");
    await t.press("ArrowLeft");
    await t.press("ArrowLeft");
    await t.press("u", { ctrlKey: true });
    expect(t.frame()).toBe("xt");
    await t.press("Enter");
    expect(submits).toEqual(["xt"]);
    expect(changes[changes.length - 1]).toBe("xt");
    await t.unmount();
  });

  test("controlled value, placeholder and mask", async () => {
    const t = await createTestRoot({ width: 30, height: 3 });
    function App() {
      const [v, setV] = useState("");
      return (
        <Box flexDirection="column">
          <Input value={v} onChange={(x) => setV(x.toUpperCase())} placeholder="Search…" autoFocus />
          <Input value={v} mask="•" focused={false} />
          <Text>len {v.length}</Text>
        </Box>
      );
    }
    await t.render(<App />);
    expect(t.lines()[0]).toBe("Search…");
    expect(cursorX(t)).toBe(0);
    await t.type("abc");
    expect(t.lines()).toEqual(["ABC", "•••", "len 3"]);
    await t.unmount();
  });

  test("focused editors consume printable keys before global shortcuts", async () => {
    const t = await createTestRoot({ width: 30, height: 2 });
    let quits = 0;
    function App() {
      useInput((e) => {
        if (e.input === "q") quits++;
      });
      return <Input autoFocus />;
    }
    await t.render(<App />);
    await t.type("qq");
    expect(t.frame()).toBe("qq");
    expect(quits).toBe(0);
    await t.unmount();
  });

  test("scrolls horizontally to keep the cursor visible", async () => {
    const t = await createTestRoot({ width: 10, height: 1 });
    await t.render(<Input autoFocus defaultValue="" />);
    await t.type("abcdefghijklmnop");
    expect(t.frame()).toBe("hijklmnop");
    expect(cursorX(t)).toBe(9);
    await t.press("Home");
    expect(t.frame()).toBe("abcdefghij");
    expect(cursorX(t)).toBe(0);
    await t.press("End");
    expect(t.frame()).toBe("hijklmnop");
    await t.unmount();
  });

  test("idle focused input emits zero frames (steady cursor, no timers)", async () => {
    const t = await createTestRoot({ width: 20, height: 1 });
    await t.render(<Input autoFocus defaultValue="idle" />);
    await t.type("!");
    t.frame();
    const logs = t.console.logs.length;
    const clears = t.console.clears;
    await t.act(() => sleep(700));
    t.frame();
    expect(t.scheduler.queue.length).toBe(0);
    expect(t.console.logs.length).toBe(logs);
    expect(t.console.clears).toBe(clears);
    await t.unmount();
  });

  test("unfocused page: static tinted cursor and zero console.clear() even with cursorBlink", async () => {
    const t = await createTestRoot({ width: 20, height: 1 });
    await t.render(<Input autoFocus cursorBlink />);
    // Focused + blinking: the cursor toggles.
    const before = t.console.logs.length;
    await t.act(() => sleep(600));
    t.frame();
    expect(t.console.logs.length).toBeGreaterThan(before);
    // Page loses focus: tinted cursor cell (no symbol glyph), timers stop.
    await t.act(() => t.root.renderer.setFocused(false));
    expect(t.frame().trim()).toBe("");
    const cell = t.root.renderer.buffer.getCell(0, 0);
    expect(cell?.char).toBe("\u00a0");
    expect(cell?.attrs && cell.attrs & ATTR_INVERSE).toBeFalsy();
    expect(cell?.bg).not.toBe(0);
    const logs = t.console.logs.length;
    const clears = t.console.clears;
    await t.act(() => sleep(1200));
    t.frame();
    expect(t.console.logs.length).toBe(logs);
    expect(t.console.clears).toBe(clears);
    // Focus returns: steady block again.
    await t.act(() => t.root.renderer.setFocused(true));
    t.frame();
    expect(cursorX(t)).toBe(0);
    await t.unmount();
  });

  test("cursor blink pauses with the renderer", async () => {
    const t = await createTestRoot({ width: 20, height: 1 });
    await t.render(<Input autoFocus cursorBlink defaultValue="x" />);
    await t.act(() => t.root.renderer.pause());
    const logs = t.console.logs.length;
    await t.act(() => sleep(700));
    t.frame();
    expect(t.console.logs.length).toBe(logs);
    await t.act(() => t.root.renderer.resume());
    await t.unmount();
  });
});

describe("zero-frame input latency", () => {
  test("a keypress commits and emits its console frame synchronously, without waiting for rAF", async () => {
    const t = await createTestRoot({ width: 20, height: 1 });
    await t.render(<Input autoFocus />);
    t.frame();
    const logs = t.console.logs.length;
    await t.press("a");
    // No scheduler flush: the frame was emitted inside the keydown turn.
    expect(t.console.logs.length).toBe(logs + 1);
    expect(String(t.console.logs.at(-1)?.[0])).toContain("a");
    expect(t.root.renderer.buffer.rowText(0).startsWith("a")).toBe(true);
    await t.unmount();
  });
});
