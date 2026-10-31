import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { scanApp, toStaticManifest } from "@textjs/next/vite";
import { fileURLToPath } from "node:url";
import type { RouteSegmentNode } from "@textjs/next/router";
import { routes } from "../embed";
import { mountShop, type Harness } from "./app";
import type { MockSiteProxy } from "./mock-terminal";

/**
 * The shop behind textjs.org's proxy (`mode: "site"`): the session is a server-side
 * cookie, products are public, and everything else asks you to sign in with Terminal.
 */

let h: Harness | null = null;
afterEach(async () => {
  await h?.stop();
  h = null;
});

const assigned: string[] = [];
const site = (h: Harness): MockSiteProxy => h.proxy as MockSiteProxy;

describe("embed", () => {
  test("the embedded route manifest matches app/", () => {
    const paths = (node: RouteSegmentNode, prefix = ""): string[] => {
      const here = node.segment ? `${prefix}/${node.segment}` : prefix;
      const out = node.page ? [here || "/"] : [];
      for (const c of node.children ?? []) out.push(...paths(c, here));
      return out;
    };
    const scanned = toStaticManifest(scanApp(fileURLToPath(new URL("..", import.meta.url))));
    expect(paths(routes).sort()).toEqual(paths(scanned as RouteSegmentNode).sort());
  });
});

describe("site mode, signed out", () => {
  test("browses public products without signing in", async () => {
    h = await mountShop({ site: {}, signedIn: false });
    await h.until("~ featured ~");
    expect(h.store.s.auth).toBe(null);
    expect(h.store.s.user).toBe(null);
    expect(h.store.s.env).toBe("prod");
    await h.press("down", "down");
    expect(h.screen()).toContain("segfault");
    // Only the public product list was requested, never with a token.
    expect(h.api.requests.every((r) => r.path === "/product" && !r.authorized)).toBe(true);
  });

  test("adding to the cart, the cart and the account ask you to sign in", async () => {
    h = await mountShop({ site: {}, signedIn: false });
    await h.until("~ featured ~");
    await h.press("down", "down", "+");
    await h.until("sign in to add coffee to your cart");
    expect(h.screen()).toContain("sign in with terminal (oauth 2.0)");
    expect(h.screen()).toContain("no api key needed");
    expect(h.screen()).toContain("orders are charged and shipped");
    expect(h.api.requests.some((r) => r.path.startsWith("/cart"))).toBe(false);
    await h.press("esc");
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("sign in to see your cart and account");
    await h.press("esc");
    await h.until("~ featured ~");
    expect(h.history.getLocation().pathname).toBe("/shop");
    await h.press("a");
    await h.until("sign in to see your cart and account");
  });

  test("sign in leaves for the proxy's OAuth start with the page to come back to", async () => {
    assigned.length = 0;
    h = await mountShop({ site: {}, signedIn: false, store: { assign: (u) => assigned.push(u) } });
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("sign in to see your cart and account");
    await h.press("enter");
    await h.t.waitFor(() => assigned.length === 1, "sign in redirect");
    expect(new URL(assigned[0]!).pathname).toBe("/api/terminal/login");
    expect(new URL(assigned[0]!).search).toBe("?return=%2Fcart");
  });

  test("without a configured OAuth client, sign in says so and browsing still works", async () => {
    h = await mountShop({ site: { configured: false }, signedIn: false, store: { assign: (u) => assigned.push(u) } });
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("sign in isn't set up on this deployment yet");
    const before = assigned.length;
    await h.press("enter");
    expect(assigned.length).toBe(before);
    await h.press("esc");
    await h.until("~ featured ~");
  });

  test("a failed callback shows its error on the sign in screen", async () => {
    h = await mountShop({ site: {}, signedIn: false, store: { initialError: "sign in was cancelled" } });
    await h.until("sign in was cancelled");
    await h.press("esc");
    await h.until("~ featured ~");
  });
});

describe("site mode, signed in", () => {
  test("cart → shipping → payment → confirm asks y/n before a real order", async () => {
    h = await mountShop({ site: {}, signedIn: true, store: { confirmRealOrders: true } });
    await h.until("~ featured ~");
    expect(h.store.s.auth).toBe("session");
    // Every API call carried the server-side session, none sent a token from the page.
    expect(h.api.requests.every((r) => r.authorized)).toBe(true);
    await h.press("down", "down", "+", "+");
    await h.t.waitFor(() => h!.api.state.cart.items[0]?.quantity === 2, "cart synced");
    await h.press("c");
    await h.until("segfault");
    // Seed an address and a card so checkout goes straight to confirm.
    const addr = { id: "shp_1", name: "Ada Lovelace", street1: "1 Infinite Loop", city: "Cupertino", province: "CA", country: "US", zip: "95014" };
    h.api.state.addresses.push(addr);
    const card = h.api.completeCollect("4242");
    await act(async () => h!.store["set"]({ addresses: [addr], cards: [card] }));
    await h.press("enter");
    await h.until("1 Infinite Loop");
    await h.press("enter");
    await h.until(/4242/);
    await h.press("enter");
    await h.until("press enter to confirm");
    expect(h.screen()).not.toContain("dev sandbox");
    await h.press("enter");
    await h.until("this is a real order");
    expect(h.screen()).toContain("place it? (y/n)");
    await h.press("n");
    await h.until("press enter to confirm");
    expect(h.api.requests.some((r) => r.path === "/cart/convert")).toBe(false);
    await h.press("enter");
    await h.until("this is a real order");
    await h.press("y");
    await h.t.waitFor(() => h!.api.requests.some((r) => r.path === "/cart/convert"), "order placed");
    expect(h.api.requests.filter((r) => r.path === "/cart/convert")).toHaveLength(1);
  });

  test("the environment can't be switched; sign out goes back to browsing", async () => {
    h = await mountShop({ site: {}, signedIn: true, path: "/account?page=debug" });
    await h.until("signed in with terminal, the token stays on the server");
    expect(h.screen()).toContain("oauth 2.0 (terminal sign in)");
    expect(h.screen()).not.toContain("switch to dev sandbox");
    let switched = true;
    await act(async () => {
      switched = h!.store.switchEnv("dev");
    });
    expect(switched).toBe(false);
    expect(h.store.s.error).toContain("only connects to production");
    await act(async () => h!.store.setError(null));
    await h.press("x");
    await h.t.waitFor(() => site(h!).signOuts === 1 && h!.store.s.auth === null, "signed out");
    await h.until("sign in to see your cart and account");
    await h.press("esc");
    await h.until("~ featured ~");
  });

  test("an expired session falls back to signed-out browsing", async () => {
    h = await mountShop({ site: {}, signedIn: true });
    await h.until("~ featured ~");
    site(h).signedIn = false;
    await h.press("down", "down", "+");
    await h.until("your terminal session ended, sign in again");
    expect(h.store.s.auth).toBe(null);
    await h.press("esc");
    await h.until("~ featured ~");
  });
});
