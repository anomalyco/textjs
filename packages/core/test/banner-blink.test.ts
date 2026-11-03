import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { CellBuffer } from "../src/cell-buffer";
import { CssConsoleDriver } from "../src/drivers/css-console-driver";
import { ConsoleRenderer } from "../src/renderer";

const BANNER = { text: "hint", fg: "#000000", bg: "#ffc53d" };
const g = globalThis as { matchMedia?: (query: string) => { matches: boolean } };

let reduce = false;
let blinkTimers: ReturnType<typeof trackBlinkTimers>;
beforeEach(() => {
  reduce = false;
  g.matchMedia = (query) => ({ matches: reduce && query === "(prefers-reduced-motion: reduce)" });
  jest.useFakeTimers();
  blinkTimers = trackBlinkTimers();
});
afterEach(() => {
  blinkTimers.restore();
  jest.useRealTimers();
  delete g.matchMedia;
});

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


/** A driver over a 10×2 grid whose `repaint` logs a frame; `bar()` is the last logged bar's colors. */
function setup() {
  const logs: unknown[][] = [];
  const driver = new CssConsoleDriver({ console: { log: (...a: unknown[]) => logs.push(a), clear() {} }, measureText: false });
  const buffer = new CellBuffer(10, 2);
  let repaints = 0;
  const repaint = () => {
    repaints++;
    driver.render(buffer);
  };
  const bar = () => {
    const css = (logs.at(-1) ?? []).slice(1).join("|");
    return css.includes("background-color:#ffc53d") ? "amber" : css.includes("background-color:#000000") ? "ink" : "none";
  };
  return { driver, buffer, logs, repaint, bar, repaints: () => repaints };
}

describe("banner blink", () => {
  test("swaps 8 times, 700ms apart, then holds the colors it was given", () => {
    const s = setup();
    s.driver._setBanner(BANNER, s.repaint);
    expect(blinkTimers.live()).toBe(1);
    s.driver.render(s.buffer);
    expect(s.bar()).toBe("amber");
    expect(String(s.logs.at(-1)?.join("|"))).toContain("font-weight:700");
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      jest.advanceTimersByTime(699);
      expect(s.repaints()).toBe(i);
      jest.advanceTimersByTime(1);
      seen.push(s.bar());
    }
    expect(seen).toEqual(["ink", "amber", "ink", "amber", "ink", "amber", "ink", "amber"]);
    jest.advanceTimersByTime(10_000);
    expect(s.repaints()).toBe(8);
    expect(blinkTimers.live()).toBe(0);
  });

  test("stays steady with reduced motion, without a repaint callback, and outside a browser", () => {
    const s = setup();
    reduce = true;
    s.driver._setBanner(BANNER, s.repaint);
    reduce = false;
    s.driver._setBanner(BANNER);
    delete g.matchMedia;
    s.driver._setBanner(BANNER, s.repaint);
    jest.advanceTimersByTime(10_000);
    expect(s.repaints()).toBe(0);
    expect(blinkTimers.live()).toBe(0);
  });

  test("removing the banner stops the blink, and the next banner blinks again from the start", () => {
    const s = setup();
    s.driver._setBanner(BANNER, s.repaint);
    jest.advanceTimersByTime(700);
    expect(s.bar()).toBe("ink");
    s.driver._setBanner(null, s.repaint);
    expect(blinkTimers.live()).toBe(0);
    s.driver.render(s.buffer);
    expect(s.bar()).toBe("none");
    jest.advanceTimersByTime(10_000);
    expect(s.repaints()).toBe(1);
    s.driver._setBanner(BANNER, s.repaint);
    s.driver.render(s.buffer);
    expect(s.bar()).toBe("amber");
    jest.advanceTimersByTime(8 * 700);
    expect(s.repaints()).toBe(9);
    expect(s.bar()).toBe("amber");
  });

  test("the renderer repaints each swap and clears the timer on dispose", () => {
    const logs: unknown[][] = [];
    const r = new ConsoleRenderer({ console: { log: (...a: unknown[]) => logs.push(a), clear() {} }, viewport: { width: 10, height: 2 }, input: false, registerGlobal: false, minFrameInterval: 0 } as never);
    r._setBanner(BANNER);
    expect(blinkTimers.live()).toBe(1);
    r.renderNow();
    const before = logs.length;
    jest.advanceTimersByTime(700);
    r.renderNow();
    expect(logs.length).toBeGreaterThan(before);
    r.dispose();
    expect(blinkTimers.live()).toBe(0);
  });
});
