/**
 * Regenerates `test/fixtures/references.json` with the real `figlet` program (FIGlet 2.2.5;
 * `brew install figlet` / `apt install figlet`), using the vendored fonts in `fonts/`.
 *
 *   bun packages/font/scripts/generate-references.ts
 *
 * Each case pipes `input` to `figlet -d fonts -f <font> <args>` on stdin and records stdout
 * (decoded as Latin-1, since FIGlet writes bytes). `test/figlet.test.ts` replays every case.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FONTS } from "./font-list";

const root = join(import.meta.dir, "..");
const fontDir = join(root, "fonts");

export interface ReferenceCase {
  font: string;
  args: string[];
  input: string;
  output: string;
}

const PANGRAM = "The quick brown fox jumps over the lazy dog 0123456789";
const PUNCT = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const IRC = readFileSync(join(import.meta.dir, "irc.txt"), "latin1");

const cases: Array<Omit<ReferenceCase, "output">> = [];
for (const { id } of FONTS) {
  for (const args of [[], ["-W"], ["-k"], ["-S"], ["-o"]]) {
    cases.push({ font: id, args, input: "Text.js" });
    cases.push({ font: id, args, input: PANGRAM });
  }
  cases.push({ font: id, args: [], input: PUNCT });
  cases.push({ font: id, args: ["-m", "7"], input: "[]{}()<>|/\\_ ][}{)(><" });
  cases.push({ font: id, args: ["-c", "-w", "60"], input: "Text.js\nconsole.log" });
  cases.push({ font: id, args: ["-R", "-r"], input: "Hello, World" });
}
// FIGlet's own regression input (tests/input.txt), with the flag sets from its run-tests.sh.
for (const args of [[], ["-c"], ["-r"], ["-k"], ["-W"], ["-o"], ["-p", "-w", "250"], ["-w", "5"], ["-kpc"], ["-klR"], ["-WrR"], ["-or"], ["-S", "-w", "40"]]) {
  cases.push({ font: "standard", args, input: IRC });
}
for (const font of ["small", "slant", "big", "banner"]) {
  for (const args of [["-k"], ["-c"], ["-or"], ["-kcR"]]) cases.push({ font, args, input: IRC });
}
cases.push({ font: "ivrit", args: [], input: "Text.js" });
cases.push({ font: "ivrit", args: ["-L", "-l"], input: "Text.js" });
cases.push({ font: "standard", args: ["-w", "30"], input: "supercalifragilistic expialidocious" });
cases.push({ font: "standard", args: ["-R", "-w", "30"], input: "supercalifragilistic expialidocious" });
cases.push({ font: "standard", args: [], input: "tabs\tand  double  spaces\n\nblank line above" });
cases.push({ font: "big", args: ["-p"], input: "one\ntwo\n\nthree\n" });

const references: ReferenceCase[] = cases.map((c) => {
  const run = spawnSync("figlet", ["-d", fontDir, "-f", c.font, ...c.args], { input: Buffer.from(c.input, "latin1") });
  if (run.status !== 0) throw new Error(`figlet ${c.args.join(" ")} failed: ${run.stderr}`);
  return { ...c, output: run.stdout.toString("latin1") };
});

const version = spawnSync("figlet", ["-v"]).stdout.toString().split("\n")[2]?.trim() ?? "";
writeFileSync(join(root, "test", "fixtures", "references.json"), JSON.stringify({ generator: `figlet ${version}`.trim(), cases: references }, null, 1) + "\n");
console.log(`Wrote ${references.length} reference outputs.`);
