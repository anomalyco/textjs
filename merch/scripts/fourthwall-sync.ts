/**
 * Reads the Fourthwall catalog and prints the `fourthwall()` config for apps/web/src/merch/config.ts.
 * The storefront token stays in your environment; the printed config holds only variant IDs.
 *
 *   FOURTHWALL_STOREFRONT_TOKEN=ptkn_… FOURTHWALL_SHOP=textjs-shop.fourthwall.com bun run sync
 *
 * Optional: FOURTHWALL_COLLECTION (default "all"), FOURTHWALL_ALIASES='{"frame-tee":"frame-tee-black"}'.
 */
import { fourthwallVariants, type FourthwallProduct } from "../../apps/web/src/merch/fourthwall";

const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
const shop = process.env.FOURTHWALL_SHOP;
const collection = process.env.FOURTHWALL_COLLECTION ?? "all";
const aliases = JSON.parse(process.env.FOURTHWALL_ALIASES ?? "{}") as Record<string, string>;
if (!token || !shop) {
  console.error("Set FOURTHWALL_STOREFRONT_TOKEN (Settings > For developers) and FOURTHWALL_SHOP (the shop's domain).");
  process.exit(1);
}

const products: FourthwallProduct[] = [];
for (let page = 0; ; page++) {
  const url = new URL(`https://storefront-api.fourthwall.com/v1/collections/${encodeURIComponent(collection)}/products`);
  url.searchParams.set("storefront_token", token);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", "50");
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Storefront API: HTTP ${res.status}`);
    process.exit(1);
  }
  const body = (await res.json()) as { results: FourthwallProduct[]; paging?: { hasNextPage?: boolean } };
  products.push(...body.results);
  if (!body.paging?.hasNextPage) break;
}

const { variants, warnings } = fourthwallVariants(products, aliases);
for (const w of warnings) console.error(`warning: ${w}`);
console.log(`  provider: fourthwall({\n    shopDomain: ${JSON.stringify(shop)},\n    variants: ${JSON.stringify(variants, null, 2).replace(/\n/g, "\n    ")},\n  }),`);
