# Text.js merch

Design files for the six-piece collection sold at [textjs.org/merch](https://textjs.org/merch): print-ready artwork, studio mockups, a tech pack per item, and the research and fulfillment options behind them. The store itself lives in `apps/web/src/merch/`.

| No. | Item | Blank | Decoration | Price | Tech pack |
| --- | --- | --- | --- | --- | --- |
| 001 | Frame Tee, Black | Los Angeles Apparel 1801GD, 6.5 oz | Screen print, 1 color front, 3 colors back | $45 | [frame-tee.md](tech-packs/frame-tee.md) |
| 002 | Hoodie, Black | Los Angeles Apparel HF09GD, 14 oz | Tonal embroidery | $95 | [hoodie.md](tech-packs/hoodie.md) |
| 003 | Cap, Black | Yupoong 6245CM | Tonal embroidery, front and back | $35 | [cap.md](tech-packs/cap.md) |
| 004 | Sticker Sheet | 4 × 6 in kiss-cut vinyl | Digital print | $8 | [sticker-sheet.md](tech-packs/sticker-sheet.md) |
| 005 | Keycap Set, ⌘ ⌥ J | Cherry-profile PBT | Reverse dye-sublimation | $25 | [keycaps.md](tech-packs/keycaps.md) |
| 006 | Notebook | Leuchtturm1917 Medium (A5) hardcover | Blind deboss | $28 | [notebook.md](tech-packs/notebook.md) |

Prices are placeholders set from the costs below and Vercel's own prices ($40 tee, $30 to $35 cap). They live in `apps/web/src/merch/products.ts`.

## Files

```
merch/
  artwork/        print-ready SVG, physical size in mm, all type outlined, one group per ink or thread
    frame.txt     the captured frame (plain text)
    frame.json    the same frame with every styled run (color, weight) from the console.log call
  mockups/        1600 × 2000 WebP masters (the store serves 600 and 1200 px copies)
  tech-packs/     one spec sheet per item
  scripts/        frame capture, artwork, mockups, proofs and store screenshots
```

To regenerate everything (no Docker; Chromium comes from the Playwright cache):

```sh
cd merch
bun install
bun run frame      # capture the first textjs.org console frame from the real companion app
bun run artwork    # write artwork/*.svg
bun run mockups    # render mockups/ and apps/web/src/merch/images/
bun scripts/proof.ts    # contact sheet of the artwork (mockups/proof.png)
bun scripts/contact.ts  # contact sheet of the mockups (mockups/contact.png)
```

The mockups are drawn, not photographed: each garment is an SVG in inches with the artwork placed at its print size and position from the tech pack, so the marks in the images are the marks in the files. Replace them with photos of the first samples.

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
| Yupoong 6245CM | 100% cotton chino twill, unstructured six-panel, 3⅛ in crown, Permacurv visor, antique brass buckle | The standard unstructured dad cap; stocked by every embroiderer and by Printful |
| Leuchtturm1917 Medium (A5) | 145 × 210 mm, 251 numbered pages, 80 g/m², 5 mm dots, thread-bound | Leuchtturm's business service does blind debossing from 50 units |

## Fulfillment options

All prices are list prices found in November 2026; get quotes before ordering.

### 1. Shopify with Printful or Printify (print on demand)

- **Costs:** Shopify Basic is $29/month billed yearly or $39 monthly, and Shopify Payments charges 2.9% + 30¢ per online card payment. Printful bases include one print or embroidery placement: Comfort Colors 1717 tee about $15.30 to $15.60 (a second placement is about $5.95 on comparable tees), Cotton Heritage M2580 hoodie embroidered about $29.30, Yupoong 6245CM dad hat $14.02 plus $4.19 US shipping. Embroidery digitization is $6.50 per design, waived for 25+ embroidered items in one order.
- **For:** no inventory or upfront cost, worldwide shipping, and the Shopify app syncs products as ordinary variants, which `shopify()` in `config.ts` can sell directly.
- **Against:** DTG and DTF prints replace screen printing, so the three-ink discharge back print becomes a digital print, usually on a lighter tee than the 1801GD. Printful reviewers note that DTF prints feel stiff. Keycaps and Leuchtturm notebooks aren't print-on-demand products. Margins on a $45 tee are about $20 after the second print and card fees.

### 2. A small-batch screen printer, Shopify, and shipping yourself or through a 3PL

- **Costs:** Threadbird prints the 1801GD with one front location at $19.35 a piece for 50 to 99 and $17.30 for 100 to 199 (2XL +$2.50, discharge from $0.55 per color per piece); the 3-color back is a second location, quoted per job. HF09 blanks are about $45 wholesale before embroidery. HatDraft embroiders 6245CM caps at $18 each for 24 and $16 for 96, with free digitizing from 24. Sticker Mule die-cut stickers are $73 for 100 at 2 × 2 in; sheets are quoted. Leuchtturm1917 custom notebooks start at 50 units, quoted. Cherry-profile dye-sub keycaps are available with no minimum from Goblintechkeys or Diykeycap, or at 500 sets minimum from a factory such as OSHID.
- **For:** the real blanks, true screen printing and tonal embroidery, which is the quality Adam asked for and what Vercel sells.
- **Against:** a first run of roughly 100 tees, 50 hoodies, 48 caps, stickers and 50 notebooks is several thousand dollars up front, plus storage and packing. Unsold sizes are sunk cost.
- **A middle path:** run each item as a two-week pre-order drop, then print exactly what sold. Shopify supports pre-orders through apps; the store config needs no change.

### 3. Shopify's Next.js storefront (Next.js Commerce, now Vercel Shop)

- **Costs:** the same Shopify plan; the template is free.
- `vercel/commerce` is archived, and development moved to `vercel/shop`, a Next.js 16 storefront on Shopify's Hydrogen SDK. Vercel's guide notes that Next.js Commerce doesn't work on Shopify's Starter plan, which Shopify has since stopped selling.
- **For:** a full cart, search, customer accounts and Shopify webhooks for revalidation.
- **Against:** textjs.org is a Vite site prerendered to Cloudflare Pages, so this would be a second Next.js app on its own domain (for example shop.textjs.org) with its own design to maintain. The `/merch` pages already cover the storefront; cart permalinks (`https://<shop>/cart/<variant>:<qty>`) hand off to Shopify checkout without a token or a server.

### 4. How Vercel does it

Vercel runs a headless Shopify store with a custom Next.js and Hydrogen front end, designs its own pieces with named materials and origins (the Origin Tee is "Made in Portugal"), and sells limited drops and collaborations alongside a few evergreen items such as tees, a cap and prints.

### Recommendation

Start with option 2 for the Frame Tee, Cap and Sticker Sheet as a pre-order drop on Shopify Basic, using `shopify()` cart permalinks from `/merch`. Add the hoodie once the tee sells through, and the keycaps and notebook as second-drop items once their minimums make sense. Use option 1 only if nobody wants to handle packing and shipping.

## What Adam needs to decide or sign up for

1. **Fulfillment model:** print on demand, small batch with stock, or pre-order drops.
2. **Shopify:** create a store on Basic ($29/month yearly). Then add products with these sizes as variants, and put the store domain and variant IDs into `apps/web/src/merch/config.ts`:

   ```ts
   provider: shopify({ domain: "textjs.myshopify.com", variants: { "frame-tee": { S: "…", M: "…" }, cap: { "": "…" } } }),
   ```

   With `provider: null` (the default) every product shows "Coming soon" and links to the blog.
3. **Vendors:** pick a screen printer (Threadbird or a local shop) and an embroiderer, and approve a strike-off of the back print before the run. Garment-dyed blacks discharge to different tones.
4. **Labels:** US textile labels need fiber content, country of origin and the seller's name or RN number. Decide whose name goes on `artwork/neck-label.svg`.
5. **Prices and run sizes:** the placeholders are above.
6. **Store policies:** shipping regions, returns and sales tax settings in Shopify.
