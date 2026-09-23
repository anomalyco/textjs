/**
 * Generates `src/bidi-data.ts` from the Unicode Character Database.
 *
 *   bun packages/core/scripts/gen-bidi-data.ts [ucdDir]
 *
 * Reads `DerivedBidiClass.txt`, `BidiMirroring.txt`, `BidiBrackets.txt`,
 * `ArabicShaping.txt` and `UnicodeData.txt` from `ucdDir` (downloading any
 * missing file from unicode.org, falling back to the unicode-org/unicodetools
 * GitHub mirror) and writes compact range strings.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const VERSION = "18.0.0";
const FILES: Record<string, string> = {
  "DerivedBidiClass.txt": "extracted/DerivedBidiClass.txt",
  "BidiMirroring.txt": "BidiMirroring.txt",
  "BidiBrackets.txt": "BidiBrackets.txt",
  "ArabicShaping.txt": "ArabicShaping.txt",
  "UnicodeData.txt": "UnicodeData.txt",
};
const SOURCES = [
  `https://www.unicode.org/Public/${VERSION}/ucd/`,
  `https://raw.githubusercontent.com/unicode-org/unicodetools/main/unicodetools/data/ucd/${VERSION}/`,
];

const dir = process.argv[2] ?? join(tmpdir(), `ucd-${VERSION}`);
mkdirSync(dir, { recursive: true });

async function load(name: string): Promise<string> {
  const path = join(dir, name);
  if (!existsSync(path)) {
    let text: string | null = null;
    for (const base of SOURCES) {
      for (let attempt = 0; attempt < 3 && text === null; attempt++) {
        const res = await fetch(base + FILES[name]).catch(() => null);
        if (res?.ok) text = await res.text();
      }
      if (text !== null) break;
    }
    if (text === null) throw new Error(`could not download ${name}`);
    writeFileSync(path, text);
  }
  const text = readFileSync(path, "utf8");
  if (name !== "UnicodeData.txt" && !text.includes(`-${VERSION}`)) throw new Error(`${name} is not version ${VERSION}`);
  return text;
}

// Must match the BidiClass constants in src/bidi.ts.
const CLASS_NAMES = ["L", "R", "AL", "EN", "ES", "ET", "AN", "CS", "NSM", "BN", "B", "S", "WS", "ON", "LRE", "LRO", "RLE", "RLO", "PDF", "LRI", "RLI", "FSI", "PDI"];
const LONG_NAMES: Record<string, string> = {
  Left_To_Right: "L",
  Right_To_Left: "R",
  Arabic_Letter: "AL",
  European_Terminator: "ET",
  Boundary_Neutral: "BN",
};

function parseRange(field: string): [number, number] {
  const [a, b] = field.trim().split("..");
  const start = Number.parseInt(a as string, 16);
  return [start, b === undefined ? start : Number.parseInt(b, 16)];
}

/** Encode `(start, value)` transitions as `<base36 delta><letter>` pairs. */
function encodeTransitions(values: Uint8Array): string {
  let out = "";
  let prevStart = 0;
  let prev = -1;
  for (let cp = 0; cp < values.length; cp++) {
    const v = values[cp] as number;
    if (v === prev) continue;
    out += (cp - prevStart).toString(36) + String.fromCharCode(65 + v);
    prevStart = cp;
    prev = v;
  }
  return out;
}

const derived = await load("DerivedBidiClass.txt");
const classes = new Uint8Array(0x110000);
const missing: string[] = [];
const explicit: string[] = [];
for (const line of derived.split("\n")) {
  const m = /^# @missing: ([0-9A-F.]+); (\w+)/.exec(line);
  if (m) missing.push(`${m[1]};${m[2]}`);
  else if (/^[0-9A-F]/.test(line)) explicit.push(line.split("#")[0] as string);
}
for (const entry of [...missing, ...explicit]) {
  const [range, value] = entry.split(";") as [string, string];
  const name = LONG_NAMES[value.trim()] ?? value.trim();
  const cls = CLASS_NAMES.indexOf(name);
  if (cls < 0) throw new Error(`unknown bidi class ${value}`);
  const [s, e] = parseRange(range);
  classes.fill(cls, s, e + 1);
}

const mirroring = await load("BidiMirroring.txt");
const mirrors: number[] = [];
for (const line of mirroring.split("\n")) {
  if (!/^[0-9A-F]/.test(line)) continue;
  const [a, b] = (line.split("#")[0] as string).split(";").map((s) => Number.parseInt(s.trim(), 16)) as [number, number];
  mirrors.push(a, b);
}

const unicodeData = await load("UnicodeData.txt");
const canonical = new Map<number, number>();
const generalCategory = new Map<number, string>();
const forms = new Map<number, [number, number, number, number]>();
const FORM_INDEX: Record<string, number> = { "<isolated>": 0, "<final>": 1, "<initial>": 2, "<medial>": 3 };
for (const line of unicodeData.split("\n")) {
  if (line.length === 0) continue;
  const f = line.split(";");
  const cp = Number.parseInt(f[0] as string, 16);
  generalCategory.set(cp, f[2] as string);
  const decomp = (f[5] as string).trim();
  if (/^[0-9A-F]+$/.test(decomp)) canonical.set(cp, Number.parseInt(decomp, 16));
  const pf = /^(<isolated>|<final>|<initial>|<medial>) ([0-9A-F]+)$/.exec(decomp);
  if (pf && ((cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff))) {
    const base = Number.parseInt(pf[2] as string, 16);
    if (base === 0x20 || base === 0x640) continue; // spacing harakat and tatweel+mark forms
    let slot = forms.get(base);
    if (slot === undefined) {
      slot = [0, 0, 0, 0];
      forms.set(base, slot);
    }
    const idx = FORM_INDEX[pf[1] as string] as number;
    if (slot[idx] === 0) slot[idx] = cp;
  }
}

const bracketsTxt = await load("BidiBrackets.txt");
const brackets: number[] = [];
for (const line of bracketsTxt.split("\n")) {
  if (!/^[0-9A-F]/.test(line)) continue;
  const [a, b, t] = (line.split("#")[0] as string).split(";").map((s) => s.trim()) as [string, string, string];
  const cp = Number.parseInt(a, 16);
  const pair = Number.parseInt(b, 16);
  brackets.push(cp, pair, t === "o" ? 1 : 2, canonical.get(cp) ?? cp);
}

// Joining types: U=0, T=1, C=2, D=3, R=4, L=5.
const JT: Record<string, number> = { U: 0, T: 1, C: 2, D: 3, R: 4, L: 5 };
const joining = new Uint8Array(0x110000);
for (const [cp, gc] of generalCategory) if (gc === "Mn" || gc === "Me" || gc === "Cf") joining[cp] = JT.T as number;
// UnicodeData lists ranges by First/Last; marks never come in such ranges, so this is complete.
const shaping = await load("ArabicShaping.txt");
for (const line of shaping.split("\n")) {
  if (!/^[0-9A-F]/.test(line)) continue;
  const f = line.split(";").map((s) => s.trim());
  joining[Number.parseInt(f[0] as string, 16)] = JT[f[2] as string] as number;
}

function hexList(nums: number[]): string {
  return nums.map((n) => n.toString(36)).join(",");
}

const formEntries: number[] = [];
for (const [base, slot] of [...forms.entries()].sort((a, b) => a[0] - b[0])) formEntries.push(base, ...slot);

const out = `// Generated by scripts/gen-bidi-data.ts from the Unicode ${VERSION} Character Database. Do not edit.
// Unicode data © Unicode, Inc., distributed under the Unicode License v3 (https://www.unicode.org/license.txt).

/** Unicode version of the bidi tables. */
export const BIDI_UNICODE_VERSION = "${VERSION}";

/** Bidi_Class transitions: \`<base36 delta from previous start><class letter A..W>\`. */
export const BIDI_CLASS_RANGES =
  "${encodeTransitions(classes)}";

/** Bidi_Mirroring_Glyph pairs \`cp,mirror,…\` (base 36). */
export const BIDI_MIRRORS = "${hexList(mirrors)}";

/** Bidi_Paired_Bracket entries \`cp,pair,type(1=open,2=close),canonical,…\` (base 36). */
export const BIDI_BRACKETS = "${hexList(brackets)}";

/** Joining_Type transitions (U T C D R L as A..F), same encoding as the class ranges. */
export const JOINING_TYPE_RANGES =
  "${encodeTransitions(joining)}";

/** Arabic presentation forms \`base,isolated,final,initial,medial,…\` (base 36, 0 = none). */
export const ARABIC_FORMS = "${hexList(formEntries)}";
`;

const target = new URL("../src/bidi-data.ts", import.meta.url);
writeFileSync(target, out);
console.log(`wrote ${target.pathname} (${out.length} bytes; ${forms.size} shaped letters, ${mirrors.length / 2} mirrors, ${brackets.length / 4} brackets)`);
