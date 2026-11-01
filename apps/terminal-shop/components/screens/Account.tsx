import { useState, type ReactNode } from "react";
import { useSearchParams } from "@textjs/app/navigation";
import { CONTENT, CONTENT_HEIGHT, type Command } from "../../lib/frame";
import { FAQS } from "../../lib/faq";
import { notEmpty, type FieldDef } from "../../lib/form";
import { dollars } from "../../lib/format";
import { useShop, useShopState, type ShopStore, type StoreState } from "../../lib/store";
import { palette, type Theme } from "../../lib/theme";
import type { Address, AddressInput, App, Order, Subscription, Token } from "../../lib/types";
import { block, box, concat, fit, hjoin, place, span, viewport, width, wordWrap, type Line } from "../../lib/ui";
import { Page, useBlink, useBusy, useHeaderMode, useKeys, useNav } from "../chrome";
import { useForm } from "../useForm";
import { listItem } from "./Cart";
import { addressItem } from "./Checkout";

export type AccountPage = "orders" | "subscriptions" | "tokens" | "apps" | "addresses" | "link-email" | "faq" | "about" | "debug";

export const ACCOUNT_PAGES: AccountPage[] = ["orders", "subscriptions", "tokens", "apps", "addresses", "link-email", "faq", "about", "debug"];

export const PAGE_NAMES: Record<AccountPage, string> = {
  orders: "order history",
  subscriptions: "subscriptions",
  tokens: "access tokens",
  apps: "apps (oauth 2.0)",
  addresses: "addresses",
  "link-email": "link email",
  faq: "faq",
  about: "about",
  debug: "debug info",
};

const MENU_WIDTH = Math.max(...ACCOUNT_PAGES.map((p) => PAGE_NAMES[p].length)) + 4;
/** `GetAccountPageContent` width: `widthContent - menuWidth - 3`. */
export const DETAIL_WIDTH = CONTENT - MENU_WIDTH - 3;

const APP_FORM: FieldDef[][] = [
  [
    { key: "name", title: "name", validate: notEmpty("name") },
    { key: "redirectUri", title: "redirect uri", validate: notEmpty("redirect uri") },
  ],
];

export function accountMenu(selected: number, t: Theme): Line[] {
  const w = MENU_WIDTH - 4 + 2;
  const hl = { fg: palette.accent, bg: t.highlight };
  return ACCOUNT_PAGES.map((p, i) => [span(" "), ...fit([span(` ${PAGE_NAMES[p]}`, i === selected ? hl : t.baseStyle)], w, "left", i === selected ? hl : t.baseStyle)]);
}

const detailBox = (content: Line[], selected: boolean, t: Theme, inner = DETAIL_WIDTH): Line[] => box(content, inner, selected ? palette.accent : t.border, t.baseStyle);

const centeredEmpty = (ls: Line[]): Line[] => place(ls, DETAIL_WIDTH, CONTENT_HEIGHT);

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

function ordersView(store: ShopStore, ui: OrdersUI, focused: boolean, t: Theme): Line[] {
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
      addresses.forEach((a, i) => ls.push(...detailBox(addressItem(a, i === ui.addressSelected, t, DETAIL_WIDTH + 1), i === ui.addressSelected, t, DETAIL_WIDTH + 1)));
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
      ls.push([]);
    }
    ls.push([t.accent("items")], ...order.items.map((i) => [t.base(orderItemText(store, i))]), []);
    ls.push([t.accent("totals")], [t.base(`subtotal: $${dollars(order.amount.subtotal)}`)], [t.base(`shipping: $${dollars(order.amount.shipping)}`)], [t.base(`total: $${dollars(order.amount.subtotal + order.amount.shipping)}`)]);
    return ls.flatMap((l) => wrapLine(l, DETAIL_WIDTH));
  }
  if (orders.length === 0) return centeredEmpty([...(ui.notice ? [[t.brand(ui.notice)], []] : []), [t.base("no orders found")]].map((l) => l));
  const out: Line[] = [...notice];
  orders.forEach((order, i) => {
    const index = orders.length - i - 1;
    const sel = focused && i === ui.selected;
    let item: Line[] = [[t.accent(`order #${index}`), t.base(`  $${String(dollars(order.amount.subtotal + order.amount.shipping)).padStart(2, " ")}`)], [t.base(`date: ${order.created}`)]];
    if (ui.canceling === i) item = [[t.accent("cancel order?")], [t.base("are you sure? (y/n)")]];
    if (ui.submitting && ui.canceling === i) item = [[t.base(" canceling order...")]];
    out.push(...detailBox(listItem(item, sel, t, DETAIL_WIDTH, false), sel, t));
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
}

function subscriptionTitle(store: ShopStore, s: Subscription, t: Theme): Line | null {
  const p = store.productForVariant(s.productVariantID);
  if (!p) return null;
  if (p.product.name === "cron") return [t.accent(p.product.name)];
  const unit = s.schedule?.type === "weekly" ? "weeks" : "";
  const interval = s.schedule && "interval" in s.schedule ? s.schedule.interval : 0;
  return [t.accent(`${s.quantity}x ${p.product.name}`), t.base(` (every ${interval} ${unit})`)];
}

function subscriptionsView(store: ShopStore, ui: SubsUI, focused: boolean, t: Theme): Line[] {
  const { subscriptions, addresses, cards } = store.s;
  if (ui.viewing && subscriptions.length > 0) {
    if (ui.deleting !== null) return [[t.accent("are you sure?")], [t.base("(y/n)")]];
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
    else if (sub.schedule?.type === "weekly") ls.push([t.base(`every ${sub.schedule.interval} ${sub.schedule.interval === 1 ? "week" : "weeks"}`)]);
    else ls.push([t.base(`${(sub.schedule as { type?: string } | undefined)?.type ?? ""} every 0`)]);
    return ls;
  }
  if (subscriptions.length === 0) return centeredEmpty([[t.base("no active subscriptions")]]);
  const out: Line[] = [];
  subscriptions.forEach((s, i) => {
    const title = subscriptionTitle(store, s, t);
    let content: Line[];
    if (!title) content = [[t.base("unknown product")]];
    else {
      const price = t.base(` $${String(dollars(s.quantity * s.price)).padStart(2, " ")}`);
      const space = DETAIL_WIDTH - width(title) - width([price]) - 2;
      content = [concat(title, t.base(" ".repeat(Math.max(0, space))), price), [t.base(`next shipment: ${s.next ?? ""}`)]];
    }
    if (ui.deleting === i) content = [[t.accent("are you sure?")], [t.base("(y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t));
  });
  return out;
}

// ── tokens + apps ───────────────────────────────────────────────────────────

function tokensView(s: StoreState, ui: { selected: number; deleting: number | null }, focused: boolean, t: Theme): Line[] {
  const out: Line[] = [];
  s.tokens.forEach((token: Token, i) => {
    let content: Line[] = [[t.accent(token.id)], [t.base(`created: ${token.created}`)]];
    if (s.newToken && token.id === s.newToken.id) content.push([t.brand(s.newToken.token, { bold: true })], [t.base("(will not be shown again)")]);
    else content.push([t.base(token.token)]);
    if (ui.deleting === i) content = [[t.accent("are you sure you want to revoke?")], [t.base("(y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t));
  });
  const addSel = ui.selected === s.tokens.length;
  if (s.proxy?.mode === "site") out.push(...sshOnly(s, "tokens", "new access tokens are made in the ssh shop:", t));
  else out.push(...detailBox(listItem("add access token", addSel, t, DETAIL_WIDTH, false), focused && addSel, t));
  return out;
}

/**
 * textjs.org never mints long-lived credentials (its proxy doesn't forward `POST /token`
 * or `POST /app`), so creating them points at the ssh shop. Listing and revoking still work.
 */
function sshOnly(s: StoreState, command: "tokens" | "apps", text: string, t: Theme): Line[] {
  const host = s.env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  return [[], ...wordWrap(text, DETAIL_WIDTH).map((l) => [t.base(l)]), [t.accent(`  ssh ${host} -t ${command}`)]];
}

function appsView(s: StoreState, ui: { selected: number; deleting: number | null; editing: boolean; submitting: boolean }, focused: boolean, form: Line[], t: Theme): Line[] {
  const out: Line[] = [];
  s.apps.forEach((app: App, i) => {
    let content: Line[] = [[t.accent(app.name)], [t.base(`redirect: ${app.redirectURI}`)], [t.base(`client id: ${app.id}`)]];
    if (s.newApp && app.id === s.newApp.id) content.push([t.base("secret: "), t.brand(s.newApp.secret, { bold: true })], [t.base("(will not be shown again)")]);
    else content.push([t.base(`secret: ${app.secret}`)]);
    if (ui.deleting === i) content = [[t.accent("are you sure you want to remove?"), t.base(" (y/n)")]];
    out.push(...detailBox(content, focused && i === ui.selected, t));
  });
  const addSel = ui.selected === s.apps.length;
  if (s.proxy?.mode === "site") out.push(...sshOnly(s, "apps", "new oauth apps are made in the ssh shop:", t));
  else if (ui.editing && !ui.submitting) out.push(...form);
  else out.push(...detailBox(listItem(ui.submitting ? "submitting app..." : "create app", addSel, t, DETAIL_WIDTH, false), focused && addSel, t));
  return out;
}

// ── static pages ────────────────────────────────────────────────────────────

function addressesPreview(addresses: Address[], t: Theme): Line[] {
  const count = addresses.length === 0 ? "no saved addresses yet." : addresses.length === 1 ? "1 saved address." : `${addresses.length} saved addresses.`;
  return [[t.base("manage saved shipping addresses")], [], [t.base(count)], [], ...wordWrap("select this item to add, edit, or remove addresses.", DETAIL_WIDTH).map((l) => [t.base(l)])];
}

/**
 * `LinkEmailView`. Linking needs the ssh session itself (the API refuses tokens), so
 * this points at the ssh command instead of showing the form.
 */
function linkEmailView(s: StoreState, t: Theme): Line[] {
  const host = s.env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const text = (v: string): Line[] => wordWrap(v, DETAIL_WIDTH).map((l) => [t.base(l)]);
  const out: Line[] = [
    ...text("link this ssh key to an email account"),
    [],
    ...text("this lets multiple ssh keys open the same terminal account."),
    ...text("we'll email you a confirmation link, and the browser will ask for the code shown here."),
    [],
  ];
  if (s.user?.email) return [...out, ...text("this account is already linked to:"), [t.base(s.user.email)]];
  return [...out, ...text("linking starts from your ssh session:"), [t.accent(`  ssh ${host} -t link-email`)]];
}

function faqView(t: Theme): Line[] {
  const out: Line[] = [];
  for (const f of FAQS) {
    out.push(...wordWrap(f.question, DETAIL_WIDTH).map((l) => [t.accent(l)]));
    out.push(...wordWrap(f.answer, DETAIL_WIDTH).map((l) => [t.base(l)]));
    out.push([]);
  }
  return out;
}

function aboutView(cursor: boolean, t: Theme): Line[] {
  return [
    ...wordWrap("1. # Amazingly awesome products for developers brought to you by a group of talented, good looking, and humble heroes...", DETAIL_WIDTH).map((l) => [t.base(l)]),
    [],
    [t.base("2. # @theprimeagen")],
    [],
    [t.base("3. # @teej_dv")],
    [],
    [t.base("4. "), t.accent("Terminal Products, Inc."), span(" ", cursor ? { bg: palette.brand } : {})],
  ];
}

function debugView(s: StoreState, confirmProd: boolean, t: Theme): Line[] {
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
  const headline = s.auth === "session" ? "signed in with terminal, the token stays on the server" : s.auth === "server" ? "connected with a server-side token" : "connected with a token in this browser";
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
    ...wordWrap("copy this when reporting an issue.", DETAIL_WIDTH).map((l) => [t.base(l)]),
    [],
  );
  if (confirmProd) {
    lines.push([t.error("switch to production?", { bold: true })], ...wordWrap("orders there are real: your card is charged and coffee ships.", DETAIL_WIDTH).map((l) => [t.base(l)]), [t.base("are you sure? "), t.accent("(y/n)")]);
  } else {
    if (site) lines.push([t.bold("x"), t.base(" sign out")]);
    else lines.push([t.bold("e"), t.base(s.env === "dev" ? " switch to production" : " switch to dev sandbox"), t.base("   "), t.bold("x"), t.base(" sign out")]);
  }
  return lines;
}

// ── screen ──────────────────────────────────────────────────────────────────

export function AccountScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const params = useSearchParams();
  const s = useShopState((st) => st);
  const cursor = useBlink();
  const initialSub = params.get("subscription");
  const initialPage = (params.get("page") as AccountPage | null) ?? (initialSub ? "subscriptions" : null);
  const [selected, setSelected] = useState(() => Math.max(0, initialPage ? ACCOUNT_PAGES.indexOf(initialPage) : 0));
  const [focused, setFocused] = useState(() => !!initialSub);
  const [offset, setOffset] = useState(0);
  const [orders, setOrders] = useState<OrdersUI>(ordersUI);
  const [subs, setSubs] = useState<SubsUI>(() => ({
    selected: Math.max(0, s.subscriptions.findIndex((x) => x.id === initialSub)),
    deleting: null,
    viewing: !!initialSub,
    notice: params.get("notice") ?? "",
  }));
  const [tokens, setTokens] = useState<{ selected: number; deleting: number | null }>({ selected: 0, deleting: null });
  const [apps, setApps] = useState<{ selected: number; deleting: number | null; editing: boolean }>({ selected: 0, deleting: null, editing: false });
  const [appSubmitting, runApp] = useBusy();
  const [confirmProd, setConfirmProd] = useState(false);
  const page = ACCOUNT_PAGES[selected] as AccountPage;

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
      void runApp(() => store.createApp((values.name ?? "").trim(), (values.redirectUri ?? "").trim()).catch((e) => store.fail(e)));
    },
  });

  const subViewing = focused && page === "subscriptions" && subs.viewing;
  useHeaderMode("account", !(page === "apps" && apps.editing), subViewing ? ["c"] : []);

  const unfocus = (): void => {
    setFocused(false);
    setOrders(ordersUI());
    setSubs({ selected: 0, deleting: null, viewing: false, notice: "" });
    setTokens({ selected: 0, deleting: null });
    setApps({ selected: 0, deleting: null, editing: false });
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
      set({ deleting: null, viewing: false });
      store.deleteSubscription(sub.id).then(
        () => {
          if (store.s.subscriptions.length === 0) unfocus();
        },
        (e) => store.fail(e),
      );
    };
    if (ui.viewing) {
      const sub = list[ui.selected];
      if (key === "n" || key === "esc") {
        if (ui.deleting !== null) set({ deleting: null });
        else set({ viewing: false, notice: "" });
      } else if (key === "backspace") {
        if (ui.deleting === null) set({ viewing: false, notice: "" });
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
        set({ notice: "", viewing: true });
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

  const tokenKeys = (key: string): boolean => {
    const set = (patch: Partial<typeof tokens>): void => setTokens((x) => ({ ...x, ...patch }));
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
      if (tokens.deleting === null && tokens.selected === s.tokens.length && !store.siteMode) store.createToken().catch((e) => store.fail(e));
    } else return false;
    return true;
  };

  const appKeys = (key: string): boolean => {
    const set = (patch: Partial<typeof apps>): void => setApps((x) => ({ ...x, ...patch }));
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
      if (apps.deleting === null && apps.selected === s.apps.length && !store.siteMode) {
        appForm.reset({});
        set({ editing: true });
      }
    } else return false;
    return true;
  };

  useKeys((key) => {
    if (focused) {
      if ((key === "esc" || key === "left" || key === "h") && !apps.editing && !orders.viewing && !subs.viewing && orders.canceling === null && subs.deleting === null && tokens.deleting === null && apps.deleting === null) {
        unfocus();
        return true;
      }
      if (page === "orders") return orderKeys(key);
      if (page === "subscriptions") return subKeys(key);
      if (page === "tokens") return tokenKeys(key);
      if (page === "apps") return appKeys(key);
    }
    if (page === "debug") {
      if (confirmProd) {
        if (key === "y") {
          setConfirmProd(false);
          if (store.switchEnv("prod")) store.reconnect();
        } else if (key === "n" || key === "esc") setConfirmProd(false);
        return true;
      }
      if (key === "e") {
        if (s.env === "dev") {
          if (store.canUse("prod")) setConfirmProd(true);
          else store.switchEnv("prod");
        } else if (store.switchEnv("dev")) store.reconnect();
        return true;
      }
      if (key === "x") {
        store.signOut();
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
        return true;
      case "shift+tab":
      case "up":
      case "k":
        setSelected((i) => Math.max(0, i - 1));
        setOffset(0);
        setConfirmProd(false);
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
        if (page === "addresses") nav("/addresses");
        else if (page === "orders" || page === "subscriptions" || page === "tokens" || page === "apps") {
          setFocused(true);
          setOrders(ordersUI());
          setSubs({ selected: 0, deleting: null, viewing: false, notice: "" });
          setTokens({ selected: 0, deleting: null });
          setApps({ selected: 0, deleting: null, editing: false });
        }
        return true;
    }
    return false;
  });

  let commands: Command[] = page === "faq" ? [{ key: "↑/↓", value: "scroll" }, { key: "pgup/pgdn", value: "page" }] : [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: "select" }];
  if (focused && page === "orders") commands = ordersFooter(store, orders);
  if (focused && page === "subscriptions")
    commands = subs.viewing
      ? [{ key: "e", value: "address" }, { key: "c", value: "card" }, { key: "x/del", value: "cancel" }, { key: "esc", value: "back" }]
      : [{ key: "↑/↓", value: "navigate" }, { key: "enter", value: "view details" }, { key: "x/del", value: "cancel" }, { key: "esc", value: "back" }];
  if (focused && page === "tokens") commands = [{ key: "↑/↓", value: "navigate" }, { key: "x/del", value: "revoke" }, { key: "esc", value: "back" }];
  if (focused && page === "apps") commands = [{ key: "↑/↓", value: "navigate" }, { key: "x/del", value: "remove" }, { key: "esc", value: "back" }];

  return (
    <Page
      page="account"
      commands={commands}
      body={(h, t) => {
        let detail: Line[];
        switch (page) {
          case "orders":
            detail = ordersView(store, orders, focused, t);
            break;
          case "subscriptions":
            detail = subscriptionsView(store, subs, focused, t);
            break;
          case "tokens":
            detail = tokensView(s, tokens, focused, t);
            break;
          case "apps":
            detail = appsView(s, { ...apps, submitting: appSubmitting }, focused, appForm.lines(DETAIL_WIDTH, 1), t);
            break;
          case "addresses":
            detail = addressesPreview(s.addresses, t);
            break;
          case "link-email":
            detail = linkEmailView(s, t);
            break;
          case "faq":
            detail = faqView(t);
            break;
          case "about":
            detail = aboutView(cursor, t);
            break;
          default:
            detail = debugView(s, confirmProd, t);
        }
        return hjoin(block(viewport(accountMenu(selected, t), h), MENU_WIDTH), block([], 2), block(viewport(detail, h, offset), CONTENT - MENU_WIDTH));
      }}
    />
  );
}
