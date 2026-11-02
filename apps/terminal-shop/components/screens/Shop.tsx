import { useState, type ReactNode } from "react";
import { LARGE, LARGE_LAYOUT, type Command, type Layout } from "../../lib/frame";
import { shopPrice } from "../../lib/format";
import { useShop, useShopState } from "../../lib/store";
import { palette, type Theme } from "../../lib/theme";
import type { Product } from "../../lib/types";
import { block, centerLines, fit, hjoin, place, span, viewport, width, wrap, type Line } from "../../lib/ui";
import { Page, useHeaderMode, useKeys, useNav } from "../chrome";

export function menuWidthFor(products: Product[]): number {
  let w = 14;
  if (products.length === 0) return w;
  for (const p of products) w = Math.max(w, width(p.name));
  return w + 4;
}

export function isSubscribed(product: Product, subscriptions: { id: string; productVariantID: string }[]): string | null {
  for (const s of subscriptions) for (const v of product.variants) if (v.id === s.productVariantID) return s.id;
  return null;
}

/** `getShopMenuContent`: the product list (centered and full width below the large layout). */
export function shopMenu(products: Product[], selected: number, t: Theme, L: Layout = LARGE_LAYOUT): Line[] {
  const menuWidth = menuWidthFor(products);
  const itemWidth = menuWidth + 2;
  const product = products[selected];
  const hl = { fg: product?.name === "cron" ? "#000000" : palette.accent, bg: t.highlight };
  const stacked = L.size < LARGE;
  const item = (p: Product, i: number): Line => {
    const style = i === selected ? hl : t.baseStyle;
    if (stacked) return [span(" "), ...fit([span(p.name, style)], L.widthContent - 1, "center", style)];
    return [span(" "), ...fit([span(` ${p.name}`, style)], itemWidth, "left", style)];
  };
  const header = (label: string): Line => (stacked ? [span(" "), ...fit([t.accent(label)], L.widthContent, "center")] : [span(" "), ...fit([t.accent(` ${label}`)], itemWidth)]);
  const featured = products.filter((p) => p.tags?.featured).length;
  const out: Line[] = [];
  if (featured > 0) {
    out.push(header("~ featured ~"));
    for (let i = 0; i < featured; i++) out.push(item(products[i] as Product, i));
    if (featured < products.length) {
      out.push([]);
      out.push(header("~ originals ~"));
      for (let i = featured; i < products.length; i++) out.push(item(products[i] as Product, i));
      out.push([]);
    }
  } else products.forEach((p, i) => out.push(item(p, i)));
  return out;
}

/** `getShopDetailContent`. */
export function shopDetail(product: Product, quantity: number, subscribed: boolean, detailWidth: number, t: Theme): Line[] {
  const w = detailWidth - 2;
  const priceColor = product.tags?.color === "#000000" ? palette.accent : t.highlight;
  const variantNames = product.variants.map((v) => v.name).join("/");
  const button = (label: string): Line => [span(` ${label} `, { fg: palette.background, bg: t.highlight }), t.base(" enter")];
  const qty: Line = product.subscription === "required" ? button(subscribed ? "manage sub" : "subscribe") : [t.base("- "), t.accent(` ${quantity} `), t.base(" +")];
  return [
    [t.accent(product.name)],
    ...wrap(variantNames.toLowerCase(), w).map((l) => [t.base(l)]),
    [],
    [span(shopPrice(product.variants[0]?.price ?? 0), { fg: priceColor, bold: true })],
    [],
    ...wrap(product.description, w).map((l) => [t.base(l)]),
    [],
    qty,
  ];
}

export function ShopScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  const products = useShopState((s) => s.products);
  const selected = useShopState((s) => s.shopSelected);
  const subscriptions = useShopState((s) => s.subscriptions);
  useShopState((s) => s.cart);
  const [detailOffset, setDetailOffset] = useState(0);
  useHeaderMode("shop");

  const commands: Command[] =
    products.length === 0
      ? [{ key: "q", value: "quit" }]
      : [...(products.length > 1 ? [{ key: "↑/↓", value: "products" }] : []), { key: "+/-", value: "qty" }, { key: "c", value: "cart" }, { key: "q", value: "quit" }];

  useKeys((key) => {
    if (key === "r") {
      void store.toggleRegion();
      return true;
    }
    const product = products[selected];
    if (!product) return false;
    const variant = product.variants[0];
    switch (key) {
      case "tab":
      case "down":
      case "j":
        store.selectProduct(selected + 1);
        setDetailOffset(0);
        return true;
      case "shift+tab":
      case "up":
      case "k":
        store.selectProduct(selected - 1);
        setDetailOffset(0);
        return true;
      case "+":
      case "=":
      case "right":
      case "l":
        if (product.subscription !== "required" && variant) store.updateCart(variant.id, 1);
        return true;
      case "-":
      case "left":
      case "h":
        if (product.subscription !== "required" && variant) store.updateCart(variant.id, -1);
        return true;
      case "pgdown":
      case "ctrl+d":
        setDetailOffset((o) => o + 10);
        return true;
      case "pgup":
      case "ctrl+u":
        setDetailOffset((o) => Math.max(0, o - 10));
        return true;
      case "enter": {
        // Signed out on textjs.org: ask to sign in here, and come back to the shop.
        if (store.signedOut) {
          store.requireSignIn(product.subscription === "required" ? "sign in to subscribe" : "sign in to see your cart");
          return true;
        }
        if (product.subscription === "required") {
          const subscriptionID = isSubscribed(product, subscriptions);
          if (subscriptionID) {
            nav(`/account?subscription=${encodeURIComponent(subscriptionID)}`);
            return true;
          }
          store.startSubscribing(product);
          if (!store.s.user?.email) nav("/email?from=shop");
          else nav(product.variants.length === 1 ? "/shipping" : "/subscribe");
          if (product.variants.length === 1 && product.variants[0]) store.setSubscription({ productVariantID: product.variants[0].id });
          return true;
        }
        nav("/cart");
        return true;
      }
    }
    return false;
  });

  return (
    <Page
      page="shop"
      commands={commands}
      body={(h, t, L) => {
        if (products.length === 0) {
          return place(centerLines([[t.accent("no products available for this region.")], [], [t.base("press 'r' to change region.")]]), L.widthContent, L.heightContent);
        }
        const product = products[selected] as Product;
        const quantity = store.cartItem(product.variants[0]?.id ?? "").quantity;
        const menu = shopMenu(products, selected, t, L);
        const featured = products.filter((p) => p.tags?.featured).length;
        const targetY = featured > 0 && selected >= featured ? selected + 4 : selected + 2;
        const menuOffset = targetY - Math.floor(h / 2);
        const subscribed = isSubscribed(product, subscriptions) !== null;
        if (L.size < LARGE) {
          // `ShopView` below the large layout stacks the two viewports (each the full body
          // height), so the product list fills the body and the details sit below it.
          const detail = shopDetail(product, quantity, subscribed, L.widthContent + 2, t);
          return [...viewport(menu, h, menuOffset).map((l) => fit(l, L.widthContent)), ...viewport(detail, h, detailOffset).map((l) => fit(l, L.widthContent))];
        }
        const menuWidth = menuWidthFor(products);
        const detailWidth = L.widthContent - menuWidth;
        const detail = shopDetail(product, quantity, subscribed, detailWidth, t);
        return hjoin(block(viewport(menu, h, menuOffset), menuWidth), block([], 2), block(viewport(detail, h, detailOffset), L.widthContainer - menuWidth - 2));
      }}
    />
  );
}
