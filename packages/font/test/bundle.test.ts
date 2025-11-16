import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const src = join(import.meta.dir, "..", "src");

async function bundle(code: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "textjs-font-"));
  const entry = join(dir, "entry.ts");
  writeFileSync(entry, code);
  const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
  if (!result.success) throw new AggregateError(result.logs, "bundle failed");
  return (await result.outputs[0]?.text()) ?? "";
}

test("importing one font ships only that font", async () => {
  const code = await bundle(
    `import { renderFiglet } from ${JSON.stringify(join(src, "index.ts"))};
import { slant } from ${JSON.stringify(join(src, "fonts", "slant.ts"))};
console.log(renderFiglet(slant, "Text.js").join("\\n"));`,
  );
  expect(code).toContain("Slant by Glenn Chappell");
  expect(code).not.toContain("Standard by Glenn Chappell");
  expect(code).not.toContain("Big by Glenn Chappell");
  expect(code).not.toMatch(/from\s*["']node:/);
}, 30_000);

test("unused fonts in the all-fonts barrel are dropped", async () => {
  const code = await bundle(
    `import { small } from ${JSON.stringify(join(src, "all.ts"))};
console.log(small.render("hi"));`,
  );
  expect(code).toContain("Small by Glenn Chappell");
  expect(code).not.toContain("Slant by Glenn Chappell");
  expect(code).not.toContain("banner.flf version 2");
}, 30_000);
