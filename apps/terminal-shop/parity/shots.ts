/**
 * The side-by-side screens: what to press in `ssh terminal.shop` (`ssh`) and in this port
 * (`ours`, when it differs because the account menu has two more rows).
 */

export interface Shot {
  name: string;
  cols: number;
  rows: number;
  ssh: string[];
  ours?: string[];
}

const SIZES = {
  xl: [120, 40],
  lg: [80, 30],
  md: [60, 24],
  sm: [45, 20],
  xs: [18, 8],
} as const;

const shot = (name: string, size: keyof typeof SIZES, ssh: string[] = [], ours?: string[]): Shot => ({ name, cols: SIZES[size][0], rows: SIZES[size][1], ssh, ours });
const down = (n: number): string[] => Array.from({ length: n }, () => "down");

export const SHOTS: Shot[] = [
  shot("shop", "xl"),
  shot("shop", "lg"),
  shot("shop", "md"),
  shot("shop", "sm"),
  shot("shop", "xs"),
  shot("shop-segfault", "lg", down(2)),
  shot("shop-segfault", "md", down(2)),
  shot("shop-segfault", "sm", down(2)),
  shot("cart", "lg", ["c"]),
  shot("cart", "md", ["c"]),
  shot("cart", "sm", ["c"]),
  shot("account", "xl", ["a"]),
  shot("account", "lg", ["a"]),
  shot("account", "md", ["a"]),
  shot("account", "sm", ["a"]),
  shot("account-subs", "lg", ["a", ...down(1)]),
  shot("account-tokens", "lg", ["a", ...down(2)]),
  shot("account-apps", "lg", ["a", ...down(3)]),
  shot("account-addr", "lg", ["a", ...down(4)]),
  shot("account-email", "lg", ["a", ...down(5)]),
  shot("account-faq", "lg", ["a", ...down(6)], ["a", ...down(8)]),
  shot("account-about", "lg", ["a", ...down(7)], ["a", ...down(9)]),
  shot("account-debug", "lg", ["a", ...down(8)], ["a", ...down(10)]),
  shot("account-faq", "md", ["a", ...down(6)], ["a", ...down(8)]),
  shot("addresses", "lg", ["a", ...down(4), "right"]),
  shot("menu", "xl", ["m"]),
  shot("menu", "lg", ["m"]),
  shot("menu", "md", ["m"]),
  shot("menu", "sm", ["m"]),
];

export const shotId = (s: Shot): string => `${s.name}-${s.cols}x${s.rows}`;
