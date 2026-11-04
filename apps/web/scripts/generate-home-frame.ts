/**
 * Writes `src/pages/home/home-frame.json`, the console companion's first Home frame that the hero
 * mirror shows before the companion boots. `bun run build` runs it first.
 *
 *   bun scripts/generate-home-frame.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderHomeFrame } from "../src/pages/home/home-frame-gen";

const out = join(import.meta.dirname, "..", "src", "pages", "home", "home-frame.json");
const json = `${JSON.stringify(await renderHomeFrame())}\n`;
let current: string | null = null;
try {
  current = readFileSync(out, "utf8");
} catch {
  // First run.
}
if (current === json) console.log(`${out} is up to date`);
else {
  writeFileSync(out, json);
  console.log(`wrote ${out} (${json.length} chars)`);
}
