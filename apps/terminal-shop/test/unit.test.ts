import { afterEach, describe, expect, test } from "bun:test";
import { createClient, TerminalError } from "../lib/api";
import { beginOAuth, completeOAuth, normalizeToken, pkce, tokenEnvMismatch } from "../lib/auth";
import { footerLines, headerLines } from "../lib/frame";
import { formKey, initForm, notEmpty } from "../lib/form";
import { formatUSD, shopPrice } from "../lib/format";
import { encodeQr, renderQr } from "../lib/qr";
import { ShopStore } from "../lib/store";
import { defaultTheme } from "../lib/theme";
import { lineText, place, wordWrap } from "../lib/ui";
import { createTerminalProxy } from "../server/terminal-proxy";
import { memoryStorage } from "./app";
import { MOCK_TOKEN, startMockProxy, startMockTerminal, type MockProxy, type MockTerminal } from "./mock-terminal";

let api: MockTerminal | null = null;
let proxy: MockProxy | null = null;
afterEach(() => {
  proxy?.stop();
  api?.stop();
  proxy = null;
  api = null;
});

const req = (path: string, init: RequestInit & { host?: string } = {}): Request =>
  new Request(`http://${init.host ?? "localhost:3002"}${path}`, { ...init, headers: { host: init.host ?? "localhost:3002", ...(init.headers as Record<string, string>) } });

describe("proxy", () => {
  test("refuses foreign hosts, cross-site reads and header-less writes", async () => {
    const p = createTerminalProxy({ env: {} });
    expect((await p.handle(req("/dev/api/product", { host: "evil.example" }), "/dev/api/product")).status).toBe(403);
    expect((await p.handle(req("/dev/api/product", { headers: { "sec-fetch-site": "cross-site" } }), "/dev/api/product")).status).toBe(403);
    expect((await p.handle(req("/dev/api/cart/convert", { method: "POST" }), "/dev/api/cart/convert")).status).toBe(403);
  });

  test("production is off unless TERMINAL_ENABLE_PRODUCTION=1", async () => {
    api = startMockTerminal();
    const env = { environments: { dev: { api: api.url, auth: api.url }, prod: { api: api.url, auth: api.url } } };
    const off = createTerminalProxy({ ...env, env: { TERMINAL_PROD_TOKEN: MOCK_TOKEN } });
    const res = await off.handle(req("/prod/api/view/init", { headers: { "x-terminal-client": "1" } }), "/prod/api/view/init");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe("production_disabled");
    expect(off.status().environments.prod).toMatchObject({ enabled: false, serverToken: false });
    expect(api.requests.length).toBe(0);

    const on = createTerminalProxy({ ...env, env: { TERMINAL_ENABLE_PRODUCTION: "1", TERMINAL_PROD_TOKEN: MOCK_TOKEN } });
    expect((await on.handle(req("/prod/api/view/init"), "/prod/api/view/init")).status).toBe(200);
  });

  test("attaches the browser token, else the server token, and never exposes either", async () => {
    api = startMockTerminal();
    const p = createTerminalProxy({ env: { TERMINAL_DEV_TOKEN: MOCK_TOKEN }, environments: { dev: { api: api.url, auth: api.url } } });
    expect((await p.handle(req("/dev/api/view/init"), "/dev/api/view/init")).status).toBe(200);
    expect(api.requests.at(-1)?.authorized).toBe(true);
    expect((await p.handle(req("/dev/api/view/init", { headers: { "x-terminal-token": "trm_test_wrong" } }), "/dev/api/view/init")).status).toBe(401);
    const status = JSON.stringify(p.status());
    expect(status).not.toContain(MOCK_TOKEN);
    expect(p.status().environments.dev.serverToken).toBe(true);
  });

  test("forwards idempotency keys and only the OAuth token endpoint", async () => {
    api = startMockTerminal();
    const p = createTerminalProxy({ env: {}, environments: { dev: { api: api.url, auth: api.url } } });
    await p.handle(req("/dev/api/cart/convert", { method: "POST", headers: { "x-terminal-client": "1", "x-terminal-token": MOCK_TOKEN, "idempotency-key": "k1" } }), "/dev/api/cart/convert");
    expect(api.requests.at(-1)?.idempotencyKey).toBe("k1");
    expect((await p.handle(req("/dev/auth/authorize"), "/dev/auth/authorize")).status).toBe(404);
    expect((await p.handle(req("/dev/api/../x"), "/dev/api/../x")).status).toBe(400);
  });

  test("TERMINAL_DEV_API_URL redirects only the sandbox", () => {
    const p = createTerminalProxy({ env: { TERMINAL_DEV_API_URL: "http://127.0.0.1:9/" } });
    expect(p.status().environments.dev.api).toBe("http://127.0.0.1:9");
    expect(p.status().environments.prod.api).toBe("https://api.terminal.shop");
  });
});

describe("api client", () => {
  test("surfaces the API's message and sends the idempotency key", async () => {
    api = startMockTerminal();
    proxy = startMockProxy(api);
    let token: string | null = "trm_test_nope";
    const client = createClient({ base: proxy.base, env: "dev", token: () => token });
    const failure = await client.view.init().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(TerminalError);
    expect((failure as TerminalError).status).toBe(401);
    expect((failure as TerminalError).message).toBe("You don't have permission to access this resource.");
    token = MOCK_TOKEN;
    const cart = await client.cart.setItem(api.state.products[2]!.variants[0]!.id, 2);
    expect(cart.subtotal).toBe(4400);
    const err = (await client.cart.convert("abc").catch((e: unknown) => e)) as TerminalError;
    expect(err.message).toBe("Cart is not ready to convert");
    expect(api.requests.at(-1)?.idempotencyKey).toBe("abc");
  });

  test("retries once after a refresh on 401", async () => {
    api = startMockTerminal();
    proxy = startMockProxy(api);
    let token = "trm_test_expired";
    const client = createClient({
      base: proxy.base,
      env: "dev",
      token: () => token,
      onUnauthorized: async () => {
        token = MOCK_TOKEN;
        return true;
      },
    });
    expect((await client.profile.me()).user.id).toBe("usr_mock");
  });
});

describe("auth", () => {
  test("tokens", () => {
    expect(normalizeToken("  Bearer trm_test_abcdef123456 ")).toBe("trm_test_abcdef123456");
    expect(normalizeToken("not a token")).toBeNull();
    expect(tokenEnvMismatch("trm_live_x", "dev")).toContain("production token");
    expect(tokenEnvMismatch("trm_test_x", "prod")).toContain("dev sandbox token");
    expect(tokenEnvMismatch("trm_test_x", "dev")).toBeNull();
  });

  test("PKCE + authorize URL + state check", async () => {
    const { verifier, challenge } = await pkce();
    expect(verifier).toMatch(/^[\w-]{43}$/);
    expect(challenge).toMatch(/^[\w-]{43}$/);
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
    try {
      const url = new URL(await beginOAuth("dev", "http://localhost:3002"));
      expect(url.origin).toBe("https://auth.dev.terminal.shop");
      expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3002/auth/callback");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      await expect(completeOAuth("/x", new URLSearchParams({ code: "c", state: "wrong" }))).rejects.toThrow("state mismatch");
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });
});

describe("layout", () => {
  test("money and wrapping match the Go helpers", () => {
    expect(formatUSD(4400)).toBe("$44.00");
    expect(formatUSD(805)).toBe("$8.05");
    expect(shopPrice(2200)).toBe("$22");
    expect(wordWrap("a  b   c", 3)).toEqual(["a b", "c"]);
  });

  test("lipgloss Place rounds the gap down", () => {
    expect(lineText(place([[{ text: "ab" }]], 5, 1)[0]!)).toBe(" ab  ");
  });

  test("header and footer", () => {
    const cart = { items: [{ productVariantID: "v", quantity: 2, subtotal: 4400 }], subtotal: 4400, amount: { subtotal: 4400 } };
    expect(lineText(headerLines("cart", cart, defaultTheme)[1]!)).toBe(" │     terminal      │      s shop      │    a account     │  c cart $44 [2]  │ ");
    const err = footerLines({ page: "cart", commands: [], error: "city cannot be empty", region: null });
    expect(lineText(err[1]!)).toBe("  city cannot be empty                                                     esc ");
  });

  test("forms validate on enter and submit from the last field", () => {
    const groups = [[{ key: "a", title: "a", validate: notEmpty("a") }, { key: "b", title: "b" }]];
    let s = initForm(groups);
    let r = formKey(groups, s, "enter", "");
    expect(r.event).toEqual({ type: "error", message: "a cannot be empty" });
    s = formKey(groups, s, "x", "x").state;
    s = formKey(groups, s, "tab", "").state;
    r = formKey(groups, s, "enter", "");
    expect(r.event).toEqual({ type: "submit", values: { a: "x", b: "" } });
  });
});

describe("qr", () => {
  test("encodes a short link as a version 2 code with finder patterns", () => {
    const code = encodeQr("https://trm.sh/abc123");
    expect(code.version).toBe(2);
    expect(code.size).toBe(25);
    const row0 = code.modules[0]!.slice(0, 7).map((d) => (d ? 1 : 0)).join("");
    expect(row0).toBe("1111111");
    expect(code.modules[1]!.slice(0, 7).map((d) => (d ? 1 : 0)).join("")).toBe("1000001");
    expect(code.modules[6]!.slice(8, 17).map((d) => (d ? 1 : 0)).join("")).toBe("101010101");
    expect(renderQr(code).length).toBe(13);
  });
});

describe("store", () => {
  test("optimistic cart updates, last write wins", async () => {
    api = startMockTerminal({ delayMs: 30 });
    proxy = startMockProxy(api);
    const storage = memoryStorage({ "terminal-shop:auth:dev": JSON.stringify({ kind: "token", access: MOCK_TOKEN }) });
    const store = new ShopStore({ storage, bases: [proxy.base], splashMs: 0 });
    await store.start("/shop");
    expect(store.s.phase).toBe("ready");
    const variant = store.s.products.find((p) => p.name === "segfault")!.variants[0]!.id;
    store.updateCart(variant, 1);
    store.updateCart(variant, 1);
    store.updateCart(variant, 1);
    expect(store.cartItem(variant).quantity).toBe(3);
    expect(store.s.cart.subtotal).toBe(6600);
    await Bun.sleep(200);
    expect(store.cartItem(variant).quantity).toBe(3);
    expect(api.state.cart.items[0]?.quantity).toBe(3);
  });

  test("an unknown token goes back to sign in and is forgotten", async () => {
    api = startMockTerminal();
    proxy = startMockProxy(api);
    const storage = memoryStorage({ "terminal-shop:auth:dev": JSON.stringify({ kind: "token", access: "trm_test_bad_bad_bad" }) });
    const store = new ShopStore({ storage, bases: [proxy.base], splashMs: 0 });
    await store.start("/shop");
    expect(store.s.phase).toBe("login");
    expect(store.s.error).toContain("rejected");
    expect(storage.data.has("terminal-shop:auth:dev")).toBe(false);
  });

  test("refuses production unless the server enables it", async () => {
    api = startMockTerminal();
    proxy = startMockProxy(api);
    const store = new ShopStore({ storage: memoryStorage({ "terminal-shop:env": "prod" }), bases: [proxy.base], splashMs: 0 });
    await store.start("/shop");
    expect(store.s.env).toBe("dev");
    expect(store.switchEnv("prod")).toBe(false);
    expect(store.s.error).toContain("TERMINAL_ENABLE_PRODUCTION=1");
  });
});
