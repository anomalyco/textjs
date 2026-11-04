import { describe, expect, test } from "bun:test";
import {
  analyzeDock,
  CHROME_STORAGE_KEY,
  consoleGridFor,
  estimateDockedConsoleSize,
  snapZoom,
  ViewportController,
  type StorageLike,
  type WindowLike,
} from "../src/index";

const CHAR_W = 7.2246875; // SF Mono 12px, as measured inside DevTools
const LINE = 14;
const UNCLAMPED = { minCols: 1, minRows: 1, maxCols: 999, maxRows: 999 };

const win = (o: Partial<WindowLike>): WindowLike => ({ innerWidth: 1440, innerHeight: 812, outerWidth: 1440, outerHeight: 900, ...o });

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

class FakeWindow implements WindowLike {
  innerWidth = 1440;
  innerHeight = 812;
  outerWidth = 1440;
  outerHeight = 900;
  private listeners = new Set<() => void>();
  addEventListener(_: "resize", l: () => void): void {
    this.listeners.add(l);
  }
  removeEventListener(_: "resize", l: () => void): void {
    this.listeners.delete(l);
  }
  fire(): void {
    for (const l of this.listeners) l();
  }
  get listenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Real DevTools measurements (Chrome for Testing 14x, DevTools zoom 100%,
 * browser chrome 143px): page-visible window metrics and the largest frame
 * that fit `#console-messages` without wrapping or scrolling.
 */
const MEASURED: Array<{ label: string; outer: [number, number]; inner: [number, number]; max: [number, number]; dpr?: number }> = [
  { label: "bottom 300", outer: [1280, 800], inner: [1280, 357], max: [169, 14] },
  { label: "bottom 200", outer: [1280, 800], inner: [1280, 457], max: [169, 7] },
  { label: "bottom 300, narrow window", outer: [900, 800], inner: [900, 357], max: [117, 14] },
  { label: "bottom 450", outer: [1440, 900], inner: [1440, 307], max: [191, 24] },
  { label: "bottom 600", outer: [1728, 1080], inner: [1728, 337], max: [231, 35] },
  { label: "right 555", outer: [1280, 800], inner: [725, 657], max: [69, 39] },
  { label: "right 700", outer: [1440, 900], inner: [740, 757], max: [89, 46] },
  { label: "left 555", outer: [1440, 900], inner: [885, 757], max: [69, 46] },
  { label: "right 380 (toolbar wraps)", outer: [1280, 800], inner: [900, 657], max: [44, 37] },
  { label: "right 300 (toolbar wraps twice)", outer: [1280, 800], inner: [980, 657], max: [33, 35] },
  { label: "bottom 250, page zoom 125%", outer: [1280, 800], inner: [1024, 326], max: [169, 10], dpr: 1.25 },
  { label: "right 600, page zoom 125%", outer: [1280, 800], inner: [544, 526], max: [75, 39], dpr: 1.25 },
  { label: "bottom 250, page zoom 80%", outer: [1280, 800], inner: [1600, 508], max: [169, 10], dpr: 0.8 },
];

describe("estimateDockedConsoleSize", () => {
  for (const m of MEASURED) {
    test(`fits without wrapping or scrolling: ${m.label}`, () => {
      const s = estimateDockedConsoleSize(win({ outerWidth: m.outer[0], outerHeight: m.outer[1], innerWidth: m.inner[0], innerHeight: m.inner[1], devicePixelRatio: m.dpr ?? 2 }), CHAR_W, LINE, {
        ...UNCLAMPED,
        browserChromeHeight: 143,
      });
      expect(s.dock).toBe(m.label.startsWith("bottom") ? "bottom" : "side");
      expect(s.cols).toBeLessThanOrEqual(m.max[0]);
      expect(s.rows).toBeLessThanOrEqual(m.max[1]);
      // Fills the console: at most one column/two rows short.
      expect(s.cols).toBeGreaterThanOrEqual(m.max[0] - 1);
      expect(s.rows).toBeGreaterThanOrEqual(m.max[1] - 2);
    });
  }

  test("closed or undocked DevTools falls back", () => {
    expect(estimateDockedConsoleSize(win({}), CHAR_W, LINE)).toEqual({ cols: 120, rows: 36, dock: "undocked" });
    expect(estimateDockedConsoleSize(win({}), CHAR_W, LINE, { fallbackCols: 90, fallbackRows: 30 })).toEqual({ cols: 90, rows: 30, dock: "undocked" });
    expect(estimateDockedConsoleSize(win({}), CHAR_W, LINE, { width: 100, height: 32 })).toEqual({ cols: 100, rows: 32, dock: "undocked" });
    // Fullscreen, no browser chrome at all.
    expect(estimateDockedConsoleSize(win({ outerHeight: 812 }), CHAR_W, LINE).dock).toBe("undocked");
    // Zoomed page with DevTools closed.
    expect(estimateDockedConsoleSize(win({ innerWidth: 1152, innerHeight: 624 }), CHAR_W, LINE, { browserChromeHeight: 120 }).dock).toBe("undocked");
    // Emulated viewports (outer smaller than inner, integer DPR) are not a zoomed side dock.
    expect(estimateDockedConsoleSize(win({ outerWidth: 1280, outerHeight: 720, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 }), CHAR_W, LINE).dock).toBe("undocked");
    // Zoom 150% on a 2x display (DPR 3) can't be told from a dock: fall back rather than guess.
    expect(estimateDockedConsoleSize(win({ innerWidth: 960, innerHeight: 275, devicePixelRatio: 3 }), CHAR_W, LINE, { browserChromeHeight: 88 }).dock).toBe("undocked");
  });

  test("clamps to min and max", () => {
    const tiny = estimateDockedConsoleSize(win({ innerWidth: 1180 }), CHAR_W, LINE, { browserChromeHeight: 88 });
    expect(tiny).toEqual({ cols: 40, rows: Math.floor((812 - 104 - 52) / LINE), dock: "side" });
    const huge = estimateDockedConsoleSize(win({ outerWidth: 3000, innerWidth: 3000, outerHeight: 2000, innerHeight: 400 }), CHAR_W, LINE, { browserChromeHeight: 88 });
    expect(huge).toEqual({ cols: 200, rows: 60, dock: "bottom" });
  });

  test("DevTools zoom shrinks the grid", () => {
    const w = win({ innerHeight: 412 });
    const base = estimateDockedConsoleSize(w, CHAR_W, LINE, { browserChromeHeight: 88 });
    const zoomed = estimateDockedConsoleSize(w, CHAR_W, LINE, { browserChromeHeight: 88, devtoolsZoom: 1.25 });
    expect(zoomed.cols).toBeLessThan(base.cols);
    expect(zoomed.rows).toBeLessThan(base.rows);
  });
});

describe("analyzeDock", () => {
  test("separates page zoom from a docked panel", () => {
    expect(analyzeDock(win({ innerHeight: 412 }), 88)).toMatchObject({ dock: "bottom", zoom: 1, panelHeight: 400 });
    expect(analyzeDock(win({ innerWidth: 940 }), 88)).toMatchObject({ dock: "side", zoom: 1, panelWidth: 500, panelHeight: 812 });
    expect(analyzeDock(win({ innerWidth: 1152, innerHeight: 328, devicePixelRatio: 2.5 }), 88)).toMatchObject({ dock: "bottom", zoom: 1.25, panelHeight: 402 });
    expect(analyzeDock(win({ innerWidth: 752, innerHeight: 650, devicePixelRatio: 2.5 }), 88)).toMatchObject({ dock: "side", zoom: 1.25, panelWidth: 500 });
    // A 2x display at 100% only considers zoom 1.
    expect(analyzeDock(win({ innerWidth: 1152, innerHeight: 328, devicePixelRatio: 2 }), 88).zoom).toBe(1);
  });

  test("reports the browser chrome height when DevTools isn't at the bottom", () => {
    expect(analyzeDock(win({}), 120).chromeSample).toBe(88);
    expect(analyzeDock(win({ innerWidth: 940 }), 120).chromeSample).toBe(88);
    expect(analyzeDock(win({ innerHeight: 412 }), 120).chromeSample).toBeNull();
  });

  test("snapZoom keeps to Chrome's presets", () => {
    expect(snapZoom(1.02)).toBe(1);
    expect(snapZoom(1.3)).toBe(1.25);
    expect(snapZoom(0.79)).toBe(0.8);
    expect(snapZoom(1.766)).toBe(1.75);
    expect(snapZoom(1.4)).toBeNull();
    expect(snapZoom(1.15)).toBe(1.15);
    expect(snapZoom(0.85)).toBe(0.85);
  });

  test("Safari's 115% zoom with DevTools closed isn't a side dock", () => {
    // 1440×900 window, Safari's 52px toolbar: ⌘+ once makes the page 1252×737 CSS pixels.
    const zoomed = { innerWidth: 1252, innerHeight: 737, outerWidth: 1440, outerHeight: 900, devicePixelRatio: 2.3 };
    expect(analyzeDock(zoomed, 120)).toMatchObject({ dock: "undocked", zoom: 1.15 });
    expect(analyzeDock({ ...zoomed, devicePixelRatio: undefined }, 52).dock).toBe("undocked");
  });

  test("consoleGridFor accounts for a classic scrollbar", () => {
    expect(consoleGridFor(1000, 500, CHAR_W, LINE).cols).toBe(Math.floor(944 / CHAR_W));
    expect(consoleGridFor(1000, 500, CHAR_W, LINE, { scrollbarWidth: 15 }).cols).toBe(Math.floor(929 / CHAR_W));
  });
});

describe("ViewportController", () => {
  test("fixed size", () => {
    const v = new ViewportController({ width: 120, height: 40, window: null });
    expect(v.getSize()).toEqual({ cols: 120, rows: 40, dock: "fixed" });
  });

  test("learns the browser chrome height while DevTools is closed", () => {
    const w = new FakeWindow();
    const storage = new MemoryStorage();
    const v = new ViewportController({ responsive: true, window: w, charWidth: CHAR_W, scrollbarWidth: 0, storage, debounceMs: 0 });
    expect(v.dock).toBe("undocked");
    expect(storage.getItem(CHROME_STORAGE_KEY)).toBe("88");
    w.innerHeight = 412;
    w.fire();
    // 400px panel: (400 - 104) / 14.
    expect(v.getSize()).toEqual({ cols: 191, rows: 21, dock: "bottom" });
    // A reload with DevTools already open reuses the learned height.
    const again = new ViewportController({ responsive: true, window: w, charWidth: CHAR_W, scrollbarWidth: 0, storage });
    expect(again.rows).toBe(21);
    const fresh = new ViewportController({ responsive: true, window: w, charWidth: CHAR_W, scrollbarWidth: 0, storage: null });
    expect(fresh.rows).toBeLessThan(21);
  });

  test("debounces drag resizes but applies dock changes at once", async () => {
    const w = new FakeWindow();
    const v = new ViewportController({ responsive: true, window: w, charWidth: CHAR_W, scrollbarWidth: 0, storage: null, browserChromeHeight: 88, debounceMs: 20 });
    const seen: string[] = [];
    v.subscribe((s) => seen.push(`${s.dock}:${s.cols}x${s.rows}`));
    w.innerWidth = 940;
    w.fire();
    // 499px console: the toolbar wraps onto a second row.
    expect(seen).toEqual(["side:61x48"]);
    w.innerWidth = 900;
    w.fire();
    w.innerWidth = 840;
    w.fire();
    expect(seen.length).toBe(1);
    await new Promise((r) => setTimeout(r, 40));
    expect(seen).toEqual(["side:61x48", "side:75x50"]);
    v.dispose();
    expect(w.listenerCount).toBe(0);
  });

  test("responsive refresh notifies subscribers; setSize pins and keeps the fallback", () => {
    const w = new FakeWindow();
    w.innerWidth = 700;
    const v = new ViewportController({ responsive: true, window: w, charWidth: CHAR_W, scrollbarWidth: 0, storage: null, browserChromeHeight: 88, width: 100, height: 30 });
    const sizes: number[] = [];
    v.subscribe((s) => sizes.push(s.cols));
    w.innerWidth = 900;
    v.refresh();
    v.refresh();
    expect(sizes).toEqual([Math.floor((540 - 1 - 56) / CHAR_W)]);
    v.setSize(80, 24);
    expect(v.getSize()).toEqual({ cols: 80, rows: 24, dock: "fixed" });
    expect(w.listenerCount).toBe(0);
    w.innerWidth = 1440;
    v.setResponsive(true);
    expect(v.getSize()).toEqual({ cols: 100, rows: 30, dock: "undocked" });
    expect(v.measure().dock).toBe("undocked");
  });
});
