/**
 * The shop's state: everything `tui.model` keeps across pages (data from
 * `/view/init`, the cart with optimistic quantity updates, checkout selections, the
 * environment and credentials). Page-local UI state (forms, list cursors) lives in
 * the screens and resets when a page mounts, like the Go TUI's `…Switch()` calls.
 */

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { createClient, errorMessage, TerminalError, type TerminalClient } from "./api";
import {
  beginOAuth,
  browserStorage,
  completeOAuth,
  loadCredentials,
  loadEnv,
  normalizeToken,
  refreshOAuth,
  saveCredentials,
  saveEnv,
  tokenEnvMismatch,
  type Credentials,
  type KeyValueStorage,
} from "./auth";
import { EMPTY_CART, type Address, type AddressInput, type App, type Card, type Cart, type Env, type Order, type Product, type Region, type Subscription, type SubscriptionInput, type Token, type User } from "./types";

export type Phase = "boot" | "login" | "splash" | "ready" | "quit";

export interface ProxyStatus {
  defaultEnv: Env;
  environments: Record<Env, { label: string; api: string; enabled: boolean; serverToken: boolean }>;
}

export interface StoreState {
  phase: Phase;
  env: Env;
  base: string | null;
  proxy: ProxyStatus | null;
  /** Where the bearer token comes from. */
  auth: "browser-token" | "oauth" | "server" | null;
  error: string | null;
  user: User | null;
  products: Product[];
  cart: Cart;
  addresses: Address[];
  cards: Card[];
  subscriptions: Subscription[];
  orders: Order[];
  tokens: Token[];
  apps: App[];
  region: Region | null;
  /** The token returned by `POST /token`, shown once. */
  newToken: { id: string; token: string } | null;
  newApp: { id: string; secret: string } | null;
  shopSelected: number;
  cartSelected: number;
  /** Set while subscribing to a `subscription: "required"` product (cron). */
  subscribing: { product: Product; selected: number } | null;
  subscription: Partial<SubscriptionInput>;
  /** The order just placed. */
  order: Order | null;
  /** Initial route requested before the splash finished (`ssh terminal.shop -t cart`). */
  initialPath: string;
}

export interface StoreOptions {
  storage?: KeyValueStorage;
  fetch?: typeof fetch;
  /** Minimum splash time (the SSH shop shows it for at least 2 s). */
  splashMs?: number;
  /** Proxy prefixes to probe. */
  bases?: string[];
  pollMs?: number;
  now?: () => number;
}

const BASES = ["/__terminal", "/api/terminal"];
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function reorder(products: Product[]): Product[] {
  return [...products.filter((p) => p.tags?.featured), ...products.filter((p) => !p.tags?.featured)];
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class ShopStore {
  private state: StoreState;
  private readonly listeners = new Set<() => void>();
  private readonly storage: KeyValueStorage;
  private readonly doFetch: typeof fetch;
  private readonly splashMs: number;
  private readonly bases: string[];
  readonly pollMs: number;
  private readonly now: () => number;
  private creds: Credentials | null = null;
  private lastCartUpdate = 0;
  private client: TerminalClient | null = null;
  private refreshing: Promise<boolean> | null = null;
  private started = false;

  constructor(options: StoreOptions = {}) {
    this.storage = options.storage ?? browserStorage();
    this.doFetch = options.fetch ?? (((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)) as typeof fetch);
    this.splashMs = options.splashMs ?? 2000;
    this.bases = options.bases ?? BASES;
    this.pollMs = options.pollMs ?? 1000;
    this.now = options.now ?? Date.now;
    this.state = {
      phase: "boot",
      env: loadEnv(this.storage),
      base: null,
      proxy: null,
      auth: null,
      error: null,
      user: null,
      products: [],
      cart: EMPTY_CART,
      addresses: [],
      cards: [],
      subscriptions: [],
      orders: [],
      tokens: [],
      apps: [],
      region: null,
      newToken: null,
      newApp: null,
      shopSelected: 0,
      cartSelected: 0,
      subscribing: null,
      subscription: {},
      order: null,
      initialPath: "/shop",
    };
  }

  // ── external store ──────────────────────────────────────────────────────
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = (): StoreState => this.state;
  get s(): StoreState {
    return this.state;
  }
  private set(patch: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)): void {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    for (const l of this.listeners) l();
  }

  get api(): TerminalClient {
    if (!this.client) throw new Error("not connected");
    return this.client;
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  /** Find the proxy, load credentials and show the splash. Idempotent. */
  async start(initialPath = "/shop"): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.set({ initialPath: initialPath === "/" || initialPath === "/login" || initialPath.startsWith("/auth") ? "/shop" : initialPath });
    for (const base of this.bases) {
      try {
        const res = await this.doFetch(`${base}/_status`, { headers: { accept: "application/json" } });
        if (!res.ok) continue;
        const status = (await res.json()) as ProxyStatus;
        if (!status?.environments) continue;
        this.set({ base, proxy: status });
        break;
      } catch {
        // try the next prefix
      }
    }
    if (!this.state.base) {
      this.set({ phase: "login", error: "terminal api proxy not found, run `bun run dev:terminal`" });
      return;
    }
    let env = this.state.env;
    if (env === "prod" && !this.state.proxy?.environments.prod.enabled) env = "dev";
    this.useEnv(env);
    if (!this.creds && !this.state.proxy?.environments[env].serverToken) {
      this.set({ phase: "login" });
      return;
    }
    await this.load();
  }

  private useEnv(env: Env): void {
    this.creds = loadCredentials(this.storage, env);
    const server = this.state.proxy?.environments[env].serverToken ?? false;
    this.set({ env, auth: this.creds ? (this.creds.kind === "oauth" ? "oauth" : "browser-token") : server ? "server" : null });
    this.client = createClient({
      base: this.state.base ?? BASES[0]!,
      env,
      fetch: this.doFetch,
      token: () => this.creds?.access ?? null,
      region: () => this.state.region,
      onUnauthorized: () => this.refresh(),
    });
  }

  private refresh(): Promise<boolean> {
    const creds = this.creds;
    if (!creds?.refresh || !this.state.base) return Promise.resolve(false);
    this.refreshing ??= refreshOAuth(this.state.base, this.state.env, creds.refresh, this.doFetch)
      .then((next) => {
        this.creds = { ...next, refresh: next.refresh ?? creds.refresh };
        saveCredentials(this.storage, this.state.env, this.creds);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  /** `SplashInit` + `LoadCmds`: `/view/init` and a minimum splash delay. */
  async load(): Promise<void> {
    this.set({ phase: "splash", error: null });
    const delay = sleep(this.splashMs);
    try {
      const data = await this.api.view.init();
      await delay;
      this.set({
        phase: "ready",
        user: data.profile.user,
        products: reorder(data.products),
        cart: data.cart ?? EMPTY_CART,
        cards: data.cards,
        addresses: data.addresses,
        subscriptions: data.subscriptions,
        tokens: data.tokens,
        apps: data.apps,
        orders: data.orders,
        region: data.region,
        shopSelected: 0,
      });
    } catch (error) {
      await delay;
      if (error instanceof TerminalError && error.status === 401) {
        this.set({ phase: "login", error: this.state.auth === "server" ? "the server token was rejected, check TERMINAL_DEV_TOKEN" : "that token was rejected, paste a new one" });
        if (this.creds) this.signOutLocal();
        return;
      }
      this.set({ error: errorMessage(error) });
    }
  }

  setError(message: string | null): void {
    this.set({ error: message });
  }

  fail(error: unknown): void {
    this.set({ error: errorMessage(error) });
  }

  showLogin(error: string | null = null): void {
    this.set({ phase: "login", error });
  }

  quit(): void {
    this.set({ phase: "quit", error: null });
  }

  /** Reconnect after "quit": back to the splash, like opening a new ssh session. */
  reconnect(): void {
    this.set({ subscribing: null, subscription: {}, order: null, cartSelected: 0, newToken: null, newApp: null, initialPath: "/shop" });
    if (!this.creds && !this.state.proxy?.environments[this.state.env].serverToken) this.set({ phase: "login" });
    else void this.load();
  }

  // ── environment + auth ──────────────────────────────────────────────────
  canUse(env: Env): boolean {
    return env === "dev" || !!this.state.proxy?.environments.prod.enabled;
  }

  switchEnv(env: Env): boolean {
    if (!this.canUse(env)) {
      this.set({ error: "production is disabled, restart the dev server with TERMINAL_ENABLE_PRODUCTION=1" });
      return false;
    }
    saveEnv(this.storage, env);
    this.useEnv(env);
    this.set({ error: null, user: null, cart: EMPTY_CART, products: [], region: null });
    return true;
  }

  hasCredentials(): boolean {
    return !!this.creds || this.state.auth === "server";
  }

  async signInWithToken(input: string): Promise<boolean> {
    const token = normalizeToken(input);
    if (!token) {
      this.set({ error: "that doesn't look like a token" });
      return false;
    }
    const mismatch = tokenEnvMismatch(token, this.state.env);
    if (mismatch) {
      this.set({ error: mismatch });
      return false;
    }
    this.creds = { kind: "token", access: token };
    saveCredentials(this.storage, this.state.env, this.creds);
    this.useEnv(this.state.env);
    await this.load();
    return this.state.phase === "ready";
  }

  async beginOAuth(origin: string): Promise<string> {
    return beginOAuth(this.state.env, origin, this.state.initialPath);
  }

  async completeOAuth(params: URLSearchParams): Promise<string> {
    if (!this.state.base) throw new Error("terminal api proxy not found");
    const { env, creds, returnTo } = await completeOAuth(this.state.base, params, this.doFetch);
    saveCredentials(this.storage, env, creds);
    saveEnv(this.storage, env);
    this.useEnv(env);
    this.set({ initialPath: returnTo });
    await this.load();
    return returnTo;
  }

  private signOutLocal(): void {
    saveCredentials(this.storage, this.state.env, null);
    this.creds = null;
    this.useEnv(this.state.env);
  }

  signOut(): void {
    this.signOutLocal();
    this.set({ phase: this.state.auth === "server" ? this.state.phase : "login", user: null, cart: EMPTY_CART, error: null });
  }

  // ── shop + cart ─────────────────────────────────────────────────────────
  get highlight(): string | null {
    return this.state.products[this.state.shopSelected]?.tags?.color ?? null;
  }

  selectProduct(index: number): void {
    const max = this.state.products.length - 1;
    this.set({ shopSelected: Math.max(0, Math.min(max, index)) });
  }

  selectProductByName(name: string): boolean {
    const i = this.state.products.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (i >= 0) this.set({ shopSelected: i });
    return i >= 0;
  }

  productFor(variantID: string): Product | null {
    return this.state.products.find((p) => p.variants[0]?.id === variantID) ?? null;
  }

  /** Any variant, for orders and subscriptions. */
  productForVariant(variantID: string | undefined): { product: Product; variant: Product["variants"][number] } | null {
    for (const product of this.state.products) for (const variant of product.variants) if (variant.id === variantID) return { product, variant };
    return null;
  }

  cartItem(variantID: string): { quantity: number; subtotal: number } {
    const item = this.state.cart.items.find((i) => i.productVariantID === variantID);
    return item ?? { quantity: 0, subtotal: 0 };
  }

  visibleCartItems(): Cart["items"] {
    return this.state.cart.items.filter((i) => this.productFor(i.productVariantID) && i.quantity > 0);
  }

  isCartEmpty(): boolean {
    return this.visibleCartItems().length === 0;
  }

  selectCartItem(index: number): void {
    const n = this.visibleCartItems().length;
    if (n === 0) return;
    this.set({ cartSelected: Math.max(0, Math.min(n - 1, index)) });
  }

  /** `UpdateCart`: optimistic, last write wins. */
  updateCart(variantID: string, offset: number): void {
    const product = this.productFor(variantID);
    if (!product) return;
    const price = product.variants[0]?.price ?? 0;
    const items = this.state.cart.items.map((i) => ({ ...i }));
    let item = items.find((i) => i.productVariantID === variantID);
    const next = (item?.quantity ?? 0) + offset;
    if (next < 0) return;
    if (!item) {
      item = { productVariantID: variantID, quantity: 0, subtotal: 0 };
      items.push(item);
    }
    item.quantity = next;
    item.subtotal = price * next;
    let subtotal = 0;
    for (const i of items) subtotal += i.quantity * (this.productFor(i.productVariantID)?.variants[0]?.price ?? 0);
    const updateID = Math.max(this.now(), this.lastCartUpdate + 1);
    this.lastCartUpdate = updateID;
    this.set((s) => ({ cart: { ...s.cart, items, subtotal } }));
    this.api.cart.setItem(variantID, next).then(
      (cart) => {
        if (this.lastCartUpdate === updateID) this.set({ cart });
      },
      (error) => {
        this.fail(error);
        void this.api.cart.get().then(
          (cart) => this.set({ cart }),
          () => this.set({ error: "something went wrong, reload the page" }),
        );
      },
    );
  }

  /** `ToggleRegion`: na → eu → global, clearing the cart and reloading. */
  async toggleRegion(): Promise<void> {
    const order: Region[] = ["na", "eu", "global"];
    const cur = this.state.region ?? "na";
    const next = order[(order.indexOf(cur) + 1) % order.length] as Region;
    this.set({ region: next });
    try {
      await this.api.cart.clear();
      const data = await this.api.view.init();
      this.set({ products: reorder(data.products), cart: data.cart ?? EMPTY_CART, shopSelected: 0, region: next });
    } catch (error) {
      this.fail(error);
    }
  }

  // ── checkout ────────────────────────────────────────────────────────────
  startSubscribing(product: Product): void {
    this.set({ subscribing: { product, selected: 0 }, subscription: {} });
  }

  selectSubscribeVariant(i: number): void {
    const sub = this.state.subscribing;
    if (!sub) return;
    this.set({ subscribing: { ...sub, selected: Math.max(0, Math.min(sub.product.variants.length - 1, i)) } });
  }

  stopSubscribing(): void {
    this.set({ subscribing: null, subscription: {} });
  }

  setSubscription(patch: Partial<SubscriptionInput>): void {
    this.set((s) => ({ subscription: { ...s.subscription, ...patch } }));
  }

  selectedAddress(): Address | null {
    const id = this.state.subscribing ? this.state.subscription.addressID : this.state.cart.addressID;
    return this.state.addresses.find((a) => a.id === id) ?? null;
  }

  selectedCard(): Card | null {
    const id = this.state.subscribing ? this.state.subscription.cardID : this.state.cart.cardID;
    return this.state.cards.find((c) => c.id === id) ?? null;
  }

  /** `SetShipping` + the cart refresh in `SelectedShippingUpdatedMsg`. */
  async chooseShipping(addressID: string): Promise<void> {
    if (this.state.subscribing) {
      this.setSubscription({ addressID });
      return;
    }
    await this.api.cart.setAddress(addressID);
    const cart = await this.api.cart.get();
    this.set({ cart: { ...cart, addressID } });
  }

  async addAddress(input: AddressInput): Promise<string> {
    const id = await this.api.address.create(input);
    const addresses = await this.api.address.list();
    this.set({ addresses });
    return id;
  }

  async updateAddress(id: string, input: AddressInput): Promise<Address> {
    const updated = await this.api.address.update(id, input);
    this.set({ addresses: await this.api.address.list() });
    return updated;
  }

  async deleteAddress(id: string): Promise<void> {
    await this.api.address.delete(id);
    this.set({ addresses: await this.api.address.list() });
  }

  async chooseCard(cardID: string): Promise<void> {
    if (this.state.subscribing) {
      this.setSubscription({ cardID });
      return;
    }
    await this.api.cart.setCard(cardID);
    this.set((s) => ({ cart: { ...s.cart, cardID } }));
  }

  async deleteCard(id: string): Promise<void> {
    await this.api.card.delete(id);
    this.set({ cards: await this.api.card.list() });
  }

  collectCard(): Promise<{ url: string }> {
    return this.api.card.collect();
  }

  /** One `PollPaymentStatusMsg` tick: resolves the new card list once a card was added. */
  async pollCards(previousCount: number): Promise<Card[] | null> {
    const cards = await this.api.card.list();
    if (cards.length > previousCount) {
      this.set({ cards });
      return cards;
    }
    return null;
  }

  /** `Cart.Convert` with a stable idempotency key: places the order. */
  async placeOrder(idempotencyKey: string): Promise<Order> {
    const order = await this.api.cart.convert(idempotencyKey);
    this.set((s) => ({ order, orders: [order, ...s.orders.filter((o) => o.id !== order.id)] }));
    return order;
  }

  /** `FinalSubSwitch` / `FinalSwitch` clear the local cart. */
  clearLocalCart(): void {
    this.set((s) => ({ cart: { ...s.cart, items: [], subtotal: 0 }, cartSelected: 0 }));
  }

  async createSubscription(input: SubscriptionInput): Promise<void> {
    await this.api.subscription.create(input);
    this.set({ subscriptions: await this.api.subscription.list() });
  }

  /** `FinalSub`: subscribe to every item of the order just placed. */
  async subscribeToOrder(weeks: number): Promise<void> {
    const order = this.state.order;
    if (!order) return;
    const { addressID, cardID } = this.state.cart;
    for (const item of order.items) {
      if (!item.productVariantID || !addressID || !cardID) continue;
      await this.api.subscription.create({
        productVariantID: item.productVariantID,
        quantity: item.quantity,
        addressID,
        cardID,
        schedule: { type: "weekly", interval: weeks },
      });
    }
    this.set({ subscriptions: await this.api.subscription.list() });
  }

  // ── account ─────────────────────────────────────────────────────────────
  async cancelOrder(id: string): Promise<void> {
    await this.api.order.cancel(id);
    this.set({ orders: await this.api.order.list() });
  }

  async updateOrderShipping(id: string, address: AddressInput): Promise<Order> {
    const order = await this.api.order.updateShipping(id, address);
    const orders = (await this.api.order.list()).map((o) => (o.id === order.id ? order : o));
    this.set({ orders });
    return order;
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.api.subscription.delete(id);
    this.set({ subscriptions: await this.api.subscription.list() });
  }

  async updateSubscription(id: string, patch: { addressID?: string; cardID?: string }): Promise<Subscription> {
    const updated = await this.api.subscription.update(id, patch);
    this.set({ subscriptions: await this.api.subscription.list() });
    return updated;
  }

  async createToken(): Promise<void> {
    const created = await this.api.token.create();
    this.set({ newToken: created, tokens: await this.api.token.list() });
  }

  async deleteToken(id: string): Promise<void> {
    await this.api.token.delete(id);
    this.set({ tokens: await this.api.token.list() });
  }

  async createApp(name: string, redirectURI: string): Promise<void> {
    const created = await this.api.app.create(name, redirectURI);
    this.set({ newApp: created, apps: await this.api.app.list() });
  }

  async deleteApp(id: string): Promise<void> {
    await this.api.app.delete(id);
    this.set({ apps: await this.api.app.list() });
  }
}

let shared: ShopStore | null = null;

export function getShopStore(): ShopStore {
  shared ??= new ShopStore();
  return shared;
}

/** Replace the shared store (tests, embeds). */
export function resetShopStore(options?: StoreOptions): ShopStore {
  shared = new ShopStore(options);
  return shared;
}

const StoreContext = createContext<ShopStore | null>(null);

export function ShopProvider({ store, children }: { store: ShopStore; children?: ReactNode }): ReactNode {
  return createElement(StoreContext.Provider, { value: store }, children);
}

export function useShop(): ShopStore {
  return useContext(StoreContext) ?? getShopStore();
}

export function useShopState<T>(select: (s: StoreState) => T): T {
  const store = useShop();
  return useSyncExternalStore(store.subscribe, () => select(store.getSnapshot()), () => select(store.getSnapshot()));
}
