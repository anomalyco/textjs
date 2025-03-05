import { describe, expect, test } from "bun:test";
import { createRef, useState } from "react";
import { Box, ScrollBox, Text, type ScrollBoxHandle } from "../src/index";
import { createTestRoot } from "./helpers";

const rows = (n: number, prefix = "line"): string[] => Array.from({ length: n }, (_, i) => `${prefix} ${i}`);

function content(t: { lines(): string[] }): string[] {
  return t.lines().map((l) => l.replace(/[│┃]\s*$/, "").trimEnd());
}

describe("<ScrollBox>", () => {
  test("clips overflowing content and draws a scrollbar thumb", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    await t.render(
      <ScrollBox height={4}>
        {rows(10).map((r) => (
          <Text key={r}>{r}</Text>
        ))}
      </ScrollBox>,
    );
    const lines = t.lines();
    expect(content(t).slice(0, 4)).toEqual(["line 0", "line 1", "line 2", "line 3"]);
    expect(lines.length).toBe(4);
    // Thumb on the right edge: 4 rows × 4/10 ≈ 2 rows of ┃ at the top.
    expect(lines.map((l) => l.padEnd(20).charAt(19))).toEqual(["┃", "┃", "│", "│"]);
    await t.unmount();
  });

  test("no scrollbar thumb when content fits", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    await t.render(
      <ScrollBox height={4}>
        <Text>short</Text>
      </ScrollBox>,
    );
    expect(t.frame()).toBe("short");
    await t.unmount();
  });

  test("keyboard scrolling when focused", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    await t.render(
      <ScrollBox height={4} focused>
        {rows(10).map((r) => (
          <Text key={r}>{r}</Text>
        ))}
      </ScrollBox>,
    );
    await t.press("ArrowDown");
    await t.press("ArrowDown");
    expect(content(t)[0]).toBe("line 2");
    await t.press("PageDown");
    expect(content(t)[0]).toBe("line 5");
    await t.press("End");
    expect(content(t)).toEqual(["line 6", "line 7", "line 8", "line 9"]);
    expect(t.lines().map((l) => l.charAt(19))).toEqual(["│", "│", "┃", "┃"]);
    await t.press("PageUp");
    expect(content(t)[0]).toBe("line 3");
    await t.press("Home");
    expect(content(t)[0]).toBe("line 0");
    await t.press("ArrowUp");
    expect(content(t)[0]).toBe("line 0");
    await t.unmount();
  });

  test("ignores keys when not focused, but follows the mouse wheel", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    await t.render(
      <ScrollBox height={4}>
        {rows(10).map((r) => (
          <Text key={r}>{r}</Text>
        ))}
      </ScrollBox>,
    );
    await t.press("ArrowDown");
    expect(content(t)[0]).toBe("line 0");
    await t.wheel(3);
    expect(content(t)[0]).toBe("line 3");
    // Fractional trackpad deltas accumulate.
    await t.wheel(0.5);
    expect(content(t)[0]).toBe("line 3");
    await t.wheel(0.5);
    expect(content(t)[0]).toBe("line 4");
    await t.wheel(-100);
    expect(content(t)[0]).toBe("line 0");
    await t.wheel(100);
    expect(content(t)[0]).toBe("line 6");
    await t.unmount();
  });

  test("imperative handle", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    const ref = createRef<ScrollBoxHandle>();
    await t.render(
      <ScrollBox ref={ref} height={4} showScrollbar={false}>
        {rows(10).map((r) => (
          <Text key={r}>{r}</Text>
        ))}
      </ScrollBox>,
    );
    await t.act(() => ref.current?.scrollTo(5));
    expect(t.lines()[0]).toBe("line 5");
    expect(ref.current?.getScrollTop()).toBe(5);
    await t.act(() => ref.current?.scrollBy(-2));
    expect(t.lines()[0]).toBe("line 3");
    await t.act(() => ref.current?.scrollToBottom());
    expect(t.lines()[3]).toBe("line 9");
    await t.act(() => ref.current?.scrollToTop());
    expect(t.lines()[0]).toBe("line 0");
    expect(ref.current?.node?.type).toBe("box");
    await t.unmount();
  });

  test("stickyScroll follows streaming appends, releases on scroll-up and re-engages at the bottom", async () => {
    const t = await createTestRoot({ width: 30, height: 6 });
    let append: (n?: number) => void = () => undefined;
    function Chat() {
      const [messages, setMessages] = useState(rows(3, "msg"));
      append = (n = 1) => setMessages((m) => [...m, ...Array.from({ length: n }, (_, i) => `msg ${m.length + i}`)]);
      return (
        <Box flexDirection="column" height={6}>
          <ScrollBox stickyScroll focused flexGrow={1} border="single">
            {messages.map((m) => (
              <Text key={m}>{m}</Text>
            ))}
          </ScrollBox>
        </Box>
      );
    }
    const visible = (): string[] =>
      t
        .lines()
        .slice(1, 5)
        .map((l) => l.replace(/^│/, "").replace(/[│┃]+\s*$/, "").trim());
    await t.render(<Chat />);
    expect(visible().slice(0, 3)).toEqual(["msg 0", "msg 1", "msg 2"]);
    // Stream in messages: stays pinned to the newest.
    for (let i = 0; i < 6; i++) await t.act(() => append());
    expect(visible()).toEqual(["msg 5", "msg 6", "msg 7", "msg 8"]);
    // User scrolls up: sticky releases and appends no longer move the view.
    await t.press("ArrowUp");
    await t.press("ArrowUp");
    expect(visible()).toEqual(["msg 3", "msg 4", "msg 5", "msg 6"]);
    await t.act(() => append(3));
    expect(visible()).toEqual(["msg 3", "msg 4", "msg 5", "msg 6"]);
    // Scrolling back to the bottom re-engages sticky mode.
    await t.wheel(100);
    expect(visible()).toEqual(["msg 8", "msg 9", "msg 10", "msg 11"]);
    await t.act(() => append(2));
    expect(visible()).toEqual(["msg 10", "msg 11", "msg 12", "msg 13"]);
    await t.unmount();
  });
});
