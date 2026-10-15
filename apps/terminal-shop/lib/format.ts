import type { Address, AddressInput, Card } from "./types";

/** `formatUSD`: cents → `$12.34`. */
export function formatUSD(cents: number): string {
  const c = Math.trunc(cents);
  return `$${Math.trunc(c / 100)}.${String(Math.abs(c % 100)).padStart(2, "0")}`;
}

/** Go's `fmt.Sprintf("%2v", n)`: right-aligned to width 2. */
export function pad2(n: number): string {
  return String(n).padStart(2, " ");
}

/** Whole dollars (Go integer division). */
export function dollars(cents: number): number {
  return Math.trunc(cents / 100);
}

/** `fmt.Sprintf("$%.2v", price/100)`. */
export function shopPrice(cents: number): string {
  return `$${String(dollars(cents)).padStart(2, "0")}`;
}

export function formatLast4(last4: string): string {
  return `**** **** **** ${last4}`;
}

export function formatExpiration(e: Card["expiration"]): string {
  return `${String(e.month).padStart(2, "0")}/${String(e.year % 100).padStart(2, "0")}`;
}

/** `formatAddress` (list item text). */
export function addressLine(a: AddressInput | Address): string {
  let s = `${a.street1}, `;
  if (a.street2) s += `${a.street2}, `;
  s += `${a.city}, ${a.province ?? ""}, ${a.country}, `;
  s += a.zip;
  return s;
}
