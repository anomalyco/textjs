import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import {
  Box,
  easings,
  FocusScope,
  Input,
  Text,
  useAnimationFrame,
  useBreakpoint,
  useClipboard,
  useInput,
  useInterval,
  useLocalStorage,
  useMeasure,
  useSpring,
  useTimeout,
  useTween,
  type ClipboardApi,
} from "../src/index";
import { activeTickerCount } from "../src/hooks/timers";
import { cleanup, render } from "../src/testing";

afterEach(cleanup);

describe("timers and animation", () => {
  test("useInterval / useTimeout use the latest callback and stop on null", async () => {
    function App() {
      const [n, setN] = useState(0);
      const [done, setDone] = useState(false);
      useInterval(() => setN((x) => x + 1), n >= 3 ? null : 10);
      useTimeout(() => setDone(true), 15);
      return <Text>{`${n} ${done ? "done" : "wait"}`}</Text>;
    }
    const app = await render(<App />, { cols: 10, rows: 1 });
    await app.waitForText("3 done");
    await app.wait(40);
    expect(app.lastFrame()).toBe("3 done");
  });

  test("useAnimationFrame ticks while active and releases its shared timer", async () => {
    function App({ on }: { on: boolean }) {
      const [ticks, setTicks] = useState(0);
      useAnimationFrame(() => setTicks((t) => t + 1), { isActive: on, fps: 100 });
      return <Text>{ticks > 2 ? "moving" : "still"}</Text>;
    }
    const app = await render(<App on />, { cols: 10, rows: 1 });
    await app.waitForText("moving");
    expect(activeTickerCount()).toBeGreaterThan(0);
    await app.rerender(<App on={false} />);
    expect(activeTickerCount()).toBe(0);
  });

  test("useTween and useSpring settle exactly on the target", async () => {
    expect(easings.easeOutCubic(0)).toBe(0);
    expect(easings.easeOutCubic(1)).toBe(1);
    function App({ to }: { to: number }) {
      const t = useTween(to, { duration: 60 });
      const s = useSpring(to);
      return <Text>{`${Math.round(t)} ${Math.round(s * 100) / 100}`}</Text>;
    }
    const app = await render(<App to={0} />, { cols: 20, rows: 1 });
    expect(app.lastFrame()).toBe("0 0");
    await app.rerender(<App to={100} />);
    const mid = app.lastFrame();
    expect(mid).not.toBe("100 100");
    await app.waitForText("100 100", { timeout: 3000 });
    await app.waitFor(() => expect(activeTickerCount()).toBe(0), { timeout: 3000 });
  });
});

describe("layout and environment", () => {
  test("useMeasure reports laid-out size after the first frame", async () => {
    function App() {
      const [ref, size] = useMeasure();
      return (
        <Box ref={ref} className="flex-col grow border p-1">
          <Text>{`${size.width}x${size.height} inner ${size.contentWidth}x${size.contentHeight}`}</Text>
        </Box>
      );
    }
    const app = await render(<App />, { cols: 30, rows: 6 });
    expect(app.lines()[2]).toContain("30x6 inner 26x2");
    await app.resize(24, 8);
    expect(app.lines()[2]).toContain("24x8 inner 20x4");
  });

  test("useBreakpoint follows console width", async () => {
    function App() {
      const bp = useBreakpoint();
      return <Text>{`${bp.breakpoint} ${bp.up("md") ? "wide" : "narrow"}`}</Text>;
    }
    const app = await render(<App />, { cols: 50, rows: 1 });
    expect(app.lastFrame()).toBe("xs narrow");
    await app.resize(90, 1);
    expect(app.lastFrame()).toBe("md wide");
    await app.resize(150, 1);
    expect(app.lastFrame()).toBe("xl wide");
  });

  test("useLocalStorage persists JSON and syncs hooks sharing a key", async () => {
    function Counter({ label }: { label: string }) {
      const [n, setN] = useLocalStorage("textjs:test:n", 0);
      useInput((e) => {
        if (e.key === "up" && label === "a") setN((x) => x + 1);
      });
      return <Text>{`${label}=${n}`}</Text>;
    }
    const app = await render(
      <Box className="flex-row gap-1">
        <Counter label="a" />
        <Counter label="b" />
      </Box>,
      { cols: 20, rows: 1 },
    );
    await app.press("up up");
    expect(app.lastFrame()).toBe("a=2 b=2");
    await app.unmount();
    const again = await render(<Counter label="c" />, { cols: 10, rows: 1 });
    expect(again.lastFrame()).toBe("c=2");
  });

  test("useClipboard writes text and flags `copied`", async () => {
    const writes: string[] = [];
    const nav = globalThis as { navigator?: unknown };
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      value: { ...(nav.navigator as object), clipboard: { writeText: async (t: string) => void writes.push(t) } },
      configurable: true,
    });
    try {
      let api: ClipboardApi | null = null;
      function App() {
        api = useClipboard({ timeout: 20 });
        return <Text>{api.copied ? "copied" : "idle"}</Text>;
      }
      const app = await render(<App />, { cols: 10, rows: 1 });
      let ok = false;
      await app.act(async () => {
        ok = await api!.copy("dpl_8f2k");
      });
      expect(ok).toBe(true);
      expect(writes).toEqual(["dpl_8f2k"]);
      expect(app.lastFrame()).toBe("copied");
      await app.waitForText("idle");
    } finally {
      if (original) Object.defineProperty(globalThis, "navigator", original);
    }
  });

  test("<FocusScope trap> confines Tab order and input", async () => {
    let outside = 0;
    function App({ trapped }: { trapped: boolean }) {
      useInput(() => outside++);
      return (
        <Box className="flex-col">
          <Input id="a" placeholder="outside" />
          <FocusScope trap={trapped}>
            <Input id="b" placeholder="inside" autoFocus />
          </FocusScope>
        </Box>
      );
    }
    const app = await render(<App trapped />, { cols: 20, rows: 2 });
    await app.press("tab tab");
    await app.type("x");
    expect(app.lines()[1]).toStartWith("x");
    expect(outside).toBe(0);
    await app.rerender(<App trapped={false} />);
    await app.press("escape");
    expect(outside).toBeGreaterThan(0);
  });
});
