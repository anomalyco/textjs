import { afterAll, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import { renderToAnsi } from "@textjs/core";
import { TEAM_EGGS } from "../src/console-companion/team";
import { mount } from "./helpers";

/**
 * The team eggs draw their portraits with `<Image>`. Outside sprite-capable consoles (tests,
 * terminals, ANSI exports) their first frame must stay the 1.3.0 half-blocks, cell for cell.
 */

function digest(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

const GOLDEN: Record<string, string> = {
  "dax": "dbb4baaf",
  "stefan": "453e45c4",
  "tas": "3738466d",
  "jay": "c0a23dea",
  "aiden": "2b7e608a",
  "michelle": "146a11ca",
  "juliana": "4b79b398",
  "daniel": "cd82d1e6",
  "filip": "6a835fc2",
  "bob": "9f9a191a",
  "alan": "1e1762b4",
  "kit": "7c3fdc6a",
  "frank": "3f7e30c5",
  "david": "652eacdd",
  "sebastian": "9f998df9",
  "ryan": "2f845814",
  "bailey": "e02d9dd5",
  "victor": "e7e6335a",
  "luke": "cb5b4a98",
  "brendan": "3982f0a5",
  "james": "0020e678",
  "dan": "30b0c34f",
  "jamie": "fe557863",
  "simon": "71c7c610",
  "jack": "859e4352",
  "ludvig": "ba96183f",
  "aarav": "ef2d4c9a",
  "kamil": "d65cfd8e",
  "walter": "d74e5876",
};

beforeAll(() => setSystemTime(new Date("2026-06-01T12:00:00Z")));
afterAll(() => setSystemTime());

describe("team eggs: <Image> output", () => {
  for (const egg of TEAM_EGGS) {
    test(`${egg.person}: first frame text and ANSI match the 1.3.0 half-blocks`, async () => {
      const h = await mount(<egg.View word={egg.names[0] as string} />, { cols: 120, rows: 36, tabFocus: false });
      const got = digest(`${h.frame()}\n--\n${renderToAnsi(h.root.renderer.buffer)}`);
      await h.unmount();
      if (process.env.IMAGE_GOLDEN) console.log(`GOLDEN ${JSON.stringify(egg.id)}: "${got}",`);
      else expect(got).toBe(GOLDEN[egg.id] as string);
    });
  }
});
