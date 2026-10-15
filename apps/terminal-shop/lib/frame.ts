/**
 * The chrome around every page: `HeaderView`, `BreadcrumbsView`, `FooterView` and
 * the 80 × 30 container of the SSH shop's "large" layout.
 */

import { pad2, dollars } from "./format";
import { makeTheme, palette, type Theme } from "./theme";
import { centerLines, concat, fit, span, width, wordWrap, type Line } from "./ui";
import type { Cart, Region } from "./types";

export const WIDTH = 80;
export const HEIGHT = 30;
/** `widthContent`. */
export const CONTENT = WIDTH - 2;

export type PageId =
  | "shop"
  | "cart"
  | "subscribe"
  | "shipping"
  | "payment"
  | "confirm"
  | "final-sub"
  | "final"
  | "account"
  | "addresses";

export interface Command {
  key: string;
  value: string;
}

export function cartCount(cart: Cart): number {
  let n = 0;
  for (const i of cart.items) n += i.quantity;
  return n;
}

/** lipgloss table column sizing: natural widths, then grow the narrowest column until the table fills `total`. */
function columnWidths(natural: number[], total: number): number[] {
  const w = [...natural];
  const inner = total - (w.length + 1);
  let sum = w.reduce((a, b) => a + b, 0);
  while (sum < inner) {
    let min = 0;
    for (let i = 1; i < w.length; i++) if ((w[i] as number) < (w[min] as number)) min = i;
    w[min] = (w[min] as number) + 1;
    sum++;
  }
  return w;
}

export function headerLines(page: PageId, cart: Cart, t: Theme): Line[] {
  const accent = t.accent;
  const base = t.base;
  const shopTab: Line = page === "shop" ? [accent("s shop")] : [accent("s"), base(" shop")];
  const accountTab: Line = page === "account" || page === "addresses" ? [accent("a account")] : [accent("a"), base(" account")];
  const total = `$${pad2(dollars(cart.subtotal))}`;
  const count = ` [${cartCount(cart)}]`;
  const cartTab: Line = page === "cart" ? [accent("c"), accent(" cart"), accent(` ${total}`), base(count)] : [accent("c"), base(" cart"), accent(` ${total}`), base(count)];
  const tabs: Line[] = [[t.bold("terminal")], shopTab, accountTab, cartTab];
  const widths = columnWidths(
    tabs.map((c) => width(c) + 2),
    CONTENT,
  );
  const b = { fg: palette.border };
  const rule = (l: string, m: string, r: string): Line => [span(l + widths.map((w) => "─".repeat(w)).join(m) + r, b)];
  const row: Line = [span("│", b)];
  tabs.forEach((c, i) => {
    const w = widths[i] as number;
    const gap = w - 2 - width(c);
    const left = Math.floor(gap / 2);
    row.push(span(" ".repeat(1 + left), t.baseStyle), ...c, span(" ".repeat(gap - left + 1), t.baseStyle), span("│", b));
  });
  return [rule("┌", "┬", "┐"), row, rule("└", "┴", "┘")].map((l) => concat(" ", l, " "));
}

const CART_STEPS = ["cart", "shipping", "payment", "confirmation"];
const SUB_STEPS = ["subscribe", "shipping", "payment", "confirmation"];

/** One line of crumbs plus its bottom margin, or a single empty line. */
export function breadcrumbLines(page: PageId, subscribing: boolean, t: Theme, subscriptionPayment = false): Line[] {
  if (page === "payment" && subscriptionPayment) return [[]];
  const order: PageId[] = [subscribing ? "subscribe" : "cart", "shipping", "payment", "confirm"];
  const selected = order.indexOf(page);
  if (selected < 0) return [[]];
  const labels = subscribing ? SUB_STEPS : CART_STEPS;
  const out: Line = [span("  ")];
  labels.forEach((label, i) => {
    if (i > 0) out.push(t.base(" / "));
    out.push(i === selected ? t.accent(label) : t.base(label));
  });
  return [out, []];
}

const FLAGS: Record<Region, string> = { na: "🇺🇸 (US)", eu: "🇪🇺 (EU)", global: "🌎 (Global)" };

export function footerLines(opts: { page: PageId; commands: Command[]; error: string | null; region: Region | null; theme?: Theme }): Line[] {
  const t = opts.theme ?? makeTheme(null);
  const cmds: Line = [];
  if (opts.page === "shop") cmds.push(t.bold("r"), t.base(` ${FLAGS[opts.region ?? "na"]}`), t.base("  "));
  for (const c of opts.commands) cmds.push(t.bold(` ${c.key} `), t.base(`${c.value}  `));

  let content: Line[];
  if (opts.error) {
    const hint = "esc";
    const maxErrorWidth = CONTENT - hint.length - 6;
    const msgLines = width(opts.error) > maxErrorWidth ? wordWrap(opts.error, maxErrorWidth) : [opts.error];
    const panel = { fg: palette.accent, bg: palette.error };
    const msgW = Math.max(...msgLines.map((l) => width(l))) + 2;
    const space = Math.max(CONTENT - msgW - hint.length - 2, 0);
    content = msgLines.map((l, i) => [
      span(` ${l}${" ".repeat(msgW - 2 - width(l))} `, panel),
      span(" ".repeat(space), panel),
      span(i === 0 ? ` ${hint} ` : " ".repeat(hint.length + 2), { ...panel, bold: true }),
    ]);
  } else {
    content = [[t.base("free shipping on US orders over $40")]];
  }

  const footer: Line[] = [[], ...centerLines(content, CONTENT), [span("─".repeat(CONTENT), { fg: palette.border })], fit(cmds, CONTENT, "center", t.baseStyle), []];
  return footer.map((l) => concat(" ", l));
}

/** Header + breadcrumbs + body + footer, exactly `HEIGHT` rows. */
export function composeFrame(opts: {
  page: PageId;
  cart: Cart;
  theme: Theme;
  subscribing: boolean;
  subscriptionPayment?: boolean;
  commands: Command[];
  error: string | null;
  region: Region | null;
  body: (height: number) => Line[];
}): Line[] {
  const header = headerLines(opts.page, opts.cart, opts.theme);
  const crumbs = breadcrumbLines(opts.page, opts.subscribing, opts.theme, opts.subscriptionPayment);
  const footer = footerLines({ page: opts.page, commands: opts.commands, error: opts.error, region: opts.region, theme: opts.theme });
  const bodyHeight = Math.max(0, HEIGHT - header.length - crumbs.length - footer.length);
  const body = opts.body(bodyHeight).slice(0, bodyHeight);
  while (body.length < bodyHeight) body.push([]);
  return [...header, ...crumbs, ...body, ...footer];
}

/**
 * `heightContent`, used by the original's centered empty states. It is measured once,
 * on the first `WindowSizeMsg` (while the splash shows, so with a 1-line breadcrumb).
 */
export const CONTENT_HEIGHT = HEIGHT - 3 - 5 - 1 - 2;
