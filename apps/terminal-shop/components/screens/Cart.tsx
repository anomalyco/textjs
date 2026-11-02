import { useRef, type ReactNode } from "react";
import { CONTENT, LARGE_LAYOUT, type Layout } from "../../lib/frame";
import { dollars } from "../../lib/format";
import { useShop, useShopState, type ShopStore } from "../../lib/store";
import { palette, type Theme } from "../../lib/theme";
import { box, concat, fit, indent, place, span, viewport, width, type Line } from "../../lib/ui";
import { Page, useHeaderMode, useKeys, useNav } from "../chrome";

/** `CreateBox`: a bordered list item `widthContent` wide. */
export function listBox(content: Line[], selected: boolean, t: Theme, inner = CONTENT - 2): Line[] {
  return box(content, inner, selected ? palette.accent : t.border, t.baseStyle);
}

/** `formatListItemCustom`: radio marker + right-aligned `enter` hint when focused. */
export function listItem(text: Line[] | string, focused: boolean, t: Theme, totalWidth = CONTENT, radio = true): Line[] {
  // Unstyled spans take the item's color: accent when focused (`accent(" ☉   " + text)`), body otherwise.
  const ls: Line[] = typeof text === "string" ? [[span(text)]] : text.map((l) => [...l]);
  const tint = (l: Line, fg: string): Line => l.map((s) => (s.fg ? s : { ...s, fg }));
  const first = ls[0] ?? [];
  let head: Line;
  if (!radio) head = tint(first, palette.body);
  else if (focused) head = [t.accent(" ☉   "), ...tint(first, palette.accent)];
  else head = [t.base("     "), ...tint(first, palette.body)];
  for (let i = 1; i < ls.length; i++) ls[i] = tint(ls[i] as Line, palette.body);
  const padding = radio ? 6 : 2;
  // The `enter` hint goes when the row is too narrow to hold it.
  const hint = focused && width(head) + padding + 5 <= totalWidth ? "enter" : "";
  const space = Math.max(0, totalWidth - width(hint) - width(head) - padding);
  ls[0] = concat(head, t.base(" ".repeat(space)), hint ? t.accent(hint) : []);
  return ls;
}

export function cartLines(store: ShopStore, selected: number, t: Theme, L: Layout = LARGE_LAYOUT): Line[] {
  // Signed out on textjs.org: the cart lives in a terminal account.
  if (store.signedOut) return place([[t.base("Your cart is empty.")], [], [t.accent("press enter to sign in")]], L.widthContent, L.heightContent);
  if (store.isCartEmpty()) return place([[t.base("Your cart is empty.")]], L.widthContent, L.heightContent);
  const out: Line[] = [];
  store.visibleCartItems().forEach((item, i) => {
    const product = store.productFor(item.productVariantID);
    if (!product) return;
    const name = t.accent(product.name);
    const quantity: Line =
      selected === i ? [t.base("- "), t.accent(String(item.quantity)), t.base(" +  ")] : [t.base("  "), t.accent(String(item.quantity)), t.base("    ")];
    const subtotal = fit([t.base(`$${dollars(item.subtotal)}`)], 5);
    const space = L.widthContent - width([name]) - width(quantity) - width(subtotal) - 4;
    const content: Line[] = [concat(name, t.base(" ".repeat(Math.max(0, space))), quantity, subtotal), [t.base((product.variants[0]?.name ?? "").toLowerCase())]];
    out.push(...listBox(content, i === selected, t, L.widthContent - 2));
  });
  return out;
}

export function CartScreen(): ReactNode {
  const store = useShop();
  const nav = useNav();
  useShopState((s) => s.cart);
  useShopState((s) => s.products);
  const stored = useShopState((s) => s.cartSelected);
  const count = store.visibleCartItems().length;
  const selected = Math.min(stored, Math.max(0, count - 1));
  const offset = useRef(0);
  useHeaderMode("cart");

  useKeys((key) => {
    const items = store.visibleCartItems();
    const current = items[selected];
    switch (key) {
      case "j":
      case "down":
      case "tab":
        store.selectCartItem(selected + 1);
        return true;
      case "k":
      case "up":
      case "shift+tab":
        store.selectCartItem(selected - 1);
        return true;
      case "+":
      case "=":
      case "right":
      case "l":
        if (current) store.updateCart(current.productVariantID, 1);
        return true;
      case "-":
      case "left":
      case "h":
        if (current) store.updateCart(current.productVariantID, -1);
        return true;
      case "enter":
        if (store.signedOut) {
          store.requireSignIn("sign in to see your cart", "/cart");
          return true;
        }
        if (items.length === 0) return true;
        nav(store.s.user?.email ? "/shipping" : "/email?from=cart");
        return true;
      case "esc":
        nav("/shop");
        return true;
    }
    return false;
  });

  return (
    <Page
      page="cart"
      commands={
        store.signedOut
          ? [
              { key: "esc", value: "back" },
              { key: "enter", value: "sign in" },
            ]
          : [
              { key: "esc", value: "back" },
              { key: "↑/↓", value: "items" },
              { key: "+/-", value: "qty" },
              { key: "enter", value: "checkout" },
            ]
      }
      body={(h, t, L) => {
        const ls = cartLines(store, selected, t, L);
        if (count > 0) {
          const itemHeight = 5;
          const targetY = selected * itemHeight;
          if (targetY < offset.current) offset.current = targetY;
          if (targetY + itemHeight > offset.current + h) offset.current = targetY - h + itemHeight;
        }
        return indent(viewport(ls, h, offset.current), 1).map((l) => (l.length ? l : [span("")]));
      }}
    />
  );
}
