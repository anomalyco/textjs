import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChromiumInCache, playwrightCache, resolveChromium } from "../scripts/chromium";
import { resolveServed } from "../scripts/harness";

describe("chromium resolution", () => {
  test("TEXTJS_CHROMIUM wins and must exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "textjs-chromium-"));
    const exe = join(dir, "chrome");
    writeFileSync(exe, "");
    try {
      expect(resolveChromium({ TEXTJS_CHROMIUM: exe })).toBe(exe);
      expect(() => resolveChromium({ TEXTJS_CHROMIUM: join(dir, "missing") })).toThrow("missing");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("scans the Playwright cache for the newest build on each platform", () => {
    const cache = mkdtempSync(join(tmpdir(), "textjs-pw-"));
    try {
      for (const [rev, rel] of [
        ["chromium-900", "chrome-linux/chrome"],
        ["chromium-1100", "chrome-linux64/chrome"],
        ["chromium-1000", "chrome-win64/chrome.exe"],
        ["chromium_headless_shell-2000", "chrome-linux/headless_shell"],
      ] as const) {
        mkdirSync(join(cache, rev, rel, ".."), { recursive: true });
        writeFileSync(join(cache, rev, rel), "");
      }
      expect(findChromiumInCache(cache, "linux")).toBe(join(cache, "chromium-1100/chrome-linux64/chrome"));
      expect(findChromiumInCache(cache, "win32")).toBe(join(cache, "chromium-1000/chrome-win64/chrome.exe"));
      expect(findChromiumInCache(cache, "darwin")).toBeUndefined();
      expect(findChromiumInCache(join(cache, "nope"), "linux")).toBeUndefined();
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }
  });

  test("cache location follows PLAYWRIGHT_BROWSERS_PATH and OS defaults", () => {
    expect(playwrightCache({ PLAYWRIGHT_BROWSERS_PATH: "/pw" }, "linux", "/home/u")).toBe("/pw");
    expect(playwrightCache({}, "linux", "/home/u")).toBe("/home/u/.cache/ms-playwright");
    expect(playwrightCache({}, "darwin", "/Users/u")).toBe("/Users/u/Library/Caches/ms-playwright");
  });
});

describe("harness server", () => {
  test("serves only files inside harness/dist", () => {
    const root = "/srv/dist";
    expect(resolveServed("/", root)).toBe("/srv/dist/index.html");
    expect(resolveServed("/harness.js", root)).toBe("/srv/dist/harness.js");
    expect(resolveServed("/../../etc/passwd", root)).toBeNull();
    expect(resolveServed("/%2e%2e/%2e%2e/etc/passwd", root)).toBeNull();
    expect(resolveServed("/..%2fsecret", root)).toBeNull();
    expect(resolveServed("/%E0%A4%A", root)).toBeNull();
    expect(resolveServed("/a%00b", root)).toBeNull();
  });
});
