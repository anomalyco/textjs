import { describe, expect, test } from "bun:test";
import {
  CellBuffer,
  CONSOLE_PROFILES,
  consoleProfile,
  CssConsoleDriver,
  detectConsoleBrowser,
  isPassthroughShortcut,
  ViewportController,
  type WindowLike,
} from "../src/index";
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

  test("Firefox supports -moz-appearance", () => {
    expect(detectConsoleBrowser(browser(["-moz-appearance"]))).toBe("firefox");
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

  test("Safari rows are fitted at 15px", () => {
    expect(fit("safari")).toEqual({ cols: Math.floor((1440 - 40) / 7.2), rows: Math.floor((400 - 104) / 15), dock: "bottom" });
  });
});

test("⌘⌥K and Ctrl+Shift+K (Firefox's console) pass through to the browser", () => {
  const key = (k: string, mods: { metaKey?: boolean; altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => ({ key: k, code: "", metaKey: false, altKey: false, ctrlKey: false, shiftKey: false, ...mods, preventDefault() {} });
  expect(isPassthroughShortcut(key("k", { metaKey: true, altKey: true }))).toBe(true);
  expect(isPassthroughShortcut(key("K", { ctrlKey: true, shiftKey: true }))).toBe(true);
  expect(isPassthroughShortcut(key("k", { ctrlKey: true }))).toBe(false);
});
