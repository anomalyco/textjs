import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { Box, Text, useApp, useConsoleStats, useFocus, useFocusManager, useInput, usePaste, useViewport, useWheel } from "../src/index";
import { createTestRoot } from "./helpers";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("hooks", () => {
  test("useViewport reacts to resize, page focus, pause and responsive mode", async () => {
    const t = await createTestRoot({ width: 40, height: 4 });
    let api: ReturnType<typeof useViewport> | null = null;
    function Status() {
      const vp = useViewport();
      api = vp;
      return <Text>{`${vp.cols}x${vp.rows} ${vp.focused ? "focused" : "blurred"} ${vp.paused ? "paused" : "live"}`}</Text>;
    }
    await t.render(<Status />);
    expect(t.frame()).toBe("40x4 focused live");
    await t.act(() => api?.resize(50, 6));
    expect(t.frame()).toBe("50x6 focused live");
    await t.act(() => t.root.renderer.setFocused(false));
    expect(t.frame()).toBe("50x6 blurred live");
    await t.act(() => t.root.renderer.pause());
    expect(api!.paused).toBe(true);
    await t.act(() => t.root.renderer.resume());
    expect(t.frame()).toBe("50x6 blurred live");
    await t.act(() => api?.setResponsive(true));
    expect(api!.responsive).toBe(true);
    await t.unmount();
  });

  test("useConsoleStats updates after real frames but never feeds itself into a render loop", async () => {
    const t = await createTestRoot({ width: 40, height: 3 });
    let bump: () => void = () => undefined;
    function Hud() {
      const s = useConsoleStats({ interval: 20 });
      return <Text>{`frames ${s.frameCount} spans ${s.spanCount}`}</Text>;
    }
    function App() {
      const [n, setN] = useState(0);
      bump = () => setN((v) => v + 1);
      return (
        <Box flexDirection="column">
          <Text>{`n=${n}`}</Text>
          <Hud />
        </Box>
      );
    }
    await t.render(<App />);
    const tick = async (): Promise<void> => {
      await t.act(() => sleep(30));
      t.frame();
    };
    await tick();
    await tick();
    expect(t.lines()[1]).toMatch(/^frames [1-9]/);
    // Idle: stats settle and logging stops completely.
    for (let i = 0; i < 4; i++) await tick();
    const settled = t.console.logs.length;
    for (let i = 0; i < 6; i++) await tick();
    expect(t.console.logs.length).toBe(settled);
    expect(t.scheduler.queue.length).toBe(0);
    // A real change produces fresh stats once, then settles again.
    await t.act(() => bump());
    t.frame();
    for (let i = 0; i < 4; i++) await tick();
    const after = t.console.logs.length;
    expect(after).toBeGreaterThan(settled);
    expect(after - settled).toBeLessThanOrEqual(3);
    for (let i = 0; i < 6; i++) await tick();
    expect(t.console.logs.length).toBe(after);
    await t.unmount();
  });

  test("useFocus + Tab / Shift+Tab cycling and useFocusManager", async () => {
    const t = await createTestRoot({ width: 20, height: 4 });
    let fm: ReturnType<typeof useFocusManager> | null = null;
    function Item({ id, autoFocus, isActive }: { id: string; autoFocus?: boolean; isActive?: boolean }) {
      const f = useFocus({ id, autoFocus, isActive });
      return <Text>{`${f.isFocused ? "*" : " "}${id}`}</Text>;
    }
    function App({ skipB }: { skipB: boolean }) {
      fm = useFocusManager();
      return (
        <Box flexDirection="column">
          <Item id="a" />
          <Item id="b" autoFocus isActive={!skipB} />
          <Item id="c" />
        </Box>
      );
    }
    await t.render(<App skipB={false} />);
    expect(t.lines()).toEqual([" a", "*b", " c"]);
    await t.press("Tab");
    expect(t.lines()).toEqual([" a", " b", "*c"]);
    await t.press("Tab");
    expect(t.lines()).toEqual(["*a", " b", " c"]);
    await t.press("Tab", { shiftKey: true });
    expect(t.lines()).toEqual([" a", " b", "*c"]);
    await t.act(() => fm?.focus("b"));
    expect(t.lines()).toEqual([" a", "*b", " c"]);
    expect(fm!.activeId).toBe("b");
    // Deactivating the focused item blurs it and removes it from Tab order.
    await t.render(<App skipB />);
    expect(t.lines()).toEqual([" a", " b", " c"]);
    await t.press("Tab");
    await t.press("Tab");
    expect(t.lines()).toEqual([" a", " b", "*c"]);
    await t.act(() => fm?.disableFocus());
    await t.press("Tab");
    expect(t.lines()).toEqual([" a", " b", "*c"]);
    await t.unmount();
  });

  test("useInput priority, stopPropagation, isActive; usePaste; useWheel", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    const log: string[] = [];
    function App({ active }: { active: boolean }) {
      useInput((e) => log.push(`low:${e.key}`));
      useInput(
        (e) => {
          log.push(`high:${e.key}`);
          if (e.key === "x") e.stopPropagation();
        },
        { priority: 5 },
      );
      useInput((e) => log.push(`inactive:${e.key}`), { isActive: active });
      usePaste((e) => log.push(`paste:${e.text}`));
      useWheel((e) => log.push(`wheel:${e.rows}`));
      return <Text>ok</Text>;
    }
    await t.render(<App active={false} />);
    await t.type("a");
    await t.type("x");
    await t.paste("clip");
    await t.wheel(2);
    expect(log).toEqual(["high:a", "low:a", "high:x", "paste:clip", "wheel:2"]);
    log.length = 0;
    await t.render(<App active />);
    await t.type("b");
    expect(log).toContain("inactive:b");
    await t.unmount();
  });

  test("useApp exposes renderer controls and exit()", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let app: ReturnType<typeof useApp> | null = null;
    function App() {
      app = useApp();
      useInput((e) => {
        if (e.input === "q") app?.exit();
      });
      return <Text>running</Text>;
    }
    await t.render(<App />);
    expect(app!.renderer).toBe(t.root.renderer);
    await t.act(() => app?.resize(30, 3));
    expect(t.root.renderer.buffer.width).toBe(30);
    await t.type("q");
    await t.act(() => Promise.resolve());
    expect(t.root.unmounted).toBe(true);
    await t.root.waitUntilExit();
  });
});
