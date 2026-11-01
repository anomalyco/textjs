/**
 * Where the store sends buyers, and what is on sale. Checkout isn't connected yet, so `provider` is
 * null: launch items show "Coming soon" and later items "Later". To open the store, set `provider`;
 * nothing else in the site changes. The store collects no data itself: carts live in the visitor's
 * localStorage and checkout happens on the provider's domain.
 */

export interface CartLine {
  slug: string;
  /** Size label, or "" for one-size products. */
  size: string;
  quantity: number;
}

export interface CheckoutProvider {
  /** Shown under the buy button ("Checkout on Fourthwall."). */
  readonly name: string;
  /** Whether lines collect in a cart drawer before checkout, or each product links out directly. */
  readonly cart: boolean;
  /** Whether this product (and size) can be bought here. */
  sells(line: Omit<CartLine, "quantity">): boolean;
  /** Absolute checkout URL for `lines`, or null if any line can't be bought here. */
  checkoutUrl(lines: readonly CartLine[]): string | null;
}

/** `slug` → size (or "" for one size) → provider variant ID. */
export type VariantMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fourthwall's hosted checkout. The cart stays in this site; checkout uses Fourthwall's documented
 * direct-checkout link, `https://<shop>/cart/checkout?products=<variant>:<qty>,…`, which needs no
 * Storefront API token in the browser. Variant IDs come from `bun run sync` in merch/ (it reads the
 * token from the environment at build time and prints the map).
 */
export function fourthwall(options: { shopDomain: string; variants: VariantMap; currency?: string }): CheckoutProvider {
  const variant = (l: Omit<CartLine, "quantity">): string | undefined => options.variants[l.slug]?.[l.size];
  return {
    name: "Fourthwall",
    cart: true,
    sells: (l) => UUID.test(variant(l) ?? ""),
    checkoutUrl(lines) {
      if (lines.length === 0) return null;
      const parts: string[] = [];
      for (const l of lines) {
        const id = variant(l);
        if (!id || !UUID.test(id) || l.quantity < 1) return null;
        parts.push(`${id}:${Math.floor(l.quantity)}`);
      }
      return `https://${options.shopDomain}/cart/checkout?products=${parts.join(",")}&currency=${options.currency ?? "USD"}`;
    },
  };
}

/**
 * Shopify cart permalinks (`https://<shop>/cart/<variant>:<qty>,…`), kept as a fallback. Printful and
 * Printify sync their products into Shopify as ordinary variants.
 */
export function shopify(options: { domain: string; variants: VariantMap }): CheckoutProvider {
  const variant = (l: Omit<CartLine, "quantity">): string | undefined => options.variants[l.slug]?.[l.size];
  return {
    name: "Shopify",
    cart: true,
    sells: (l) => variant(l) !== undefined,
    checkoutUrl(lines) {
      if (lines.length === 0) return null;
      const parts: string[] = [];
      for (const l of lines) {
        const id = variant(l);
        if (!id || !/^\d+$/.test(id) || l.quantity < 1) return null;
        parts.push(`${id}:${Math.floor(l.quantity)}`);
      }
      return `https://${options.domain}/cart/${parts.join(",")}`;
    },
  };
}

/** One external product page per item (a pre-order form, a partner shop, …). */
export function linkOut(options: { name: string; urls: Readonly<Record<string, string>> }): CheckoutProvider {
  return {
    name: options.name,
    cart: false,
    sells: (l) => options.urls[l.slug] !== undefined,
    checkoutUrl(lines) {
      const [line] = lines;
      if (lines.length !== 1 || !line) return null;
      return options.urls[line.slug] ?? null;
    },
  };
}

export interface Sale {
  /** `launch` items are in the first drop; `later` items are listed but not for sale. */
  drop: "launch" | "later";
  /** Sold as a pre-order: the button reads "Pre-order". */
  preorder?: boolean;
  /** One line under the buy button once the store is open. */
  shipping?: string;
}

export interface MerchConfig {
  provider: CheckoutProvider | null;
  /** Where "Follow the blog" points while the store is closed. A link only: no form, no email. */
  notify: { label: string; href: string };
  sale: Readonly<Record<string, Sale>>;
}

export const MERCH: MerchConfig = {
  provider: null,
  notify: { label: "Follow the blog", href: "/blog" },
  sale: {
    // Screen printed as a Fourthwall pre-order drop: Fourthwall charges when the drop closes and ships 4 to 8 weeks after.
    "frame-tee": { drop: "launch", preorder: true, shipping: "Charged when the drop closes. Ships 4 to 8 weeks later." },
    // Made to order by Fourthwall: most on-demand items are produced in 2 to 5 business days.
    cap: { drop: "launch", shipping: "Made to order. Ships after 2 to 5 business days in production." },
    "sticker-sheet": { drop: "launch", shipping: "Made to order. Ships after 2 to 5 business days in production." },
    hoodie: { drop: "later" },
    keycaps: { drop: "later" },
    notebook: { drop: "later" },
  },
};

export function saleOf(slug: string): Sale {
  return MERCH.sale[slug] ?? { drop: "later" };
}
