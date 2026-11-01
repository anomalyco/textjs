import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "@textjs/app/navigation";
import { isSafeExternalUrl } from "../../lib/entry";
import { ADDRESS_FORM, addressFromValues, newAddressValues, validateAddress } from "../../lib/address";
import { CONTENT, CONTENT_HEIGHT, HEIGHT, WIDTH } from "../../lib/frame";
import { addressLine, dollars, formatExpiration, formatLast4, formatUSD } from "../../lib/format";
import { encodeQr, renderQr } from "../../lib/qr";
import { useShop, useShopState, uuid, type ShopStore } from "../../lib/store";
import { defaultTheme, palette, type Theme } from "../../lib/theme";
import type { Address } from "../../lib/types";
import { centerLines, concat, fit, indent, place, span, viewport, width, wrap, type Line } from "../../lib/ui";
import { Page, useBusy, useHeaderMode, useKeys, useNav, useRealMoneyConfirm } from "../chrome";
import { Screen } from "../Screen";
import { useForm } from "../useForm";
import { listBox, listItem } from "./Cart";

/** `formatAddress` as a list item. */
export function addressItem(a: Address, focused: boolean, t: Theme, totalWidth = CONTENT): Line[] {
  return listItem(addressLine(a), focused, t, totalWidth);
}

function shippingBack(store: ShopStore, nav: (p: string) => void): void {
  const sub = store.s.subscribing;
  if (sub) nav(sub.product.variants.length === 1 ? "/shop" : "/subscribe");
  else nav("/cart");
}

/** Body centered in the container like `lipgloss.Place(widthContainer, …, viewport)`. */
const centered = (ls: Line[]): Line[] => indent(ls, 1);

// ── shipping ────────────────────────────────────────────────────────────────

export function ShippingScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const addresses = useShopState((s) => s.addresses);
  const user = useShopState((s) => s.user);
  const [view, setView] = useState<"list" | "form">(() => (store.s.addresses.length === 0 ? "form" : "list"));
  const [selected, setSelected] = useState(0);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [submitting, run] = useBusy();
  const offset = useRef(0);
  useHeaderMode("shipping", view === "list" && !submitting);

  const finish = async (addressID: string): Promise<void> => {
    await store.chooseShipping(addressID);
    nav("/payment");
  };

  const form = useForm({
    groups: ADDRESS_FORM,
    initial: newAddressValues(user?.name),
    active: view === "form" && !submitting,
    onKey: (key) => {
      if (key !== "esc") return false;
      if (store.s.addresses.length === 0) shippingBack(store, nav);
      else setView("list");
      return true;
    },
    onSubmit: (values) => {
      const input = addressFromValues(values);
      const invalid = validateAddress(input);
      if (invalid) {
        store.setError(invalid);
        return;
      }
      void run(async () => {
        try {
          const id = await store.addAddress(input);
          await finish(id);
        } catch (error) {
          store.fail(error);
        }
      });
    },
  });

  useKeys(
    (key) => {
      if (view !== "list" || submitting) return submitting;
      switch (key) {
        case "j":
        case "down":
        case "tab":
          if (deleting === null) setSelected((s) => Math.min(addresses.length, s + 1));
          return true;
        case "k":
        case "up":
        case "shift+tab":
          if (deleting === null) setSelected((s) => Math.max(0, s - 1));
          return true;
        case "delete":
        case "d":
        case "backspace":
        case "x":
          if (deleting === null && selected < addresses.length) setDeleting(selected);
          return true;
        case "y": {
          const target = deleting !== null ? addresses[selected] : undefined;
          if (!target) return true;
          setDeleting(null);
          store.deleteAddress(target.id).catch((e) => store.fail(e));
          return true;
        }
        case "n":
          setDeleting(null);
          return true;
        case "enter": {
          if (deleting !== null) return true;
          const a = addresses[selected];
          if (a) {
            store.setError(null);
            void run(() => finish(a.id).catch((e) => store.fail(e)));
          } else {
            form.reset(newAddressValues(user?.name));
            setView("form");
          }
          return true;
        }
        case "esc":
          if (deleting !== null) setDeleting(null);
          else shippingBack(store, nav);
          return true;
      }
      return false;
    },
  );

  return (
    <Page
      page="shipping"
      commands={[
        { key: "esc", value: "back" },
        { key: "↑/↓", value: "addresses" },
        { key: "x/del", value: "remove" },
        { key: "enter", value: "select" },
      ]}
      body={(h, t) => {
        if (submitting) return [[t.base("  calculating shipping costs...")]];
        if (view === "form") return centered(viewport(form.lines(CONTENT), h));
        const ls: Line[] = [[t.base(" select shipping address")]];
        addresses.forEach((a, i) => {
          const content = deleting === i ? listItem([[t.accent("are you sure?"), t.base(" (y/n)")]], true, t) : addressItem(a, i === selected, t);
          ls.push(...listBox(content, i === selected, t));
        });
        ls.push(...listBox(listItem("add new address", selected === addresses.length, t), selected === addresses.length, t));
        if (selected === addresses.length) offset.current = Math.max(0, ls.length - h);
        else {
          const top = selected * 3;
          if (top < offset.current) offset.current = top;
          if (top + 3 > offset.current + h) offset.current = top - h + 3 + 1;
        }
        return centered(viewport(ls, h, offset.current));
      }}
    />
  );
}

// ── payment ─────────────────────────────────────────────────────────────────

export function costsLine(store: ShopStore, t: Theme): Line {
  const sub = store.s.subscribing;
  let price = store.s.cart.amount.subtotal;
  let shipping = store.s.cart.amount.shipping ?? 0;
  if (sub) {
    price = sub.product.variants[sub.selected]?.price ?? 0;
    shipping = 0;
  }
  return [t.base(` subtotal: ${formatUSD(price)}, `), t.base(`shipping: ${formatUSD(shipping)}, `), t.accent(`total: ${formatUSD(price + shipping)}`)];
}

/** Opens Terminal's hosted card page. Only https links, whatever the API returned. */
export function openExternal(url: string): void {
  if (typeof window === "undefined" || !isSafeExternalUrl(url)) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PaymentScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const params = useSearchParams();
  /** `paymentSubscriptionMode`: pick a new card for an existing subscription. */
  const subscriptionID = params.get("subscription");
  const cards = useShopState((s) => s.cards);
  useShopState((s) => s.cart);
  const [view, setView] = useState<"list" | "https">("list");
  const [selected, setSelected] = useState(() => {
    const id = subscriptionID
      ? store.s.subscriptions.find((x) => x.id === subscriptionID)?.cardID
      : store.s.subscribing
        ? store.s.subscription.cardID
        : store.s.cart.cardID;
    const i = store.s.cards.findIndex((c) => c.id === id);
    return i >= 0 ? i : 0;
  });
  const [deleting, setDeleting] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "generating">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const offset = useRef(0);
  const polling = useRef(0);
  useHeaderMode("payment", status === "idle");

  useEffect(() => {
    if (!subscriptionID && !store.s.subscribing && store.isCartEmpty()) nav("/cart");
    return () => {
      polling.current++;
    };
  }, []);

  const assign = async (cardID: string): Promise<void> => {
    setStatus("submitting");
    store.setError(null);
    try {
      if (subscriptionID) {
        await store.updateSubscription(subscriptionID, { cardID });
        nav(`/account?subscription=${encodeURIComponent(subscriptionID)}&notice=${encodeURIComponent("payment method updated")}`);
        return;
      }
      await store.chooseCard(cardID);
      nav("/confirm");
    } catch (error) {
      store.fail(error);
      setStatus("idle");
    }
  };

  const poll = (count: number, run: number): void => {
    setTimeout(async () => {
      if (polling.current !== run) return;
      try {
        const next = await store.pollCards(count);
        if (polling.current !== run) return;
        if (next) {
          const card = next[next.length - 1];
          setSelected(next.length - 1);
          if (card) void assign(card.id);
          return;
        }
      } catch (error) {
        store.fail(error);
      }
      poll(count, run);
    }, store.pollMs);
  };

  const collect = async (): Promise<void> => {
    store.setError(null);
    setStatus("generating");
    setView("https");
    try {
      const res = await store.collectCard();
      setUrl(res.url);
      setStatus("idle");
      const run = ++polling.current;
      poll(store.s.cards.length, run);
    } catch (error) {
      store.fail(error);
      setUrl(null);
      setStatus("idle");
    }
  };

  useKeys((key) => {
    if (status !== "idle") return true;
    if (view === "https") {
      if (key === "esc") {
        polling.current++;
        setView("list");
        return true;
      }
      if (key === "enter" && url) {
        openExternal(url);
        return true;
      }
      return false;
    }
    switch (key) {
      case "j":
      case "down":
      case "tab":
        if (deleting === null) setSelected((s) => Math.min(cards.length, s + 1));
        return true;
      case "k":
      case "up":
      case "shift+tab":
        if (deleting === null) setSelected((s) => Math.max(0, s - 1));
        return true;
      case "delete":
      case "d":
      case "backspace":
      case "x":
        if (deleting === null && selected < cards.length) setDeleting(selected);
        return true;
      case "y": {
        const card = deleting !== null ? cards[selected] : undefined;
        if (!card) return true;
        setDeleting(null);
        store.deleteCard(card.id).catch((e) => store.fail(e));
        return true;
      }
      case "n":
        setDeleting(null);
        return true;
      case "enter": {
        if (deleting !== null) return true;
        const card = cards[selected];
        if (card) void assign(card.id);
        else void collect();
        return true;
      }
      case "esc":
        if (deleting !== null) setDeleting(null);
        else nav(subscriptionID ? `/account?subscription=${encodeURIComponent(subscriptionID)}` : "/shipping");
        return true;
    }
    return false;
  });

  const commands =
    view === "https"
      ? [
          { key: "esc", value: "back" },
          { key: "enter", value: "open" },
        ]
      : [
          { key: "esc", value: "back" },
          { key: "↑/↓", value: "cards" },
          { key: "x/del", value: "remove" },
          { key: "enter", value: "select" },
        ];

  return (
    <Page
      page="payment"
      subscriptionPayment={!!subscriptionID}
      commands={commands}
      body={(h, t) => {
        if (status === "submitting") return [[t.base("  verifying payment details...")]];
        if (status === "generating") return [[t.base("  generating payment link...")]];
        if (view === "https") return centered(paymentHttps(url, t));
        const ls: Line[] = [...(subscriptionID ? [] : [costsLine(store, t), []]), [t.base(" select payment method")]];
        cards.forEach((c, i) => {
          const focused = i === selected;
          const content: Line = deleting === i ? [t.accent("are you sure?"), t.base(" (y/n)")] : [span(`${c.brand}  ${formatLast4(c.last4)}  ${formatExpiration(c.expiration)}`)];
          ls.push(...listBox(listItem([content], focused, t), focused, t));
        });
        const browser = selected === cards.length;
        ls.push(...listBox(listItem("add payment information via browser", browser, t), browser, t));
        if (browser) offset.current = Math.max(0, ls.length - h);
        else {
          const top = selected * 3;
          if (top < offset.current) offset.current = top;
          if (top + 3 > offset.current + h) offset.current = top - h + 3 + 1;
        }
        return centered(viewport(ls, h, offset.current));
      }}
    />
  );
}

export function paymentHttps(url: string | null, t: Theme): Line[] {
  if (!url) return [[t.error(" failed to generate payment url")]];
  let qr: string[];
  try {
    qr = renderQr(encodeQr(url));
  } catch (error) {
    return [[t.error(` failed to generate qr code: ${error instanceof Error ? error.message : String(error)}`)]];
  }
  const white = { fg: palette.accent, bg: palette.background };
  return centerLines([[], ...qr.map((r) => [span(r, white)]), [t.base("scan or copy to enter payment information")], [span(url, { fg: palette.accent, link: true })]], CONTENT);
}

// ── confirm ─────────────────────────────────────────────────────────────────

export function confirmLines(store: ShopStore, t: Theme): Line[] {
  const s = store.s;
  const card = store.selectedCard();
  const address = store.selectedAddress();
  const out: Line[] = [];
  const sub = s.subscribing;
  if (sub) {
    out.push([t.accent(`${sub.product.name}: ${sub.product.variants[sub.selected]?.name ?? ""}`)], [t.base("monthly subscription")], []);
  }
  if (address) {
    out.push([t.base(address.name)], [t.base(address.street1)]);
    if (address.street2) out.push([t.base(address.street2)]);
    out.push([t.base(`${address.city}, ${address.province ?? ""}, ${address.country} ${address.zip}`)]);
  }
  if (!sub && s.cart.shipping?.service) {
    out.push([], [t.base(s.cart.shipping.service)]);
    if (s.cart.shipping.timeframe) out.push([t.base(s.cart.shipping.timeframe)]);
  }
  out.push([]);
  out.push([t.base(`cc: ${formatLast4(card?.last4 ?? "")}`)]);
  const subtotal = sub ? (sub.product.variants[sub.selected]?.price ?? 0) : s.cart.amount.subtotal;
  const shipping = sub ? 0 : (s.cart.amount.shipping ?? 0);
  out.push([t.base(`subtotal: ${formatUSD(subtotal)}`)], [t.base(`shipping: ${formatUSD(shipping)}`)], [t.accent(`total:    ${formatUSD(subtotal + shipping)}`)], []);
  if (s.env === "dev") out.push([t.base("dev sandbox: test card, nothing is charged or shipped")], []);
  out.push([t.brand("press enter to confirm")], []);
  return indent(out, 1);
}

/** The explicit confirmation before subscribing to the order just placed. */
export function realSubscriptionLines(store: ShopStore, weeks: number, t: Theme, code: string): Line[] {
  const order = store.s.order;
  const each = (order?.items ?? []).reduce((n, i) => n + (i.amount ?? 0), 0);
  const card = store.selectedCard();
  return indent(
    [
      [t.error("this is a real subscription", { bold: true })],
      [],
      [t.base(`${each ? `${formatUSD(each)} ` : ""}every ${weeks} week${weeks === 1 ? "" : "s"} on cc ${formatLast4(card?.last4 ?? "")},`)],
      [t.base("until you cancel it in account → subscriptions.")],
      [],
      [t.base("to subscribe, press "), t.brand(code, { bold: true }), t.base(" · n to cancel")],
    ],
    1,
  );
}

/** The second, explicit confirmation for a real order. */
export function realOrderLines(store: ShopStore, t: Theme, code: string): Line[] {
  const s = store.s;
  const sub = s.subscribing;
  const total = sub ? (sub.product.variants[sub.selected]?.price ?? 0) : s.cart.amount.subtotal + (s.cart.amount.shipping ?? 0);
  const card = store.selectedCard();
  return indent(
    [
      [t.error("this is a real order", { bold: true })],
      [],
      [t.base(`${formatUSD(total)}${sub ? " a month" : ""} will be charged to cc ${formatLast4(card?.last4 ?? "")}`)],
      [t.base(sub ? "and coffee ships every month until you cancel." : "and your coffee ships to the address above.")],
      [],
      [t.base("to place it, press "), t.brand(code, { bold: true }), t.base(" · n to cancel")],
    ],
    1,
  );
}

export function ConfirmScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  useShopState((s) => s.cart);
  const [submitting, run] = useBusy();
  const key = useRef(store.s.subscribing ? "" : uuid());
  const [offset, setOffset] = useState(0);
  // textjs.org: one more explicit step before a real (production) order or subscription.
  const confirm = useRealMoneyConfirm();
  const askTwice = store.confirmRealOrders && store.s.env === "prod";
  useHeaderMode("confirm", !submitting && confirm.code === null);

  useEffect(() => {
    if (!store.s.subscribing && (store.isCartEmpty() || !store.s.cart.cardID || !store.s.cart.addressID)) nav("/cart");
  }, []);

  const submit = (): void => {
    store.setError(null);
    void run(async () => {
      try {
        const s = store.s;
        if (s.subscribing) {
          const variant = s.subscribing.product.variants[s.subscribing.selected];
          await store.createSubscription({
            productVariantID: s.subscription.productVariantID ?? variant?.id ?? "",
            quantity: 1,
            addressID: s.subscription.addressID ?? "",
            cardID: s.subscription.cardID ?? "",
          });
          store.stopSubscribing();
          store.clearLocalCart();
          nav("/order/complete");
        } else {
          await store.placeOrder(key.current);
          key.current = "";
          store.clearLocalCart();
          nav("/order/subscribe");
        }
      } catch (error) {
        store.fail(error);
      }
    });
  };

  useKeys((k, e) => {
    if (submitting) return true;
    // A held key never confirms anything.
    if (e.repeat && (confirm.code !== null || k === "enter")) return true;
    if (confirm.code !== null) {
      if (confirm.answer(k) === "confirm") submit();
      return true;
    }
    switch (k) {
      case "esc":
        nav("/payment");
        return true;
      case "up":
      case "k":
        setOffset((o) => Math.max(0, o - 1));
        return true;
      case "down":
      case "j":
        setOffset((o) => o + 1);
        return true;
      case "enter":
        if (askTwice) confirm.arm();
        else submit();
        return true;
    }
    return false;
  });

  return (
    <Page
      page="confirm"
      commands={[
        { key: "esc", value: "back" },
        { key: "enter", value: "next" },
      ]}
      body={(h, t) => (submitting ? [[t.base("  submitting order...")]] : centered(confirm.code !== null ? realOrderLines(store, t, confirm.code) : viewport(confirmLines(store, t), h, offset)))}
    />
  );
}

// ── after the order ─────────────────────────────────────────────────────────

export function FinalSubScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const order = useShopState((s) => s.order);
  const [weeks, setWeeks] = useState(3);
  const [complete, setComplete] = useState(false);
  const [submitting, run] = useBusy();
  const confirm = useRealMoneyConfirm();
  const askTwice = store.confirmRealOrders && store.s.env === "prod";
  useHeaderMode("final-sub", !submitting && confirm.code === null);

  useEffect(() => {
    if (!store.s.order) nav("/shop");
  }, []);

  const subscribe = (): void => {
    void run(async () => {
      try {
        await store.subscribeToOrder(weeks);
        setComplete(true);
      } catch (error) {
        store.fail(error);
      }
    });
  };

  useKeys((key, e) => {
    if (submitting) return true;
    if (e.repeat && (confirm.code !== null || key === "enter")) return true;
    if (confirm.code !== null) {
      if (confirm.answer(key) === "confirm") subscribe();
      return true;
    }
    switch (key) {
      case "esc":
        nav("/order/complete");
        return true;
      case "enter":
        if (complete) {
          nav("/order/complete");
          return true;
        }
        if (askTwice) confirm.arm();
        else subscribe();
        return true;
      case "+":
      case "=":
      case "l":
      case "up":
      case "right":
        if (!complete) setWeeks((w) => Math.min(12, w + 1));
        return true;
      case "-":
      case "h":
      case "down":
      case "left":
        if (!complete) setWeeks((w) => Math.max(1, w - 1));
        return true;
    }
    return false;
  });

  return (
    <Page
      page="final-sub"
      commands={complete ? [{ key: "enter", value: "continue" }] : [
        { key: "+/-", value: "schedule" },
        { key: "enter", value: "subscribe" },
        { key: "esc", value: "skip" },
      ]}
      body={(_h, t) => {
        if (submitting) return centered([[t.base(" creating subscription...")]]);
        if (complete) return centered([[t.base(" subscribed! press enter to continue...")]]);
        if (confirm.code !== null) return centered(realSubscriptionLines(store, weeks, t, confirm.code));
        const ls: Line[] = [[t.base("order complete!")], [], [t.accent("subscribe to your order?")], []];
        for (const item of order?.items ?? []) {
          const product = store.productFor(item.productVariantID ?? "");
          ls.push([t.base(`${product?.name ?? item.description ?? "unknown product"} (x${item.quantity})`)]);
        }
        ls.push([], [t.base("delivery every  - "), t.accent(String(weeks)), t.base(" +  weeks")], [], [t.brand("press enter to subscribe, esc to skip")]);
        return centered(indent(ls, 1));
      }}
    />
  );
}

const THANKS =
  "\n\nAt this very moment as you sit, stunned and in awe of the CLI experience that just befell you, a personalized order confirmation email is on its way to your inbox.\n\nSimultaneously, news of your order is being celebrated wildly by the team. Perhaps too wildly by some. Once the excitement of your order has subsided to manageable levels your order will be sealed, shipped, and tracked courtesy of the Terminal team.\n\nYours sincerely,\n\nPrime, Teej\n\nTerminal Products, Inc.";

export function finalLines(t: Theme): Line[] {
  const w = CONTENT - 2;
  const body = wrap(`Thank you for ordering with Terminal Products, Inc. ${THANKS} \n\nps. https://www.terminal.shop/xxx`, w);
  const out: Line[] = body.map((l, i) => {
    if (i === 0) return [t.accent(l)];
    if (l.startsWith("ps. ")) return [t.base("ps. "), span(l.slice(4), { fg: palette.brand, link: true })];
    return [t.base(l)];
  });
  return indent(out, 1);
}

export function FinalScreen(): ReactNode {
  const store = useShop();
  const [offset, setOffset] = useState(0);
  useHeaderMode("final");
  useKeys((key) => {
    if (key === "enter" || key === "esc") {
      store.quit();
      return true;
    }
    if (key === "down" || key === "j") setOffset((o) => o + 1);
    else if (key === "up" || key === "k") setOffset((o) => Math.max(0, o - 1));
    else return false;
    return true;
  });
  return <Page page="final" commands={[{ key: "enter", value: "done" }]} body={(h, t) => centered(viewport(finalLines(t), h, offset))} />;
}

// ── subscribe (variant picker for subscription-only products) ──────────────

export function SubscribeScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const sub = useShopState((s) => s.subscribing);
  useHeaderMode("subscribe");
  useKeys((key) => {
    switch (key) {
      case "j":
      case "down":
      case "tab":
        store.selectSubscribeVariant((sub?.selected ?? 0) + 1);
        return true;
      case "k":
      case "up":
      case "shift+tab":
        store.selectSubscribeVariant((sub?.selected ?? 0) - 1);
        return true;
      case "enter": {
        const v = sub?.product.variants[sub.selected];
        if (!v) return true;
        store.setSubscription({ productVariantID: v.id });
        nav("/shipping");
        return true;
      }
      case "esc":
        store.stopSubscribing();
        nav("/shop");
        return true;
    }
    return false;
  });
  return (
    <Page
      page="subscribe"
      commands={[
        { key: "esc", value: "back" },
        { key: "↑/↓", value: "roast" },
        { key: "enter", value: "select" },
      ]}
      body={(_h, t) => {
        if (!sub) return place([[t.base("You haven't selected a product to subscribe to.")]], CONTENT, CONTENT_HEIGHT);
        const ls: Line[] = [];
        sub.product.variants.forEach((v, i) => {
          const name = t.accent(v.name);
          const price = t.base(`$${dollars(v.price)}`);
          const space = CONTENT - width([name]) - width([price]) - 4;
          ls.push(...listBox([concat(name, t.base(" ".repeat(Math.max(0, space))), price)], i === sub.selected, t));
        });
        return ls;
      }}
    />
  );
}

// ── email gate ──────────────────────────────────────────────────────────────

/**
 * `EmailGateView`. The SSH shop links an email to the ssh key here; the API only
 * allows that from an ssh session, so this explains how to do it instead.
 */
export function EmailGateScreen(): ReactNode {
  const nav = useNav();
  const params = useSearchParams();
  const store = useShop();
  const env = useShopState((s) => s.env);
  useHeaderMode("cart", false);
  useKeys((key) => {
    if (key === "esc") {
      const from = params.get("from");
      if (from === "shop") store.stopSubscribing();
      nav(from === "shop" ? "/shop" : "/cart");
      return true;
    }
    if (key === "r") {
      store.reconnect();
      return true;
    }
    return false;
  });
  const t = defaultTheme;
  const host = env === "dev" ? "dev.terminal.shop" : "terminal.shop";
  const ls: Line[] = [
    [t.bold("one quick thing")],
    [],
    [t.base("we don't have an email for your account, so we can't send you")],
    [t.base("order or subscription updates. link one to your account first:")],
    [],
    [t.accent(`  ssh ${host} -t link-email`)],
    [],
    [t.base("or sign in with the browser (an email account) instead.")],
    [],
    [t.base("r to reload after linking · esc to go back · ctrl+c to quit")],
  ];
  const body = ls.map((l) => fit(l, CONTENT));
  return <Screen lines={place(body, WIDTH, HEIGHT)} />;
}
