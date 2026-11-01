/**
 * Build-time helper for Fourthwall's Storefront API (not imported by the site). `merch/scripts/fourthwall-sync.ts`
 * fetches the shop's catalog with a storefront token from the environment and uses this to turn it into
 * the `variants` map for `fourthwall()` in config.ts, so the token never reaches the browser.
 */
import type { VariantMap } from "./config";
import { PRODUCTS } from "./products";

/** The fields of the Storefront API's ProductV1 this needs (GET /v1/collections/{handle}/products). */
export interface FourthwallProduct {
  slug: string;
  name: string;
  variants: ReadonlyArray<{
    id: string;
    unitPrice: { value: number; currency: string };
    attributes: { description: string; size?: { name: string } };
  }>;
}

export interface SyncResult {
  variants: VariantMap;
  /** Human-readable problems: unmatched products, missing sizes, price differences. */
  warnings: string[];
}

/**
 * Matches Fourthwall products to the store's by slug (or an explicit `aliases` map from our slug to the
 * Fourthwall slug) and sizes by name. One-size products use the "" size key.
 */
export function fourthwallVariants(catalog: readonly FourthwallProduct[], aliases: Readonly<Record<string, string>> = {}): SyncResult {
  const variants: Record<string, Record<string, string>> = {};
  const warnings: string[] = [];
  for (const p of PRODUCTS) {
    const fwSlug = aliases[p.slug] ?? p.slug;
    const fw = catalog.find((c) => c.slug === fwSlug);
    if (!fw) {
      warnings.push(`${p.slug}: no Fourthwall product with slug "${fwSlug}"`);
      continue;
    }
    const map: Record<string, string> = {};
    if (p.sizes.length === 0) {
      const v = fw.variants[0];
      if (v) map[""] = v.id;
      if (fw.variants.length > 1) warnings.push(`${p.slug}: one size here, ${fw.variants.length} variants on Fourthwall (used the first)`);
    } else {
      for (const size of p.sizes) {
        const v = fw.variants.find((x) => x.attributes.size?.name.toUpperCase() === size.toUpperCase());
        if (v) map[size] = v.id;
        else warnings.push(`${p.slug}: size ${size} not on Fourthwall`);
      }
    }
    for (const v of fw.variants) {
      if (v.unitPrice.currency === "USD" && v.unitPrice.value !== p.price) warnings.push(`${p.slug}: Fourthwall price ${v.unitPrice.value} for ${v.attributes.description}, store page says ${p.price}`);
    }
    variants[p.slug] = map;
  }
  return { variants, warnings };
}
