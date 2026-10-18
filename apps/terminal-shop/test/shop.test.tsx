import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mountShop, type Harness } from "./app";

let h: Harness | null = null;
afterEach(async () => {
  await h?.stop();
  h = null;
});

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/ssh/${name}.txt`, import.meta.url), "utf8")
    .split("\n")
    .slice(0, 30)
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
const trimmed = (s: string): string =>
  s
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");

/** Fill the address form (name is prefilled from the profile). */
async function fillAddress(x: Harness): Promise<void> {
  await x.press("tab");
  await x.t.type("1 Infinite Loop");
  await x.press("tab", "tab");
  await x.t.type("Cupertino");
  await x.press("tab");
  await x.t.type("CA");
  await x.press("tab", "tab", "tab");
  await x.t.type("95014");
}

describe("matches the ssh shop (captured from `ssh terminal.shop`, 80×30)", () => {
  test("shop, cart, account and menu screens", async () => {
    h = await mountShop();
    h.api.state.tokens = [];
    await h.until("~ featured ~");
    expect(trimmed(h.screen())).toBe(fixture("shop-cron"));
    await h.press("down", "down");
    expect(trimmed(h.screen())).toBe(fixture("shop-segfault"));
    await h.press("c");
    await h.until("Your cart is empty.");
    expect(trimmed(h.screen())).toBe(fixture("cart-empty"));
    await h.press("a");
    await h.until("no orders found");
    expect(trimmed(h.screen())).toBe(fixture("account-orders"));
    for (const name of ["account-subscriptions", "account-tokens"]) {
      await h.press("down");
      expect(trimmed(h.screen())).toBe(fixture(name));
    }
    await h.press("down", "down");
    expect(trimmed(h.screen())).toBe(fixture("account-addresses"));
    await h.press("down", "down");
    expect(trimmed(h.screen())).toBe(fixture("account-faq"));
    await h.press("down");
    expect(trimmed(h.screen())).toBe(fixture("account-about"));
    await h.press("m");
    await h.until("press esc to close");
    expect(trimmed(h.screen())).toBe(fixture("menu-from-account"));
  });
});

describe("palette", () => {
  test("theme colors reach the cell buffer", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    h.screen();
    const buf = h.t.root.renderer.buffer;
    const hex = (c: number): string => `#${(c >>> 8).toString(16).padStart(6, "0")}`;
    // Selected product row: product color background (cron is #00FFF0) with black text.
    expect(hex(buf.getCell(3, 5)!.bg)).toBe("#00fff0");
    expect(hex(buf.getCell(3, 5)!.fg)).toBe("#000000");
    // Header borders, bold white "terminal", body grey.
    expect(hex(buf.getCell(1, 0)!.fg)).toBe("#3a3f42");
    expect(hex(buf.getCell(7, 1)!.fg)).toBe("#ffffff");
    expect(hex(buf.getCell(4, 4)!.fg)).toBe("#ffffff");
    expect(hex(buf.getCell(2, 8)!.fg)).toBe("#889096");
    // Price in the product color, bold.
    expect(hex(buf.getCell(21, 7)!.fg)).toBe("#00fff0");
    await h.press("down", "down");
    h.screen();
    expect(hex(buf.getCell(3, 9)!.bg)).toBe("#169fc1");
    expect(hex(buf.getCell(3, 9)!.fg)).toBe("#ffffff");
  });
});

describe("checkout", () => {
  test("shop → cart → new address → browser card → confirm → order → thank you", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("down", "down", "+", "+");
    await h.until("c cart $44 [2]");
    await h.press("c");
    await h.until("segfault");
    expect(h.screen()).toContain("- 2 +  $44");
    await h.press("enter");
    await h.until("street 1");
    // Header keys are off while a form has focus: `s` and `c` are typed, not navigation.
    await fillAddress(h);
    await h.press("enter");
    await h.until("select payment method");
    expect(h.screen()).toContain("subtotal: $44.00, shipping: $0.00, total: $44.00");
    expect(h.api.state.addresses[0]).toMatchObject({ name: "Ada Lovelace", street1: "1 Infinite Loop", city: "Cupertino", province: "CA", country: "US", zip: "95014" });
    expect(h.api.state.cart.addressID).toBe(h.api.state.addresses[0]!.id);
    await h.press("enter");
    await h.until("scan or copy to enter payment information");
    expect(h.screen()).toMatch(/https:\/\/dev\.trm\.sh\/\w+/);
    expect(h.screen()).toContain("▀");
    h.api.completeCollect();
    await h.until("press enter to confirm");
    const confirm = h.screen();
    expect(confirm).toContain("1 Infinite Loop");
    expect(confirm).toContain("Cupertino, CA, US 95014");
    expect(confirm).toContain("USPS Ground Advantage");
    expect(confirm).toContain("cc: **** **** **** 4242");
    expect(confirm).toContain("total:    $44.00");
    expect(confirm).toContain("dev sandbox: test card");
    await h.press("enter");
    await h.until("subscribe to your order?");
    expect(h.screen()).toContain("segfault (x2)");
    expect(h.screen()).toContain("c cart $ 0 [0]");
    const convert = h.api.requests.filter((r) => r.path === "/cart/convert");
    expect(convert.length).toBe(1);
    expect(convert[0]!.idempotencyKey).toMatch(/^[\w-]{36}$/);
    expect(h.api.state.orders.length).toBe(1);
    // Subscribe every 4 weeks.
    await h.press("+", "enter");
    await h.until("subscribed! press enter to continue...");
    expect(h.api.state.subscriptions[0]).toMatchObject({ quantity: 2, schedule: { type: "weekly", interval: 4 } });
    await h.press("enter");
    await h.until("Thank you for ordering with Terminal Products, Inc.");
    await h.press("enter");
    await h.until("Connection to terminal.shop closed.");
    await h.press("enter");
    await h.until("~ featured ~");
  });

  test("a failed conversion keeps its idempotency key for the retry", async () => {
    h = await mountShop();
    const variant = h.api.state.products[2]!.variants[0]!.id;
    h.api.state.cart.items = [{ id: "itm_1", productVariantID: variant, quantity: 1 }];
    h.api.state.addresses = [{ id: "shp_1", name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" }];
    h.api.state.cards = [{ id: "crd_1", brand: "Visa", last4: "4242", expiration: { month: 1, year: 2031 } }];
    h.api.state.user.email = "ada@example.com";
    await h.until("~ featured ~");
    await h.press("c");
    await h.until("checkout");
    await h.press("enter");
    await h.until("select shipping address");
    expect(h.screen()).toContain("☉   1 Main, Austin, TX, US, 78701");
    await h.press("enter");
    await h.until("select payment method");
    expect(h.screen()).toContain("Visa  **** **** **** 4242  01/31");
    await h.press("enter");
    await h.until("press enter to confirm");
    h.api.state.user.email = null;
    await h.press("enter");
    await h.until("An email address is required to place an order.");
    h.api.state.user.email = "ada@example.com";
    await h.press("esc");
    await h.until("free shipping on US orders over $40");
    await h.press("enter");
    await h.until("subscribe to your order?");
    const keys = h.api.requests.filter((r) => r.path === "/cart/convert").map((r) => r.idempotencyKey);
    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]!);
    expect(h.api.state.orders.length).toBe(1);
  });

  test("validation errors show in the footer and esc dismisses them", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("down", "+", "c");
    await h.until("checkout");
    await h.press("enter");
    await h.until("street 1");
    await h.press("tab", "tab");
    await h.until("street 1 cannot be empty");
    await h.press("esc");
    await h.until("free shipping on US orders over $40");
    expect(h.screen()).toContain("street 1");
    await h.press("esc");
    await h.until("enter checkout");
  });

  test("subscription-only products go straight to shipping and subscribe on confirm", async () => {
    h = await mountShop();
    h.api.state.addresses = [{ id: "shp_1", name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" }];
    h.api.state.cards = [{ id: "crd_1", brand: "Visa", last4: "4242", expiration: { month: 1, year: 2031 } }];
    await h.until("~ featured ~");
    expect(h.screen()).toContain("subscribe  enter");
    await h.press("+");
    expect(h.screen()).toContain("c cart $ 0 [0]");
    await h.press("enter");
    await h.until("select shipping address");
    expect(h.screen()).toContain("subscribe / shipping / payment / confirmation");
    await h.press("enter");
    await h.until("select payment method");
    expect(h.screen()).toContain("subtotal: $30.00, shipping: $0.00, total: $30.00");
    await h.press("enter");
    await h.until("press enter to confirm");
    expect(h.screen()).toContain("cron: 12oz");
    expect(h.screen()).toContain("monthly subscription");
    await h.press("enter");
    await h.until("Thank you for ordering");
    expect(h.api.state.subscriptions[0]).toMatchObject({ productVariantID: h.api.state.products[0]!.variants[0]!.id, quantity: 1, addressID: "shp_1", cardID: "crd_1" });
    expect(h.api.requests.some((r) => r.path === "/cart/convert")).toBe(false);
  });

  test("accounts without an email are sent to the email gate", async () => {
    h = await mountShop({ email: null });
    await h.until("~ featured ~");
    await h.press("down", "+", "c");
    await h.until("checkout");
    await h.press("enter");
    await h.until("one quick thing");
    expect(h.screen()).toContain("ssh dev.terminal.shop -t link-email");
    await h.press("esc");
    await h.until("enter checkout");
  });
});

describe("account", () => {
  test("orders: details, cancel", async () => {
    h = await mountShop();
    h.api.state.orders = [
      {
        id: "ord_1",
        status: "placed",
        fulfillmentStarted: false,
        canCancel: true,
        canUpdateShipping: true,
        shipping: { name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" },
        created: "2026-10-30",
        amount: { subtotal: 4400, shipping: 0 },
        tracking: {},
        items: [{ id: "i", amount: 4400, quantity: 2, productVariantID: h.api.state.products[2]!.variants[0]!.id }],
      },
    ];
    await h.until("~ featured ~");
    await h.press("a");
    await h.until("order #0  $44");
    await h.press("enter");
    await h.until("enter view details");
    await h.press("enter");
    await h.until("back to orders");
    expect(h.screen()).toContain("2x segfault");
    expect(h.screen()).toContain("changes: available before fulfillment starts");
    await h.press("x");
    await h.until("cancel order?");
    await h.press("y");
    await h.until("order canceled");
    expect(h.api.state.orders[0]!.status).toBe("canceled");
  });

  test("tokens: create shows the secret once", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("a", "down", "down", "enter", "down", "enter");
    await h.until("(will not be shown again)");
    expect(h.screen()).toContain(`trm_test_${"f".repeat(20)}`);
    expect(h.api.state.tokens.length).toBe(2);
  });

  test("addresses: add from the address book", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("a", "down", "down", "down", "down", "enter");
    await h.until("saved addresses");
    expect(h.screen()).toContain("press n to add one");
    await h.press("n");
    await h.until("add address");
    await fillAddress(h);
    await h.press("enter");
    await h.until("address added");
    expect(h.screen()).toContain("1 Infinite Loop, Cupertino, CA, US, 95014");
    await h.press("esc");
    await h.until("1 saved address.");
  });

  test("debug info names the environment; production needs the server opt-in", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("a");
    for (let i = 0; i < 8; i++) await h.press("down");
    await h.until("environment: dev sandbox");
    expect(h.screen()).toContain("mode: personal access token");
    expect(h.screen()).not.toContain("trm_test_0123");
    await h.press("e");
    await h.until("TERMINAL_ENABLE_PRODUCTION=1");
  });

  test("with production enabled, switching asks first", async () => {
    h = await mountShop({ env: { TERMINAL_ENABLE_PRODUCTION: "1" } });
    await h.until("~ featured ~");
    await h.press("a");
    for (let i = 0; i < 8; i++) await h.press("down");
    await h.press("e");
    await h.until("switch to production?");
    await h.press("n");
    await h.until("e switch to production");
    expect(h.store.s.env).toBe("dev");
  });
});

describe("sign in", () => {
  test("paste a token", async () => {
    h = await mountShop({ signedIn: false });
    await h.until("paste a personal access token");
    await h.press("enter");
    await h.until("ssh dev.terminal.shop -t tokens");
    await h.t.type("trm_test_0123456789abcdef0123");
    expect(h.screen()).toContain("> •••••");
    expect(h.screen()).not.toContain("0123456789");
    await h.press("enter");
    await h.until("~ featured ~");
    expect(JSON.parse(h.storage.data.get("terminal-shop:auth:dev")!)).toEqual({ kind: "token", access: "trm_test_0123456789abcdef0123" });
  });

  test("a production token is refused in the sandbox", async () => {
    h = await mountShop({ signedIn: false });
    await h.until("paste a personal access token");
    await h.press("enter");
    await h.t.type("trm_live_0123456789abcdef0123");
    await h.press("enter");
    await h.until("that's a production token");
    expect(h.api.requests.length).toBe(0);
  });

  test("deep links: /cart opens the cart after the splash", async () => {
    h = await mountShop({ path: "/cart" });
    await h.until("Your cart is empty.");
  });
});
