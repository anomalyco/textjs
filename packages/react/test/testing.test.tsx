import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { useEffect, useState } from "react";
import { Box, createConsoleRootSync, Input, Text, useInput, usePaste, useWheel } from "../src/index";
import { cleanup, keyEventFromCombo, render, renderToString } from "../src/testing";
import { captureWarnings, FakeConsole, ManualScheduler, withoutActEnvironment } from "./helpers";

afterEach(cleanup);

function Counter() {
  const [n, setN] = useState(0);
  const [last, setLast] = useState("");
  useInput((e) => {
    if (e.key === "up") setN((x) => x + 1);
    if (e.key === "down") setN((x) => x - 1);
    setLast(`${e.ctrl ? "ctrl+" : ""}${e.shift ? "shift+" : ""}${e.key}`);
  });
  usePaste((e) => setLast(`paste:${e.text}`));
  useWheel((e) => setLast(`wheel:${e.rows}`));
  return (
    <Box className="flex-col p-1">
      <Text bold>count = {n}</Text>
      <Text color="muted">last: {last}</Text>
    </Box>
  );
}

describe("@textjs/react/testing", () => {
  test("render, press combos, paste, wheel and frames", async () => {
    const app = await render(<Counter />, { cols: 30, rows: 5 });
    expect(app.lastFrame()).toBe("\n count = 0\n last:");
    await app.press("up up");
    expect(app.lines()[1]).toBe(" count = 2");
    await app.press("ctrl+k");
    expect(app.lines()[2]).toBe(" last: ctrl+k");
    await app.press("shift+tab");
    expect(app.lines()[2]).toBe(" last: shift+tab");
    await app.press("G");
    expect(app.lines()[2]).toBe(" last: shift+g");
    await app.paste("hello");
    expect(app.lines()[2]).toBe(" last: paste:hello");
    await app.wheel(3);
    expect(app.lines()[2]).toBe(" last: wheel:3");
    expect(app.frames.length).toBeGreaterThan(4);
    expect(app.frames[0]).toContain("count = 0");
    expect(app.locate("count")).toEqual({ x: 1, y: 1 });
    expect(app.cell(1, 1)?.char).toBe("c");
    expect(app.toAnsi()).toContain("\u001b[0;1;");
  });

  test("type() drives focused inputs", async () => {
    let submitted = "";
    const app = await render(<Input autoFocus onSubmit={(v) => (submitted = v)} />, { cols: 20, rows: 1 });
    await app.type("Hi there\n");
    expect(submitted).toBe("Hi there");
  });

  test("waitForText, wait, resize and rerender", async () => {
    function Late() {
      const [ready, setReady] = useState(false);
      useEffect(() => {
        const id = setTimeout(() => setReady(true), 20);
        return () => clearTimeout(id);
      }, []);
      return <Text>{ready ? "Ready" : "Loading"}</Text>;
    }
    const app = await render(<Late />, { cols: 12, rows: 1 });
    expect(app.lastFrame()).toBe("Loading");
    await app.waitForText("Ready");
    await app.resize(4, 1);
    expect(app.lastFrame()).toBe("Read");
    await app.rerender(<Text>Swapped</Text>);
    expect(app.lastFrame()).toBe("Swap");
    await expect(app.waitForText("Never", { timeout: 30 })).rejects.toThrow(/not found/);
  });

  test("renderToString and keyEventFromCombo", async () => {
    expect(await renderToString(<Text>▼ hello</Text>, { cols: 10, rows: 1 })).toBe("▼ hello");
    expect(keyEventFromCombo("ctrl+shift+p")).toMatchObject({ key: "p", ctrl: true, shift: true, input: "" });
    expect(keyEventFromCombo("?")).toMatchObject({ key: "?", input: "?" });
    expect(keyEventFromCombo("space")).toMatchObject({ key: "space", input: " " });
    expect(() => keyEventFromCombo("g g")).toThrow();
  });

  test("a render that throws doesn't leave act() open for code that runs outside it", async () => {
    let thrown: unknown;
    await captureWarnings(async () => {
      await render(
        <Text>
          <Box />
        </Text>,
      ).catch((error: unknown) => {
        thrown = error;
      });
    });
    expect(String(thrown)).toContain("cannot be nested inside <Text>");

    let bump = () => {};
    function Count() {
      const [n, setN] = useState(0);
      bump = () => setN((x) => x + 1);
      return <Text>{n}</Text>;
    }
    const scheduler = new ManualScheduler();
    const warnings = await captureWarnings(() =>
      withoutActEnvironment(async () => {
        const root = createConsoleRootSync({ console: new FakeConsole(), scheduler, width: 4, height: 1, registerGlobal: false });
        root.render(<Count />);
        scheduler.flush();
        bump();
        // React commits the update on its own scheduler; the commit requests a frame. Wait for that request.
        const deadline = Date.now() + 2000;
        while (scheduler.queue.length === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1));
        expect(scheduler.queue.length).toBe(1);
        scheduler.flush();
        expect(root.renderer.buffer.toPlainString(true).trim()).toBe("1");
        root.unmount();
      }),
    );
    expect(warnings).toEqual([]);
  });

  test("renders when the test stubs fetch before the first render", () => {
    // Yoga's WebAssembly loads through fetch; a fresh process makes sure it isn't loaded already.
    const r = Bun.spawnSync([process.execPath, join(import.meta.dir, "fixtures/stubbed-fetch.tsx")]);
    expect(r.stderr.toString()).not.toContain("CompileError");
    expect(r.stdout.toString().trim()).toBe("hello");
    expect(r.exitCode).toBe(0);
  });
});
