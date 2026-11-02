/**
 * The chrome around every page: `HeaderView`, `BreadcrumbsView`, `FooterView`, and the
 * responsive container from the SSH shop's `tea.WindowSizeMsg` handler (`root.go`).
 */

import { pad2, dollars } from "./format";
import { makeTheme, palette, type Theme } from "./theme";
import { centerLines, clip, concat, fit, place, span, width, wordWrap, type Line } from "./ui";
import type { Cart, Region } from "./types";

/** `size`: which of the SSH shop's layouts the console gets. */
export const UNDERSIZED = 0;
export const SMALL = 1;
export const MEDIUM = 2;
export const LARGE = 3;
export type Size = typeof UNDERSIZED | typeof SMALL | typeof MEDIUM | typeof LARGE;

export interface Layout {
  size: Size;
  viewportWidth: number;
  viewportHeight: number;
  widthContainer: number;
  heightContainer: number;
  /** `widthContainer - 2`. */
  widthContent: number;
  /**
   * `heightContainer` minus the header, footer and breadcrumbs as they are when the window
   * size arrives (on the splash: a 1-row breadcrumb), minus 2. Used by the centered empty states.
   */
  heightContent: number;
}

/** The SSH shop's `tea.WindowSizeMsg` handler. */
export function layoutFor(cols: number, rows: number): Layout {
  const vw = Math.max(1, Math.floor(cols));
  const vh = Math.max(1, Math.floor(rows));
  let size: Size;
  let widthContainer: number;
  let heightContainer: number;
  if (vw < 20 || vh < 10) {
    size = UNDERSIZED;
    widthContainer = vw;
    heightContainer = vh;
  } else if (vw < 50) {
    size = SMALL;
    widthContainer = vw;
    heightContainer = vh;
  } else if (vw < 80) {
    size = MEDIUM;
    widthContainer = 50;
    heightContainer = Math.min(vh, 30);
  } else {
    size = LARGE;
    widthContainer = 80;
    heightContainer = Math.min(vh, 30);
  }
  const footer = size === SMALL ? 3 : 5;
  return { size, viewportWidth: vw, viewportHeight: vh, widthContainer, heightContainer, widthContent: widthContainer - 2, heightContent: heightContainer - 3 - footer - 1 - 2 };
}

/** The "large" layout in an 80 × 30 console. */
export const LARGE_LAYOUT: Layout = layoutFor(80, 30);

export const WIDTH = LARGE_LAYOUT.widthContainer;
export const HEIGHT = LARGE_LAYOUT.heightContainer;
/** `widthContent` of the large layout. */
export const CONTENT = LARGE_LAYOUT.widthContent;
/** `heightContent` of the large layout. */
export const CONTENT_HEIGHT = LARGE_LAYOUT.heightContent;

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

/**
 * lipgloss table column sizing: natural widths, then grow the narrowest column until the
 * table fills `total`, or shrink the widest while it's too wide.
 */
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
  while (sum > inner && Math.max(...w) > 1) {
    let max = 0;
    for (let i = 1; i < w.length; i++) if ((w[i] as number) > (w[max] as number)) max = i;
    w[max] = (w[max] as number) - 1;
    sum--;
  }
  return w;
}

/** lipgloss (go-runewidth) counts `☰` as two columns; terminals and the console draw one. */
function lipglossWidth(l: Line): number {
  let extra = 0;
  for (const s of l) for (const ch of s.text) if (ch === "☰") extra++;
  return width(l) + extra;
}

/** The splash logo: "terminal" and the blinking brand cursor. */
export function logo(cursor: boolean): Line {
  return [span("terminal", { fg: palette.accent, bold: true }), span(" ", cursor ? { bg: palette.brand } : {})];
}

/** Key hints in the footer's style (`enter sign in   esc back`), wrapped between pairs to fit `w`. */
export function keyHints(keys: Array<[key: string, label: string] | null | false>, t: Theme, w: number): Line[] {
  const out: Line[] = [];
  let cur: Line = [];
  for (const k of keys) {
    if (!k) continue;
    const hint: Line = [t.bold(k[0]), t.base(` ${k[1]}`)];
    if (cur.length && width(cur) + 3 + width(hint) > w) {
      out.push(cur);
      cur = [];
    }
    if (cur.length) cur.push(t.base("   "));
    cur.push(...hint);
  }
  if (cur.length) out.push(cur);
  return out;
}

/**
 * A full-screen centered column under the logo (sign in, the email gate): every line
 * centered, a blank line between blocks. On short consoles the spacing goes first, then the logo.
 */
export function logoScreen(blocks: Array<Line[] | null | false>, L: Layout, cursor: boolean): Line[] {
  const parts = blocks.filter((b): b is Line[] => !!b && b.length > 0);
  const stack = (head: Line[] | null, afterLogo: number, gap: number): Line[] => {
    const out: Line[] = head ? [...head, ...Array.from({ length: afterLogo }, (): Line => [])] : [];
    parts.forEach((b, i) => {
      if (i > 0) for (let g = 0; g < gap; g++) out.push([]);
      out.push(...b);
    });
    return out;
  };
  const head = [logo(cursor)];
  const tries = [stack(head, 2, 1), stack(head, 1, 1), stack(null, 0, 1), stack(head, 1, 0), stack(head, 0, 0), stack(null, 0, 0)];
  const ls = tries.find((l) => l.length <= L.viewportHeight) ?? (tries.at(-1) as Line[]);
  return place(centerLines(ls, Math.min(L.viewportWidth, Math.max(0, ...ls.map(width)))), L.viewportWidth, L.viewportHeight);
}

/** `HeaderView`: logo and tabs (large), `m ☰`, logo and cart (medium), `t` and cart (small). */
export function headerLines(page: PageId, cart: Cart, t: Theme, L: Layout = LARGE_LAYOUT, cursor = true): Line[] {
  const accent = t.accent;
  const base = t.base;
  const shopTab: Line = page === "shop" ? [accent("s shop")] : [accent("s"), base(" shop")];
  const accountTab: Line = page === "account" || page === "addresses" ? [accent("a account")] : [accent("a"), base(" account")];
  const total = `$${pad2(dollars(cart.subtotal))}`;
  const count = ` [${cartCount(cart)}]`;
  const cartTab: Line = page === "cart" ? [accent("c"), accent(" cart"), accent(` ${total}`), base(count)] : [accent("c"), base(" cart"), accent(` ${total}`), base(count)];
  const logo: Line = [t.bold("terminal")];
  let tabs: Line[];
  if (L.size === SMALL) tabs = [[t.bold("t"), span(" ", cursor ? { bg: palette.brand } : {})], cartTab];
  else if (L.size === MEDIUM) tabs = [[t.bold("m"), base(" ☰")], logo, cartTab];
  else tabs = [logo, shopTab, accountTab, cartTab];
  const widths = columnWidths(
    tabs.map((c) => lipglossWidth(c) + 2),
    L.widthContent,
  );
  const b = { fg: palette.border };
  const rule = (l: string, m: string, r: string): Line => [span(l + widths.map((w) => "─".repeat(w)).join(m) + r, b)];
  const row: Line = [span("│", b)];
  tabs.forEach((c, i) => {
    const w = widths[i] as number;
    const cell = clip(c, Math.max(0, w - 2));
    const gap = Math.max(0, w - 2 - lipglossWidth(cell));
    const left = Math.floor(gap / 2);
    row.push(span(" ".repeat(Math.min(w, 1 + left)), t.baseStyle), ...(w >= 2 ? cell : []), span(" ".repeat(Math.max(0, gap - left + (w >= 2 ? 1 : 0))), t.baseStyle), span("│", b));
  });
  const tableWidth = width(rule("┌", "┬", "┐"));
  const left = Math.floor(Math.max(0, L.widthContainer - tableWidth) / 2);
  const pad = (l: Line): Line => fit(concat(" ".repeat(left), l), L.widthContainer);
  return [rule("┌", "┬", "┐"), row, rule("└", "┴", "┘")].map(pad);
}

const CART_STEPS = ["cart", "shipping", "payment", "confirmation"];
const SUB_STEPS = ["subscribe", "shipping", "payment", "confirmation"];
const CART_STEPS_SHORT = ["cart", "ship", "pay", "confirm"];
const SUB_STEPS_SHORT = ["subscribe", "ship", "pay", "confirm"];

/** One line of crumbs plus its bottom margin, or a single empty line. */
export function breadcrumbLines(page: PageId, subscribing: boolean, t: Theme, subscriptionPayment = false, L: Layout = LARGE_LAYOUT): Line[] {
  if (page === "payment" && subscriptionPayment) return [[]];
  const order: PageId[] = [subscribing ? "subscribe" : "cart", "shipping", "payment", "confirm"];
  const selected = order.indexOf(page);
  if (selected < 0) return [[]];
  const short = L.size === SMALL || L.size === MEDIUM;
  const labels = subscribing ? (short ? SUB_STEPS_SHORT : SUB_STEPS) : short ? CART_STEPS_SHORT : CART_STEPS;
  const out: Line = [span("  ")];
  labels.forEach((label, i) => {
    if (i > 0) out.push(t.base(" / "));
    out.push(i === selected ? t.accent(label) : t.base(label));
  });
  return [out, []];
}

const FLAGS: Record<Region, string> = { na: "🇺🇸 (US)", eu: "🇪🇺 (EU)", global: "🌎 (Global)" };

export function footerLines(opts: { page: PageId; commands: Command[]; error: string | null; region: Region | null; theme?: Theme; layout?: Layout }): Line[] {
  const t = opts.theme ?? makeTheme(null);
  const L = opts.layout ?? LARGE_LAYOUT;
  const rule: Line = [span("─".repeat(L.widthContent), { fg: palette.border })];
  // Small screens: just the menu key, no message line (errors don't show either).
  if (L.size === SMALL) return [rule, fit([t.bold("m"), t.base(" menu")], L.widthContent, "center", t.baseStyle), []];

  const cmds: Line = [];
  if (opts.page === "shop") cmds.push(t.bold("r"), t.base(` ${FLAGS[opts.region ?? "na"]}`), t.base("  "));
  for (const c of opts.commands) cmds.push(t.bold(` ${c.key} `), t.base(`${c.value}  `));

  let content: Line[];
  if (opts.error) {
    const hint = "esc";
    const maxErrorWidth = L.widthContent - hint.length - 6;
    const msgLines = width(opts.error) > maxErrorWidth ? wordWrap(opts.error, maxErrorWidth) : [opts.error];
    const panel = { fg: palette.accent, bg: palette.error };
    const msgW = Math.max(...msgLines.map((l) => width(l))) + 2;
    const space = Math.max(L.widthContent - msgW - hint.length - 2, 0);
    content = msgLines.map((l, i) => [
      span(` ${l}${" ".repeat(Math.max(0, msgW - 2 - width(l)))} `, panel),
      span(" ".repeat(space), panel),
      span(i === 0 ? ` ${hint} ` : " ".repeat(hint.length + 2), { ...panel, bold: true }),
    ]);
  } else {
    content = [[t.base("free shipping on US orders over $40")]];
  }

  const commandLines = wrapCommands(cmds, L.widthContent).map((l) => fit(l, L.widthContent, "center", t.baseStyle));
  const footer: Line[] = [[], ...centerLines(content, L.widthContent), rule, ...commandLines, []];
  // Placed in `widthContainer`, centered (one column each side).
  return footer.map((l) => concat(" ", l));
}

/** lipgloss `Width(w)` on the command row: wraps at spaces when it's too long. */
function wrapCommands(cmds: Line, w: number): Line[] {
  if (width(cmds) <= w) return [cmds];
  // Words with the spaces before them, styles kept; spaces at a break are dropped.
  const words: Array<{ gap: Line; word: Line }> = [];
  let gap: Line = [];
  let word: Line = [];
  for (const s of cmds) {
    for (const p of s.text.split(/( +)/)) {
      if (!p) continue;
      if (/^ +$/.test(p)) {
        if (word.length) {
          words.push({ gap, word });
          gap = [];
          word = [];
        }
        gap.push({ ...s, text: p });
      } else word.push({ ...s, text: p });
    }
  }
  if (word.length) words.push({ gap, word });
  const out: Line[] = [];
  let cur: Line = [];
  for (const { gap: g, word: wd } of words) {
    if (cur.length && width(cur) + width(g) + width(wd) > w) {
      out.push(cur);
      cur = [];
    }
    // Spaces at a break are dropped; the first line keeps its leading ones.
    if (cur.length || out.length === 0) cur.push(...g);
    cur.push(...wd);
  }
  if (cur.length) out.push(cur);
  return out.map((l) => clip(l, w));
}

/**
 * `View()`: header + breadcrumbs + body + footer in the container. The body is at least
 * the room that's left (`Height(height)`); taller content pushes the footer down and the
 * container clips at `heightContainer` (`MaxHeight`), as lipgloss does.
 */
export function composeFrame(opts: {
  page: PageId;
  cart: Cart;
  theme: Theme;
  subscribing: boolean;
  subscriptionPayment?: boolean;
  commands: Command[];
  error: string | null;
  region: Region | null;
  layout?: Layout;
  cursor?: boolean;
  body: (height: number) => Line[];
}): Line[] {
  const L = opts.layout ?? LARGE_LAYOUT;
  const header = headerLines(opts.page, opts.cart, opts.theme, L, opts.cursor);
  const crumbs = breadcrumbLines(opts.page, opts.subscribing, opts.theme, opts.subscriptionPayment, L);
  const footer = footerLines({ page: opts.page, commands: opts.commands, error: opts.error, region: opts.region, theme: opts.theme, layout: L });
  const bodyHeight = Math.max(0, L.heightContainer - header.length - crumbs.length - footer.length);
  const body = opts.body(bodyHeight).map((l) => clip(l, L.widthContainer));
  while (body.length < bodyHeight) body.push([]);
  return [...header, ...crumbs, ...body, ...footer].slice(0, L.heightContainer).map((l) => clip(l, L.widthContainer));
}

/**
 * `renderer.Place(viewportWidth, viewportHeight, Center, Center, …)`: the container (or any
 * block) centered in the console, the theme background around it.
 */
export function placeInViewport(ls: Line[], L: Layout, blockWidth = Math.max(0, ...ls.map(width))): Line[] {
  const top = Math.floor(Math.max(0, L.viewportHeight - ls.length) / 2);
  const left = Math.floor(Math.max(0, L.viewportWidth - blockWidth) / 2);
  const out: Line[] = [];
  for (let i = 0; i < top; i++) out.push([]);
  for (const l of ls) out.push(clip(left > 0 ? concat(" ".repeat(left), l) : l, L.viewportWidth));
  return out.slice(0, L.viewportHeight);
}
