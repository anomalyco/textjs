/**
 * Where the store sends buyers. Checkout isn't chosen yet, so `provider` is null and every product
 * shows "Coming soon". To open the store, set `provider` to one of the factories below; nothing
 * else in the site needs to change. The store collects no data itself: carts live in the
 * visitor's localStorage and checkout happens on the provider's domain.
 */

export interface CartLine {
  slug: string;
  /** Size label, or "" for one-size products. */
  size: string;
  quantity: number;
}

export interface CheckoutProvider {
  /** Shown under the buy button ("Checkout by Shopify"). */
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

/**
 * Shopify cart permalinks (`https://<shop>/cart/<variant>:<qty>,…`): no Storefront API token and
 * no SDK. Printful and Printify both sync their products into Shopify as ordinary variants, so this
 * also covers print-on-demand fulfillment.
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

/** One external product page per item (a print-on-demand storefront, a pre-order form, …). */
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

export interface MerchConfig {
  provider: CheckoutProvider | null;
  /** Where "Get notified" points while the store is closed. A link only: no form, no email. */
  notify: { label: string; href: string };
}

export const MERCH: MerchConfig = {
  provider: null,
  notify: { label: "Follow the blog", href: "/blog" },
};
