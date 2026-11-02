import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { scanApp, toStaticManifest } from "@textjs/app/vite";
import { fileURLToPath } from "node:url";
import type { RouteSegmentNode } from "@textjs/app/router";
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

describe("embed store", () => {
  test("F-13: an embedded shop uses its own store, not the module-global one", async () => {
    const { createEmbeddedShop } = await import("../embed");
    const { getShopStore } = await import("../lib/store");
    const global = getShopStore();
    const shop = createEmbeddedShop({ bases: ["/api/terminal"] });
    expect(shop.store).not.toBe(global);
    expect(getShopStore()).toBe(global);
  });

  test("F-13: odd initial paths open the shop instead of throwing", async () => {
    const { parseInitial } = await import("../components/Shell");
    expect(parseInitial("/account?page=faq").href).toBe("http://x/account?page=faq");
    for (const odd of ["/\\evil.com", "//evil.com", "/\\[::", "http://evil.com/cart"]) expect(parseInitial(odd).pathname).toBe("/shop");
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

  test("adding to the cart asks you to sign in; the cart and the account show where to", async () => {
    h = await mountShop({ site: {}, signedIn: false });
    await h.until("~ featured ~");
    await h.press("down", "down", "+");
    await h.until("sign in to add coffee to your cart");
    expect(h.screen()).toContain("enter sign in   esc back");
    // Signing in charges nothing; checkout asks for a letter before real money moves.
    expect(h.screen()).not.toContain("charged");
    expect(h.api.requests.some((r) => r.path.startsWith("/cart"))).toBe(false);
    await h.press("esc");
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("Your cart is empty.");
    expect(h.screen()).toContain("press enter to sign in");
    await h.press("enter");
    await h.until("sign in to see your cart");
    await h.press("esc");
    await h.until("Your cart is empty.");
    expect(h.history.getLocation().pathname).toBe("/cart");
    await h.press("a");
    await h.until("sign in to see your orders");
    expect(h.screen()).toContain("enter sign in");
    // faq, about and debug info don't need an account.
    for (let i = 0; i < 8; i++) await h.press("down");
    await h.until("help, i have a question about my order!");
    await h.press("down", "down");
    await h.until("not signed in");
    expect(h.api.requests.every((r) => r.path === "/product" && !r.authorized)).toBe(true);
    await h.press("up", "up", "up", "enter");
    await h.until("sign in to see your profile");
    expect(h.screen()).toContain("enter sign in   esc back");
  });

  test("sign in leaves for the proxy's OAuth start with the page to come back to", async () => {
    assigned.length = 0;
    h = await mountShop({ site: {}, signedIn: false, store: { assign: (u) => assigned.push(u) } });
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("press enter to sign in");
    await h.press("enter");
    await h.until("sign in to see your cart");
    await h.press("enter");
    await h.t.waitFor(() => assigned.length === 1, "sign in redirect");
    expect(new URL(assigned[0]!).pathname).toBe("/api/terminal/login");
    expect(new URL(assigned[0]!).search).toBe("?return=%2Fcart");
    await h.press("esc", "a", "down", "enter");
    await h.until("sign in to manage your subscriptions");
    await h.press("enter");
    await h.t.waitFor(() => assigned.length === 2, "second sign in redirect");
    expect(new URL(assigned[1]!).searchParams.get("return")).toBe("/account?page=subscriptions");
  });

  test("the sign in screen fits the smallest console", async () => {
    const shop = (h = await mountShop({ site: {}, signedIn: false, size: { cols: 20, rows: 10 } }));
    await shop.t.waitFor(() => shop.store.s.phase === "ready" && shop.history.getLocation().pathname === "/shop", "shop");
    await shop.press("down", "down", "+");
    await shop.until("esc back");
    expect(shop.screen()).toContain("enter sign in");
    expect(shop.screen()).toContain("terminal");
  });

  test("1 to 3 columns: every screen still renders (the resize view)", async () => {
    const errors: unknown[] = [];
    const consoleError = console.error;
    console.error = (...args: unknown[]) => void errors.push(args);
    try {
      for (const cols of [1, 2, 3]) {
        const shop = (h = await mountShop({ site: {}, signedIn: false, size: { cols, rows: 12 }, store: { initialError: "サインインがキャンセルされました" } }));
        await shop.t.waitFor(() => shop.store.s.phase === "ready" && shop.history.getLocation().pathname === "/shop", "shop");
        await shop.press("esc", "down", "down", "+");
        await shop.t.waitFor(() => shop.store.s.signInPrompt !== null, "sign in");
        await shop.press("esc", "c", "a");
        expect(shop.screen().trim()).not.toBe("");
        await shop.stop();
        h = null;
      }
    } finally {
      console.error = consoleError;
    }
    expect(errors).toEqual([]);
  });

  test("a CJK error wraps on the sign in screen", async () => {
    const shop = (h = await mountShop({ site: {}, signedIn: false, size: { cols: 20, rows: 12 }, store: { initialError: "サインインがキャンセルされました" } }));
    await shop.until("サインインが");
    expect(shop.screen()).toContain("enter sign in");
  });

  test("without a configured OAuth client, sign in says so and browsing still works", async () => {
    h = await mountShop({ site: { configured: false }, signedIn: false, store: { assign: (u) => assigned.push(u) } });
    await h.until("~ featured ~");
    await h.press("c", "enter");
    await h.until("sign in isn't set up here");
    expect(h.screen()).not.toContain("enter sign in");
    const before = assigned.length;
    await h.press("enter");
    expect(assigned.length).toBe(before);
    await h.press("esc");
    await h.until("Your cart is empty.");
  });

  test("F-09: enter on cron (or any product) asks to sign in and comes back to the shop", async () => {
    assigned.length = 0;
    h = await mountShop({ site: {}, signedIn: false, store: { assign: (u) => assigned.push(u) } });
    await h.until("~ featured ~");
    expect(h.screen()).toContain("subscribe");
    await h.press("enter");
    await h.until("sign in to subscribe");
    expect(h.history.getLocation().pathname).toBe("/shop");
    await h.press("enter");
    await h.t.waitFor(() => assigned.length === 1, "sign in redirect");
    expect(new URL(assigned[0]!).searchParams.get("return")).toBe("/shop");
    await h.stop();
    h = await mountShop({ site: {}, signedIn: false });
    await h.until("~ featured ~");
    await h.press("down", "down", "enter");
    await h.until("sign in to see your cart");
  });

  test("a failed callback shows its error on the sign in screen", async () => {
    h = await mountShop({ site: {}, signedIn: false, store: { initialError: "sign in was cancelled" } });
    await h.until("sign in was cancelled");
    await h.press("esc");
    await h.until("~ featured ~");
  });
});

describe("site mode, signed in", () => {
  test("real orders ask for the letter by default behind the site proxy", async () => {
    h = await mountShop({ site: {}, signedIn: true });
    await h.until("~ featured ~");
    expect(h.store.confirmRealOrders).toBe(true);
    await h.stop();
    h = await mountShop({ site: {}, signedIn: true, store: { confirmRealOrders: false } });
    await h.until("~ featured ~");
    expect(h.store.confirmRealOrders).toBe(false);
    await h.stop();
    // The local dev proxy (not a site) keeps the plain flow unless asked.
    h = await mountShop();
    await h.until("~ featured ~");
    expect(h.store.confirmRealOrders).toBe(false);
  });

  /** Walk a seeded cart to the confirm screen. */
  async function toConfirm(x: Harness): Promise<void> {
    await x.until("~ featured ~");
    await x.press("down", "down", "+", "+");
    await x.t.waitFor(() => x.api.state.cart.items[0]?.quantity === 2, "cart synced");
    const addr = { id: "shp_1", name: "Ada Lovelace", street1: "1 Infinite Loop", city: "Cupertino", province: "CA", country: "US", zip: "95014" };
    x.api.state.addresses.push(addr);
    const card = x.api.completeCollect("4242");
    await act(async () => x.store["set"]({ addresses: [addr], cards: [card] }));
    await x.press("c");
    await x.until("segfault");
    await x.press("enter");
    await x.until("1 Infinite Loop");
    await x.press("enter");
    await x.until(/4242/);
    await x.press("enter");
    await x.until("press enter to confirm");
  }

  const codeOn = (screen: string): string => /to (?:place it|subscribe), press (\w) · n to cancel/.exec(screen)?.[1] ?? "";
  const converts = (x: Harness): number => x.api.requests.filter((r) => r.path === "/cart/convert").length;

  test("F-03: a real order needs a letter shown only in the console; y, repeats and scripts don't place it", async () => {
    h = await mountShop({ site: {}, signedIn: true, store: { confirmRealOrders: true } });
    await toConfirm(h);
    expect(h.store.s.auth).toBe("session");
    expect(h.api.requests.every((r) => r.authorized)).toBe(true);
    expect(h.screen()).not.toContain("dev sandbox");
    // A held enter key neither arms nor confirms.
    await h.t.press("Enter", { repeat: true });
    await h.t.settle(5);
    expect(h.screen()).not.toContain("this is a real order");
    await h.press("enter");
    await h.until("this is a real order");
    const code = codeOn(h.screen());
    expect(code).toMatch(/^[bfgiloptuvwz]$/);
    // The old blind script: enter, y.
    await h.press("y", "enter");
    expect(converts(h)).toBe(0);
    expect(h.screen()).toContain("this is a real order");
    // The right letter, held down (auto-repeat), doesn't count either.
    await h.t.press(code, { repeat: true });
    await h.t.settle(5);
    expect(converts(h)).toBe(0);
    await h.press("n");
    await h.until("press enter to confirm");
    await h.press("enter");
    await h.until("this is a real order");
    await h.press(codeOn(h.screen()));
    await h.t.waitFor(() => converts(h!) === 1, "order placed");
    // F-03: subscribing to the order needs its own confirmation.
    await h.until("subscribe to your order?");
    await h.press("enter");
    await h.until("this is a real subscription");
    expect(h.api.requests.some((r) => r.path === "/subscription" && r.method === "POST")).toBe(false);
    await h.press("y", "enter");
    expect(h.api.requests.some((r) => r.path === "/subscription" && r.method === "POST")).toBe(false);
    await h.press(codeOn(h.screen()));
    await h.until("subscribed!");
    expect(h.api.requests.filter((r) => r.path === "/subscription" && r.method === "POST")).toHaveLength(1);
  });

  test("F-03: checkout can't be an entry point", async () => {
    for (const path of ["/confirm", "/payment", "/shipping", "/order/subscribe", "/subscribe"]) {
      h = await mountShop({ site: {}, signedIn: true, store: { confirmRealOrders: true, initialPath: path } });
      await h.until("~ featured ~");
      expect(h.history.getLocation().pathname).toBe("/shop");
      await h.stop();
      h = null;
    }
  });

  test("F-13: the initial path keeps its query (/account?page=faq opens the faq)", async () => {
    h = await mountShop({ site: {}, signedIn: true, store: { initialPath: "/account?page=faq" } });
    await h.until("faq");
    expect(h.history.getLocation().pathname).toBe("/account");
    expect(h.history.getLocation().search).toBe("?page=faq");
  });

  test("F-02: tokens and apps are made in the ssh shop, never from the page", async () => {
    h = await mountShop({ site: {}, signedIn: true, store: { initialPath: "/account?page=tokens" } });
    await h.until("new access tokens are made in the ssh shop:");
    expect(h.screen()).toContain("ssh terminal.shop -t tokens");
    expect(h.screen()).not.toContain("add access token");
    await h.press("enter", "down", "enter");
    expect(h.api.requests.some((r) => r.method === "POST" && (r.path === "/token" || r.path === "/app"))).toBe(false);
    await expect(h.store.createToken()).rejects.toThrow("ssh terminal.shop -t tokens");
    await expect(h.store.createApp("x", "https://example.com/cb")).rejects.toThrow("ssh terminal.shop -t apps");
    await h.press("esc", "down");
    await h.until("new oauth apps are made in the ssh shop:");
    expect(h.screen()).toContain("ssh terminal.shop -t apps");
  });

  test("with TERMINAL_ALLOW_CREDENTIALS, a new token or app takes the console-only letter", async () => {
    h = await mountShop({ site: { credentials: true }, signedIn: true, store: { confirmRealOrders: true, initialPath: "/account?page=tokens" } });
    await h.until("add access token");
    const posts = (path: string): number => h!.api.requests.filter((r) => r.method === "POST" && r.path === path).length;
    await h.press("enter", "down", "enter");
    await h.until("to create a token, press");
    const code = /to create a token, press (\w)/.exec(h.screen())?.[1] ?? "";
    expect(code).toMatch(/^[bfgiloptuvwz]$/);
    await h.press("y", "enter");
    expect(posts("/token")).toBe(0);
    await h.press(code);
    await h.until("(will not be shown again)");
    expect(posts("/token")).toBe(1);
    await h.press("esc", "down", "enter", "enter");
    await h.until("redirect uri");
    await h.t.type("x");
    await h.press("tab");
    await h.t.type("https://example.com/cb");
    await h.press("enter");
    await h.until("to create this app, press");
    await h.press("n");
    await h.until("create app");
    expect(posts("/app")).toBe(0);
  });

  test("F-12: a non-https card link from the API is refused", async () => {
    h = await mountShop({ site: {}, signedIn: true });
    await h.until("~ featured ~");
    await expect(h.store.collectCard()).resolves.toMatchObject({ url: expect.stringMatching(/^https:/) });
    const original = h.store.api.card.collect;
    h.store.api.card.collect = async () => ({ url: "javascript:alert(1)" });
    await expect(h.store.collectCard()).rejects.toThrow("unexpected card link");
    h.store.api.card.collect = original;
  });

  test("F-13: subscribing to an order needs its address and card, and a retry doesn't double up", async () => {
    h = await mountShop({ site: {}, signedIn: true });
    await h.until("~ featured ~");
    const order = { id: "ord_1", items: [{ id: "itm_1", amount: 2200, quantity: 1, productVariantID: h.store.s.products[1]!.variants[0]!.id }, { id: "itm_2", amount: 2200, quantity: 1, productVariantID: h.store.s.products[2]!.variants[0]!.id }] };
    await act(async () => h!.store["set"]({ order: order as never }));
    await expect(h.store.subscribeToOrder(3)).rejects.toThrow("no address or card");
    const addr = { id: "shp_1", name: "Ada", street1: "1 Loop", city: "Cupertino", province: "CA", country: "US", zip: "95014" };
    h.api.state.addresses.push(addr);
    const card = h.api.completeCollect("4242");
    await act(async () => h!.store["set"]({ cart: { ...h!.store.s.cart, addressID: "shp_1", cardID: card.id } }));
    let calls = 0;
    const create = h.store.api.subscription.create;
    h.store.api.subscription.create = async (input) => {
      if (++calls === 2) throw new Error("flaky");
      return create(input);
    };
    await act(async () => {
      await expect(h!.store.subscribeToOrder(3)).rejects.toThrow("flaky");
      await h!.store.subscribeToOrder(3);
    });
    const posts = h.api.requests.filter((r) => r.path === "/subscription" && r.method === "POST");
    expect(posts.map((r) => (r.body as { productVariantID: string }).productVariantID)).toEqual(order.items.map((i) => i.productVariantID));
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
    await h.until("not signed in");
    expect(h.screen()).toContain("enter sign in");
    await h.press("s");
    await h.until("~ featured ~");
  });

  test("F-11: a failed sign out says so and stays signed in", async () => {
    h = await mountShop({ site: {}, signedIn: true, path: "/account?page=debug" });
    await h.until("signed in with terminal, the token stays on the server");
    site(h).failLogout = true;
    await h.press("x");
    await h.until("couldn't sign out, check your connection and try again");
    expect(h.store.s.auth).toBe("session");
    expect(site(h).signedIn).toBe(true);
  });

  test("F-02: signing out clears account data from the page", async () => {
    h = await mountShop({ site: {}, signedIn: true, path: "/account?page=debug" });
    await h.until("signed in with terminal");
    await act(async () => h!.store["set"]({ newToken: { id: "pat_1", token: "trm_live_secret" }, newApp: { id: "cli_1", secret: "sec_x" } }));
    expect(h.store.s.tokens.length).toBeGreaterThan(0);
    await h.press("x");
    await h.t.waitFor(() => site(h!).signOuts === 1 && h!.store.s.auth === null, "signed out");
    const s = h.store.s;
    expect([s.newToken, s.newApp, s.user, s.order]).toEqual([null, null, null, null]);
    expect([s.tokens, s.apps, s.cards, s.addresses, s.orders, s.subscriptions].every((a) => a.length === 0)).toBe(true);
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
