import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { useState } from "react";
import { CellBuffer, parseColor } from "@textjs/core";
import { Box, Text, useApp, useInput, usePaste, useWheel } from "../src/index";
import { parseTerminalInput, renderToTerminal, TerminalFrameWriter, TerminalInputParser, type TerminalInput, type TerminalOutput } from "../src/terminal";

const pick = (events: ReturnType<typeof parseTerminalInput>) =>
  events.map((e) =>
    e.type === "key" ? `${e.ctrl ? "ctrl+" : ""}${e.alt ? "alt+" : ""}${e.shift ? "shift+" : ""}${e.key}${e.input ? `(${e.input})` : ""}` : e.type === "paste" ? `paste:${e.text}` : `wheel:${e.rows}`,
  );

describe("terminal input parser", () => {
  test("keys, modifiers, function keys and control characters", () => {
    expect(pick(parseTerminalInput("aG \r\t\x7f\x1b[A\x1b[1;5C\x1b[1;2D\x1b[Z\x1b[3~\x1b[5~\x1bOP\x1b[15~\x03\x1bx"))).toEqual([
      "a(a)",
      "shift+g(G)",
      "space( )",
      "return",
      "tab",
      "backspace",
      "up",
      "ctrl+right",
      "shift+left",
      "shift+tab",
      "delete",
      "pageup",
      "f1",
      "f5",
      "ctrl+c",
      "alt+x",
    ]);
  });

  test("bracketed paste, SGR wheel, kitty CSI u and a lone Escape", () => {
    expect(pick(parseTerminalInput("\x1b[200~line 1\r\nline 2\x1b[201~\x1b[<64;5;5M\x1b[<65;5;5M\x1b[13;2u\x1b"))).toEqual([
      "paste:line 1\nline 2",
      "wheel:-3",
      "wheel:3",
      "shift+return",
      "escape",
    ]);
  });

  test("sequences split across chunks wait for the rest", () => {
    const p = new TerminalInputParser();
    expect(p.push("\x1b[")).toEqual([]);
    expect(p.hasPending).toBe(true);
    expect(pick(p.push("B"))).toEqual(["down"]);
    expect(pick(p.push("\x1b[200~hel"))).toEqual([]);
    expect(pick(p.push("lo\x1b[201~"))).toEqual(["paste:hello"]);
    expect(p.push("\x1b")).toEqual([]);
    expect(pick(p.flush())).toEqual(["escape"]);
    expect(pick(p.push("€😀"))).toEqual(["€(€)", "😀(😀)"]);
  });
});

describe("TerminalFrameWriter", () => {
  test("writes only changed rows inside synchronized-output markers", () => {
    const out: string[] = [];
    const w = new TerminalFrameWriter((s) => out.push(s));
    const buf = new CellBuffer(4, 3);
    buf.drawText(0, 0, "ab", parseColor("#ffffff"), 0);
    expect(w.render(buf)).toBe(3);
    expect(out[0]).toStartWith("\x1b[?2026h\x1b[1;1H");
    buf.drawText(0, 2, "zz", parseColor("#ffffff"), 0);
    expect(w.render(buf)).toBe(1);
    expect(out[1]).toContain("\x1b[3;1H");
    expect(out[1]).not.toContain("\x1b[1;1H");
    expect(w.render(buf)).toBe(0);
    expect(out.length).toBe(2);
  });

  test("RTL frames pin rows without re-sending the bidi mode on row 0", () => {
    const out: string[] = [];
    const w = new TerminalFrameWriter((s) => out.push(s));
    const buf = new CellBuffer(6, 2);
    buf.drawText(0, 0, "abc", parseColor("#ffffff"), 0);
    buf.drawText(0, 1, "םולש", parseColor("#ffffff"), 0);
    expect(w.render(buf)).toBe(2);
    expect(out[0]).not.toContain("\x1b[8l");
    expect(out[0]).toContain("\x1b[2;1H\u202D");
    buf.drawText(0, 1, "abcd", parseColor("#ffffff"), 0);
    expect(w.render(buf)).toBe(1);
    expect(out[1]).not.toContain("\x1b[1;1H");
  });
});

function fakeStreams(cols = 30, rows = 4) {
  const dataListeners = new Set<(c: string | Uint8Array) => void>();
  const resizeListeners = new Set<() => void>();
  const written: string[] = [];
  let raw = false;
  const stdin: TerminalInput & { send(s: string): void; readonly raw: boolean; readonly listeners: number } = {
    isTTY: true,
    setRawMode: (r: boolean) => (raw = r),
    on: (_e, l) => dataListeners.add(l),
    off: (_e, l) => dataListeners.delete(l),
    send: (s) => {
      for (const l of [...dataListeners]) l(s);
    },
    get raw() {
      return raw;
    },
    get listeners() {
      return dataListeners.size;
    },
  };
  const stdout: TerminalOutput & { columns: number; rows: number; resize(c: number, r: number): void } = {
    columns: cols,
    rows,
    write: (s: string) => written.push(s),
    on: (_e, l) => resizeListeners.add(l),
    off: (_e, l) => resizeListeners.delete(l),
    resize(c, r) {
      this.columns = c;
      this.rows = r;
      for (const l of resizeListeners) l();
    },
  };
  return { stdin, stdout, written };
}

const tick = (ms = 25): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until(check: () => boolean, timeout = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error("timed out");
    await tick(5);
  }
}

describe("renderToTerminal", () => {
  // A terminal app runs outside act(), like production code.
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let prev: boolean | undefined;
  beforeAll(() => {
    prev = g.IS_REACT_ACT_ENVIRONMENT;
    g.IS_REACT_ACT_ENVIRONMENT = false;
  });
  afterAll(() => {
    g.IS_REACT_ACT_ENVIRONMENT = prev;
  });

  test("enters raw / alternate screen, routes input, diffs frames and restores on exit", async () => {
    const { stdin, stdout, written } = fakeStreams();
    const wheels: number[] = [];
    function App() {
      const [n, setN] = useState(0);
      const [last, setLast] = useState("");
      const { exit } = useApp();
      useInput((e) => {
        if (e.key === "up") setN((x) => x + 1);
        if (e.key === "q") exit();
      });
      usePaste((e) => setLast(`paste ${e.text}`));
      useWheel((e) => {
        wheels.push(e.rows);
        setLast(`wheel ${e.rows}`);
      });
      return (
        <Box className="flex-col">
          <Text>count {n}</Text>
          <Text>{last}</Text>
        </Box>
      );
    }
    const app = await renderToTerminal(<App />, { stdin, stdout, fps: 1000 });
    expect(stdin.raw).toBe(true);
    const boot = written.join("");
    expect(boot).toContain("\x1b[?1049h");
    expect(boot).toContain("\x1b[?25l");
    // Explicit bidi mode once on entry (cells are in visual order); implicit restored on exit.
    expect(boot.split("\x1b[8l").length).toBe(2);
    expect(boot).toContain("count 0");
    written.length = 0;
    stdin.send("\x1b[A");
    await until(() => written.join("").includes("count 1"));
    expect(written.join("")).not.toContain("\x1b[2;1H");
    stdin.send("\x1b[200~hi\x1b[201~");
    await until(() => written.join("").includes("paste hi"));
    stdin.send("\x1b[<65;1;1M");
    // Wheel updates render at continuous priority on React's scheduler; assert delivery.
    await until(() => wheels.length === 1);
    expect(wheels).toEqual([3]);
    stdout.resize(20, 3);
    await until(() => app.root.renderer.buffer.width === 20);
    written.length = 0;
    stdin.send("q");
    await app.waitUntilExit();
    const bye = written.join("");
    expect(bye).toContain("\x1b[?1049l");
    expect(bye).toContain("\x1b[?25h");
    expect(bye).toContain("\x1b[8h");
    expect(stdin.raw).toBe(false);
    expect(stdin.listeners).toBe(0);
  });

  test("holds console output while mounted and replays it after exit", async () => {
    const { stdin, stdout } = fakeStreams();
    const seen: unknown[] = [];
    const original = console.warn;
    console.warn = (...a: unknown[]) => void seen.push(a.join(" "));
    try {
      const app = await renderToTerminal(<Text>hi</Text>, { stdin, stdout });
      console.warn("stray", "log");
      expect(seen).toEqual([]);
      app.unmount();
      expect(seen).toEqual(["stray log"]);
    } finally {
      console.warn = original;
    }
  });

  test("Ctrl+C unmounts by default", async () => {
    const { stdin, stdout } = fakeStreams();
    const app = await renderToTerminal(<Text>hi</Text>, { stdin, stdout, altScreen: false, mouse: false });
    stdin.send("\x03");
    await app.waitUntilExit();
    expect(app.root.unmounted).toBe(true);
  });
});
