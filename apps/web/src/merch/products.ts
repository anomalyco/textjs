/** The merch collection. Specs come from the blank manufacturers; see merch/tech-packs/ in the repo. */
import capA600 from "./images/cap-1-600.webp";
import capA1200 from "./images/cap-1-1200.webp";
import capB600 from "./images/cap-2-600.webp";
import capB1200 from "./images/cap-2-1200.webp";
import teeA600 from "./images/frame-tee-1-600.webp";
import teeA1200 from "./images/frame-tee-1-1200.webp";
import teeB600 from "./images/frame-tee-2-600.webp";
import teeB1200 from "./images/frame-tee-2-1200.webp";
import teeC600 from "./images/frame-tee-3-600.webp";
import teeC1200 from "./images/frame-tee-3-1200.webp";
import teeD600 from "./images/frame-tee-4-600.webp";
import teeD1200 from "./images/frame-tee-4-1200.webp";
import hoodieA600 from "./images/hoodie-1-600.webp";
import hoodieA1200 from "./images/hoodie-1-1200.webp";
import hoodieB600 from "./images/hoodie-2-600.webp";
import hoodieB1200 from "./images/hoodie-2-1200.webp";
import keysA600 from "./images/keycaps-1-600.webp";
import keysA1200 from "./images/keycaps-1-1200.webp";
import keysB600 from "./images/keycaps-2-600.webp";
import keysB1200 from "./images/keycaps-2-1200.webp";
import bookA600 from "./images/notebook-1-600.webp";
import bookA1200 from "./images/notebook-1-1200.webp";
import bookB600 from "./images/notebook-2-600.webp";
import bookB1200 from "./images/notebook-2-1200.webp";
import stickersA600 from "./images/stickers-1-600.webp";
import stickersA1200 from "./images/stickers-1-1200.webp";
import stickersB600 from "./images/stickers-2-600.webp";
import stickersB1200 from "./images/stickers-2-1200.webp";

/** Every product image is 4:5, rendered at 600 and 1200 px wide. */
export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 1500;

export interface ProductImage {
  small: string;
  large: string;
  alt: string;
}

export interface SizeGuide {
  /** Column headings after the size column. */
  columns: readonly string[];
  /** One row per size, in the same order as `sizes`. */
  rows: ReadonlyArray<readonly string[]>;
  note: string;
}

export interface Product {
  slug: string;
  /** Collection number, shown as 001…006. */
  number: string;
  name: string;
  color: string;
  /** Price in US dollars. */
  price: number;
  description: readonly string[];
  details: readonly string[];
  care: readonly string[];
  /** Selectable sizes; an empty list means one size. */
  sizes: readonly string[];
  fit?: string;
  sizeGuide?: SizeGuide;
  images: readonly ProductImage[];
}

const img = (small: string, large: string, alt: string): ProductImage => ({ small, large, alt });

export const PRODUCTS: readonly Product[] = [
  {
    slug: "frame-tee",
    number: "001",
    name: "Frame Tee",
    color: "Black",
    price: 45,
    description: [
      "The back is the first frame textjs.org renders into the DevTools console, printed 12 inches wide with all 104 × 32 cells. The front carries the frame’s first line.",
      "Three water-based inks match the frame’s three text colors.",
    ],
    details: [
      "6.5 oz/yd² (220 g/m²) 100% cotton jersey",
      "Garment dyed, made in Los Angeles by Los Angeles Apparel (1801GD)",
      "Relaxed fit with a high ribbed collar",
      "Screen printed: 3 colors on the back, 1 on the chest",
      "Printed neck label, no tag",
    ],
    care: ["Machine wash cold, inside out", "Tumble dry low or hang dry", "Do not iron the print"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    fit: "Relaxed. Take your usual size.",
    sizeGuide: {
      columns: ["Chest width", "Body length"],
      rows: [
        ["17 in", "26.5 in"],
        ["19 in", "27.5 in"],
        ["21 in", "28.5 in"],
        ["23 in", "29.5 in"],
        ["25 in", "30.5 in"],
        ["27 in", "31.5 in"],
      ],
      note: "Measured flat. Chest width is armpit to armpit; body length is from the high point of the shoulder.",
    },
    images: [
      img(teeA600, teeA1200, "Frame Tee in black, front and back"),
      img(teeB600, teeB1200, "Back of the Frame Tee with the 104 by 32 cell console frame printed across it"),
      img(teeC600, teeC1200, "Front of the Frame Tee with ▼ Text.js printed at the chest"),
      img(teeD600, teeD1200, "Close-up of the back print: the TEXT.JS block letters, React 19 in console.log and the counter"),
    ],
  },
  {
    slug: "hoodie",
    number: "002",
    name: "Hoodie",
    color: "Black",
    price: 95,
    description: ["A heavyweight fleece hoodie with the ▼ embroidered at the chest in black thread on black."],
    details: [
      "14 oz heavy fleece",
      "Garment dyed, made in Los Angeles by Los Angeles Apparel (HF09)",
      "Loose fit, kangaroo pocket, ribbed cuffs and hem",
      "Tonal embroidery, 1.75 inches wide",
      "Printed neck label, no tag",
    ],
    care: ["Machine wash cold, inside out", "Tumble dry low or hang dry"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    fit: "Loose. Size down for a closer fit.",
    images: [img(hoodieA600, hoodieA1200, "Black hoodie, front"), img(hoodieB600, hoodieB1200, "Close-up of the tonal ▼ embroidery on the chest")],
  },
  {
    slug: "cap",
    number: "003",
    name: "Cap",
    color: "Black",
    price: 35,
    description: ["An unstructured six-panel cap with the ▼ embroidered on the front and textjs.org above the strap, both in black thread."],
    details: [
      "100% cotton chino twill",
      "Unstructured, low profile, 3⅛ inch crown",
      "Pre-curved visor with four rows of stitching",
      "Adjustable strap with antique brass buckle",
      "Yupoong 6245CM",
    ],
    care: ["Spot clean with cold water", "Air dry"],
    sizes: [],
    images: [img(capA600, capA1200, "Black cap with a tonal ▼ on the front panel"), img(capB600, capB1200, "Back of the cap with textjs.org embroidered above the strap")],
  },
  {
    slug: "sticker-sheet",
    number: "004",
    name: "Sticker Sheet",
    color: "Black",
    price: 8,
    description: [
      "Seven kiss-cut stickers on one 4 × 6 inch sheet: the ▼ cut to shape, the wordmark, %c, the ▼ from the console’s block-letter font, and ⌘, ⌥ and J.",
    ],
    details: ["Matte vinyl, printed black with white artwork", "Kiss-cut, peel individually", "4 × 6 inch sheet, ▼ sticker 2 inches wide"],
    care: ["Apply to a clean, dry surface"],
    sizes: [],
    images: [img(stickersA600, stickersA1200, "Black sticker sheet with a white ▼, the Text.js wordmark, %c, a block ▼ and ⌘ ⌥ J keys"), img(stickersB600, stickersB1200, "Close-up of the die-cut ▼ and wordmark stickers")],
  },
  {
    slug: "keycaps",
    number: "005",
    name: "Keycap Set",
    color: "⌘ ⌥ J",
    price: 25,
    description: ["⌘⌥J opens the Console in Chrome DevTools on macOS. Three black keycaps with gray legends: ⌘ and ⌥ at 1.25u, and J at 1u with its homing bar."],
    details: ["PBT, Cherry profile", "Dye-sublimated legends", "MX-compatible stems", "1.25u, 1.25u and 1u"],
    care: ["Wipe clean with a damp cloth"],
    sizes: [],
    fit: "Fits MX-style switches. Check that your bottom row takes 1.25u modifiers.",
    images: [img(keysA600, keysA1200, "Three black keycaps: ⌘, ⌥ and J"), img(keysB600, keysB1200, "The J keycap, with its homing bar")],
  },
  {
    slug: "notebook",
    number: "006",
    name: "Notebook",
    color: "Black",
    price: 28,
    description: ["An A5 hardcover notebook with the ▼ blind-debossed on the cover. Dot grid inside."],
    details: [
      "Leuchtturm1917 Medium (A5), 145 × 210 mm",
      "251 numbered pages, 80 g/m² paper, 5 mm dot grid",
      "Thread-bound, opens flat",
      "Two page markers, elastic band and back pocket",
    ],
    care: ["Keep dry"],
    sizes: [],
    images: [img(bookA600, bookA1200, "Black A5 notebook with a debossed ▼ on the cover"), img(bookB600, bookB1200, "The notebook open to a dot-grid spread")],
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function productPath(slug: string): string {
  return `/merch/${slug}`;
}

export function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
