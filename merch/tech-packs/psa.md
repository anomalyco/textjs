# 013–014 PSA Tee and PSA Sticker

YOU WOULDN'T RENDER A WEBSITE IN THE CONSOLE, in the layout of the 2004 "Piracy. It's a crime." ad. From the design round in `options/meme.md` (tee option A, sticker option S1).

## What is borrowed, and what isn't

- **Borrowed:** the wording pattern and the on-screen layout. Adam's legal team signed off on mirroring the layout.
- **Not borrowed:** no footage, frames, artwork, logos, or MPA or FACT marks, and not the ad's font (FF Confidential, or the XBAND Rough clone, whose licence allows personal use only).
- **Type:** Barlow Condensed Bold (SIL Open Font License 1.1, `fonts/OFL.txt`), widened 12%, which the OFL allows. The distress is our own (`scripts/meme.ts`): a noise-displaced edge, ink pits and a few scanline bands shifted sideways.

## Layout

Measured on the "YOU WOULDN'T STEAL A CAR" frame and applied to three lines (`scripts/psa.ts`):

| | Reference frame | Ours |
| --- | --- | --- |
| Line 1 | YOU (cap 178) high, WOULDN'T (cap 160) dropped 38 | Same |
| Line 2 | STEAL (145), a small raised A (120, up 25), a large dropped CAR (200, down 100) | RENDER, A, WEBSITE, set the same way |
| Line 3 | (the ad has two lines per frame) | IN (145), THE (120, up 25), CONSOLE (200, down 100) |
| Tracking | About 0.13 of the cap height | Same |
| Word gaps | About 0.45 of the larger cap height | Same |
| Letters | Bob a few px off their baseline | A fixed set of per-letter offsets |
| Lines | Centred | Centred |

## 013 PSA Tee

| | |
| --- | --- |
| Fourthwall product | AS Colour 5082 Premium Oversized Faded T-Shirt, Printed, Faded Black, XS to 3XL, from $24.17 base |
| Front artwork | `artwork/psa-tee-front.svg`, `png/psa-tee-front.png` (3347 × 1415 px at 300 DPI) |
| Front size | 11 × 4.6 in (the PNG adds 2 mm of padding on each side) |
| Front placement | Front Large, centered, top edge 3 in below the front neck seam |
| Back artwork | `artwork/psa-tee-back.svg`, `png/psa-tee-back.png`: ▼ Text.js |
| Back size | 3 in wide |
| Back placement | Back Large, centered, top edge 2 in below the back neck seam |
| Ink | White |
| Method | DTG or DTFx |
| Photos | `photos/final/psa-tee-1.webp` (front), `-2` (back), `-3` (print close-up) |

The distress is 1-bit: every pixel is ink or shirt. It prints as is by DTG, and by screen printing as one white screen with no halftone. The finest pits are about 0.5 mm. Check them on the sample; DTG holds them, and a screen print may fill the smallest ones in.

## 014 PSA Sticker

| | |
| --- | --- |
| Fourthwall product | Allcolor 957 Die-Cut Stickers, 4 in |
| Artwork | `artwork/psa-sticker.svg`, `png/psa-sticker.png` (1200 × 675 px at 300 DPI) |
| Size | 4 × 2.25 in, 16:9 |
| Design | The PSA layout in white on a black card, with a 0.12 in white edge and 0.23 in corners |
| Distress | A finer, sparser version of the tee's, so the small A and THE survive at this size |
| Photos | `photos/final/psa-sticker-1.webp` (on a laptop), `-2` (studio render) |

## Care

- **Tee:** machine wash cold, inside out. Tumble dry low or hang dry. Do not iron the print.
- **Sticker:** apply to a clean, dry surface.
