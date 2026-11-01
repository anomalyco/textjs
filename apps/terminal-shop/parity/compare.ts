/**
 * Compares this port with the ssh captures in parity/ssh/ and writes our grids to parity/ours/.
 *   bun parity/compare.ts [shot-id…]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { toText, type Grid } from "./grid";
import { renderOurs, withoutExtraMenuRows } from "./ours";
import { SHOTS, shotId } from "./shots";

const only = process.argv.slice(2);
const dir = (p: string): string => new URL(p, import.meta.url).pathname;
mkdirSync(dir("./ours"), { recursive: true });
let same = 0;
let total = 0;
for (const s of SHOTS) {
  const id = shotId(s);
  if (only.length && !only.includes(id) && !only.includes(s.name)) continue;
  const file = dir(`./ssh/${id}.json`);
  if (!existsSync(file)) continue;
  const ssh = JSON.parse(readFileSync(file, "utf8")) as Grid;
  const ours = await renderOurs(s);
  writeFileSync(dir(`./ours/${id}.json`), JSON.stringify(ours));
  const a = toText(ssh);
  const b = withoutExtraMenuRows(toText(ours), s.cols);
  total++;
  if (a === b) {
    same++;
    console.log(`✓ ${id}`);
    continue;
  }
  console.log(`✗ ${id}`);
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) console.log(`  ${String(i).padStart(2)} ssh  |${al[i] ?? ""}|\n     ours |${bl[i] ?? ""}|`);
  }
}
console.log(`${same}/${total} identical`);
process.exit(0);
