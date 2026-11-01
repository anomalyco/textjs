# Text.js merch

Design files for the collection sold at [textjs.org/store](https://textjs.org/store): print-ready artwork, product photography, a tech pack per product family, and the research behind them. The store itself lives in `apps/web/src/merch/`. Fulfillment runs through Anomaly's Fourthwall shop; [LAUNCH.md](LAUNCH.md) is the checklist. The designs come from the November 2026 design round in [options/](options/README.md); `options/final-collection.png` shows the result.

| No. | Product | Maker | Fourthwall product | Decoration | Price | Tech pack |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | Logo Tee | Fourthwall | AS Colour 5082, Printed | ▼ Text.js, 8 in, white | $40 | [tees.md](tech-packs/tees.md) |
| 002 | Block Tee | Fourthwall | AS Colour 5082, Printed | Block-letter ▼, 4.5 in, white | $40 | [tees.md](tech-packs/tees.md) |
| 003 | console.log Tee | Fourthwall | AS Colour 5082, Printed | console / .log, 10 in, and a ▼ on the left sleeve | $40 | [tees.md](tech-packs/tees.md) |
| 004 | console.log Hoodie | Fourthwall | AS Colour 5161, Printed | console.log, 9 in, white | $75 | [hoodies.md](tech-packs/hoodies.md) |
| 005 | ▼ Hoodie | Fourthwall | AS Colour 5161, Embroidered | ▼, 3.5 in, white thread | $75 | [hoodies.md](tech-packs/hoodies.md) |
| 006 | console.log Cap | Fourthwall | Yupoong 6245CM, Embroidered | console.log, 3.4 in, white thread | $35 | [caps.md](tech-packs/caps.md) |
| 007 | ▼ Cap | Fourthwall | Yupoong 6245CM, Embroidered | ▼, 1.6 in, white thread | $35 | [caps.md](tech-packs/caps.md) |
| 008–012 | ▼, Wordmark, console.log, ⌘⌥J and %c Stickers | Fourthwall | Allcolor 957 Die-Cut Stickers | Digital print, die-cut, 2 or 3 in | $5–$6 | [stickers.md](tech-packs/stickers.md) |
| 013 | PSA Tee | Fourthwall | AS Colour 5082, Printed | YOU WOULDN'T RENDER A WEBSITE IN THE CONSOLE, 11 in, and ▼ Text.js on the back | $40 | [psa.md](tech-packs/psa.md) |
| 014 | PSA Sticker | Fourthwall | Allcolor 957 Die-Cut Stickers | The same layout on a 4 in 16:9 card | $7 | [psa.md](tech-packs/psa.md) |
| 015 | Keycap Set, ⌘ ⌥ J | Separate maker | Not in the catalog at this quantity; self-fulfilled | Reverse dye-sublimation | $25 | [keycaps.md](tech-packs/keycaps.md) |
| 016 | Notebook | Separate maker | Leuchtturm1917, self-fulfilled | Blind deboss | $28 | [notebook.md](tech-packs/notebook.md) |

Prices are placeholders, set against Fourthwall's base costs and Vercel's own prices ($40 tee, $30 to $35 cap). They live in `apps/web/src/merch/products.ts`; what is on sale and how it ships lives in `apps/web/src/merch/config.ts`.

## Files

```
merch/
  LAUNCH.md       launch checklist for Fourthwall
  artwork/        print-ready SVG, physical size in mm, all type outlined
    png/          300 DPI transparent PNGs for Fourthwall's product designer
  options/        the design round: option boards, the final collection sheet, the console.log tee previews,
                  and the PSA tee and sticker concepts (meme.md; A and S1 are now in the store)
  fonts/          Barlow Condensed (SIL Open Font License) for the PSA Tee and Sticker
  photos/
    blanks/       the generated blanks and edits the Keycap Set and Notebook photos use (WebP)
    final/        1024 × 1280 product photos (the store serves 600 and 1024 px copies)
  tech-packs/     spec sheets
  scripts/        artwork, PNG export, photography pipeline, Fourthwall sync
```

## Regenerating

```sh
cd merch
bun install
bun run artwork    # write artwork/*.svg
bun run export     # write artwork/png/*.png
bun run render     # product photos: photos/final/ and the site images
bun run boards     # options/final-collection.png and options/console-tee-sleeve-vs-back.png
```

The image cache (`photos/cache/`) is local and ignored. On a fresh checkout `bun run render` calls the image API for the blanks, close-ups and embroidery edits it doesn't have (set the credentials with `set -a; . ~/.config/textjs/openai.env; set +a`).

### How the photos are made

Image models garble letters and logos, so no mark in the photos comes from the model:

1. `scripts/photos.ts` and `scripts/options-blanks.ts` ask `gpt-image-2.5-sunburst` for blank products (fixed prompts, one shared studio style) and cache each result by a hash of its request.
2. `scripts/collection.ts` warps the real SVG artwork onto each blank at the size and position from the tech pack, then shades it with the photo's own light and fabric texture (`scripts/composite.ts`).
3. Close-ups are enlargements of the same blanks (`scripts/enlarge.ts`): a crop is scaled up and re-rendered by the model with the composition kept, so placements measured on the blank carry over.
4. Embroidered ▼ marks start as a flat stand-in of the exact ▼. The model turns it into stitches in an edit that keeps the rest of the photo, and an affine fit moves the result back onto the exact geometry.
5. Embroidered lettering on the cap starts as the exact vector type mapped through a mesh that follows the crown (`scripts/capmesh.ts`). The model stitches it in an edit (satin direction, sheen, relief, puckering), and `scripts/cap-edit.ts` corrects the result back onto the exact letterforms: each letter's stitches are registered to the type, thread is grown into any stroke the model drew thinner, and anything it drew wider is replaced by the original twill with a soft contact shadow.

Placements were measured on the blanks with `scripts/grid.ts`.

## What Vercel's merch does

Research from vercel.store, its `llms.txt`, past drops and the Next.js Commerce repository (November 2026).

- **The store is a black page of product images.** The vercel.store grid shows only product cutouts on black, with a small mono "SOLD OUT" label; names and prices appear on the product page or the `/collections/all` list, which numbers products `MN-001` to `MN-014`.
- **Product pages follow one template.** A large gallery, then name, color and price in uppercase mono, a size row with sold-out sizes struck through, Add to Cart, and two short sections: Description (two sentences) and Details (three or four material bullets). Sold-out items swap the button for an email "Notify Me".
- **Small marks, and graphics with a story.** The Origin Tee pairs a two-line chest mark with a large back graphic, and its copy explains the idea in one sentence ("A graphic study of the origin of Vercel's name"). The chore coat has "a tonal embroidered triangle at the chest" and "a hidden terminal graphic under the collar".
- **Materials are stated as numbers.** "100% organic cotton, 240 gsm. Made in Portugal. Unisex regular fit." "100% cotton canvas, 10 oz." Posters: "24 × 36 in. Premium heavyweight paper. Matte, archival-quality print."
- **Prices sit near cost.** Origin Tee $40, Origin Cap $30, prints $15; the outerwear line (racing jacket, chore coats, jumpsuits) runs $145 to $325.
- **Drops are limited and dated.** Ship 24 had a KidSuper Studios collaboration ($45 hat, $160 racing jacket), and most vercel.store items are marked unavailable rather than restocked. The Next.js Commerce demo store described a June 2021 Next.js Conf tee as a numbered run of 200, printed after the drop closed.
- **The platform is headless Shopify.** vercel.store describes itself as "an agent-friendly Shopify storefront built with Next.js and Hydrogen", with cart and checkout through Shopify. The archived Next.js Commerce template (now `vercel/shop`) also lists Fourthwall, BigCommerce and others as providers.
- **Restraint.** One or two colors, tonal thread on matching fabric, heavyweight blanks, generous whitespace and no slogans. The only joke on the chore coat is the terminal graphic hidden under its collar.

### Blanks used here and why

| Blank | Spec | Why |
| --- | --- | --- |
| Los Angeles Apparel 1801GD | 6.5 oz/yd² (220 g/m²), 100% US cotton, garment dyed, XS to 2XL, made in Los Angeles | Heavyweight, garment dyed, stocked by screen printers, and 100% cotton, which discharge ink needs |
| Los Angeles Apparel HF09GD | 14 oz heavy fleece, garment dyed, loose fit, XS to 3XL, made in Los Angeles | Matches the tee's dye and hand; heavier than the 400 g/m² French terry brief |
| Yupoong 6245CM | 100% cotton chino twill, unstructured six-panel, 3⅛ in crown, Permacurv visor, antique brass buckle | The standard unstructured dad cap, and the one in Fourthwall's catalog |
| Leuchtturm1917 Medium (A5) | 145 × 210 mm, 251 numbered pages, 80 g/m², 5 mm dots, thread-bound | Leuchtturm's business service does blind debossing from 50 units |

## Fulfillment: Fourthwall

Anomaly already has a Fourthwall shop, so it replaces the Shopify and screen-printer plans. From Fourthwall's docs (November 2026):

- **Fees.** No monthly fee and no platform fee on physical products. Each catalog product has a published base cost that is deducted from the price we set. Card payments cost 2.9% + 30¢ in the US and 3.9% + 30¢ for international cards.
- **Methods.** On demand (no minimum): DTG, DTFx (a film transfer), sublimation and embroidery. Products labelled "Printed" let Fourthwall's partner choose DTG or DTFx per design. Embroidery allows six thread colors and 15,000 stitches in a standard area (typically 4 × 4 in; dad hats about 4 × 2 in on the front), lowercase letters at least 0.25 in tall, uppercase 0.3 in and strokes 0.05 in. Some products combine printed and embroidered regions. Screen printing is a minimum-order method: the Help Center says 75 units, the pricing sheet 48 to 50.
- **Drops.** Minimum-order products go through bespoke sourcing: a quote, a paid sample with up to two revision rounds, then a pre-order drop. Customers aren't charged until the drop closes and the minimum is met, and orders ship 4 to 8 weeks after the drop ends. If the minimum isn't met, the shop either cancels the orders or pays for the rest. On-demand products don't support pre-orders; most are produced in 2 to 5 business days.
- **Blanks.** The tees are AS Colour 5082 (7.1 oz, garment dyed, XS to 3XL; Front Large, Back Large, both sleeves and Inside Label). The hoodies are AS Colour 5161 (9.4 oz, S to 3XL), listed once printed and once embroidered. The Yupoong 6245CM dad hat has front, back and side embroidery.
- **Labels.** Some on-demand blanks have a printed Inside Label area. Custom woven or printed neck labels, hang tags and private labels come with bespoke products.
- **Stickers.** Die-cut stickers (Allcolor 957) come in 2 to 6 in on white matte-laminated vinyl, from $3.78; the cut follows the artwork and there is no transparent stock. There are also kiss-cut singles and sheets.
- **What Fourthwall can't make here.** Its only keycap needs 2,000 orders. Its notebook is a UV-printed 5.5 × 8.5 in JournalBook with lined pages and no deboss. Both later items would be bought elsewhere and sold on Fourthwall as self-fulfilled products (no platform fee) or through its 3PL, which is invite-only and needs Fourthwall Pro ($1.35 per item fulfilled).
- **Storefront API.** A storefront token (`ptkn_…`, Settings → For developers) reads published products and collections and manages carts; checkout always happens on Fourthwall's hosted page. Fourthwall's own Next.js template exposes the token to the browser, but the help center says to store it securely, so this site doesn't ship it: `bun run sync` reads it from the environment at build time and prints variant IDs, and checkout uses Fourthwall's documented direct link, `https://<shop>/cart/checkout?products=<variant>:<qty>,…`.

`fourthwall()` in `config.ts` is the provider. `shopify()` and `linkOut()` stay in the same file as fallbacks; no Shopify account or product CSV is needed.
