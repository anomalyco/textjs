import { readFileSync } from "node:fs";
import { join } from "node:path";

export const REPO = join(import.meta.dir, "../../..");
export const WAD_PATH = join(REPO, "apps/web/public/doom/DOOM1.WAD");

export interface Lump {
  index: number;
  name: string;
  data: Uint8Array;
}

/** The IWAD's directory. Lump indices match the engine's (one WAD, so `W_CheckNumForName` returns these). */
export function readWad(path = WAD_PATH): Lump[] {
  const buf = new Uint8Array(readFileSync(path));
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = dv.getInt32(4, true);
  const dir = dv.getInt32(8, true);
  const lumps: Lump[] = [];
  for (let i = 0; i < count; i++) {
    const o = dir + i * 16;
    const pos = dv.getInt32(o, true);
    const size = dv.getInt32(o + 4, true);
    const name = new TextDecoder().decode(buf.subarray(o + 8, o + 16)).replace(/\0.*$/, "");
    lumps.push({ index: i, name, data: buf.subarray(pos, pos + size) });
  }
  return lumps;
}
