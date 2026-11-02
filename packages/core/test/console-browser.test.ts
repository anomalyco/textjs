import { describe, expect, test } from "bun:test";
import {
  analyzeDock,
  CellBuffer,
  CHROME_STORAGE_KEY,
  ConsoleRenderer,
  CssConsoleDriver,
  detectConsoleBrowser,
  isPassthroughShortcut,
  ViewportController,
  type StorageLike,
  type WindowLike,
} from "../src/index";
import { CONSOLE_PROFILES, consoleProfile } from "../src/drivers/console-browser";
import { FakeConsole } from "./fixtures";

const BG = 0x18181bff;
const FG = 0xededf0ff;

/** A browser-like global whose `CSS.supports` accepts only `supported` property names. */
function browser(supported: string[], extra: Record<string, unknown> = {}) {
  return { document: {}, navigator: {}, CSS: { supports: (property: string) => supported.includes(property) }, ...extra };
}

describe("detectConsoleBrowser", () => {
  test("is null outside a browser", () => {
    expect(detectConsoleBrowser({})).toBeNull();
    expect(detectConsoleBrowser({ navigator: {} })).toBeNull();
    expect(detectConsoleBrowser({ document: {} })).toBeNull();
    // Bun and Node.js under test.
    expect(detectConsoleBrowser()).toBeNull();
  });

  test("Chromium exposes window.chrome or navigator.userAgentData", () => {
    expect(detectConsoleBrowser(browser([], { chrome: {} }))).toBe("chromium");
    expect(detectConsoleBrowser(browser([], { navigator: { userAgentData: {} } }))).toBe("chromium");
    // Chromium wins even if it ever gains a WebKit alias.
    expect(detectConsoleBrowser(browser(["-webkit-hyphens"], { chrome: {} }))).toBe("chromium");
  });

  test("Firefox supports -moz-appearance, checked first", () => {
    expect(detectConsoleBrowser(browser(["-moz-appearance"]))).toBe("firefox");
    // An extension's `window.chrome` shim doesn't turn Firefox into Chromium.
    expect(detectConsoleBrowser(browser(["-moz-appearance"], { chrome: {} }))).toBe("firefox");
    // Falsy globals don't count as Chromium.
    expect(detectConsoleBrowser(browser(["-webkit-hyphens"], { chrome: null, navigator: { userAgentData: undefined } }))).toBe("safari");
  });

  test("Safari supports -webkit-hyphens or -webkit-backdrop-filter", () => {
    expect(detectConsoleBrowser(browser(["-webkit-hyphens"]))).toBe("safari");
    expect(detectConsoleBrowser(browser(["-webkit-backdrop-filter"]))).toBe("safari");
  });

  test("anything else is treated as Chromium", () => {
    expect(detectConsoleBrowser(browser([]))).toBe("chromium");
    expect(detectConsoleBrowser({ document: {}, CSS: { supports: () => { throw new Error("nope"); } } })).toBe("chromium");
  });

  test("defaults to the Chromium profile outside a browser", () => {
    expect(consoleProfile()).toBe(CONSOLE_PROFILES.chromium);
  });
});

function frameFor(browserName?: "chromium" | "firefox" | "safari"): { format: string; args: string[] } {
  const con = new FakeConsole();
  const d = new CssConsoleDriver({ console: con, curtain: true, browser: browserName });
  const b = new CellBuffer(4, 2);
  b.fillRect(0, 0, 4, 2, BG);
  b.drawText(0, 0, "ab", FG, BG);
  d.render(b);
  return con.last;
}

describe("CssConsoleDriver per browser", () => {
  test("Chromium frames are unchanged: 16px line height, -1px margins, margin curtain", () => {
    const { format, args } = frameFor("chromium");
    expect(format.startsWith("%c\u200b%c\n")).toBe(true);
    expect(args[0]).toBe("margin-top:100vh;");
    expect(args[2]).toContain("line-height:16px;margin-top:-1px;margin-bottom:-1px;");
    expect(args[2]).not.toContain("text-wrap-mode");
    expect(frameFor()).toEqual({ format, args });
  });

  test("Safari puts Menlo first, the font its pages can measure", () => {
    const css = frameFor("safari").args[2] ?? "";
    expect(css.startsWith('font-family:Menlo,"SF Mono",Consolas,monospace;font-size:12px;line-height:14px;')).toBe(true);
    expect(css).not.toContain("font-variant-ligatures");
    expect(frameFor("firefox").args[2]?.startsWith('font-family:"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace;')).toBe(true);
  });

  for (const name of ["firefox", "safari"] as const) {
    test(`${name}: inline spans get 14px rows, no margins, no wrapping and a line-height curtain`, () => {
      const { format, args } = frameFor(name);
      expect(format.startsWith("%c\u200b%c\n")).toBe(true);
      expect(args[0]).toBe("line-height:100vh;");
      expect(args[1]).toBe("");
      const css = args[2] ?? "";
      expect(css).toContain("line-height:14px;text-wrap-mode:nowrap;");
      expect(css).not.toContain("margin");
      expect(css).not.toContain("padding");
      expect(css).toContain("background-color:");
    });
  }

  test("explicit typography still wins over the browser defaults", () => {
    const con = new FakeConsole();
    const d = new CssConsoleDriver({ console: con, browser: "firefox", typography: { lineHeight: 15, rowPaddingY: 1 } });
    expect(d.typography.lineHeight).toBe(15);
    const b = new CellBuffer(2, 1);
    b.fillRect(0, 0, 2, 1, BG);
    d.render(b);
    expect(con.last.args[0]).toContain("line-height:15px;text-wrap-mode:nowrap;padding-top:1px;padding-bottom:1px;");
  });

  test("the browser never changes the text of a frame", () => {
    const strip = (f: { format: string }) => f.format;
    expect(strip(frameFor("firefox"))).toBe(strip(frameFor("chromium")));
    expect(strip(frameFor("safari"))).toBe(strip(frameFor("chromium")));
  });
});

describe("fitting the console per browser", () => {
  // DevTools docked at the bottom: a 1440 × 400 panel.
  const win: WindowLike = { innerWidth: 1440, innerHeight: 412, outerWidth: 1440, outerHeight: 900 };
  const fit = (name: "chromium" | "firefox" | "safari") =>
    new ViewportController({ responsive: true, window: win, charWidth: 7.2, scrollbarWidth: 0, storage: null, browserChromeHeight: 88, maxCols: 999, browser: name }).getSize();

  test("Firefox leaves room for its source link column", () => {
    expect(fit("chromium")).toEqual({ cols: Math.floor((1440 - 56) / 7.2), rows: Math.floor((400 - 104) / 14), dock: "bottom" });
    expect(fit("firefox")).toEqual({ cols: Math.floor((1440 - 140) / 7.2), rows: Math.floor((400 - 104) / 14), dock: "bottom" });
  });

  test("Safari uses the full width", () => {
    expect(fit("safari")).toEqual({ cols: Math.floor((1440 - 40) / 7.2), rows: Math.floor((400 - 104) / 14), dock: "bottom" });
  });

  test("a renderer passes its browser to the viewport unless the viewport names one", () => {
    const base = { console: { clear() {}, log() {} }, input: false, registerGlobal: false } as const;
    const vp = { responsive: true, window: win, charWidth: 7.2, scrollbarWidth: 0, storage: null, browserChromeHeight: 88, maxCols: 999 };
    expect(new ConsoleRenderer({ ...base, browser: "firefox", viewport: { ...vp, browser: undefined } }).viewport.cols).toBe(Math.floor((1440 - 140) / 7.2));
    expect(new ConsoleRenderer({ ...base, browser: "firefox", viewport: { ...vp, browser: "safari" } }).viewport.cols).toBe(Math.floor((1440 - 40) / 7.2));
  });
});

describe("slim browser chrome", () => {
  class Storage implements StorageLike {
    data = new Map<string, string>();
    getItem(k: string): string | null {
      return this.data.get(k) ?? null;
    }
    setItem(k: string, v: string): void {
      this.data.set(k, v);
    }
  }
  // Safari's toolbar is about 52px and Firefox's about 40px, well under the 120px assumed until learned.
  for (const chrome of [52, 40]) {
    test(`a ${chrome}px toolbar is learned while DevTools is closed, then used to size a bottom dock`, () => {
      expect(analyzeDock({ innerWidth: 1440, innerHeight: 900 - chrome, outerWidth: 1440, outerHeight: 900 })).toMatchObject({ dock: "undocked", chromeSample: chrome });
      const w = { innerWidth: 1440, innerHeight: 900 - chrome, outerWidth: 1440, outerHeight: 900 };
      const storage = new Storage();
      const v = new ViewportController({ responsive: true, window: w, charWidth: 7.2, scrollbarWidth: 0, storage, debounceMs: 0, browser: "chromium" });
      expect(storage.getItem(CHROME_STORAGE_KEY)).toBe(String(chrome));
      // Dock a 400px console at the bottom.
      w.innerHeight = 900 - chrome - 400;
      expect(v.refresh()).toMatchObject({ dock: "bottom", rows: Math.floor((400 - 104) / 14) });
    });
  }
});

test("⌘⌥K and Ctrl+Shift+K (Firefox's console) pass through to the browser", () => {
  const key = (k: string, mods: { metaKey?: boolean; altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => ({ key: k, code: "", metaKey: false, altKey: false, ctrlKey: false, shiftKey: false, ...mods, preventDefault() {} });
  expect(isPassthroughShortcut(key("k", { metaKey: true, altKey: true }))).toBe(true);
  expect(isPassthroughShortcut(key("K", { ctrlKey: true, shiftKey: true }))).toBe(true);
  expect(isPassthroughShortcut(key("k", { ctrlKey: true }))).toBe(false);
});
