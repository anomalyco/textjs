import { describe, expect, jest, test } from "bun:test";
import { CellBuffer, CssConsoleDriver, InputEngine } from "@textjs/core";
import { Box, Button, FocusHint, Modal, ScrollBox, SplitPane, Tabs, Text, useFocus, useInput, usePageFocus } from "../src/index";
import * as api from "../src/index";
import { focusHintLabel } from "../src/components/FocusHint";
import { createTestRoot, FakeConsole, type TestRoot } from "./helpers";

const HINT = "Click the page to use the keyboard";

/** Just enough of a DOM for `InputEngine.attach()` to create its sink. */
function fakeDocument(hasFocus: boolean): Document {
  const node = () => ({ style: {}, value: "", setAttribute() {}, addEventListener() {}, removeEventListener() {}, focus() {}, remove() {} });
  return {
    body: { appendChild() {} },
    defaultView: null,
    createElement: node,
    addEventListener() {},
    removeEventListener() {},
    hasFocus: () => hasFocus,
  } as unknown as Document;
}

function pageEngine(hasFocus = true): InputEngine {
  return new InputEngine({ document: fakeDocument(hasFocus) }).attach();
}

/** The last row of the last frame logged to the console. */
function consoleLastRow(t: TestRoot): string {
  t.frame();
  const args = t.console.logs.at(-1) ?? [""];
  const rows = String(args[0]).replace(/%c/g, "").replace(/[\u200b\u2060]/g, "").split("\n").filter((r) => r.trim() !== "");
  return (rows.at(-1) ?? "").trim();
}

function Passive() {
  return (
    <Box flexDirection="column" height="100%" justifyContent="space-between">
      <Text>header</Text>
      <Text>keys</Text>
    </Box>
  );
}

function Interactive({ isActive = true, ambient = false }: { isActive?: boolean; ambient?: boolean }) {
  useInput(() => undefined, { isActive, ambient });
  return <Passive />;
}

function Focusable() {
  useFocus();
  return <Passive />;
}

/**
 * Counts live 700ms intervals (the focus hint's blink timers) from `setInterval` / `clearInterval`
 * calls, so other timers the renderer or React schedule don't count. Install after `useFakeTimers`.
 */
function trackBlinkTimers(): { live: () => number; restore: () => void } {
  const g = globalThis as { setInterval: typeof setInterval; clearInterval: typeof clearInterval };
  const { setInterval: set, clearInterval: clear } = g;
  const live = new Set<unknown>();
  g.setInterval = ((fn: () => void, ms?: number) => {
    const id = set(fn, ms);
    if (ms === 700) live.add(id);
    return id;
  }) as typeof setInterval;
  g.clearInterval = ((id?: ReturnType<typeof setInterval>) => {
    live.delete(id);
    clear(id);
  }) as typeof clearInterval;
  return { live: () => live.size, restore: () => Object.assign(g, { setInterval: set, clearInterval: clear }) };
}

describe("usePageFocus", () => {
  test("follows the input engine's page focus and re-renders only when it changes", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let renders = 0;
    function Status() {
      renders++;
      return <Text>{usePageFocus() ? "focused" : "blurred"}</Text>;
    }
    await t.render(<Status />);
    expect(t.frame()).toBe("focused");
    await t.act(() => t.engine.setFocused(false));
    expect(t.frame()).toBe("blurred");
    const before = renders;
    await t.act(() => t.root.renderer.resize(30, 3));
    expect(renders).toBe(before);
    await t.act(() => t.engine.setFocused(true));
    expect(t.frame()).toBe("focused");
    await t.unmount();
  });
});

describe("FocusHint", () => {
  test("covers the last row of console frames while blurred, and never enters the buffer mirrors read", async () => {
    const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
    await t.render(
      <>
        <Passive />
        <FocusHint active />
      </>,
    );
    expect(consoleLastRow(t)).toBe("keys");
    await t.act(() => t.engine.setFocused(false));
    expect(consoleLastRow(t)).toBe(HINT);
    expect(t.lines()).toEqual(["header", "keys"]);
    expect(t.root.renderer._banner).toEqual({ text: HINT, fg: "#000000", bg: "#ffc53d" });
    await t.act(() => t.engine.setFocused(true));
    expect(t.root.renderer._banner).toBeNull();
    expect(consoleLastRow(t)).toBe("keys");
    await t.unmount();
  });

  test("is the same amber bar in every theme", async () => {
    const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
    await t.render(<FocusHint active />);
    await t.act(() => t.engine.setFocused(false));
    await t.act(() => t.root.setTheme("geistLight"));
    expect(t.root.renderer._banner).toEqual({ text: HINT, fg: "#000000", bg: "#ffc53d" });
    await t.unmount();
  });

  test("blinks after each blur, and stops on focus and on unmount", async () => {
    const g = globalThis as { matchMedia?: (query: string) => { matches: boolean } };
    g.matchMedia = () => ({ matches: false });
    jest.useFakeTimers();
    const blinkTimers = trackBlinkTimers();
    try {
      const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
      await t.render(<FocusHint active />);
      expect(blinkTimers.live()).toBe(0);
      /** The bar's background in the last frame logged after advancing `ms`. */
      const barAfter = (ms: number) => {
        jest.advanceTimersByTime(ms);
        t.frame();
        const css = String(t.console.logs.at(-1)?.slice(1).join("|"));
        return css.includes("background-color:#ffc53d") ? "amber" : css.includes("background-color:#000000") ? "ink" : "none";
      };
      await t.act(() => t.engine.setFocused(false));
      expect(consoleLastRow(t)).toBe(HINT);
      expect(blinkTimers.live()).toBe(1);
      expect(barAfter(0)).toBe("amber");
      expect(barAfter(700)).toBe("ink");
      await t.act(() => t.engine.setFocused(true));
      expect(blinkTimers.live()).toBe(0);
      expect(barAfter(0)).toBe("none");
      // The next blur blinks again from the start, then holds amber.
      await t.act(() => t.engine.setFocused(false));
      const seen = [barAfter(0)];
      for (let i = 0; i < 8; i++) seen.push(barAfter(700));
      expect(seen).toEqual(["amber", "ink", "amber", "ink", "amber", "ink", "amber", "ink", "amber"]);
      expect(blinkTimers.live()).toBe(0);
      await t.act(() => t.engine.setFocused(true));
      await t.act(() => t.engine.setFocused(false));
      await t.unmount();
      expect(blinkTimers.live()).toBe(0);
    } finally {
      blinkTimers.restore();
      jest.useRealTimers();
      delete g.matchMedia;
    }
  });

  test("points up at the page when DevTools is docked at the bottom", () => {
    expect(focusHintLabel("bottom")).toBe(`▲ ${HINT}`);
    for (const dock of ["side", "undocked", "fixed"] as const) expect(focusHintLabel(dock)).toBe(HINT);
  });

  test("active={false} renders nothing", async () => {
    const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
    await t.render(<FocusHint active={false} />);
    await t.act(() => t.engine.setFocused(false));
    expect(t.root.renderer._banner).toBeNull();
    await t.unmount();
  });

  test("the label helpers and banner API stay internal", async () => {
    expect("focusHintLabel" in api).toBe(false);
    expect("FOCUS_HINT_TEXT" in api).toBe(false);
    const t = await createTestRoot({ width: 10, height: 2 });
    for (const name of ["setBanner", "banner", "onBannerChange"]) expect(name in t.root.renderer).toBe(false);
    await t.unmount();
  });
});

describe("the root's default focus hint", () => {
  const blurredBanner = async (app: React.ReactNode, options: Parameters<typeof createTestRoot>[0] = {}) => {
    const engine = options.input instanceof InputEngine ? options.input : pageEngine();
    const t = await createTestRoot({ width: 40, height: 2, input: engine, ...options });
    await t.render(app);
    await t.act(() => engine.setFocused(false));
    const banner = t.root.renderer._banner?.text ?? null;
    await t.unmount();
    engine.detach();
    return banner;
  };

  test("shows when the app has an input handler or a focus target", async () => {
    expect(await blurredBanner(<Interactive />)).toBe(HINT);
    expect(await blurredBanner(<Focusable />)).toBe(HINT);
  });

  test("stays off for passive apps, inactive handlers and ambient shortcuts", async () => {
    expect(await blurredBanner(<Passive />)).toBeNull();
    expect(await blurredBanner(<Interactive isActive={false} />)).toBeNull();
    expect(await blurredBanner(<Interactive ambient />)).toBeNull();
  });

  test("stays off for components that only register inactive focus targets", async () => {
    expect(
      await blurredBanner(
        <ScrollBox height={2}>
          <Text>line</Text>
        </ScrollBox>,
      ),
    ).toBeNull();
    expect(await blurredBanner(<SplitPane direction="row"><Text>a</Text><Text>b</Text></SplitPane>)).toBeNull();
    expect(await blurredBanner(<Tabs tabs={[{ id: "a", label: "A" }]} activeTab="a" onChange={() => undefined} />)).toBeNull();
    expect(await blurredBanner(<Button disabled>Go</Button>)).toBeNull();
    expect(await blurredBanner(<Button>Go</Button>)).toBe(HINT);
  });

  test("follows targets turning active, Tab focus turning off and modal traps", async () => {
    const engine = pageEngine();
    const t = await createTestRoot({ width: 40, height: 6, input: engine });
    await t.render(<Button disabled>Go</Button>);
    await t.act(() => engine.setFocused(false));
    expect(t.root.renderer._banner).toBeNull();
    await t.render(<Button>Go</Button>);
    expect(t.root.renderer._banner?.text).toBe(HINT);
    await t.act(() => t.root.focus.disable());
    expect(t.root.renderer._banner).toBeNull();
    await t.act(() => t.root.focus.enable());
    expect(t.root.renderer._banner?.text).toBe(HINT);
    // A modal with no targets of its own traps focus away from the button. Its Esc handler still wants keys.
    await t.render(
      <>
        <Button>Go</Button>
        <Modal title="m" onClose={() => undefined} closeOnEscape={false}>
          <Text>info</Text>
        </Modal>
      </>,
    );
    expect(t.root.focus.hasTargets()).toBe(false);
    await t.unmount();
    engine.detach();
  });

  test("appears and goes away as handlers come and go", async () => {
    const engine = pageEngine();
    const t = await createTestRoot({ width: 40, height: 2, input: engine });
    await t.render(<Interactive isActive={false} />);
    await t.act(() => engine.setFocused(false));
    expect(t.root.renderer._banner).toBeNull();
    await t.render(<Interactive />);
    expect(t.root.renderer._banner?.text).toBe(HINT);
    await t.render(<Interactive isActive={false} />);
    expect(t.root.renderer._banner).toBeNull();
    await t.unmount();
    engine.detach();
  });

  test("stays off without page input (tests, terminals, prerendering), unless the root says frames reach a page", async () => {
    const headless = new InputEngine({ document: null });
    expect(await blurredBanner(<Interactive />, { input: headless })).toBeNull();
    expect(await blurredBanner(<Interactive />, { input: new InputEngine({ document: null }), focusHint: true })).toBe(HINT);
    // `true` still needs an app that wants keys.
    expect(await blurredBanner(<Passive />, { input: new InputEngine({ document: null }), focusHint: true })).toBeNull();
  });

  test("shows from the first frame when the page loads without focus (reloaded from DevTools)", async () => {
    const engine = pageEngine(false);
    const t = await createTestRoot({ width: 40, height: 2, input: engine });
    await t.render(<Interactive />);
    expect(consoleLastRow(t)).toBe(HINT);
    await t.unmount();
    engine.detach();
  });

  test("focusHint: false turns it off", async () => {
    expect(await blurredBanner(<Interactive />, { focusHint: false })).toBeNull();
  });
});

describe("CssConsoleDriver banner", () => {
  test("is drawn for the encode only: the buffer, its write version and grapheme pool come back unchanged", () => {
    const buf = new CellBuffer(12, 2);
    buf.drawText(0, 1, "👩‍💻 row", 0xffffffff, 0x000000ff);
    const before = { text: buf.toPlainString(), version: buf._writeVersion, pool: buf.graphemePool.length, bg: buf.bg.slice() };
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, clear: "never" });
    driver._setBanner({ text: "hint", fg: "#000000", bg: "#ffffff" });
    driver.render(buf);
    expect(String(con.logs.at(-1)?.[0]).replace(/%c/g, "")).toContain("hint");
    expect(buf.toPlainString()).toBe(before.text);
    expect(buf._writeVersion).toBe(before.version);
    expect(buf.graphemePool.length).toBe(before.pool);
    expect(buf.bg).toEqual(before.bg);
    driver._setBanner(null);
    expect(driver.render(buf).skipped).toBe(false);
    expect(String(con.logs.at(-1)?.[0]).replace(/%c/g, "")).not.toContain("hint");
  });
});
