/**
 * Minimal Terminal API client (mirrors `@terminaldotshop/sdk`'s resources) that talks
 * to the local proxy: `${base}/${env}/api/<path>`. Bearer tokens travel in
 * `x-terminal-token` to the same-origin proxy, which turns them into `Authorization`.
 */

import type {
  Address,
  AddressInput,
  App,
  Card,
  Cart,
  Env,
  Order,
  Profile,
  Product,
  Region,
  Subscription,
  SubscriptionInput,
  Token,
  ViewInit,
} from "./types";

export class TerminalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly type?: string,
  ) {
    super(message);
    this.name = "TerminalError";
  }
}

export interface ClientOptions {
  /** Proxy prefix, e.g. `/__terminal` (dev) or `/api/terminal` (`text start`). */
  base: string;
  env: Env;
  /** Returns the current bearer token, or `null` to let the proxy use its server-side token. */
  token: () => string | null;
  /** Called once on 401; resolve `true` after refreshing credentials to retry. */
  onUnauthorized?: () => Promise<boolean>;
  region?: () => Region | null;
  fetch?: typeof fetch;
}

/** Human message from any thrown value (like the Go TUI's `api.GetErrorMessage`). */
export function errorMessage(error: unknown): string {
  if (error instanceof TerminalError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createClient(options: ClientOptions) {
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  async function request<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}, retried = false): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json", "x-terminal-client": "1", ...extra };
    const token = options.token();
    if (token) headers["x-terminal-token"] = token;
    const region = options.region?.();
    if (region) headers["x-terminal-region"] = region;
    if (body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      res = await doFetch(`${options.base}/${options.env}/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new TerminalError("could not reach the terminal api, check your connection", 0, "network");
    }
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (res.status === 401 && !retried && options.onUnauthorized && (await options.onUnauthorized())) {
      return request<T>(method, path, body, extra, true);
    }
    if (!res.ok) {
      const j = (json ?? {}) as { message?: string; code?: string; type?: string };
      throw new TerminalError(j.message || `request failed with status ${res.status}`, res.status, j.code, j.type);
    }
    return ((json ?? {}) as { data: T }).data;
  }

  return {
    view: { init: () => request<ViewInit>("GET", "/view/init") },
    product: { list: () => request<Product[]>("GET", "/product") },
    profile: {
      me: () => request<Profile>("GET", "/profile"),
      update: (name: string) => request<Profile>("PUT", "/profile", { name }),
    },
    cart: {
      get: () => request<Cart>("GET", "/cart"),
      clear: () => request<"ok">("DELETE", "/cart"),
      setItem: (productVariantID: string, quantity: number) => request<Cart>("PUT", "/cart/item", { productVariantID, quantity }),
      setAddress: (addressID: string) => request<"ok">("PUT", "/cart/address", { addressID }),
      setCard: (cardID: string) => request<"ok">("PUT", "/cart/card", { cardID }),
      /** Places the order. `idempotencyKey` makes retries safe. */
      convert: (idempotencyKey: string) => request<Order>("POST", "/cart/convert", undefined, { "idempotency-key": idempotencyKey }),
    },
    address: {
      list: () => request<Address[]>("GET", "/address"),
      create: (input: AddressInput) => request<string>("POST", "/address", input),
      update: (id: string, input: AddressInput) => request<Address>("PATCH", `/address/${encodeURIComponent(id)}`, input),
      delete: (id: string) => request<"ok">("DELETE", `/address/${encodeURIComponent(id)}`),
    },
    card: {
      list: () => request<Card[]>("GET", "/card"),
      delete: (id: string) => request<"ok">("DELETE", `/card/${encodeURIComponent(id)}`),
      /** A short-lived terminal.shop URL where Stripe collects the card over https. */
      collect: () => request<{ url: string }>("POST", "/card/collect"),
    },
    order: {
      list: () => request<Order[]>("GET", "/order"),
      cancel: (id: string) => request<string>("DELETE", `/order/${encodeURIComponent(id)}`),
      updateShipping: (id: string, shipping: AddressInput) => request<Order>("PATCH", `/order/${encodeURIComponent(id)}/shipping`, { shipping }),
    },
    subscription: {
      list: () => request<Subscription[]>("GET", "/subscription"),
      create: (input: SubscriptionInput) => request<"ok">("POST", "/subscription", input),
      update: (id: string, input: Partial<Pick<SubscriptionInput, "addressID" | "cardID" | "schedule">>) =>
        request<Subscription>("PUT", `/subscription/${encodeURIComponent(id)}`, input),
      delete: (id: string) => request<"ok">("DELETE", `/subscription/${encodeURIComponent(id)}`),
    },
    token: {
      list: () => request<Token[]>("GET", "/token"),
      create: () => request<{ id: string; token: string }>("POST", "/token"),
      delete: (id: string) => request<"ok">("DELETE", `/token/${encodeURIComponent(id)}`),
    },
    app: {
      list: () => request<App[]>("GET", "/app"),
      create: (name: string, redirectURI: string) => request<{ id: string; secret: string }>("POST", "/app", { name, redirectURI }),
      delete: (id: string) => request<"ok">("DELETE", `/app/${encodeURIComponent(id)}`),
    },
  };
}

export type TerminalClient = ReturnType<typeof createClient>;
