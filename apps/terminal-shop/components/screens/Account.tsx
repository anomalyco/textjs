import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "@textjs/app/navigation";
import { LARGE, LARGE_LAYOUT, type Command, type Layout } from "../../lib/frame";
import { FAQS } from "../../lib/faq";
import { notEmpty, type FieldDef } from "../../lib/form";
import { dollars, formatExpiration, formatLast4 } from "../../lib/format";
import { useShop, useShopState, type ShopStore, type StoreState } from "../../lib/store";
import { palette, type Theme } from "../../lib/theme";
import type { Address, AddressInput, App, Card, Order, Subscription, Token } from "../../lib/types";
import { block, box, concat, fit, hjoin, place, span, viewport, width, wordWrap, type Line } from "../../lib/ui";
import { Page, useBlink, useBusy, useHeaderMode, useKeys, useNav, useRealMoneyConfirm } from "../chrome";
import { useForm } from "../useForm";
import { listItem } from "./Cart";
import { addressItem, paymentHttps } from "./Checkout";

export type AccountPage = "orders" | "subscriptions" | "tokens" | "apps" | "addresses" | "link-email" | "payment" | "profile" | "faq" | "about" | "debug";

/**
 * The SSH shop's account pages, in its order. "payment methods" is the shop's own
 * `paymentPage` entry (written but commented out of its menu); "profile" is ours, for the
 * one profile field the API changes (`PUT /profile` takes a name).
 */
export const ACCOUNT_PAGES: AccountPage[] = ["orders", "subscriptions", "tokens", "apps", "addresses", "link-email", "payment", "profile", "faq", "about", "debug"];

export const PAGE_NAMES: Record<AccountPage, string> = {
  orders: "order history",
  subscriptions: "subscriptions",
  tokens: "access tokens",
  apps: "apps (oauth 2.0)",
  addresses: "addresses",
  "link-email": "link email",
  payment: "payment methods",
  profile: "profile",
  faq: "faq",
  about: "about",
  debug: "debug info",
};

/** Pages that show account data; signed out (textjs.org), they ask you to sign in. */
const SIGN_IN_PROMPTS: Partial<Record<AccountPage, string>> = {
  orders: "sign in to see your orders",
  subscriptions: "sign in to manage your subscriptions",
  tokens: "sign in to manage access tokens",
  apps: "sign in to manage oauth apps",
  addresses: "sign in to manage your addresses",
  "link-email": "sign in to link an email",
  payment: "sign in to manage payment methods",
  profile: "sign in to see your profile",
};

const NAME_WIDTH = Math.max(...ACCOUNT_PAGES.map((p) => PAGE_NAMES[p].length));

/** `updateAccountViewports` / `getAccountDetailContent`: menu and detail widths for the layout. */
export interface AccountDims {
  layout: Layout;
  /** Below the large layout the menu and the detail stack, both full width. */
  stacked: boolean;
  menuWidth: number;
  /** `GetAccountPageContent`'s `totalWidth`. */
  detail: number;
}

export function accountDims(L: Layout = LARGE_LAYOUT): AccountDims {
  if (L.size < LARGE) return { layout: L, stacked: true, menuWidth: L.widthContent, detail: L.widthContent };
  const menuWidth = NAME_WIDTH + 4;
  return { layout: L, stacked: false, menuWidth, detail: L.widthContent - menuWidth - 3 };
}

/** Width of the account detail column in the large layout. */
export const DETAIL_WIDTH = accountDims().detail;

const APP_FORM: FieldDef[][] = [
  [
    { key: "name", title: "name", validate: notEmpty("name") },
    { key: "redirectUri", title: "redirect uri", validate: notEmpty("redirect uri") },
  ],
];

const PROFILE_FORM: FieldDef[][] = [[{ key: "name", title: "name", validate: notEmpty("name") }]];

export function accountMenu(selected: number, t: Theme, d: AccountDims = accountDims()): Line[] {
  const hl = { fg: palette.accent, bg: t.highlight };
  return ACCOUNT_PAGES.map((p, i) => {
    const style = i === selected ? hl : t.baseStyle;
    if (d.stacked) return [span(" "), ...fit([span(PAGE_NAMES[p], style)], d.layout.widthContent, "center", style)];
    return [span(" "), ...fit([span(` ${PAGE_NAMES[p]}`, style)], NAME_WIDTH + 2, "left", style)];
  });
}

const detailBox = (content: Line[], selected: boolean, t: Theme, inner: number): Line[] => box(content, inner, selected ? palette.accent : t.border, t.baseStyle);

const centeredEmpty = (ls: Line[], d: AccountDims): Line[] => place(ls, d.detail, d.layout.heightContent);

const text = (v: string, w: number, t: Theme): Line[] => wordWrap(v, w).map((l) => [t.base(l)]);

// ── orders ──────────────────────────────────────────────────────────────────

interface OrdersUI {
  selected: number;
  viewing: boolean;
  canceling: number | null;
  editingShipping: boolean;
  addressConfirming: boolean;
  addressSelected: number;
  pending: number;
  submitting: boolean;
  notice: string;
}

const ordersUI = (): OrdersUI => ({ selected: 0, viewing: false, canceling: null, editingShipping: false, addressConfirming: false, addressSelected: 0, pending: -1, submitting: false, notice: "" });

function lockedNotice(order: Order | undefined): string {
  switch (order?.changeUnavailableReason) {
    case "fulfillment_started":
      return "fulfillment started; contact support for changes";
    case "canceled":
      return "this order has been canceled";
    default:
      return "this order cannot be changed";
  }
}

function orderItemText(store: ShopStore, item: Order["items"][number]): string {
  const p = store.productForVariant(item.productVariantID);
  return p ? `${item.quantity}x ${p.product.name}` : "unknown product";
}

function addressBlock(a: AddressInput, t: Theme): Line[] {
  const out: Line[] = [[t.base(a.name)], [t.base(a.street1)]];
  if (a.street2) out.push([t.base(a.street2)]);
  out.push([t.base(`${a.city}, ${a.province ?? ""} ${a.zip}`)], [t.base(a.country)]);
  if (a.phone) out.push([t.base(`tel: ${a.phone}`)]);
  return out;
}

function ordersView(store: ShopStore, ui: OrdersUI, focused: boolean, t: Theme, d: AccountDims): Line[] {
  const W = d.detail;
  const { orders, addresses } = store.s;
  const notice = ui.notice ? [[t.brand(ui.notice)], []] : [];
  if (ui.viewing && orders.length > 0) {
    const order = orders[ui.selected] as Order;
    if (ui.submitting) return [[t.base(" updating order...")]];
    if (ui.addressConfirming) {
      const a = addresses[ui.pending];
      const ls: Line[] = [...notice, [t.accent("update shipping address?")], [t.base("this only changes the selected order.")], []];
      if (!a) return [...ls, [t.base("selected address is no longer available")]];
      return [...ls, ...addressBlock(a, t), [], [t.base("are you sure? "), t.accent("(enter/y to update, n to go back)")]];
    }
    if (ui.canceling !== null) {
      return [...notice, [t.accent("cancel order?")], [t.base("orders can only be canceled before fulfillment starts.")], [], [t.base("are you sure? "), t.accent("(y/n)")]];
    }
    if (ui.editingShipping) {
      const ls: Line[] = [...notice, [t.accent("choose a new shipping address")], [t.base("shipping changes are available before fulfillment starts.")], []];
      if (addresses.length === 0) return [...ls, [t.base("no saved addresses found")], [t.base("add an address from the shipping section first")]];
      addresses.forEach((a, i) => ls.push(...detailBox(addressItem(a, i === ui.addressSelected, t, W + 1), i === ui.addressSelected, t, W + 1)));
      return ls;
    }
    const index = orders.length - ui.selected - 1;
    const ls: Line[] = [[t.base("< "), t.accent("esc "), t.base("back to orders")], [], ...notice];
    ls.push([t.brand(`order #${index}`)], [t.base(`date: ${order.created}`)]);
    if (order.fulfillmentStarted) ls.push([t.base("changes: fulfillment started, contact support for changes")]);
    else if (order.status === "canceled") ls.push([t.base("changes: order canceled")]);
    else ls.push([t.base("changes: available before fulfillment starts")]);
    ls.push([], [t.accent("shipping address")], ...addressBlock(order.shipping, t), []);
    const tr = order.tracking ?? {};
    if (tr.service || tr.number || tr.status) {
      ls.push([t.accent("tracking")]);
      if (tr.status) ls.push([t.base(`status: ${tr.status}`)]);
      if (tr.service) ls.push([t.base(`service: ${tr.service}`)]);
      if (tr.number) ls.push([t.base(`tracking: ${tr.number}`)]);
      // The API also has these; the console can open the link.
      if (tr.statusDetails) ls.push([t.base(`details: ${tr.statusDetails}`)]);
      if (tr.url) ls.push([t.base("track: "), span(tr.url, { fg: palette.accent, link: true })]);
      ls.push([]);
    }
    ls.push([t.accent("items")], ...order.items.map((i) => [t.base(orderItemText(store, i))]), []);
    ls.push([t.accent("totals")], [t.base(`subtotal: $${dollars(order.amount.subtotal)}`)], [t.base(`shipping: $${dollars(order.amount.shipping)}`)], [t.base(`total: $${dollars(order.amount.subtotal + order.amount.shipping)}`)]);
    return ls.flatMap((l) => wrapLine(l, W));
  }
  if (orders.length === 0) return centeredEmpty([...(ui.notice ? [[t.brand(ui.notice)], []] : []), [t.base("no orders found")]], d);
  const out: Line[] = [...notice];
  orders.forEach((order, i) => {
    const index = orders.length - i - 1;
    const sel = focused && i === ui.selected;
    let item: Line[] = [[t.accent(`order #${index}`), t.base(`  $${String(dollars(order.amount.subtotal + order.amount.shipping)).padStart(2, " ")}`)], [t.base(`date: ${order.created}`)]];
    if (ui.canceling === i) item = [[t.accent("cancel order?")], [t.base("are you sure? (y/n)")]];
    if (ui.submitting && ui.canceling === i) item = [[t.base(" canceling order...")]];
    out.push(...detailBox(listItem(item, sel, t, W, false), sel, t, W));
  });
  return out;
}

function wrapLine(l: Line, w: number): Line[] {
  if (width(l) <= w || l.length !== 1) return [l];
  const s = l[0] as Line[number];
  return wordWrap(s.text, w).map((text) => [{ ...s, text }]);
}

function ordersFooter(store: ShopStore, ui: OrdersUI): Command[] {
  const orders = store.s.orders;
  if (ui.submitting) return [{ key: "…", value: "updating" }];
  if (ui.editingShipping) {
    if (ui.addressConfirming) return [{ key: "enter/y", value: "update address" }, { key: "n/esc", value: "back" }];
    return [{ key: "↑/↓", value: "addresses" }, { key: "enter", value: "review address" }, { key: "esc", value: "back" }];
  }
  if (ui.canceling !== null) return [{ key: "y", value: "confirm" }, { key: "n/esc", value: "cancel" }];
  const order = orders[Math.min(ui.selected, orders.length - 1)];
  if (ui.viewing && order) {
    return [...(order.canUpdateShipping ? [{ key: "a", value: "edit address" }] : []), ...(order.canCancel ? [{ key: "x/del", value: "cancel" }] : []), { key: "esc", value: "back to orders" }];
  }
  if (!order) return [{ key: "esc", value: "back" }];
  if (!order.canCancel) return [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: "view details" }, { key: "esc", value: "back" }];
  return [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: "view details" }, { key: "x/del", value: "cancel" }, { key: "esc", value: "back" }];
}

// ── subscriptions ───────────────────────────────────────────────────────────

interface SubsUI {
  selected: number;
  deleting: number | null;
  viewing: boolean;
  notice: string;
  /** A new weekly interval picked with +/- in the detail view, not saved yet. */
  interval: number | null;
  saving: boolean;
}

const subsUI = (patch: Partial<SubsUI> = {}): SubsUI => ({ selected: 0, deleting: null, viewing: false, notice: "", interval: null, saving: false, ...patch });

export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;

function subscriptionTitle(store: ShopStore, s: Subscription, t: Theme): Line | null {
  const p = store.productForVariant(s.productVariantID);
  if (!p) return null;
  if (p.product.name === "cron") return [t.accent(p.product.name)];
  const unit = s.schedule?.type === "weekly" ? "weeks" : "";
  const interval = s.schedule && "interval" in s.schedule ? s.schedule.interval : 0;
  return [t.accent(`${s.quantity}x ${p.product.name}`), t.base(` (every ${interval} ${unit})`)];
}

const weeks = (n: number): string => `every ${n} ${n === 1 ? "week" : "weeks"}`;

function subscriptionsView(store: ShopStore, ui: SubsUI, focused: boolean, t: Theme, d: AccountDims): Line[] {
  const W = d.detail;
  const { subscriptions, addresses, cards } = store.s;
  if (ui.viewing && subscriptions.length > 0) {
    if (ui.deleting !== null) return [[t.accent("are you sure?")], [t.base("(y/n)")]];
    if (ui.saving) return [[t.base(" updating subscription...")]];
    const sub = subscriptions[ui.selected] as Subscription;
    const ls: Line[] = [[t.base("< "), t.accent("esc "), t.base("back to subscriptions")], []];
    if (ui.notice) ls.push([t.brand(ui.notice)], []);
    ls.push([t.brand(`subscription ${sub.id}`)], [t.base(`created: ${sub.created}`)], []);
    const addr = addresses.find((a) => a.id === sub.addressID);
    ls.push([t.accent("address")], ...(addr ? addressBlock(addr, t) : [[t.base(sub.addressID)]]), []);
    const card = cards.find((c) => c.id === sub.cardID);
    ls.push([t.accent("card")]);
    if (card) ls.push([t.base(`${card.brand} • ****${card.last4}`)], [t.base(`expires ${String(card.expiration.month).padStart(2, "0")}/${String(card.expiration.year).padStart(4, "0")}`)], []);
    else ls.push([t.base(sub.cardID)], []);
    const p = store.productForVariant(sub.productVariantID);
    if (p) {
      ls.push([t.accent("product")], [t.base(`name: ${p.product.name}`)], [t.base(`variant: ${p.variant.name}`)], [t.base(`quantity: ${sub.quantity}`)], [t.base(`price: $${dollars(sub.price)}`)], [t.base(`subtotal: $${dollars(sub.quantity * sub.price)}`)], []);
    }
    ls.push([t.accent("next shipment")], [t.base(sub.next ?? "")], [], [t.accent("schedule")]);
    if (sub.schedule?.type === "fixed") ls.push([t.base("monthly")]);
    else if (sub.schedule?.type === "weekly") {
      if (ui.interval !== null && ui.interval !== sub.schedule.interval) {
        ls.push([t.base("- "), t.accent(weeks(ui.interval)), t.base(" +")], [t.brand("press enter to save, esc to keep "), t.brand(weeks(sub.schedule.interval))]);
      } else ls.push([t.base(weeks(sub.schedule.interval))]);
    } else ls.push([t.base(`${(sub.schedule as { type?: string } | undefined)?.type ?? ""} every 0`)]);
    return ls.flatMap((l) => wrapLine(l, W));
  }
  if (subscriptions.length === 0) return centeredEmpty([[t.base("no active subscriptions")]], d);
  const out: Line[] = [];
  subscriptions.forEach((s, i) => {
    const title = subscriptionTitle(store, s, t);
    let content: Line[];
    if (!title) content = [[t.base("unknown product")]];
    else {
      const price = t.base(` $${String(dollars(s.quantity * s.price)).padStart(2, " ")}`);
      const space = W - width(title) - width([price]) - 2;
      content = [concat(title, t.base(" ".repeat(Math.max(0, space))), price), [t.base(`next shipment: ${s.next ?? ""}`)]];
    }
    if (ui.deleting === i) content = [[t.accent("are you sure?")], [t.base("(y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t, W));
  });
  return out;
}

function subscriptionsFooter(store: ShopStore, ui: SubsUI): Command[] {
  if (!ui.viewing) return [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: "view details" }, { key: "x/del", value: "cancel" }, { key: "esc", value: "back" }];
  const sub = store.s.subscriptions[ui.selected];
  const weekly = sub?.schedule?.type === "weekly";
  if (weekly && ui.interval !== null && ui.interval !== (sub.schedule as { interval: number }).interval) return [{ key: "+/-", value: "schedule" }, { key: "enter", value: "save" }, { key: "esc", value: "keep" }];
  return [{ key: "e", value: "address" }, { key: "c", value: "card" }, ...(weekly ? [{ key: "+/-", value: "schedule" }] : []), { key: "x/del", value: "cancel" }, { key: "esc", value: "back" }];
}

// ── tokens + apps ───────────────────────────────────────────────────────────

interface TokensUI {
  selected: number;
  deleting: number | null;
}

function tokensView(s: StoreState, ui: TokensUI, focused: boolean, t: Theme, d: AccountDims, opts: { canCreate: boolean; code: string | null; creating: boolean }): Line[] {
  const W = d.detail;
  const out: Line[] = [];
  s.tokens.forEach((token: Token, i) => {
    let content: Line[] = [[t.accent(token.id)], [t.base(`created: ${token.created}`)]];
    if (s.newToken && token.id === s.newToken.id) content.push([t.brand(s.newToken.token, { bold: true })], [t.base("(will not be shown again)")]);
    else content.push([t.base(token.token)]);
    if (ui.deleting === i) content = [[t.accent("are you sure you want to revoke?")], [t.base("(y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t, W));
  });
  const addSel = ui.selected === s.tokens.length;
  if (!opts.canCreate) out.push(...sshOnly(s, "tokens", "new access tokens are made in the ssh shop:", t, W));
  else if (opts.code !== null) out.push(...detailBox([[t.base("to create a token, press "), t.brand(opts.code, { bold: true }), t.base(" · n to cancel")]], true, t, W));
  else out.push(...detailBox(listItem(opts.creating ? "creating token..." : "add access token", addSel, t, W, false), focused && addSel, t, W));
  return out;
}

/**
 * Without `TERMINAL_ALLOW_CREDENTIALS`, textjs.org never mints long-lived credentials (its
 * proxy doesn't forward `POST /token` or `POST /app`), so creating them points at the ssh
 * shop. Listing and revoking still work.
 */
function sshOnly(s: StoreState, command: "tokens" | "apps", message: string, t: Theme, W: number): Line[] {
  const host = s.env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  return [[], ...text(message, W, t), [t.accent(`  ssh ${host} -t ${command}`)]];
}

interface AppsUI {
  selected: number;
  deleting: number | null;
  editing: boolean;
}

function appsView(s: StoreState, ui: AppsUI & { submitting: boolean }, focused: boolean, form: Line[], t: Theme, d: AccountDims, opts: { canCreate: boolean; code: string | null }): Line[] {
  const W = d.detail;
  const out: Line[] = [];
  s.apps.forEach((app: App, i) => {
    let content: Line[] = [[t.accent(app.name)], [t.base(`redirect: ${app.redirectURI}`)], [t.base(`client id: ${app.id}`)]];
    if (s.newApp && app.id === s.newApp.id) content.push([t.base("secret: "), t.brand(s.newApp.secret, { bold: true })], [t.base("(will not be shown again)")]);
    else content.push([t.base(`secret: ${app.secret}`)]);
    if (ui.deleting === i) content = [[t.accent("are you sure you want to remove?"), t.base(" (y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t, W));
  });
  const addSel = ui.selected === s.apps.length;
  if (!opts.canCreate) out.push(...sshOnly(s, "apps", "new oauth apps are made in the ssh shop:", t, W));
  else if (opts.code !== null) out.push(...detailBox([[t.base("to create this app, press "), t.brand(opts.code, { bold: true }), t.base(" · n to cancel")]], true, t, W));
  else if (ui.editing && !ui.submitting) out.push(...form);
  else out.push(...detailBox(listItem(ui.submitting ? "submitting app..." : "create app", addSel, t, W, false), focused && addSel, t, W));
  return out;
}

// ── payment methods ─────────────────────────────────────────────────────────

interface CardsUI {
  selected: number;
  deleting: number | null;
  /** `https`: the hosted card page's link and QR code, polling until the card shows up. */
  view: "list" | "https";
  url: string | null;
  status: "idle" | "generating" | "removing";
  notice: string;
}

const cardsUI = (): CardsUI => ({ selected: 0, deleting: null, view: "list", url: null, status: "idle", notice: "" });

function cardLine(c: Card): string {
  return `${c.brand}  ${formatLast4(c.last4)}  ${formatExpiration(c.expiration)}`;
}

function cardsView(s: StoreState, ui: CardsUI, focused: boolean, t: Theme, d: AccountDims): Line[] {
  const W = d.detail;
  if (ui.status === "generating") return [[t.base("  generating payment link...")]];
  if (ui.status === "removing") return [[t.base("  removing card...")]];
  if (ui.view === "https") return paymentHttps(ui.url, t, W);
  const out: Line[] = [];
  if (ui.notice) out.push([t.brand(` ${ui.notice}`)]);
  s.cards.forEach((c, i) => {
    const sel = focused && i === ui.selected;
    const used = s.subscriptions.filter((x) => x.cardID === c.id).length;
    let content: Line[] = [[span(cardLine(c))]];
    if (used) content.push([t.base(`pays for ${used} subscription${used === 1 ? "" : "s"}`)]);
    content = listItem(content, sel, t, W);
    if (ui.deleting === i) content = listItem([[t.accent("remove this card?"), t.base(" (y/n)")]], true, t, W);
    out.push(...detailBox(content, sel, t, W - 2));
  });
  const addSel = focused && ui.selected === s.cards.length;
  out.push(...detailBox(listItem("add payment information via browser", addSel, t, W), addSel, t, W - 2));
  return out;
}

function cardsFooter(s: StoreState, ui: CardsUI): Command[] {
  if (ui.status !== "idle") return [{ key: "…", value: ui.status === "removing" ? "removing" : "generating" }];
  if (ui.view === "https") return [{ key: "esc", value: "back" }, { key: "enter", value: "open" }];
  if (ui.deleting !== null) return [{ key: "y", value: "remove" }, { key: "n/esc", value: "keep" }];
  return [{ key: "↑/↓", value: "cards" }, ...(ui.selected < s.cards.length ? [{ key: "x/del", value: "remove" }] : [{ key: "enter", value: "add" }]), { key: "esc", value: "back" }];
}

// ── profile ─────────────────────────────────────────────────────────────────

function profileView(s: StoreState, focused: boolean, editing: boolean, saving: boolean, notice: string, form: Line[], t: Theme, d: AccountDims): Line[] {
  const W = d.detail;
  const host = s.env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const user = s.user;
  if (saving) return [[t.base("  saving profile...")]];
  const out: Line[] = [];
  if (notice) out.push([t.brand(notice)], []);
  if (editing) return [...out, [t.base("change the name on your account")], [], ...form];
  out.push([t.accent("name")], [t.base(user?.name?.trim() ? user.name : "none")], []);
  out.push([t.accent("email")]);
  if (user?.email) out.push([t.base(user.email)]);
  else out.push([t.base("none")], ...text("link one from your ssh session:", W, t), [t.accent(`  ssh ${host} -t link-email`)]);
  out.push([], [t.accent("id")], [t.base(user?.id ?? "none")], []);
  if (!focused) out.push(...text("select this item to change your name.", W, t));
  return out;
}

// ── static pages ────────────────────────────────────────────────────────────

function addressesPreview(addresses: Address[], t: Theme, W: number): Line[] {
  const count = addresses.length === 0 ? "no saved addresses yet." : addresses.length === 1 ? "1 saved address." : `${addresses.length} saved addresses.`;
  return [[t.base("manage saved shipping addresses")], [], [t.base(count)], [], ...text("select this item to add, edit, or remove addresses.", W, t)];
}

/**
 * `LinkEmailView`. Linking needs the ssh session itself (the API refuses tokens), so
 * selecting it points at the ssh command instead of showing the form.
 */
function linkEmailView(s: StoreState, focused: boolean, t: Theme, W: number): Line[] {
  const host = s.env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const out: Line[] = [
    ...text("link this ssh key to an email account", W, t),
    [],
    ...text("this lets multiple ssh keys open the same terminal account.", W, t),
    ...text("we'll email you a confirmation link, and the browser will ask for the code shown here.", W, t),
    [],
  ];
  if (s.user?.email) return [...out, ...text("this account is already linked to:", W, t), [t.base(s.user.email)]];
  if (!focused) return [...out, ...text("select this item to start.", W, t)];
  return [...out, ...text("linking starts from your ssh session:", W, t), [t.accent(`  ssh ${host} -t link-email`)]];
}

function faqView(t: Theme, W: number): Line[] {
  const out: Line[] = [];
  for (const f of FAQS) {
    out.push(...wordWrap(f.question, W).map((l) => [t.accent(l)]));
    out.push(...wordWrap(f.answer, W).map((l) => [t.base(l)]));
    out.push([]);
  }
  return out;
}

function aboutView(cursor: boolean, t: Theme, W: number): Line[] {
  return [
    ...text("1. # Amazingly awesome products for developers brought to you by a group of talented, good looking, and humble heroes...", W, t),
    [],
    [t.base("2. # @theprimeagen")],
    [],
    [t.base("3. # @teej_dv")],
    [],
    [t.base("4. "), t.accent("Terminal Products, Inc."), span(" ", cursor ? { bg: palette.brand } : {})],
  ];
}

function debugView(s: StoreState, confirmProd: boolean, signedOut: boolean, t: Theme, W: number): Line[] {
  const value = (v: string | null | undefined): string => (v && v.trim() ? v : "none");
  const row = (k: string, v: string | null | undefined): Line => [t.base(`${k}: `), t.accent(value(v))];
  const mode =
    s.auth === "session"
      ? "oauth 2.0 (terminal sign in)"
      : s.auth === "oauth"
        ? "oauth 2.0 (browser sign in)"
        : s.auth === "browser-token"
          ? "personal access token"
          : s.auth === "server"
            ? "server token (env)"
            : "none";
  const env = s.proxy?.environments[s.env];
  const site = s.proxy?.mode === "site";
  const headline = signedOut
    ? "not signed in"
    : s.auth === "session"
      ? "signed in with terminal, the token stays on the server"
      : s.auth === "server"
        ? "connected with a server-side token"
        : "connected with a token in this browser";
  const lines: Line[] = [[t.accent(headline)], []];
  lines.push(
    [t.accent("session")],
    row("  mode", mode),
    row("  environment", env?.label ?? s.env),
    row("  api", env?.api ?? ""),
    row("  region", s.region ?? "unknown"),
    [],
    [t.accent("account")],
    row("  id", s.user?.id),
    row("  email", s.user?.email),
    row("  name", s.user?.name),
    [],
    ...text("copy this when reporting an issue.", W, t),
    [],
  );
  if (confirmProd) {
    lines.push([t.error("switch to production?", { bold: true })], ...text("orders there are real: your card is charged and coffee ships.", W, t), [t.base("are you sure? "), t.accent("(y/n)")]);
  } else if (signedOut) lines.push([t.bold("enter"), t.base(" sign in")]);
  else if (site) lines.push([t.bold("x"), t.base(" sign out")]);
  else lines.push([t.bold("e"), t.base(s.env === "dev" ? " switch to production" : " switch to dev sandbox"), t.base("   "), t.bold("x"), t.base(" sign out")]);
  return lines;
}

function signInView(page: AccountPage, t: Theme, d: AccountDims): Line[] {
  const prompt = SIGN_IN_PROMPTS[page] ?? "sign in to continue";
  return centeredEmpty([...wordWrap(prompt, d.detail).map((l) => [t.accent(l)]), [], [t.base("press enter to sign in")]], d);
}

// ── screen ──────────────────────────────────────────────────────────────────

export function AccountScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const params = useSearchParams();
  const s = useShopState((st) => st);
  const signedOut = store.signedOut;
  const cursor = useBlink();
  const initialSub = params.get("subscription");
  const initialPage = (params.get("page") as AccountPage | null) ?? (initialSub ? "subscriptions" : null);
  const [selected, setSelected] = useState(() => Math.max(0, initialPage ? ACCOUNT_PAGES.indexOf(initialPage) : 0));
  const [focused, setFocused] = useState(() => !!initialSub);
  const [offset, setOffset] = useState(0);
  const [orders, setOrders] = useState<OrdersUI>(ordersUI);
  const [subs, setSubs] = useState<SubsUI>(() =>
    subsUI({ selected: Math.max(0, s.subscriptions.findIndex((x) => x.id === initialSub)), viewing: !!initialSub, notice: params.get("notice") ?? "" }),
  );
  const [tokens, setTokens] = useState<TokensUI>({ selected: 0, deleting: null });
  const [apps, setApps] = useState<AppsUI>({ selected: 0, deleting: null, editing: false });
  const [cards, setCards] = useState<CardsUI>(cardsUI);
  const [profile, setProfile] = useState({ editing: false, saving: false, notice: "" });
  const [appSubmitting, runApp] = useBusy();
  const [tokenCreating, runToken] = useBusy();
  const [confirmProd, setConfirmProd] = useState(false);
  // textjs.org (production): minting a token or an app takes a letter shown only in the console.
  const tokenConfirm = useRealMoneyConfirm();
  const appConfirm = useRealMoneyConfirm();
  const pendingApp = useRef<{ name: string; redirectURI: string } | null>(null);
  const askFirst = store.confirmRealOrders && s.env === "prod";
  const polling = useRef(0);
  const page = ACCOUNT_PAGES[selected] as AccountPage;
  const gated = signedOut && !!SIGN_IN_PROMPTS[page];

  useEffect(
    () => () => {
      polling.current++;
    },
    [],
  );

  const createApp = (name: string, redirectURI: string): void => {
    void runApp(() => store.createApp(name, redirectURI).catch((e) => store.fail(e)));
  };

  const appForm = useForm({
    groups: APP_FORM,
    active: focused && page === "apps" && apps.editing && !appSubmitting,
    onKey: (key) => {
      if (key !== "esc") return false;
      setApps((a) => ({ ...a, editing: false }));
      return true;
    },
    onSubmit: (values) => {
      setApps((a) => ({ ...a, editing: false }));
      const app = { name: (values.name ?? "").trim(), redirectURI: (values.redirectUri ?? "").trim() };
      if (askFirst) {
        pendingApp.current = app;
        appConfirm.arm();
      } else createApp(app.name, app.redirectURI);
    },
  });

  const profileForm = useForm({
    groups: PROFILE_FORM,
    active: focused && page === "profile" && profile.editing && !profile.saving,
    onKey: (key) => {
      if (key !== "esc") return false;
      setProfile((p) => ({ ...p, editing: false }));
      setFocused(false);
      return true;
    },
    onSubmit: (values) => {
      const name = (values.name ?? "").trim();
      setProfile({ editing: false, saving: true, notice: "" });
      store.updateProfile(name).then(
        () => {
          setProfile({ editing: false, saving: false, notice: "name updated" });
          setFocused(false);
        },
        (e) => {
          store.fail(e);
          setProfile({ editing: true, saving: false, notice: "" });
        },
      );
    },
  });

  const subViewing = focused && page === "subscriptions" && subs.viewing;
  const formActive = (page === "apps" && apps.editing) || (page === "profile" && profile.editing);
  useHeaderMode("account", !formActive && tokenConfirm.code === null && appConfirm.code === null, subViewing ? ["c"] : []);

  const unfocus = (): void => {
    setFocused(false);
    setOrders(ordersUI());
    setSubs(subsUI());
    setTokens({ selected: 0, deleting: null });
    setApps({ selected: 0, deleting: null, editing: false });
    setCards(cardsUI());
    setProfile((p) => ({ ...p, editing: false }));
    tokenConfirm.disarm();
    appConfirm.disarm();
    polling.current++;
    setOffset(0);
  };

  const orderKeys = (key: string): boolean => {
    const ui = orders;
    const list = s.orders;
    const set = (patch: Partial<OrdersUI>): void => setOrders((o) => ({ ...o, ...patch }));
    if (ui.submitting) return true;
    if (ui.editingShipping) {
      if (ui.addressConfirming) {
        if (key === "enter" || key === "y") {
          const order = list[ui.selected];
          const address = s.addresses[ui.pending];
          if (!order || !address) {
            set({ addressConfirming: false, pending: -1 });
            return true;
          }
          set({ submitting: true });
          store
            .updateOrderShipping(order.id, address)
            .then(() => setOrders((o) => ({ ...o, submitting: false, editingShipping: false, addressConfirming: false, pending: -1, notice: "shipping address updated" })))
            .catch((e) => {
              store.fail(e);
              set({ submitting: false });
            });
          return true;
        }
        if (key === "n" || key === "esc" || key === "backspace") set({ addressConfirming: false, pending: -1 });
        return true;
      }
      if (key === "j" || key === "down" || key === "tab") set({ notice: "", addressSelected: Math.max(0, Math.min(s.addresses.length - 1, ui.addressSelected + 1)) });
      else if (key === "k" || key === "up" || key === "shift+tab") set({ notice: "", addressSelected: Math.max(0, ui.addressSelected - 1) });
      else if (key === "esc" || key === "backspace") set({ editingShipping: false, addressConfirming: false, pending: -1 });
      else if (key === "enter" && list.length > 0 && s.addresses.length > 0) set({ pending: ui.addressSelected, addressConfirming: true });
      return true;
    }
    if (ui.canceling !== null) {
      if (key === "y") {
        const order = list[ui.canceling];
        if (!order) return true;
        set({ submitting: true });
        store
          .cancelOrder(order.id)
          .then(() =>
            setOrders((o) => ({ ...o, submitting: false, canceling: null, viewing: false, editingShipping: false, addressConfirming: false, pending: -1, notice: "order canceled", selected: Math.min(o.selected, Math.max(0, store.s.orders.length - 1)) })),
          )
          .catch((e) => {
            store.fail(e);
            set({ submitting: false, canceling: null });
          });
      } else if (key === "n" || key === "esc" || key === "backspace") set({ canceling: null });
      return true;
    }
    const order = list[ui.selected];
    if (ui.viewing) {
      if (key === "esc" || key === "backspace") set({ viewing: false });
      else if (key === "delete" || key === "d" || key === "x") set(order?.canCancel ? { notice: "", canceling: ui.selected } : { notice: lockedNotice(order) });
      else if (key === "a") set(order?.canUpdateShipping ? { notice: "", editingShipping: true, addressConfirming: false, addressSelected: 0, pending: -1 } : { notice: lockedNotice(order) });
      else if (key === "down" || key === "j") setOffset((o) => o + 1);
      else if (key === "up" || key === "k") setOffset((o) => Math.max(0, o - 1));
      else return false;
      return true;
    }
    if (key === "j" || key === "down" || key === "tab") set({ notice: "", selected: Math.max(0, Math.min(list.length - 1, ui.selected + 1)) });
    else if (key === "k" || key === "up" || key === "shift+tab") set({ notice: "", selected: Math.max(0, ui.selected - 1) });
    else if (key === "delete" || key === "d" || key === "x") {
      if (order?.canCancel) set({ notice: "", canceling: ui.selected });
      else if (order) set({ notice: lockedNotice(order) });
    } else if (key === "enter") {
      if (list.length > 0) {
        set({ notice: "", viewing: true });
        setOffset(0);
      }
    } else return false;
    return true;
  };

  const subKeys = (key: string): boolean => {
    const ui = subs;
    const list = s.subscriptions;
    const set = (patch: Partial<SubsUI>): void => setSubs((x) => ({ ...x, ...patch }));
    const remove = (): void => {
      const sub = list[ui.selected];
      if (!sub) return;
      set({ deleting: null, viewing: false, interval: null });
      store.deleteSubscription(sub.id).then(
        () => {
          if (store.s.subscriptions.length === 0) unfocus();
        },
        (e) => store.fail(e),
      );
    };
    if (ui.saving) return true;
    if (ui.viewing) {
      const sub = list[ui.selected];
      const current = sub?.schedule?.type === "weekly" ? sub.schedule.interval : null;
      const changed = current !== null && ui.interval !== null && ui.interval !== current;
      if (key === "+" || key === "=" || key === "right" || key === "l" || key === "-" || key === "left" || key === "h") {
        if (ui.deleting === null && current !== null) {
          const step = key === "+" || key === "=" || key === "right" || key === "l" ? 1 : -1;
          set({ notice: "", interval: Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, (ui.interval ?? current) + step)) });
          // The schedule is the last section: bring it into view.
          setOffset(1000);
        }
      } else if (key === "enter") {
        if (changed && sub) {
          set({ saving: true });
          store.updateSubscription(sub.id, { schedule: { type: "weekly", interval: ui.interval as number } }).then(
            () => {
              setSubs((x) => ({ ...x, saving: false, interval: null, notice: "schedule updated" }));
              setOffset(0);
            },
            (e) => {
              store.fail(e);
              set({ saving: false });
            },
          );
        }
      } else if (key === "n" || key === "esc") {
        if (ui.deleting !== null) set({ deleting: null });
        else if (changed) set({ interval: null });
        else set({ viewing: false, notice: "", interval: null });
      } else if (key === "backspace") {
        if (ui.deleting === null) set({ viewing: false, notice: "", interval: null });
      } else if (key === "e") {
        if (ui.deleting === null && sub) nav(`/addresses?subscription=${encodeURIComponent(sub.id)}`);
      } else if (key === "c") {
        if (ui.deleting === null && sub) nav(`/payment?subscription=${encodeURIComponent(sub.id)}`);
      } else if (key === "delete" || key === "d" || key === "x") {
        if (ui.deleting === null && sub) set({ notice: "", deleting: ui.selected });
      } else if (key === "y") {
        if (ui.deleting !== null) remove();
      } else if (key === "down" || key === "j") setOffset((o) => o + 1);
      else if (key === "up" || key === "k") setOffset((o) => Math.max(0, o - 1));
      else return false;
      return true;
    }
    if (key === "j" || key === "down" || key === "tab") {
      if (ui.deleting === null) set({ notice: "", selected: Math.min(list.length - 1, ui.selected + 1) });
    } else if (key === "k" || key === "up" || key === "shift+tab") {
      if (ui.deleting === null) set({ notice: "", selected: Math.max(0, ui.selected - 1) });
    } else if (key === "enter") {
      if (ui.deleting === null && list.length > 0) {
        set({ notice: "", viewing: true, interval: null });
        setOffset(0);
      }
    } else if (key === "delete" || key === "d" || key === "x") {
      if (ui.deleting === null) set({ notice: "", deleting: ui.selected });
    } else if (key === "y") {
      if (ui.deleting !== null) remove();
    } else if (key === "n" || key === "esc") set({ deleting: null });
    else return false;
    return true;
  };

  const canCreate = store.canCreateCredentials;

  const tokenKeys = (key: string, repeat: boolean): boolean => {
    const set = (patch: Partial<TokensUI>): void => setTokens((x) => ({ ...x, ...patch }));
    if (tokenCreating) return true;
    if (tokenConfirm.code !== null) {
      if (repeat) return true;
      if (tokenConfirm.answer(key) === "confirm") void runToken(() => store.createToken().catch((e) => store.fail(e)));
      return true;
    }
    if (key === "j" || key === "down" || key === "tab") {
      if (tokens.deleting === null) set({ selected: Math.min(s.tokens.length, tokens.selected + 1) });
    } else if (key === "k" || key === "up" || key === "shift+tab") {
      if (tokens.deleting === null) set({ selected: Math.max(0, tokens.selected - 1) });
    } else if (key === "delete" || key === "d" || key === "backspace" || key === "x") {
      if (tokens.deleting === null && tokens.selected < s.tokens.length) set({ deleting: tokens.selected });
    } else if (key === "y") {
      const token = tokens.deleting !== null ? s.tokens[tokens.selected] : undefined;
      if (token) {
        set({ deleting: null });
        store.deleteToken(token.id).then(
          () => {
            if (store.s.tokens.length === 0) unfocus();
          },
          (e) => store.fail(e),
        );
      }
    } else if (key === "n" || key === "esc") set({ deleting: null });
    else if (key === "enter") {
      if (repeat || tokens.deleting !== null || tokens.selected !== s.tokens.length || !canCreate) return true;
      if (askFirst) tokenConfirm.arm();
      else void runToken(() => store.createToken().catch((e) => store.fail(e)));
    } else return false;
    return true;
  };

  const appKeys = (key: string, repeat: boolean): boolean => {
    const set = (patch: Partial<AppsUI>): void => setApps((x) => ({ ...x, ...patch }));
    if (appConfirm.code !== null) {
      if (repeat) return true;
      const answer = appConfirm.answer(key);
      const app = pendingApp.current;
      if (answer !== null) pendingApp.current = null;
      if (answer === "confirm" && app) createApp(app.name, app.redirectURI);
      return true;
    }
    if (apps.editing) return false;
    if (key === "j" || key === "down" || key === "tab") {
      if (apps.deleting === null) set({ selected: Math.min(s.apps.length, apps.selected + 1) });
    } else if (key === "k" || key === "up" || key === "shift+tab") {
      if (apps.deleting === null) set({ selected: Math.max(0, apps.selected - 1) });
    } else if (key === "delete" || key === "d" || key === "backspace" || key === "x") {
      if (apps.deleting === null && apps.selected < s.apps.length) set({ deleting: apps.selected });
    } else if (key === "y") {
      const app = apps.deleting !== null ? s.apps[apps.selected] : undefined;
      if (app) {
        set({ deleting: null });
        store.deleteApp(app.id).catch((e) => store.fail(e));
      }
    } else if (key === "n" || key === "esc") set({ deleting: null, editing: false });
    else if (key === "enter") {
      if (apps.deleting === null && apps.selected === s.apps.length && canCreate) {
        appForm.reset({});
        set({ editing: true });
      }
    } else return false;
    return true;
  };

  const pollCards = (count: number, run: number): void => {
    setTimeout(async () => {
      if (polling.current !== run) return;
      try {
        const next = await store.pollCards(count);
        if (polling.current !== run) return;
        if (next) {
          setCards((c) => ({ ...c, view: "list", url: null, selected: next.length - 1, notice: "card added" }));
          return;
        }
      } catch (error) {
        store.fail(error);
      }
      pollCards(count, run);
    }, store.pollMs);
  };

  const cardKeys = (key: string): boolean => {
    const ui = cards;
    const set = (patch: Partial<CardsUI>): void => setCards((c) => ({ ...c, ...patch }));
    if (ui.status !== "idle") return true;
    if (ui.view === "https") {
      if (key === "esc" || key === "left" || key === "h") {
        polling.current++;
        set({ view: "list", url: null });
      } else if (key === "enter" && ui.url && typeof window !== "undefined") {
        window.open(ui.url, "_blank", "noopener,noreferrer");
      }
      return true;
    }
    if (ui.deleting !== null) {
      const card = s.cards[ui.deleting];
      if (key === "y" && card) {
        set({ status: "removing", deleting: null });
        store.deleteCard(card.id).then(
          () => setCards((c) => ({ ...c, status: "idle", notice: "card removed", selected: Math.min(c.selected, store.s.cards.length) })),
          (e) => {
            store.fail(e);
            set({ status: "idle" });
          },
        );
      } else if (key === "n" || key === "esc" || key === "backspace") set({ deleting: null });
      return true;
    }
    if (key === "j" || key === "down" || key === "tab") set({ notice: "", selected: Math.min(s.cards.length, ui.selected + 1) });
    else if (key === "k" || key === "up" || key === "shift+tab") set({ notice: "", selected: Math.max(0, ui.selected - 1) });
    else if (key === "delete" || key === "d" || key === "backspace" || key === "x") {
      if (ui.selected < s.cards.length) set({ notice: "", deleting: ui.selected });
    } else if (key === "enter") {
      if (ui.selected < s.cards.length) return true;
      set({ notice: "", status: "generating", view: "https" });
      store.collectCard().then(
        (res) => {
          set({ status: "idle", url: res.url });
          const run = ++polling.current;
          pollCards(store.s.cards.length, run);
        },
        (e) => {
          store.fail(e);
          set({ status: "idle", url: null });
        },
      );
    } else return false;
    return true;
  };

  const focus = (): void => {
    setFocused(true);
    setOrders(ordersUI());
    setSubs(subsUI());
    setTokens({ selected: 0, deleting: null });
    setApps({ selected: 0, deleting: null, editing: false });
    setCards(cardsUI());
  };

  useKeys((key, e) => {
    if (focused) {
      const busy = orders.viewing || subs.viewing || orders.canceling !== null || subs.deleting !== null || tokens.deleting !== null || apps.deleting !== null || cards.deleting !== null || cards.view !== "list";
      const confirming = tokenConfirm.code !== null || appConfirm.code !== null;
      if ((key === "esc" || key === "left" || key === "h") && !apps.editing && !profile.editing && !busy && !confirming) {
        unfocus();
        return true;
      }
      let handled = false;
      if (page === "orders") handled = orderKeys(key);
      else if (page === "subscriptions") handled = subKeys(key);
      else if (page === "tokens") handled = tokenKeys(key, e.repeat);
      else if (page === "apps") handled = appKeys(key, e.repeat);
      else if (page === "payment") handled = cardKeys(key);
      else if (page === "profile") handled = profile.editing || profile.saving;
      if (handled) return true;
      // The detail viewport pages (`modifiedKeyMap`).
      if (key === "pgdown" || key === "ctrl+d") {
        setOffset((o) => o + 10);
        return true;
      }
      if (key === "pgup" || key === "ctrl+u") {
        setOffset((o) => Math.max(0, o - 10));
        return true;
      }
      if (page !== "faq" && page !== "about" && page !== "debug" && page !== "addresses") return false;
    }
    if (page === "debug") {
      if (confirmProd) {
        if (key === "y") {
          setConfirmProd(false);
          if (store.switchEnv("prod")) store.reconnect();
        } else if (key === "n" || key === "esc") setConfirmProd(false);
        return true;
      }
      if (key === "e" && !store.siteMode) {
        if (s.env === "dev") {
          if (store.canUse("prod")) setConfirmProd(true);
          else store.switchEnv("prod");
        } else if (store.switchEnv("dev")) store.reconnect();
        return true;
      }
      if (key === "x" && !signedOut) {
        store.signOut();
        return true;
      }
      if (key === "enter" && signedOut) {
        store.requireSignIn("sign in to your terminal account", "/account?page=debug");
        return true;
      }
    }
    switch (key) {
      case "tab":
      case "down":
      case "j":
        setSelected((i) => Math.min(ACCOUNT_PAGES.length - 1, i + 1));
        setOffset(0);
        setConfirmProd(false);
        setProfile((p) => ({ ...p, notice: "" }));
        return true;
      case "shift+tab":
      case "up":
      case "k":
        setSelected((i) => Math.max(0, i - 1));
        setOffset(0);
        setConfirmProd(false);
        setProfile((p) => ({ ...p, notice: "" }));
        return true;
      case "pgdown":
      case "ctrl+d":
        setOffset((o) => o + 10);
        return true;
      case "pgup":
      case "ctrl+u":
        setOffset((o) => Math.max(0, o - 10));
        return true;
      case "enter":
      case "right":
      case "l":
        if (gated) {
          store.requireSignIn(SIGN_IN_PROMPTS[page] as string, `/account?page=${page}`);
          return true;
        }
        if (page === "addresses") nav("/addresses");
        else if (page === "orders" || page === "subscriptions" || page === "tokens" || page === "apps" || page === "payment" || page === "link-email") focus();
        else if (page === "profile") {
          profileForm.reset({ name: s.user?.name ?? "" });
          setProfile({ editing: true, saving: false, notice: "" });
          setFocused(true);
        }
        return true;
    }
    return false;
  });

  let commands: Command[] = page === "faq" ? [{ key: "↑/↓", value: "scroll" }, { key: "pgup/pgdn", value: "page" }] : [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: gated ? "sign in" : "select" }];
  if (focused && page === "orders") commands = ordersFooter(store, orders);
  if (focused && page === "subscriptions") commands = subscriptionsFooter(store, subs);
  if (focused && page === "tokens") commands = tokenConfirm.code !== null ? [{ key: tokenConfirm.code, value: "create" }, { key: "n", value: "cancel" }] : [{ key: "↑/↓", value: "navigate" }, { key: "x/del", value: "revoke" }, { key: "esc", value: "back" }];
  if (focused && page === "apps") commands = appConfirm.code !== null ? [{ key: appConfirm.code, value: "create" }, { key: "n", value: "cancel" }] : [{ key: "↑/↓", value: "navigate" }, { key: "x/del", value: "remove" }, { key: "esc", value: "back" }];
  if (focused && page === "payment") commands = cardsFooter(s, cards);
  if (focused && page === "profile") commands = profile.saving ? [{ key: "…", value: "saving" }] : [{ key: "esc", value: "cancel" }, { key: "enter", value: "save" }];

  return (
    <Page
      page="account"
      commands={commands}
      body={(h, t, L) => {
        const d = accountDims(L);
        const W = d.detail;
        let detail: Line[];
        if (gated) detail = signInView(page, t, d);
        else
          switch (page) {
            case "orders":
              detail = ordersView(store, orders, focused, t, d);
              break;
            case "subscriptions":
              detail = subscriptionsView(store, subs, focused, t, d);
              break;
            case "tokens":
              detail = tokensView(s, tokens, focused, t, d, { canCreate, code: tokenConfirm.code, creating: tokenCreating });
              break;
            case "apps":
              detail = appsView(s, { ...apps, submitting: appSubmitting }, focused, appForm.lines(W, 1), t, d, { canCreate, code: appConfirm.code });
              break;
            case "addresses":
              detail = addressesPreview(s.addresses, t, W);
              break;
            case "link-email":
              detail = linkEmailView(s, focused, t, W);
              break;
            case "payment":
              detail = cardsView(s, cards, focused, t, d);
              break;
            case "profile":
              detail = profileView(s, focused, profile.editing, profile.saving, profile.notice, profileForm.lines(W, 1), t, d);
              break;
            case "faq":
              detail = faqView(t, W);
              break;
            case "about":
              detail = aboutView(cursor, t, W);
              break;
            default:
              detail = debugView(s, confirmProd, signedOut, t, W);
          }
        const menu = accountMenu(selected, t, d);
        if (d.stacked) {
          // `AccountView` below the large layout stacks the menu and the detail viewports.
          const menuOffset = selected + 1 - Math.floor(h / 2);
          return [...viewport(menu, h, menuOffset).map((l) => fit(l, L.widthContent)), ...viewport(detail, h, offset).map((l) => fit(l, L.widthContent))];
        }
        return hjoin(block(viewport(menu, h), d.menuWidth), block([], 2), block(viewport(detail, h, offset), L.widthContent - d.menuWidth));
      }}
    />
  );
}
