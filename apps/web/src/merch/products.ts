/** The merch collection. Specs come from the blank manufacturers; see merch/tech-packs/ in the repo. */
import tee1_600 from "./images/frame-tee-1-600.webp";
import tee1_1024 from "./images/frame-tee-1-1024.webp";
import tee2_600 from "./images/frame-tee-2-600.webp";
import tee2_1024 from "./images/frame-tee-2-1024.webp";
import tee3_600 from "./images/frame-tee-3-600.webp";
import tee3_1024 from "./images/frame-tee-3-1024.webp";
import tee4_600 from "./images/frame-tee-4-600.webp";
import tee4_1024 from "./images/frame-tee-4-1024.webp";
import tee5_600 from "./images/frame-tee-5-600.webp";
import tee5_1024 from "./images/frame-tee-5-1024.webp";
import cap1_600 from "./images/cap-1-600.webp";
import cap1_1024 from "./images/cap-1-1024.webp";
import cap2_600 from "./images/cap-2-600.webp";
import cap2_1024 from "./images/cap-2-1024.webp";
import cap3_600 from "./images/cap-3-600.webp";
import cap3_1024 from "./images/cap-3-1024.webp";
import stickers1_600 from "./images/stickers-1-600.webp";
import stickers1_1024 from "./images/stickers-1-1024.webp";
import stickers2_600 from "./images/stickers-2-600.webp";
import stickers2_1024 from "./images/stickers-2-1024.webp";
import hoodie1_600 from "./images/hoodie-1-600.webp";
import hoodie1_1024 from "./images/hoodie-1-1024.webp";
import hoodie2_600 from "./images/hoodie-2-600.webp";
import hoodie2_1024 from "./images/hoodie-2-1024.webp";
import hoodie3_600 from "./images/hoodie-3-600.webp";
import hoodie3_1024 from "./images/hoodie-3-1024.webp";
import keys1_600 from "./images/keycaps-1-600.webp";
import keys1_1024 from "./images/keycaps-1-1024.webp";
import keys2_600 from "./images/keycaps-2-600.webp";
import keys2_1024 from "./images/keycaps-2-1024.webp";
import book1_600 from "./images/notebook-1-600.webp";
import book1_1024 from "./images/notebook-1-1024.webp";
import book2_600 from "./images/notebook-2-600.webp";
import book2_1024 from "./images/notebook-2-1024.webp";
import book3_600 from "./images/notebook-3-600.webp";
import book3_1024 from "./images/notebook-3-1024.webp";

/** Every product image is 4:5, served at 600 and 1024 px wide. */
export const IMAGE_WIDTH = 1024;
export const IMAGE_HEIGHT = 1280;

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
      "The back is the first frame textjs.org renders into the DevTools console, printed 12 inches wide with all 104\u00a0×\u00a032 cells. The front carries the frame’s first line.",
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
      img(tee1_600, tee1_1024, "Two black Frame Tees laid flat, one showing the back print and one the chest print"),
      img(tee2_600, tee2_1024, "Back of the Frame Tee with the 104 by 32 cell console frame printed across it"),
      img(tee3_600, tee3_1024, "Front of the Frame Tee with ▼ Text.js printed at the chest"),
      img(tee4_600, tee4_1024, "Close-up of the back print on the cotton: the TEXT.JS block letters, React 19 in console.log, the counter and Geist Dark"),
      img(tee5_600, tee5_1024, "The printed neck label inside the collar: ▼ Text.js, the size, fiber content and care"),
    ],
  },
  {
    slug: "cap",
    number: "002",
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
    images: [
      img(cap1_600, cap1_1024, "Black cap with a tonal embroidered ▼ on the front"),
      img(cap2_600, cap2_1024, "Back of the cap with textjs.org embroidered above the strap and brass buckle"),
      img(cap3_600, cap3_1024, "Close-up of the ▼ in black satin stitches on the cotton twill, across the front seam"),
    ],
  },
  {
    slug: "sticker-sheet",
    number: "003",
    name: "Sticker Sheet",
    color: "Black",
    price: 8,
    description: [
      "Seven kiss-cut stickers on one 5.83\u00a0×\u00a08.27 inch sheet: the ▼ cut to shape, the wordmark, %c, the ▼ from the console’s block-letter font, and ⌘, ⌥ and J.",
    ],
    details: ["Glossy vinyl, white stickers on a black sheet", "Kiss-cut, peel individually", "▼ sticker 2.5 inches wide"],
    care: ["Apply to a clean, dry surface", "For indoor use"],
    sizes: [],
    images: [
      img(stickers1_600, stickers1_1024, "Black sticker sheet with a black ▼ edged in white, the ▼ Text.js wordmark, %c, a block ▼ and ⌘ ⌥ J keys"),
      img(stickers2_600, stickers2_1024, "The ▼, wordmark and ⌘ stickers on a black laptop lid"),
    ],
  },
  {
    slug: "hoodie",
    number: "004",
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
    images: [
      img(hoodie1_600, hoodie1_1024, "Black hoodie with the hood up, front"),
      img(hoodie2_600, hoodie2_1024, "Black hoodie laid flat with the small tonal ▼ at the chest"),
      img(hoodie3_600, hoodie3_1024, "Close-up of the ▼ in black satin stitches on the fleece"),
    ],
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
    images: [
      img(keys1_600, keys1_1024, "Three black keycaps with gray legends: ⌘, ⌥ and J"),
      img(keys2_600, keys2_1024, "The ⌘, ⌥ and J keycaps in place on a black keyboard"),
    ],
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
    images: [
      img(book1_600, book1_1024, "Black A5 notebook with a blind-debossed ▼ on the cover"),
      img(book2_600, book2_1024, "Close-up of the debossed ▼ pressed into the cover grain"),
      img(book3_600, book3_1024, "The notebook open to a dot-grid spread"),
    ],
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
