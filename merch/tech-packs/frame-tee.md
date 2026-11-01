# 001 Frame Tee, Black

The back print is the first frame textjs.org renders into the DevTools console: the home companion app at 104 × 32 cells, captured from the real `console.log` call by `scripts/frame.tsx`. The front print is that frame's first line.

## Production

Fourthwall bespoke request, sold as a pre-order drop (see `LAUNCH.md`). Screen printing on Fourthwall needs a minimum order: the Help Center says 75 units, the pricing sheet 48 to 50; confirm with the quote. The sourcing team quotes the blank, inks and labels, so everything below is the spec to send them.

Fallback without a minimum: AS Colour 5082 Premium Oversized Faded Tee (7.1 oz, 100% cotton, garment dyed) printed on demand by DTG, front, back and Inside Label areas, from $24.17 base. What changes: the print is digital, the three grays are reproduced from the file instead of mixed to Pantone, dark-garment DTG whites are less opaque than discharge, and the shirt isn't US-made, so the label and the product page details change with it. Shaka Wear's Max Heavyweight Garment-Dyed Tee (7.5 oz, US cotton) is the heavier option but prints DTFx only, a film transfer that would sit stiff across a 12 in back print.

## Blank

| | |
| --- | --- |
| Style | Los Angeles Apparel 1801GD, 6.5 oz Garment Dye Crew Neck T-Shirt |
| Fabric | 6.5 oz/yd² (220 g/m²), 18/1 open-end, 100% US cotton, garment dyed |
| Color | Black |
| Fit | Unisex, relaxed, high ribbed collar |
| Sizes | XS, S, M, L, XL, 2XL |
| Origin | Knitted, cut, sewn and dyed in Los Angeles |

Size chart (Los Angeles Apparel, measured flat, inches):

| Size | Chest width | Body length | Sleeve length |
| --- | --- | --- | --- |
| XS | 17 | 26.5 | 7.875 |
| S | 19 | 27.5 | 8.125 |
| M | 21 | 28.5 | 8.375 |
| L | 23 | 29.5 | 8.625 |
| XL | 25 | 30.5 | 8.875 |
| 2XL | 27 | 31.5 | 9.125 |

## Decoration

Screen print, water-based discharge on all screens. Request a strike-off on the production blank before the run: garment-dyed blacks discharge to different base tones.

### Front: chest

| | |
| --- | --- |
| Artwork | `artwork/frame-tee-front.svg` |
| Size | 69.85 × 12.29 mm (2.75 × 0.48 in), all sizes |
| Placement | Centered on the center front, top of the artboard 3 in below the front neck seam |
| Inks | 1: White |

### Back: the frame

| | |
| --- | --- |
| Artwork | `artwork/frame-tee-back.svg` |
| Size | 304.8 × 208.41 mm (12.00 × 8.21 in) for M to 2XL; scale to 10.5 in wide (87.5%) for XS and S |
| Placement | Centered on the center back, top of the **artboard** 3 in below the back neck seam. The artboard is the full 104 × 32 cell frame; ink starts one row (0.26 in) below its top edge, so position by the artboard, not the ink |
| Inks | 3, one SVG group each |

| SVG group | Console color | Ink | Used for |
| --- | --- | --- | --- |
| `ink-1-white` | `#ededed` | White discharge | ▼ Text.js, TEXT.JS block letters, the counter, ↑ ↓ and t |
| `ink-2-cool-gray-6c` | `#a1a1a1` | PANTONE Cool Gray 6 C (discharge base + pigment) | React 19 in console.log |
| `ink-3-cool-gray-9c` | `#6b6b70` | PANTONE Cool Gray 9 C (discharge base + pigment) | Geist Dark, count, theme |

Geometry: each console cell is 2.931 × 6.512 mm (DevTools draws 12 px type on a 16 px line, and the cell keeps that 0.45 ratio). Block characters (█ ▀ ▄) are exact rectangles, so adjacent blocks print as one shape with no gaps. Text is Geist Mono, outlined; the ▼ is the site's mark, scaled to the cell.

Smallest detail: the 4.9 mm Geist Mono lines (cap height 3.5 mm, stems about 0.4 mm). Confirm the mesh holds them in Cool Gray 9 C before approving.

### Neck label

| | |
| --- | --- |
| Artwork | `artwork/neck-label.svg` (size M shown; change the size line per size) |
| Size | 50.8 × 31.75 mm (2 × 1.25 in) |
| Placement | Inside back neck, centered, top 0.5 in below the neck seam |
| Ink | 1: White, plastisol or water-based |
| Note | Remove the manufacturer's label. US labels need fiber content, country of origin and the seller's name or RN number; add whichever Adam chooses before production |

## Care

Machine wash cold, inside out. Tumble dry low or hang dry. Do not iron the print.

## Mockups

`photos/final/frame-tee-1.webp` (front and back), `-2` (back), `-3` (front), `-4` (back print close-up), `-5` (neck label).

For Fourthwall's designer: `artwork/png/frame-tee-back.png` (3600 × 2462 px), `frame-tee-front.png` and `neck-label.png`, all 300 DPI.
