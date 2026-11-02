/**
 * UAX #9 conformance: the complete official BidiTest.txt and
 * BidiCharacterTest.txt for Unicode 18.0.0 (gzipped copies of
 * https://www.unicode.org/Public/18.0.0/ucd/, © Unicode, Inc., Unicode License v3).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  applyLineRules,
  BIDI_BN,
  BIDI_CLASS_NAMES,
  BIDI_PDF,
  BIDI_LRE,
  BIDI_UNICODE_VERSION,
  bidiClass,
  reorderIndices,
  resolveLevels,
  type ParagraphDirection,
} from "../src/bidi";

function fixture(name: string): string {
  const gz = readFileSync(new URL(`./unicode/${name}-${BIDI_UNICODE_VERSION}.txt.gz`, import.meta.url));
  return new TextDecoder().decode(gunzipSync(gz));
}

const removed = (t: number): boolean => t === BIDI_BN || (t >= BIDI_LRE && t <= BIDI_PDF);

/** Levels (`-1` = removed by X9) and visual order (removed skipped) for one line. */
function run(types: Uint8Array, cps: number[] | null, dir: ParagraphDirection): { levels: number[]; order: number[]; paragraphLevel: number } {
  const { levels, paragraphLevels } = resolveLevels(types, cps, dir);
  applyLineRules(types, levels, paragraphLevels, 0, types.length);
  const order = reorderIndices(levels, 0, types.length).filter((i) => !removed(types[i] as number));
  const out: number[] = [];
  for (let i = 0; i < types.length; i++) out.push(removed(types[i] as number) ? -1 : (levels[i] as number));
  return { levels: out, order, paragraphLevel: paragraphLevels[0] ?? (dir === 1 ? 1 : 0) };
}

const fmtLevels = (ls: number[]): string => ls.map((l) => (l < 0 ? "x" : String(l))).join(" ");

// Each test checks hundreds of thousands of cases: half a second on a laptop, but past the
// default 5 s on a CI runner busy with other test files.
describe(`UAX #9 conformance (Unicode ${BIDI_UNICODE_VERSION})`, () => {
  test("BidiTest.txt (all cases)", () => {
    const classIndex = new Map(BIDI_CLASS_NAMES.map((n, i) => [n, i]));
    let levels = "";
    let reorder = "";
    let cases = 0;
    const failures: string[] = [];
    for (const raw of fixture("BidiTest").split("\n")) {
      const line = raw.trim();
      if (line.length === 0 || line.startsWith("#")) continue;
      if (line.startsWith("@Levels:")) {
        levels = line.slice(8).trim();
        continue;
      }
      if (line.startsWith("@Reorder:")) {
        reorder = line.slice(9).trim();
        continue;
      }
      if (line.startsWith("@")) continue;
      const [input, bits] = line.split(";") as [string, string];
      const names = input.trim().split(/\s+/);
      const types = Uint8Array.from(names.map((n) => classIndex.get(n) as number));
      const bitset = Number.parseInt(bits.trim(), 16);
      for (const [bit, dir] of [[1, -1], [2, 0], [4, 1]] as const) {
        if ((bitset & bit) === 0) continue;
        cases++;
        const r = run(types, null, dir);
        const gotLevels = fmtLevels(r.levels);
        const gotOrder = r.order.join(" ");
        if (gotLevels !== levels || gotOrder !== reorder) {
          if (failures.length < 20) failures.push(`${input.trim()} [dir ${dir}]: levels ${gotLevels} (want ${levels}), order ${gotOrder} (want ${reorder})`);
          else failures.push("");
        }
      }
    }
    console.info(`[bidi] BidiTest.txt: ${cases} cases`);
    expect(cases).toBe(770_241);
    expect(failures.slice(0, 20)).toEqual([]);
    expect(failures.length).toBe(0);
  }, 30_000);

  test("BidiCharacterTest.txt (all cases, including paired brackets)", () => {
    let cases = 0;
    const failures: string[] = [];
    for (const raw of fixture("BidiCharacterTest").split("\n")) {
      const line = raw.trim();
      if (line.length === 0 || line.startsWith("#")) continue;
      const [cpField, dirField, paraField, levelField, orderField] = line.split(";") as [string, string, string, string, string];
      const cps = cpField.trim().split(/\s+/).map((h) => Number.parseInt(h, 16));
      const types = Uint8Array.from(cps.map(bidiClass));
      const dir = (dirField === "2" ? -1 : Number(dirField)) as ParagraphDirection;
      cases++;
      const r = run(types, cps, dir);
      const gotLevels = fmtLevels(r.levels);
      const gotOrder = r.order.join(" ");
      if (String(r.paragraphLevel) !== paraField.trim() || gotLevels !== levelField.trim() || gotOrder !== orderField.trim()) {
        if (failures.length < 20) failures.push(`${cpField} [${dirField}]: para ${r.paragraphLevel} (want ${paraField}) levels ${gotLevels} (want ${levelField}) order ${gotOrder} (want ${orderField})`);
        else failures.push("");
      }
    }
    console.info(`[bidi] BidiCharacterTest.txt: ${cases} cases`);
    expect(cases).toBe(91_707);
    expect(failures.slice(0, 20)).toEqual([]);
    expect(failures.length).toBe(0);
  }, 30_000);
});
