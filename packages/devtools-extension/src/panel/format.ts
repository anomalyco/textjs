/** `0xRRGGBBAA` → `#rrggbb` (or `#rrggbbaa` when translucent). */
export function hex(packed: number): string {
  const v = packed >>> 0;
  const a = v & 255;
  const rgb = (v >>> 8).toString(16).padStart(6, "0");
  return a === 255 ? `#${rgb}` : `#${rgb}${a.toString(16).padStart(2, "0")}`;
}

/** CSS color for a cell, or `null` when the cell leaves it to the console default. */
export function cssColor(packed: number): string | null {
  return (packed >>> 0 & 255) === 0 ? null : hex(packed);
}

export function ms(n: number, digits = 2): string {
  return `${n.toFixed(digits)}ms`;
}

export const ATTR_NAMES: ReadonlyArray<[number, string]> = [
  [1, "bold"],
  [2, "dim"],
  [4, "italic"],
  [8, "underline"],
  [16, "strikethrough"],
  [32, "inverse"],
  [64, "link"],
];

export function attrList(attrs: number): string[] {
  return ATTR_NAMES.filter(([bit]) => (attrs & bit) !== 0).map(([, n]) => n);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] as number;
}
