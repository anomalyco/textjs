import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { existsSync, readFileSync } from "node:fs";
import { LARGE, layoutFor, MEDIUM, SMALL, UNDERSIZED } from "../lib/frame";
import { toText, type Grid } from "../parity/grid";
import { renderOurs, withoutExtraMenuRows } from "../parity/ours";
import { SHOTS, shotId } from "../parity/shots";
import { mountShop, type Harness } from "./app";

/**
 * The SSH shop's responsive layout (`root.go`'s `tea.WindowSizeMsg` handler): size classes,
 * the container centered in the console, and the per-size header, footer, shop and account.
 */

let h: Harness | null = null;
afterEach(async () => {
  await h?.stop();
  h = null;
});

const rows = (s: string): string[] => s.split("\n");

describe("size classes", () => {
  test("undersized, small, medium and large, like root.go", () => {
    expect(layoutFor(120, 40)).toEqual({ size: LARGE, viewportWidth: 120, viewportHeight: 40, widthContainer: 80, heightContainer: 30, widthContent: 78, heightContent: 19 });
    expect(layoutFor(80, 30)).toMatchObject({ size: LARGE, widthContainer: 80, heightContainer: 30 });
    expect(layoutFor(80, 24)).toMatchObject({ size: LARGE, widthContainer: 80, heightContainer: 24, heightContent: 13 });
    expect(layoutFor(79, 40)).toMatchObject({ size: MEDIUM, widthContainer: 50, heightContainer: 30, widthContent: 48 });
    expect(layoutFor(50, 20)).toMatchObject({ size: MEDIUM, widthContainer: 50, heightContainer: 20 });
    // Small uses the whole console, even past 30 rows, and its footer is 3 rows.
    expect(layoutFor(49, 40)).toMatchObject({ size: SMALL, widthContainer: 49, heightContainer: 40, widthContent: 47, heightContent: 31 });
    expect(layoutFor(20, 10)).toMatchObject({ size: SMALL });
    expect(layoutFor(19, 30).size).toBe(UNDERSIZED);
    expect(layoutFor(80, 9).size).toBe(UNDERSIZED);
  });
});

describe("placement", () => {
  test("large: the 80 × 30 container is centered in a bigger console", async () => {
    h = await mountShop({ size: { cols: 120, rows: 40 } });
    await h.until("~ featured ~");
    const r = rows(h.screen());
    expect(r.slice(0, 5).every((l) => l.trim() === "")).toBe(true);
    expect(r[5]!.indexOf("┌")).toBe(21);
    expect(r[6]).toContain("s shop");
    expect(r[33]).toContain("r 🇺🇸 (US)");
    // The theme background fills the rest of the console.
    const buf = h.t.root.renderer.buffer;
    expect(buf.getCell(0, 0)!.bg >>> 8).toBe(0);
    expect(buf.getCell(119, 39)!.bg >>> 8).toBe(0);
  });

  test("medium: a 50-wide container with m ☰, the logo and the cart; short breadcrumbs", async () => {
    h = await mountShop({ size: { cols: 60, rows: 24 } });
    await h.until("~ featured ~");
    const r = rows(h.screen());
    expect(r[1]).toContain("m ☰");
    expect(r[1]).toContain("terminal");
    expect(r[1]).not.toContain("s shop");
    expect(r[0]!.indexOf("┌")).toBe(6);
    await h.press("down", "down", "+", "c");
    await h.until("cart / ship / pay / confirm");
  });

  test("small: the whole console, t and the cart, and only `m menu` in the footer", async () => {
    h = await mountShop({ size: { cols: 45, rows: 30 } });
    await h.until("c cart");
    await h.press("c");
    await h.until("Your cart is empty.");
    const r = rows(h.screen());
    expect(r[1]).toMatch(/│\s+t\s+│\s+c cart \$ 0 \[0\]\s+│/);
    expect(r[28]!.trim()).toBe("m menu");
    expect(h.screen()).not.toContain("free shipping");
  });

  test("below 20 × 10 every page shows ResizeView and keeps its state", async () => {
    h = await mountShop({ size: { cols: 80, rows: 30 } });
    await h.until("~ featured ~");
    await h.press("down", "down");
    await act(async () => h!.t.root.renderer.resize(18, 8));
    await h.until("is too small");
    expect(rows(h.screen())[3]).toContain("terminal");
    // Keys still reach the page, like the ssh shop.
    await h.press("up");
    await act(async () => h!.t.root.renderer.resize(80, 30));
    await h.until("~ featured ~");
    expect(h.store.s.shopSelected).toBe(1);
  });

  test("resizing re-lays the page out live", async () => {
    h = await mountShop({ size: { cols: 80, rows: 30 } });
    await h.until("~ featured ~");
    await act(async () => h!.t.root.renderer.resize(60, 24));
    await h.until("m ☰");
    await act(async () => h!.t.root.renderer.resize(120, 40));
    await h.until("s shop");
    expect(rows(h.screen())[5]!.indexOf("┌")).toBe(21);
  });
});

describe("per-size pages", () => {
  test("shop and account stack their viewports below the large layout", async () => {
    h = await mountShop({ size: { cols: 45, rows: 20 } });
    await h.until("~ featured ~");
    const shop = rows(h.screen());
    // The centered product list fills the body; the details start below it and the footer is pushed out.
    expect(shop[5]!.trim()).toBe("cron");
    expect(shop[17]).toBe("cron");
    expect(h.screen()).not.toContain("q quit");
    await h.press("a");
    await h.until("order history");
    expect(rows(h.screen())[4]!.trim()).toBe("order history");
    expect(rows(h.screen())[4]!.indexOf("order history")).toBeGreaterThan(10);
  });

  test("small address forms stack their two columns", async () => {
    h = await mountShop({ size: { cols: 45, rows: 40 } });
    await h.until("c cart");
    await h.press("a", "down", "down", "down", "down", "enter", "n");
    await h.until("add address");
    const r = rows(h.screen());
    const name = r.findIndex((l) => l.includes("name"));
    const state = r.findIndex((l) => l.includes("state"));
    expect(state).toBeGreaterThan(name + 10);
  });
});

describe("matches ssh terminal.shop at every size (parity/ssh captures)", () => {
  // debug info shows the session (ssh key vs. token), so it differs on purpose.
  const shots = SHOTS.filter((s) => s.name !== "account-debug" && existsSync(new URL(`../parity/ssh/${shotId(s)}.json`, import.meta.url)));
  for (const s of shots) {
    test(shotId(s), async () => {
      const ssh = JSON.parse(readFileSync(new URL(`../parity/ssh/${shotId(s)}.json`, import.meta.url), "utf8")) as Grid;
      const ours = await renderOurs(s);
      expect(withoutExtraMenuRows(toText(ours), s.cols)).toBe(toText(ssh));
    });
  }
});
