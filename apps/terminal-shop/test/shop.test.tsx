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

/**
 * The ssh captures plus this port's two extra account menu rows ("payment methods" is the
 * shop's own commented-out `paymentPage`, "profile" is ours), spliced in after "link email".
 */
const withExtraMenuRows = (screen: string): string => {
  const rows = screen.split("\n");
  const r0 = rows.findIndex((l) => l.startsWith("  order history"));
  if (r0 < 0) return screen;
  const MENU = 22;
  const menu = rows.map((l) => l.slice(0, MENU).padEnd(MENU));
  const rest = rows.map((l) => l.slice(MENU));
  const at = r0 + 6;
  menu.splice(at, 0, "  payment methods".padEnd(MENU), "  profile".padEnd(MENU));
  menu.splice(r0 + 11, 2);
  return rows.map((_, i) => `${menu[i]}${rest[i]}`.trimEnd()).join("\n");
};
const accountFixture = (name: string): string => withExtraMenuRows(fixture(name));

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
    expect(trimmed(h.screen())).toBe(accountFixture("account-orders"));
    for (const name of ["account-subscriptions", "account-tokens"]) {
      await h.press("down");
      expect(trimmed(h.screen())).toBe(accountFixture(name));
    }
    await h.press("down", "down");
    expect(trimmed(h.screen())).toBe(accountFixture("account-addresses"));
    await h.press("down", "down", "down", "down");
    expect(trimmed(h.screen())).toBe(accountFixture("account-faq"));
    await h.press("down");
    expect(trimmed(h.screen())).toBe(accountFixture("account-about"));
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

  test("payment methods: add a card through the hosted page, then remove it", async () => {
    h = await mountShop({ path: "/account?page=payment" });
    await h.until("add payment information via browser");
    await h.press("enter");
    await h.until("enter add");
    await h.press("enter");
    await h.until("scan or copy to enter payment information");
    expect(h.screen()).toMatch(/https:\/\/dev\.trm\.sh\/\w+/);
    expect(h.api.requests.filter((r) => r.method === "POST" && r.path === "/card/collect")).toHaveLength(1);
    h.api.completeCollect("1881");
    await h.until("card added");
    expect(h.screen()).toContain("Visa  **** **** **** 1881  12/30");
    await h.press("x");
    await h.until("remove this card? (y/n)");
    await h.press("n");
    await h.until("x/del remove");
    await h.press("x", "y");
    await h.until("card removed");
    expect(h.api.state.cards).toHaveLength(0);
    expect(h.api.requests.some((r) => r.method === "DELETE" && r.path.startsWith("/card/crd_"))).toBe(true);
  });

  test("payment methods: esc stops waiting for the hosted card page", async () => {
    h = await mountShop({ path: "/account?page=payment" });
    await h.until("add payment information via browser");
    await h.press("enter", "enter");
    await h.until("scan or copy");
    await h.press("esc");
    await h.until("add payment information via browser");
    const polls = h.api.requests.filter((r) => r.path === "/card").length;
    await h.t.settle(100);
    expect(h.api.requests.filter((r) => r.path === "/card").length).toBe(polls);
  });

  test("profile: shows name, email and id; changing the name uses PUT /profile", async () => {
    h = await mountShop({ path: "/account?page=profile" });
    await h.until("ada@example.com");
    expect(h.screen()).toContain("Ada Lovelace");
    expect(h.screen()).toContain("usr_mock");
    expect(h.screen()).toContain("select this item to change your name.");
    await h.press("enter");
    await h.until("change the name on your account");
    // Header keys are typed while the form has focus.
    for (let i = 0; i < 12; i++) await h.press("backspace");
    await h.press("enter");
    await h.until("name cannot be empty");
    await h.press("esc");
    await h.t.type("Ada King");
    await h.press("enter");
    await h.until("name updated");
    expect(h.screen()).toContain("Ada King");
    const put = h.api.requests.filter((r) => r.method === "PUT" && r.path === "/profile");
    expect(put.map((r) => r.body)).toEqual([{ name: "Ada King" }]);
    expect(h.store.s.user?.name).toBe("Ada King");
  });

  test("profile: without an email, it points at ssh -t link-email", async () => {
    h = await mountShop({ email: null, path: "/account?page=profile" });
    await h.until("link one from your ssh session:");
    expect(h.screen()).toContain("ssh dev.terminal.shop -t link-email");
  });

  test("link email: selecting it shows the ssh command", async () => {
    h = await mountShop({ email: null, path: "/account?page=link-email" });
    await h.until("select this item to start.");
    await h.press("enter");
    await h.until("ssh dev.terminal.shop -t link-email");
    await h.press("esc");
    await h.until("select this item to start.");
  });

  test("subscriptions: +/- and enter change a weekly schedule", async () => {
    h = await mountShop();
    const variant = h.api.state.products[2]!.variants[0]!.id;
    h.api.state.addresses = [{ id: "shp_1", name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" }];
    h.api.state.cards = [{ id: "crd_1", brand: "Visa", last4: "4242", expiration: { month: 1, year: 2031 } }];
    h.api.state.subscriptions = [{ id: "sub_1", productVariantID: variant, price: 2200, quantity: 2, addressID: "shp_1", cardID: "crd_1", schedule: { type: "weekly", interval: 3 }, next: "2026-11-21", created: "2026-10-01" }];
    await h.until("~ featured ~");
    await h.press("a", "down", "enter", "enter");
    await h.until("back to subscriptions");
    expect(h.screen()).toContain("+/- schedule");
    await h.press("pgdown");
    await h.until("every 3 weeks");
    await h.press("+", "+");
    await h.until("every 5 weeks");
    expect(h.screen()).toContain("press enter to save, esc to keep every 3 weeks");
    await h.press("esc");
    await h.until("e address");
    expect(h.api.requests.some((r) => r.method === "PUT")).toBe(false);
    await h.press("-", "enter");
    await h.until("schedule updated");
    await h.press("pgdown");
    await h.until("every 2 weeks");
    expect(h.api.requests.filter((r) => r.method === "PUT").map((r) => [r.path, r.body])).toEqual([["/subscription/sub_1", { schedule: { type: "weekly", interval: 2 } }]]);
    for (let i = 0; i < 5; i++) await h.press("-");
    await h.until("every 1 week");
  });

  test("subscriptions: monthly (cron) schedules don't change", async () => {
    h = await mountShop();
    const cron = h.api.state.products[0]!.variants[0]!.id;
    h.api.state.subscriptions = [{ id: "sub_c", productVariantID: cron, price: 3000, quantity: 1, addressID: "shp_x", cardID: "crd_x", schedule: { type: "fixed" }, next: "2026-12-01", created: "2026-10-01" }];
    await h.until("~ featured ~");
    await h.press("a", "down", "enter", "enter", "pgdown");
    await h.until("monthly");
    expect(h.screen()).not.toContain("+/- schedule");
    await h.press("+", "enter");
    expect(h.api.requests.some((r) => r.method === "PUT")).toBe(false);
  });

  test("orders: tracking shows the carrier's link", async () => {
    h = await mountShop();
    h.api.state.orders = [
      {
        id: "ord_1",
        status: "shipped",
        fulfillmentStarted: true,
        canCancel: false,
        canUpdateShipping: false,
        changeUnavailableReason: "fulfillment_started",
        shipping: { name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" },
        created: "2026-10-30",
        amount: { subtotal: 2200, shipping: 800 },
        tracking: { service: "USPS Ground Advantage", number: "9234", status: "TRANSIT", statusDetails: "In transit to next facility", url: "https://tools.usps.com/go/TrackConfirmAction_input?origTrackNum=9234" },
        items: [{ id: "i", amount: 2200, quantity: 1, productVariantID: h.api.state.products[2]!.variants[0]!.id }],
      },
    ];
    await h.until("~ featured ~");
    await h.press("a", "enter", "enter");
    await h.until("tracking");
    const screen = h.screen();
    expect(screen).toContain("status: TRANSIT");
    expect(screen).toContain("service: USPS Ground Advantage");
    expect(screen).toContain("details: In transit to next facility");
    expect(screen).toContain("track: https://tools.usps.com");
    expect(screen).not.toContain("x/del cancel");
    await h.press("x");
    await h.until("fulfillment started; contact support for changes");
  });

  test("apps: create shows the secret once; remove asks first", async () => {
    h = await mountShop({ path: "/account?page=apps" });
    await h.until("create app");
    await h.press("enter", "enter");
    await h.until("redirect uri");
    await h.t.type("my app");
    await h.press("tab");
    await h.t.type("http://localhost:3000/cb");
    await h.press("enter");
    await h.until("(will not be shown again)");
    expect(h.screen()).toContain(`secret: sec_${"a".repeat(16)}`);
    expect(h.api.requests.find((r) => r.method === "POST" && r.path === "/app")?.body).toEqual({ name: "my app", redirectURI: "http://localhost:3000/cb" });
    await h.press("up", "x");
    await h.until("are you sure you want to remove?");
    await h.press("y");
    await h.t.waitFor(() => h!.api.state.apps.length === 0, "app removed");
  });

  test("tokens: revoke asks first", async () => {
    h = await mountShop({ path: "/account?page=tokens" });
    await h.until("pat_existing");
    await h.press("enter", "x");
    await h.until("are you sure you want to revoke?");
    await h.press("y");
    await h.t.waitFor(() => h!.api.state.tokens.length === 0, "token revoked");
    expect(h.api.requests.some((r) => r.method === "DELETE" && r.path === "/token/pat_existing")).toBe(true);
  });

  test("shipping starts on the cart's address", async () => {
    h = await mountShop();
    const variant = h.api.state.products[2]!.variants[0]!.id;
    h.api.state.cart.items = [{ id: "itm_1", productVariantID: variant, quantity: 1 }];
    h.api.state.addresses = [
      { id: "shp_1", name: "Ada", street1: "1 Main", city: "Austin", province: "TX", country: "US", zip: "78701" },
      { id: "shp_2", name: "Ada", street1: "2 Side", city: "Austin", province: "TX", country: "US", zip: "78702" },
    ];
    h.api.state.cart.addressID = "shp_2";
    await h.until("~ featured ~");
    await h.press("c", "enter");
    await h.until("select shipping address");
    expect(h.screen()).toContain("☉   2 Side");
  });

  test("debug info names the environment; production needs the server opt-in", async () => {
    h = await mountShop();
    await h.until("~ featured ~");
    await h.press("a");
    for (let i = 0; i < 10; i++) await h.press("down");
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
    for (let i = 0; i < 10; i++) await h.press("down");
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
