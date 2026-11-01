/**
 * The side-by-side screens: what to press in `ssh terminal.shop` (`ssh`) and in this port
 * (`ours`, when it differs because the account menu has two more rows).
 */

import type { MockTerminal } from "../test/mock-terminal";

export interface Shot {
  name: string;
  cols: number;
  rows: number;
  ssh: string[];
  ours?: string[];
  /** Account data for screens the ssh capture's fresh account can't show (ours only). */
  seed?: (api: MockTerminal) => void;
  /** textjs.org mode, signed out. */
  site?: boolean;
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

const seedAccount = (api: MockTerminal): void => {
  const segfault = api.state.products.find((p) => p.name === "segfault")?.variants[0]?.id ?? "";
  api.state.user.email = "ada@example.com";
  api.state.user.name = "Ada Lovelace";
  api.state.addresses = [{ id: "shp_1", name: "Ada Lovelace", street1: "1 Infinite Loop", city: "Cupertino", province: "CA", country: "US", zip: "95014" }];
  api.state.cards = [
    { id: "crd_1", brand: "Visa", last4: "4242", expiration: { month: 1, year: 2031 } },
    { id: "crd_2", brand: "MasterCard", last4: "4444", expiration: { month: 7, year: 2029 } },
  ];
  api.state.subscriptions = [{ id: "sub_01JC0EXAMPLE", productVariantID: segfault, price: 2200, quantity: 2, addressID: "shp_1", cardID: "crd_1", schedule: { type: "weekly", interval: 3 }, next: "2026-11-21", created: "2026-10-01" }];
};

/** Screens the ssh shop doesn't have (or can't show a fresh account), rendered alone. */
export const EXTRA_SHOTS: Shot[] = [
  { ...shot("account-payment", "lg", [], ["a", ...down(6)]), seed: seedAccount },
  { ...shot("account-payment-add", "lg", [], ["a", ...down(6), "enter", "down", "down", "enter"]), seed: seedAccount },
  { ...shot("account-profile", "lg", [], ["a", ...down(7)]), seed: seedAccount },
  { ...shot("account-profile-edit", "lg", [], ["a", ...down(7), "enter"]), seed: seedAccount },
  { ...shot("account-subscription-schedule", "lg", [], ["a", "down", "enter", "enter", "+"]), seed: seedAccount },
  { ...shot("account-signed-out", "lg", [], ["a"]), site: true },
  { ...shot("cart-signed-out", "lg", [], ["c"]), site: true },
];
