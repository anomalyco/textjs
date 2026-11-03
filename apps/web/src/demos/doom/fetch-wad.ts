// Verifies or refreshes id Software's shareware DOOM1.WAD (v1.9, Episode 1) in apps/web/public/doom/,
// byte-identical to the 1995 release, with its README.TXT and id's shareware license alongside.
// Usage:
//   bun apps/web/src/demos/doom/fetch-wad.ts --verify   # verify committed assets offline
//   bun apps/web/src/demos/doom/fetch-wad.ts            # re-download from archive.org + Debian and verify
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The v1.9 shareware archive as preserved by the Internet Archive (id no longer hosts it).
const ZIP = { url: "https://archive.org/download/DoomsharewareEpisode/DoomV1.9sw1995idSoftwareInc.action.zip", sha256: "63ad7609f2e951fb2198f682e1226f003946c75c00b9785fa967ffb12c6745f7" };
// Debian's packaging, which records id's license text and John Carmack's 1999 note that the WAD is freely distributable.
const DEBIAN = { url: "https://deb.debian.org/debian/pool/non-free/d/doom-wad-shareware/doom-wad-shareware_1.9.fixed-4.debian.tar.xz", sha256: "6c5ca875615ac9ce2dc24542ae7d3a7bb21475751c426530b636cb00952bcd96" };
// Published hashes of DOOM1.WAD v1.9 (Doom Wiki, Wad Archive): 4,196,020 bytes, 1,264 lumps.
export const WAD = {
  size: 4196020,
  md5: "f0cefca49926d00903cf57551d901abe",
  sha1: "5b2e249b9c5133ec987b3ea77596381dc0d6bc1d",
  sha256: "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771",
};

export const LICENSE_HEADER = "DOOM1.WAD: DOOM shareware v1.9, Episode 1 © 1993–1995 id Software";
export const TRADEMARK_NOTICE = "DOOM is a trademark of id Software. Text.js is not affiliated with or endorsed by id Software.";

const out = new URL("../../../public/doom/", import.meta.url).pathname;
const hash = (algo: string, data: Uint8Array): string => createHash(algo).update(data).digest("hex");

export function verifyDoomAssets(dir = out): void {
  const wadPath = join(dir, "DOOM1.WAD");
  const readmePath = join(dir, "README.TXT");
  const licensePath = join(dir, "LICENSE-DOOM1.TXT");
  if (!existsSync(wadPath)) throw new Error(`Missing ${wadPath}`);
  if (!existsSync(readmePath)) throw new Error(`Missing ${readmePath}`);
  if (!existsSync(licensePath)) throw new Error(`Missing ${licensePath}`);
  const wad = new Uint8Array(readFileSync(wadPath));
  if (
    wad.length !== WAD.size ||
    hash("md5", wad) !== WAD.md5 ||
    hash("sha1", wad) !== WAD.sha1 ||
    hash("sha256", wad) !== WAD.sha256
  ) {
    throw new Error("DOOM1.WAD doesn't match the published v1.9 shareware hashes");
  }
  const licenseLines = readFileSync(licensePath, "utf8").split("\n");
  if (licenseLines[0] !== LICENSE_HEADER) {
    throw new Error("LICENSE-DOOM1.TXT line 1 doesn't match expected header");
  }
  if (licenseLines[1] !== TRADEMARK_NOTICE) {
    throw new Error("LICENSE-DOOM1.TXT line 2 doesn't match expected trademark notice");
  }
}

if (import.meta.main) {
  if (process.argv.includes("--verify")) {
    verifyDoomAssets();
    console.log(`DOOM1.WAD ${WAD.size} bytes, sha256 ${WAD.sha256} ✓`);
    process.exit(0);
  }

  const tmp = mkdtempSync(join(tmpdir(), "doom1-"));

  async function download(src: { url: string; sha256: string }, name: string): Promise<string> {
    const bytes = new Uint8Array(await (await fetch(src.url)).arrayBuffer());
    if (hash("sha256", bytes) !== src.sha256) throw new Error(`${name}: SHA-256 mismatch`);
    const path = join(tmp, name);
    await Bun.write(path, bytes);
    return path;
  }

  const run = (cmd: string[]): string => {
    const r = Bun.spawnSync(cmd, { cwd: tmp });
    if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")}: ${r.stderr.toString()}`);
    return r.stdout.toString();
  };

  await download(ZIP, "doom19s.zip");
  run(["unzip", "-q", "-o", "doom19s.zip", "DOOM1.WAD", "README.TXT"]);
  const wad = new Uint8Array(await Bun.file(join(tmp, "DOOM1.WAD")).arrayBuffer());
  if (wad.length !== WAD.size || hash("md5", wad) !== WAD.md5 || hash("sha1", wad) !== WAD.sha1 || hash("sha256", wad) !== WAD.sha256) {
    throw new Error("DOOM1.WAD doesn't match the published v1.9 shareware hashes");
  }
  await Bun.write(join(out, "DOOM1.WAD"), wad);
  await Bun.write(join(out, "README.TXT"), Bun.file(join(tmp, "README.TXT")));

  await download(DEBIAN, "debian.tar.xz");
  const copyright = run(["tar", "-xJOf", "debian.tar.xz", "debian/copyright"]);
  const lines = copyright.split("\n");
  const disclaimer = lines.slice(lines.findIndex((l) => l.startsWith("Disclaimer:")) + 1, lines.findIndex((l) => l.startsWith("Files: doom1.wad")));
  const license = lines.slice(lines.findIndex((l) => l.startsWith("License: id-software-license")) + 1, lines.findIndex((l) => l.startsWith("Files: debian")));
  const unfold = (ls: string[]): string => ls.map((l) => (l.trim() === "." ? "" : l.replace(/^ /, ""))).join("\n").trim();
  await Bun.write(
    join(out, "LICENSE-DOOM1.TXT"),
    `${LICENSE_HEADER}\n${TRADEMARK_NOTICE}\nSHA-256 ${WAD.sha256}\n\n${unfold(license)}\n\n----\n\nDistribution (from Debian's doom-wad-shareware copyright file):\n\n${unfold(disclaimer)}\n`,
  );
  verifyDoomAssets();
  console.log(`DOOM1.WAD ${wad.length} bytes, sha256 ${WAD.sha256} ✓`);
}
