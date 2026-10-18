/**
 * An in-memory Terminal API (the subset the shop uses), shaped like
 * https://api.terminal.shop/doc, plus the proxy in front of it.
 */

import products from "./fixtures/products.json";
import { createTerminalProxy, type TerminalProxy } from "../server/terminal-proxy";
import type { Address, App, Card, Cart, Order, Product, Subscription, Token, User } from "../lib/types";

export const MOCK_TOKEN = "trm_test_0123456789abcdef0123";

export interface MockRequest {
  method: string;
  path: string;
  authorized: boolean;
  idempotencyKey: string | null;
  body: unknown;
}

export interface MockTerminal {
  url: string;
  requests: MockRequest[];
  state: {
    user: User;
    products: Product[];
    cart: { items: Array<{ id: string; productVariantID: string; quantity: number }>; addressID?: string; cardID?: string };
    addresses: Address[];
    cards: Card[];
    subscriptions: Subscription[];
    orders: Order[];
    tokens: Token[];
    apps: App[];
  };
  /** Finish the browser card form opened from `POST /card/collect`. */
  completeCollect(last4?: string): Card;
  stop(): void;
}

let seq = 0;
const id = (prefix: string): string => `${prefix}_${String(++seq).padStart(26, "0")}`;
const err = (status: number, type: string, code: string, message: string): Response => Response.json({ type, code, message }, { status });

export function startMockTerminal(opts: { token?: string; email?: string | null; delayMs?: number } = {}): MockTerminal {
  const token = opts.token ?? MOCK_TOKEN;
  const requests: MockRequest[] = [];
  const state: MockTerminal["state"] = {
    user: { id: "usr_mock", name: "Ada Lovelace", email: opts.email === undefined ? "ada@example.com" : opts.email, stripeCustomerID: "cus_mock" },
    products: structuredClone(products) as Product[],
    cart: { items: [] },
    addresses: [],
    cards: [],
    subscriptions: [],
    orders: [],
    tokens: [{ id: "pat_existing", created: "2026-10-01T12:00:00.000Z", token: "trm_test_******cdef" }],
    apps: [],
  };
  const converted = new Map<string, Order>();

  const price = (variantID: string): number => {
    for (const p of state.products) for (const v of p.variants) if (v.id === variantID) return v.price;
    return 0;
  };
  const cart = (): Cart => {
    const items = state.cart.items.map((i) => ({ ...i, subtotal: i.quantity * price(i.productVariantID) }));
    const subtotal = items.reduce((n, i) => n + i.subtotal, 0);
    const shipping = state.cart.addressID ? (subtotal >= 4000 ? 0 : 800) : undefined;
    return {
      items,
      subtotal,
      addressID: state.cart.addressID,
      cardID: state.cart.cardID,
      amount: { subtotal, shipping, total: subtotal + (shipping ?? 0) },
      shipping: state.cart.addressID ? { service: "USPS Ground Advantage", timeframe: "3-5 days" } : undefined,
    };
  };

  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;
      const body = method === "GET" || method === "DELETE" ? undefined : await req.json().catch(() => undefined);
      const authorized = req.headers.get("authorization") === `Bearer ${token}`;
      requests.push({ method, path, authorized, idempotencyKey: req.headers.get("idempotency-key"), body });
      if (opts.delayMs) await Bun.sleep(opts.delayMs);
      if (path === "/product" && method === "GET") return Response.json({ data: state.products });
      if (!authorized) return err(401, "authentication", "unauthorized", "You don't have permission to access this resource.");
      const ok = (data: unknown): Response => Response.json({ data });
      const b = (body ?? {}) as Record<string, unknown>;
      const seg = path.split("/").filter(Boolean);
      const [root, sub] = seg;

      if (path === "/view/init") {
        return ok({
          profile: { user: state.user },
          products: state.products,
          cart: cart(),
          addresses: state.addresses,
          cards: state.cards,
          subscriptions: state.subscriptions,
          orders: state.orders,
          tokens: state.tokens,
          apps: state.apps,
          region: (req.headers.get("x-terminal-region") as "na") ?? "na",
        });
      }
      if (root === "profile") {
        if (method === "PUT") state.user.name = String(b.name ?? "");
        return ok({ user: state.user });
      }
      if (root === "cart") {
        if (!sub && method === "GET") return ok(cart());
        if (!sub && method === "DELETE") {
          state.cart = { items: [] };
          return ok("ok");
        }
        if (sub === "item" && method === "PUT") {
          const variant = String(b.productVariantID);
          const quantity = Number(b.quantity);
          if (!price(variant)) return err(400, "validation", "invalid_parameter", "Invalid product variant");
          state.cart.items = state.cart.items.filter((i) => i.productVariantID !== variant);
          if (quantity > 0) state.cart.items.push({ id: id("itm"), productVariantID: variant, quantity });
          return ok(cart());
        }
        if (sub === "address" && method === "PUT") {
          if (!state.addresses.some((a) => a.id === b.addressID)) return err(404, "not_found", "not_found", "Address not found");
          state.cart.addressID = String(b.addressID);
          return ok("ok");
        }
        if (sub === "card" && method === "PUT") {
          if (!state.cards.some((c) => c.id === b.cardID)) return err(404, "not_found", "not_found", "Card not found");
          state.cart.cardID = String(b.cardID);
          return ok("ok");
        }
        if (sub === "convert" && method === "POST") {
          const key = req.headers.get("idempotency-key");
          if (!key) return err(400, "validation", "invalid_parameter", "Invalid request");
          const existing = converted.get(key);
          if (existing) return ok(existing);
          if (!state.user.email) return err(400, "validation", "email", "An email address is required to place an order.");
          const c = cart();
          const address = state.addresses.find((a) => a.id === c.addressID);
          if (!address || !c.cardID || c.items.length === 0) return err(400, "validation", "invalid_parameter", "Cart is not ready to convert");
          const order: Order = {
            id: id("ord"),
            index: state.orders.length,
            status: "placed",
            fulfillmentStarted: false,
            canCancel: true,
            canUpdateShipping: true,
            shipping: { name: address.name, street1: address.street1, street2: address.street2, city: address.city, province: address.province, country: address.country, zip: address.zip, phone: address.phone },
            created: "2026-10-31T22:00:00.000Z",
            amount: { subtotal: c.amount.subtotal, shipping: c.amount.shipping ?? 0 },
            tracking: {},
            items: c.items.map((i) => ({ id: id("itm"), amount: i.subtotal, quantity: i.quantity, productVariantID: i.productVariantID })),
          };
          converted.set(key, order);
          state.orders = [order, ...state.orders];
          state.cart = { items: [] };
          return ok(order);
        }
      }
      if (root === "address") {
        if (!sub && method === "GET") return ok(state.addresses);
        if (!sub && method === "POST") {
          const a = { ...(b as unknown as Address), id: id("shp"), created: "2026-10-31T22:00:00.000Z" };
          state.addresses.push(a);
          return ok(a.id);
        }
        const i = state.addresses.findIndex((a) => a.id === sub);
        if (i < 0) return err(404, "not_found", "not_found", "Address not found");
        if (method === "PATCH") {
          state.addresses[i] = { ...(state.addresses[i] as Address), ...(b as object) };
          return ok(state.addresses[i]);
        }
        if (method === "DELETE") {
          state.addresses.splice(i, 1);
          return ok("ok");
        }
      }
      if (root === "card") {
        if (!sub && method === "GET") return ok(state.cards);
        if (sub === "collect" && method === "POST") return ok({ url: `https://dev.trm.sh/${id("lnk").slice(-6)}` });
        if (method === "DELETE") {
          state.cards = state.cards.filter((c) => c.id !== sub);
          return ok("ok");
        }
      }
      if (root === "order") {
        if (!sub && method === "GET") return ok(state.orders);
        const o = state.orders.find((x) => x.id === sub);
        if (!o) return err(404, "not_found", "not_found", "Order not found");
        if (method === "DELETE") {
          o.status = "canceled";
          o.canCancel = false;
          o.canUpdateShipping = false;
          o.changeUnavailableReason = "canceled";
          return ok("ok");
        }
        if (method === "PATCH" && seg[2] === "shipping") {
          o.shipping = (b.shipping ?? o.shipping) as Order["shipping"];
          return ok(o);
        }
      }
      if (root === "subscription") {
        if (!sub && method === "GET") return ok(state.subscriptions);
        if (!sub && method === "POST") {
          state.subscriptions.push({ ...(b as unknown as Subscription), id: id("sub"), price: price(String(b.productVariantID)), next: "2026-11-21T00:00:00.000Z", created: "2026-10-31T22:00:00.000Z" });
          return ok("ok");
        }
        const s = state.subscriptions.find((x) => x.id === sub);
        if (!s) return err(404, "not_found", "not_found", "Subscription not found");
        if (method === "PUT") {
          Object.assign(s, b);
          return ok(s);
        }
        if (method === "DELETE") {
          state.subscriptions = state.subscriptions.filter((x) => x.id !== sub);
          return ok("ok");
        }
      }
      if (root === "token") {
        if (!sub && method === "GET") return ok(state.tokens.map((t) => ({ ...t, token: `trm_test_******${t.token.slice(-4)}` })));
        if (!sub && method === "POST") {
          const t = { id: id("pat"), token: `trm_test_${"f".repeat(20)}`, created: "2026-10-31T22:00:00.000Z" };
          state.tokens.push(t);
          return ok({ id: t.id, token: t.token });
        }
        if (method === "DELETE") {
          state.tokens = state.tokens.filter((t) => t.id !== sub);
          return ok("ok");
        }
      }
      if (root === "app") {
        if (!sub && method === "GET") return ok(state.apps);
        if (!sub && method === "POST") {
          const a = { id: id("cli"), name: String(b.name), redirectURI: String(b.redirectURI), secret: `sec_${"a".repeat(16)}` };
          state.apps.push({ ...a, secret: "sec_******aaaa" });
          return ok({ id: a.id, secret: a.secret });
        }
        if (method === "DELETE") {
          state.apps = state.apps.filter((a) => a.id !== sub);
          return ok("ok");
        }
      }
      return err(404, "not_found", "not_found", `no route for ${method} ${path}`);
    },
  });

  return {
    url: `http://127.0.0.1:${server.port}`,
    requests,
    state,
    completeCollect(last4 = "4242") {
      const card: Card = { id: id("crd"), brand: "Visa", last4, expiration: { month: 12, year: 2030 }, created: "2026-10-31T22:00:00.000Z" };
      state.cards.push(card);
      return card;
    },
    stop: () => server.stop(true),
  };
}

export interface MockProxy {
  base: string;
  proxy: TerminalProxy;
  stop(): void;
}

/** The real proxy, on loopback, pointed at the mock for both environments. */
export function startMockProxy(api: MockTerminal, env: Record<string, string | undefined> = {}): MockProxy {
  const proxy = createTerminalProxy({ env, environments: { dev: { api: api.url, auth: `${api.url}/auth` }, prod: { api: api.url, auth: `${api.url}/auth` } } });
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const url = new URL(req.url);
      if (!url.pathname.startsWith("/__terminal")) return new Response("not found", { status: 404 });
      return proxy.handle(req, url.pathname.slice("/__terminal".length) || "/");
    },
  });
  return { base: `http://127.0.0.1:${server.port}/__terminal`, proxy, stop: () => server.stop(true) };
}
