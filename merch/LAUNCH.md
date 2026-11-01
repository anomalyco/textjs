# Launch checklist: first drop on Fourthwall

The first drop is the Frame Tee, Cap and Sticker Sheet. Anomaly's Fourthwall shop makes, ships and takes payment for them; textjs.org/merch is the storefront and hands the cart to Fourthwall's hosted checkout. The Hoodie, Keycap Set and Notebook show "Later".

| Item | Fourthwall product | Method | How it sells | Ships |
| --- | --- | --- | --- | --- |
| 001 Frame Tee | Bespoke request (ask for Los Angeles Apparel 1801GD) | Screen print, 3 colors back, 1 front | Pre-order drop with a minimum order | 4 to 8 weeks after the drop closes |
| 002 Cap | Yupoong Classic Dad Hat (6245CM) | Embroidery, front and back | On demand, no minimum | After 2 to 5 business days in production |
| 003 Sticker Sheet | Kiss Cut Sticker Sheet with Custom Background (5.83 × 8.27 in) | Digital print, kiss-cut | On demand, no minimum | After 2 to 5 business days in production |

Fourthwall has no monthly fee and no platform fee on physical products. Each product's base cost is deducted from the price we set, and card payments cost 2.9% + 30¢ (3.9% + 30¢ for international cards).

## 1. Access

- [ ] Michelle adds Adam to Anomaly's Fourthwall shop.
- [ ] Note the shop domain (for example `anomaly-shop.fourthwall.com`); checkout links use it.
- [ ] Optional: connect a checkout domain such as `checkout.textjs.org` and style checkout to match the site (Fourthwall recommends the Clean Frame theme). Add Fourthwall's redirect script so links in order emails come back to textjs.org.

## 2. Cap (on demand)

- [ ] Products → Create new product → Design a new product → Yupoong Classic Dad Hat, Embroidered, Black.
- [ ] Front Large: `artwork/png/cap-front.png` (1.6 in wide, centered on the front seam).
- [ ] Back: `artwork/png/cap-back.png` (textjs.org, 2.87 in wide). If the Back area is narrower, scale it down only as far as Fourthwall's 0.25 in lowercase minimum allows.
- [ ] Thread: black on both. Check the stitch preview stays under 15,000 stitches.
- [ ] Order a sample. Approve the tonal contrast in daylight before listing.

## 3. Sticker Sheet (on demand)

- [ ] Design a new product → Kiss Cut Sticker Sheet with Custom Background.
- [ ] Upload `artwork/png/sticker-sheet-stickers.png` (1749 × 2481 px, 300 DPI). Everything outside the stickers must stay fully transparent; reviewers report that partly transparent pixels change the cut.
- [ ] Background color `#0a0a0a`. Fourthwall adds the 0.12 in white border itself; `artwork/sticker-sheet.svg` shows where it lands.
- [ ] Order a sample and check the cuts around the ▼ and ⌘ ⌥ J.

## 4. Frame Tee (bespoke pre-order drop)

- [ ] Design a new product → All Products, filter by Request or Min. orders required, and submit a bespoke request with `tech-packs/frame-tee.md`, `artwork/frame-tee-back.svg`, `artwork/frame-tee-front.svg` and `artwork/neck-label.svg`.
- [ ] Ask the sourcing team for:
  - Los Angeles Apparel 1801GD in Black
  - water-based discharge inks, matched to White, PANTONE Cool Gray 6 C and Cool Gray 9 C
  - a printed neck label in place of the manufacturer's tag
  - the minimum order and the per-unit price at 75, 150 and 300 units
- [ ] Approve the quote, then the skeleton listing.
- [ ] Order the sample (paid). Fourthwall allows two rounds of revisions; check the 4.9 mm text in Cool Gray 9 C and the discharge tone on the garment-dyed black.
- [ ] Pick the drop window with the sourcing team. Customers aren't charged until the drop closes and the minimum is met; Fourthwall ships 4 to 8 weeks after the drop ends.
- [ ] Decide now what happens if the drop misses the minimum: cancel and refund everyone, or pay for the remaining units.

If bespoke doesn't work out, the on-demand fallback is the AS Colour 5082 Premium Oversized Faded Tee (7.1 oz, garment dyed) printed DTG, with the label in its Inside Label area. The print is digital and the three grays aren't spot-matched; update the product page details before launching it that way.

## 5. Neck label

- [ ] Decide whose name or RN number goes on the label. US textile labels need fiber content, country of origin and the seller's name or RN; the current artwork has the first two but not the third.
- [ ] Update `artwork/neck-label.svg` per size, then `bun run export` in `merch/`.

## 6. Prices

- [ ] Confirm $45, $35 and $8 against the quote and base costs (cap from $15.65, sticker sheet $5.05). Prices live in `apps/web/src/merch/products.ts` and must match Fourthwall; `bun run sync` warns about differences.

## 7. Connect the site

- [ ] In Fourthwall, Settings → For developers → Storefront API → Create token (it starts with `ptkn_`). Keep it out of the repo.
- [ ] Put the products in one collection (or use `all`), then from `merch/`:

  ```sh
  FOURTHWALL_STOREFRONT_TOKEN=ptkn_… FOURTHWALL_SHOP=anomaly-shop.fourthwall.com bun run sync
  ```

  If Fourthwall's product slugs differ from the store's, pass `FOURTHWALL_ALIASES='{"frame-tee":"<fourthwall slug>"}'`.
- [ ] Paste the printed block into `apps/web/src/merch/config.ts`, replacing `provider: null`:

  ```ts
  provider: fourthwall({
    shopDomain: "anomaly-shop.fourthwall.com",
    variants: {
      "frame-tee": { XS: "<uuid>", S: "<uuid>", M: "<uuid>", L: "<uuid>", XL: "<uuid>", "2XL": "<uuid>" },
      cap: { "": "<uuid>" },
      "sticker-sheet": { "": "<uuid>" },
    },
  }),
  ```

  Only variant IDs go in the site; checkout uses Fourthwall's `/cart/checkout?products=<variant>:<qty>` links and needs no token in the browser.
- [ ] If the drop dates or shipping times change, edit the `sale` lines in the same file.
- [ ] `cd apps/web && bun test`, then deploy.

## 8. Launch

- [ ] Samples approved for all three items.
- [ ] Place one real order of the cap through textjs.org to test the handoff end to end.
- [ ] Publish the drop on the blog; the store's "Follow the blog" links point there.
