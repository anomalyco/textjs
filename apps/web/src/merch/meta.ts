export interface ProductMeta {
  slug: string;
  name: string;
}

export const PRODUCTS_META: readonly ProductMeta[] = [
  { slug: "logo-tee", name: "Logo Tee" },
  { slug: "block-tee", name: "Block Tee" },
  { slug: "console-tee", name: "console.log Tee" },
  { slug: "console-hoodie", name: "console.log Hoodie" },
  { slug: "mark-hoodie", name: "▼ Hoodie" },
  { slug: "console-cap", name: "console.log Cap" },
  { slug: "mark-cap", name: "▼ Cap" },
  { slug: "sticker-mark", name: "▼ Sticker" },
  { slug: "sticker-wordmark", name: "Wordmark Sticker" },
  { slug: "sticker-console", name: "console.log Sticker" },
  { slug: "sticker-keys", name: "⌘⌥J Sticker" },
  { slug: "sticker-percent-c", name: "%c Sticker" },
  { slug: "psa-tee", name: "PSA Tee" },
  { slug: "psa-sticker", name: "PSA Sticker" },
  { slug: "keycaps", name: "Keycap Set" },
  { slug: "notebook", name: "Notebook" },
];

export function getProductMeta(slug: string): ProductMeta | undefined {
  return PRODUCTS_META.find((p) => p.slug === slug);
}

export function productPath(slug: string): string {
  return `/store/${slug}`;
}
