# Launch checklist

The first drop is fourteen products that Anomaly's Fourthwall shop makes on demand: four tees, two hoodies, two caps and six stickers. Fourthwall makes, ships and takes payment for them; textjs.org/merch is the storefront and hands the cart to Fourthwall's hosted checkout. The Keycap Set and Notebook are listed too, but Fourthwall can't make them at a sensible minimum, so they come from separate makers and ship from Anomaly (section 7). Every product reads "Coming soon" until checkout is configured, and stays that way until Fourthwall sells it.

| No. | Product | Fourthwall product | Method | Base cost |
| --- | --- | --- | --- | --- |
| 001 | Logo Tee | AS Colour 5082 Premium Oversized Faded T-Shirt | Printed, front | From $24.17 |
| 002 | Block Tee | AS Colour 5082 | Printed, front | From $24.17 |
| 003 | console.log Tee | AS Colour 5082 | Printed, front and left sleeve | From $24.17, plus the sleeve |
| 004 | console.log Hoodie | AS Colour 5161 Unisex Premium Relaxed Hoodie, Printed | Printed, front | From $38.46 |
| 005 | ▼ Hoodie | AS Colour 5161, Embroidered | Embroidered, center chest | From $41.24 |
| 006 | console.log Cap | Yupoong Classic Dad Hat (6245CM), Embroidered | Embroidered, Front Large | From $15.65 |
| 007 | ▼ Cap | Yupoong Classic Dad Hat (6245CM), Embroidered | Embroidered, Front Large | From $15.65 |
| 008–012 | ▼, Wordmark, console.log, ⌘⌥J and %c Stickers | Allcolor 957 Die-Cut Stickers | Digital print, die-cut | From $3.78 |
| 013 | PSA Tee | AS Colour 5082 | Printed, front and back | From $24.17, plus the back |
| 014 | PSA Sticker | Allcolor 957 Die-Cut Stickers, 4 in | Digital print, die-cut | From $3.78 |

All fourteen are on demand with no minimum; most on-demand items are produced in 2 to 5 business days. Fourthwall has no monthly fee and no platform fee on physical products. Each product's base cost is deducted from the price we set, and card payments cost 2.9% + 30¢ (3.9% + 30¢ for international cards).

Specs, sizes and placements are in the tech packs: [tees.md](tech-packs/tees.md), [hoodies.md](tech-packs/hoodies.md), [caps.md](tech-packs/caps.md), [stickers.md](tech-packs/stickers.md), [psa.md](tech-packs/psa.md). Upload files are the 300 DPI PNGs in `artwork/png/` (`bun run export` rebuilds them from the SVGs).

## 1. Access

- [ ] Michelle adds Adam to Anomaly's Fourthwall shop.
- [ ] Note the shop domain (for example `anomaly-shop.fourthwall.com`); checkout links use it.
- [ ] Optional: connect a checkout domain such as `checkout.textjs.org` and style checkout to match the site (Fourthwall recommends the Clean Frame theme).

## 2. Tees

- [ ] Products → Create new product → Design a new product → AS Colour Premium Oversized Faded T-Shirt, Printed, Faded Black, sizes XS to 3XL. Make three products from it.
- [ ] Logo Tee: `png/logo-tee-front.png` in Front Large, 8 in wide, top 3 in below the neck seam.
- [ ] Block Tee: `png/block-tee-front.png` in Front Large, 4.5 in wide, top 3 in below the neck seam.
- [ ] console.log Tee: `png/console-tee-front.png` in Front Large, 10 in wide, its left edge 6 in toward the wearer's right of center, top 3 in below the neck seam; `png/console-tee-sleeve.png` in Left Sleeve, 1.25 in wide, pointing down the arm, 1 in above the hem band.
- [ ] Adam picks the sleeve ▼ (store default) or the upper-back ▼ from `options/console-tee-sleeve-vs-back.png`. For the back, use the same PNG in Back Large, 1 in below the back neck seam.
- [ ] Check what the sleeve adds to the base cost and adjust the price if needed.

## 3. Hoodies

- [ ] console.log Hoodie: AS Colour Unisex Premium Relaxed Hoodie, Printed, Black, S to 3XL. `png/console-hoodie-front.png` in Front, 9 in wide, top 3.5 in below the front neck seam.
- [ ] ▼ Hoodie: the same hoodie, Embroidered. `png/mark-hoodie-chest.png` in Center Chest, 3.5 in wide, top 3.5 in below the front neck seam, white thread.
- [ ] Check the ▼'s stitch count in the designer. The estimate is 11,000 to 13,000 against Fourthwall's 15,000 limit; if it is over, set it to 3.25 in and update the tech pack and product page.

## 4. Caps

- [ ] Yupoong Classic Dad Hat, Embroidered, Black. Make two products.
- [ ] console.log Cap: `png/console-cap-front.png` in Front Large, 3.4 in wide, centered on the front seam, white thread. The lowercase is 0.27 in, just over Fourthwall's 0.25 in minimum: don't scale it down.
- [ ] ▼ Cap: `png/mark-cap-front.png` in Front Large, 1.6 in wide, centered on the front seam, apex 0.6 in above the brim, white thread.
- [ ] Order a sample of each and check the lettering where it crosses the front seam.

## 5. Stickers

- [ ] Allcolor 957 Die-Cut Stickers. Make five products: ▼ (3 in), Wordmark (3 in), console.log (3 in), ⌘⌥J (3 in) and %c (2 in), from the matching `png/sticker-*.png`.
- [ ] The white edge is in the artwork and outside it must stay fully transparent. Check each cut line in the preview.

## 5b. PSA Tee and PSA Sticker

- [ ] PSA Tee: AS Colour Premium Oversized Faded T-Shirt, Printed, Faded Black, XS to 3XL. `png/psa-tee-front.png` in Front Large, 11 in wide, top 3 in below the front neck seam; `png/psa-tee-back.png` in Back Large, 3 in wide, top 2 in below the back neck seam.
- [ ] PSA Sticker: Allcolor 957 Die-Cut Stickers at 4 in, from `png/psa-sticker.png`.
- [ ] Order a sample of the tee and check the distress: every pixel is ink or shirt, and the finest pits should still show.

## 6. Prices

Placeholders in `apps/web/src/merch/products.ts`: tees $40, hoodies $75, caps $35, 3 in stickers $6, the 2 in sticker $5, the 4 in PSA Sticker $7.

- [ ] Confirm them against the base costs once the products exist. Prices must match Fourthwall; `bun run sync` warns about differences.

## 7. Keycap Set and Notebook (later, not on Fourthwall)

Fourthwall's only keycap is the Infinikey single custom keycap, which needs 2,000 orders, and its notebook (JournalBook) is UV printed with lined pages and can't deboss. Both come from separate makers and are sold on Fourthwall as self-fulfilled products (no platform fee; Anomaly ships them) or, with Fourthwall Pro and 3PL access, stocked in Fourthwall's warehouse ($1.35 per item fulfilled).

- [ ] Keycap Set: quote three-key sets from a small-batch maker ([keycaps.md](tech-packs/keycaps.md) lists the spec and vendors).
- [ ] Notebook: quote Leuchtturm1917's business service for a blind deboss (minimum 50, [notebook.md](tech-packs/notebook.md)).
- [ ] Decide who ships them, then add each as a self-fulfilled product on Fourthwall and add its variant to the `fourthwall()` config (section 8). It goes on sale on the site as soon as it has a variant there; add a `shipping` line for it in `apps/web/src/merch/config.ts`.

## 8. Connect the site

- [ ] In Fourthwall, Settings → For developers → Storefront API → Create token (it starts with `ptkn_`). Keep it out of the repo.
- [ ] Put the products in one collection (or use `all`), then from `merch/`:

  ```sh
  FOURTHWALL_STOREFRONT_TOKEN=ptkn_… FOURTHWALL_SHOP=anomaly-shop.fourthwall.com bun run sync
  ```

  If Fourthwall's product slugs differ from the store's, pass `FOURTHWALL_ALIASES='{"logo-tee":"<fourthwall slug>"}'`.
- [ ] Paste the printed block into `apps/web/src/merch/config.ts`, replacing `provider: null`:

  ```ts
  provider: fourthwall({
    shopDomain: "anomaly-shop.fourthwall.com",
    variants: {
      "logo-tee": { XS: "<uuid>", S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "block-tee": { XS: "<uuid>", S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "console-tee": { XS: "<uuid>", S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "console-hoodie": { S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "mark-hoodie": { S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "console-cap": { "": "<uuid>" },
      "mark-cap": { "": "<uuid>" },
      "sticker-mark": { "": "<uuid>" },
      "sticker-wordmark": { "": "<uuid>" },
      "sticker-console": { "": "<uuid>" },
      "sticker-keys": { "": "<uuid>" },
      "sticker-percent-c": { "": "<uuid>" },
      "psa-tee": { XS: "<uuid>", S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>", "3XL": "<uuid>" },
      "psa-sticker": { "": "<uuid>" },
    },
  }),
  ```

  Only variant IDs go in the site; checkout uses Fourthwall's `/cart/checkout?products=<variant>:<qty>` links and needs no token in the browser. A product with no variant in this map stays "Coming soon".
- [ ] If shipping times change, edit the `sale` lines in the same file.
- [ ] `cd apps/web && bun test`, then deploy.

## 9. Launch

- [ ] Samples approved: one of each tee, hoodie and cap, and the six stickers.
- [ ] Place one real order of a sticker through textjs.org to test the handoff end to end.
- [ ] Publish the drop on the blog.
