/** Layout bits from the FIGfont 2 `Full_Layout` header field. */
export const LAYOUT = {
  /** Horizontal rule 1: equal character smushing. */
  H_EQUAL: 1,
  /** Horizontal rule 2: underscore smushing. */
  H_LOWLINE: 2,
  /** Horizontal rule 3: hierarchy smushing. */
  H_HIERARCHY: 4,
  /** Horizontal rule 4: opposite pair smushing. */
  H_PAIR: 8,
  /** Horizontal rule 5: big X smushing. */
  H_BIGX: 16,
  /** Horizontal rule 6: hardblank smushing. */
  H_HARDBLANK: 32,
  /** Horizontal fitting (kerning) by default. */
  H_FITTING: 64,
  /** Horizontal smushing by default (overrides fitting). */
  H_SMUSHING: 128,
  /** Vertical rule 1: equal character smushing. */
  V_EQUAL: 256,
  /** Vertical rule 2: underscore smushing. */
  V_LOWLINE: 512,
  /** Vertical rule 3: hierarchy smushing. */
  V_HIERARCHY: 1024,
  /** Vertical rule 4: horizontal line smushing. */
  V_LINE: 2048,
  /** Vertical rule 5: vertical line supersmushing. */
  V_SUPER: 4096,
  /** Vertical fitting by default. */
  V_FITTING: 8192,
  /** Vertical smushing by default (overrides fitting). */
  V_SMUSHING: 16384,
} as const;
