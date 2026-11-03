import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TRADEMARK_NOTICE, verifyDoomAssets, WAD } from "../src/demos/doom/fetch-wad";

const WEB_ROOT = join(import.meta.dir, "..");

describe("Doom shareware & GPL engine assets", () => {
  test("DOOM1.WAD, README.TXT, and LICENSE-DOOM1.TXT match published v1.9 hashes and trademark notice", () => {
    expect(WAD.sha256).toBe("1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771");
    expect(existsSync(join(WEB_ROOT, "public/doom/.gitignore"))).toBe(false);
    verifyDoomAssets(join(WEB_ROOT, "public/doom"));
  });

  test("Doom UI credits and engine directory retain trademark disclaimer, GPL-2.0 licence, and source link", () => {
    const doomTsx = readFileSync(join(WEB_ROOT, "src/demos/doom/Doom.tsx"), "utf8");
    expect(doomTsx).toContain(TRADEMARK_NOTICE);

    const engineLicense = readFileSync(join(WEB_ROOT, "src/demos/doom/engine/LICENSE"), "utf8");
    expect(engineLicense).toContain("GNU GENERAL PUBLIC LICENSE");

    const engineReadme = readFileSync(join(WEB_ROOT, "src/demos/doom/engine/README.md"), "utf8");
    expect(engineReadme).toContain("https://github.com/jacobenget/doom.wasm");
  });
});
