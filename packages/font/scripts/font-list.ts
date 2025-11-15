export interface FontEntry {
  /** File and module name. */
  id: string;
  exportName: string;
  name: string;
  description: string;
}

/** The FIGlet 2.2.5 distribution fonts (BSD-3-Clause). `mnemonic` is left out: it is an RFC 1345 transliterator, not a display font. */
export const FONTS: FontEntry[] = [
  { id: "standard", exportName: "standard", name: "Standard", description: "FIGlet's default: 6 rows, smushed." },
  { id: "slant", exportName: "slant", name: "Slant", description: "Italic Standard, 6 rows." },
  { id: "small", exportName: "small", name: "Small", description: "Compact Standard, 5 rows." },
  { id: "smslant", exportName: "smslant", name: "Small Slant", description: "Compact italic, 5 rows." },
  { id: "big", exportName: "big", name: "Big", description: "Tall Standard with Greek, 8 rows." },
  { id: "banner", exportName: "banner", name: "Banner", description: "Unix banner(1) lettering in #, 8 rows; Katakana and Cyrillic too." },
  { id: "block", exportName: "block", name: "Block", description: "Upright outline lettering, 8 rows." },
  { id: "lean", exportName: "lean", name: "Lean", description: "Slanted outline lettering, 8 rows." },
  { id: "shadow", exportName: "shadow", name: "Shadow", description: "Drop-shadow lettering, 5 rows." },
  { id: "smshadow", exportName: "smshadow", name: "Small Shadow", description: "Compact drop-shadow, 4 rows." },
  { id: "script", exportName: "script", name: "Script", description: "Cursive, 7 rows." },
  { id: "smscript", exportName: "smscript", name: "Small Script", description: "Compact cursive, 5 rows." },
  { id: "mini", exportName: "mini", name: "Mini", description: "Tiny lettering, 4 rows." },
  { id: "bubble", exportName: "bubble", name: "Bubble", description: "Letters in circles, 4 rows." },
  { id: "digital", exportName: "digital", name: "Digital", description: "Letters in boxes, 3 rows." },
  { id: "ivrit", exportName: "ivrit", name: "Ivrit", description: "Hebrew with Latin, printed right to left, 6 rows." },
  { id: "term", exportName: "term", name: "Term", description: "One row, input as-is: the identity font." },
];
