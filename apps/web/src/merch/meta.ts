export interface ProductMeta {
  slug: string;
  name: string;
  summary: string;
}

export const PRODUCTS_META: readonly ProductMeta[] = [
  { slug: "logo-tee", name: "Logo Tee", summary: "A heavyweight tee with the ▼ Text.js wordmark printed in white across the chest, 8 inches wide." },
  { slug: "block-tee", name: "Block Tee", summary: "The ▼ as the console’s block-letter font draws it, in rows of 7, 5, 3 and 1 cells, printed in white at the chest." },
  { slug: "console-tee", name: "console.log Tee", summary: "console.log in Geist, set in two lines on the chest, with a small ▼ on the left sleeve." },
  { slug: "console-hoodie", name: "console.log Hoodie", summary: "A relaxed fleece hoodie with console.log printed in white Geist Mono across the chest." },
  { slug: "mark-hoodie", name: "▼ Hoodie", summary: "A relaxed fleece hoodie with a 3.5 inch ▼ embroidered in white thread at the chest." },
  { slug: "console-cap", name: "console.log Cap", summary: "An unstructured six-panel cap with console.log embroidered across the front in white Geist Mono." },
  { slug: "mark-cap", name: "▼ Cap", summary: "A cap with the ▼ embroidered on the front in white thread, 1.6 inches wide." },
  { slug: "sticker-mark", name: "▼ Sticker", summary: "The ▼ in black with a white edge, cut to shape. 3 inches wide." },
  { slug: "sticker-wordmark", name: "Wordmark Sticker", summary: "▼ Text.js in black on a white rounded rectangle. 3 inches wide." },
  { slug: "sticker-console", name: "console.log Sticker", summary: "console.log in white Geist Mono on a black pill with a white edge. 3 inches wide." },
  { slug: "sticker-keys", name: "⌘⌥J Sticker", summary: "⌘⌥J opens the Console in Chrome DevTools on macOS. Three keys on one sticker, 3 inches wide." },
  { slug: "sticker-percent-c", name: "%c Sticker", summary: "%c applies CSS to a console.log message. Black on white, 2 inches square." },
  { slug: "psa-tee", name: "PSA Tee", summary: "YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE in distressed white type across the chest, and ▼ Text.js below the collar on the back." },
  { slug: "psa-sticker", name: "PSA Sticker", summary: "The PSA Tee’s print on a black 16:9 card with a white edge. 4 inches wide." },
  { slug: "keycaps", name: "Keycap Set", summary: "⌘⌥J opens the Console in Chrome DevTools on macOS. Three black keycaps with gray legends: ⌘ and ⌥ at 1.25u, and J at 1u with its homing bar." },
  { slug: "notebook", name: "Notebook", summary: "An A5 hardcover notebook with the ▼ blind-debossed on the cover. Dot grid inside." },
];

export function getProductMeta(slug: string): ProductMeta | undefined {
  return PRODUCTS_META.find((p) => p.slug === slug);
}

export function productPath(slug: string): string {
  return `/store/${slug}`;
}
