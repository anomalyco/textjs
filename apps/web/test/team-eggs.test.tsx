import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CompanionApp } from "../src/console-companion/App";
import { siteStore } from "../src/console-companion/store";
import { fnv1a, gatePath, GATES, matchGate } from "../src/console-companion/team-gate";
import { TEAM_EGGS } from "../src/console-companion/team";
import { ludvigStep, PIN, pushBack } from "../src/console-companion/team/eggs/ludvig";
import { CHIPS, MULT } from "../src/console-companion/team/eggs/brendan";
import { render } from "../src/entry-server";
import { resetLocation } from "../src/router";
import { mount, type Harness } from "./helpers";

async function site(fn: () => void): Promise<void> {
  await act(async () => fn());
}

/** What each egg shows, and the page that hosts it (from the registry). */
const MARKERS: Record<string, string> = {
  dax: "Light angle",
  stefan: "We're all ears",
  tas: "Flying away from the redlines",
  jay: "Sleeve length",
  aiden: "American traditional",
  michelle: "Same as Across",
  juliana: '"is money even real"',
  daniel: "Daniel's Chicken Coop",
  filip: "Bakery taken (grandmas)",
  bob: "Kitchen, ca. 2000",
  alan: "Normal Alan",
  kit: "There Won't Be Blog",
  frank: "we're a gaming company now!",
  david: "Heinz #e85d26",
  sebastian: "Flughafenwartezeitgetränk",
  ryan: "Slack Premium Verified",
  bailey: "Liquid grapes",
  victor: "Astral plane · 4th Jhana · gracias amigo",
  luke: "Throne of Glass",
  brendan: "Royal Flush",
  james: "Liquid Glass",
  dan: '"a young one"',
  jamie: "Morning!",
  simon: "SH-101",
  jack: "Unbeatable in forest",
  ludvig: "Undefeated",
  aarav: ":aarav_style_doom_rage_avatar:",
  kamil: ":kamil_style_doom_rage_avatar:",
  walter: "HKG → CDG → SJO",
};

const HOME_TAB = new Set(["/", "/enterprise", "/store", "/status", "/changelog", "/blog"]);

async function open(path: string): Promise<Harness> {
  await site(() => {
    siteStore.syncRoute(path);
    siteStore.set({ consoleInput: true });
  });
  return mount(<CompanionApp />, HOME_TAB.has(path) ? { cols: 100, rows: 26, tabFocus: false } : { cols: 120, rows: 36, tabFocus: false });
}

/** Lets the lazy team chunk resolve. */
async function settle(h: Harness): Promise<string> {
  for (let i = 0; i < 20 && siteStore.getSnapshot().teamEgg === null; i++) await h.wait(10);
  await h.wait(10);
  return h.frame();
}

describe("team eggs: gate", () => {
  test("every name's hash is in the main bundle's gate list, and nothing else is", () => {
    const hashes = TEAM_EGGS.flatMap((e) => e.names.map((n) => fnv1a(`${e.path}:${n}`)));
    expect(new Set(hashes)).toEqual(GATES);
    expect(hashes.length).toBe(GATES.size);
  });

  test("the main bundle's companion files name no one", () => {
    const names = TEAM_EGGS.flatMap((e) => e.names);
    for (const file of ["team-gate.ts", "App.tsx", "store.ts", "boot.tsx"]) {
      const src = readFileSync(join(import.meta.dir, "../src/console-companion", file), "utf8");
      for (const n of names) expect(src).not.toMatch(new RegExp(`["'\`]${n}["'\`]`));
    }
  });

  test("two eggs never share a page and a name, and every Playground route is the Playground", () => {
    const keys = TEAM_EGGS.flatMap((e) => e.names.map((n) => `${e.path}:${n}`));
    expect(new Set(keys).size).toBe(keys.length);
    expect(gatePath("/playground/snake")).toBe("/playground");
    expect(gatePath("/playground/")).toBe("/playground");
    expect(gatePath("/docs/caching/")).toBe("/docs/caching");
    expect(gatePath("/opencode")).toBe("/opencode");
  });

  test("letters a text field took don't count; a list's j and k do", () => {
    const typed = (word: string, free: (ch: string, i: number) => boolean) => word.split("").map((ch, i) => ({ ch, free: free(ch, i) }));
    expect(matchGate("/docs/caching", typed("jack", () => true))?.word).toBe("jack");
    expect(matchGate("/docs/caching", typed("jack", (ch) => ch !== "j" && ch !== "k"))?.word).toBe("jack");
    expect(matchGate("/docs/caching", typed("jack", () => false))).toBeNull();
    expect(matchGate("/docs/caching", typed("jack", (ch) => ch !== "a"))).toBeNull();
    expect(matchGate("/docs/caching", typed("xxjack", () => true))).toEqual({ word: "jack", start: 2 });
    expect(matchGate("/docs/fonts", typed("jack", () => true))).toBeNull();
  });
});

describe("team eggs", () => {
  let logs: ReturnType<typeof spyOn>[] = [];
  beforeEach(() => {
    logs = (["log", "info", "warn", "error", "debug"] as const).map((m) => spyOn(console, m));
  });
  afterEach(async () => {
    for (const spy of logs) {
      // No console output besides the companion's own frames (which go to the harness's console).
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    await site(() => siteStore.reset());
  });
  afterAll(() => resetLocation("/"));

  for (const egg of TEAM_EGGS) {
    const name = egg.names[0] as string;
    const marker = MARKERS[egg.id] as string;
    test(`${egg.person}: "${name}" on ${egg.path} opens it, Esc closes it`, async () => {
      expect(marker).toBeDefined();
      const h = await open(egg.path);
      const before = h.frame();
      expect(before).not.toContain(marker);
      await h.type(name);
      const f = await settle(h);
      expect(siteStore.getSnapshot().teamEgg).toBe(egg.id);
      expect(f).toContain(marker);
      expect(f).toContain("Esc back");
      await h.key("escape");
      expect(siteStore.getSnapshot().teamEgg).toBeNull();
      expect(h.frame()).not.toContain(marker);
      expect(h.frame()).toBe(before);
      await h.unmount();
    });

    test(`${egg.person}: "${name}" does nothing on other pages`, async () => {
      const other = egg.path === "/docs/routing" ? "/docs" : "/docs/routing";
      const h = await open(other);
      await h.type(name);
      await settle(h);
      expect(siteStore.getSnapshot().teamEgg).toBeNull();
      expect(h.frame()).not.toContain(marker);
      await h.unmount();
    });
  }

  test("the page's prerendered HTML is the same with an egg open", async () => {
    for (const egg of TEAM_EGGS) {
      const html = await render(egg.path);
      siteStore.set({ teamEgg: egg.id });
      expect(await render(egg.path)).toBe(html);
      siteStore.set({ teamEgg: null });
    }
  });

  test("navigating away closes the egg", async () => {
    const h = await open("/docs/caching");
    await h.type("jack");
    await settle(h);
    expect(siteStore.getSnapshot().teamEgg).toBe("jack");
    await site(() => siteStore.syncRoute("/docs/fonts"));
    expect(siteStore.getSnapshot().teamEgg).toBeNull();
    await h.unmount();
  });

  test("names typed into the docs search, or with console input off, do nothing", async () => {
    const h = await open("/docs/caching");
    await h.key("/", { input: "/" });
    await h.type("jack");
    await settle(h);
    expect(siteStore.getSnapshot().teamEgg).toBeNull();
    expect(h.frame()).toContain("jack");
    await h.key("escape");
    await site(() => siteStore.set({ consoleInput: false }));
    await h.type("jack");
    await settle(h);
    expect(siteStore.getSnapshot().teamEgg).toBeNull();
    await h.unmount();
  });

  test("OpenCode's composer and terminal.shop never open an egg; every Playground route does", async () => {
    for (const path of ["/opencode", "/terminal"]) {
      const h = await open(path);
      await h.type("kit");
      await settle(h);
      expect(siteStore.getSnapshot().teamEgg).toBeNull();
      await h.unmount();
    }
    for (const path of ["/playground", "/playground/streaming", "/playground/snake"]) {
      const h = await open(path);
      await h.type("frank");
      expect(await settle(h)).toContain("we're a gaming company now!");
      await h.unmount();
      await site(() => siteStore.reset());
    }
  });

  test("letters pressed slower than 1.5s apart start over", async () => {
    const h = await open("/docs/caching");
    await h.type("ja");
    await h.wait(1600);
    await h.type("ck");
    await settle(h);
    expect(siteStore.getSnapshot().teamEgg).toBeNull();
    await h.unmount();
  });

  test("on /enterprise the t in stefan cycles the theme on the way in, and the egg puts it back", async () => {
    const h = await open("/enterprise");
    const theme = siteStore.getSnapshot().theme;
    await h.type("stefan");
    await settle(h);
    expect(siteStore.getSnapshot().teamEgg).toBe("stefan");
    expect(siteStore.getSnapshot().theme).toBe(theme);
    await h.unmount();
  });

  test("Stefan's ears grow and shrink, down to L", async () => {
    const h = await open("/enterprise");
    await h.type("stefan");
    expect(await settle(h)).toContain("XXL");
    await h.key("up");
    expect(h.frame()).toContain("3XL");
    for (let i = 0; i < 6; i++) await h.key("down");
    expect(h.frame()).toMatch(/Ear size\s+L\b/);
    await h.unmount();
  });

  test("bigal opens Big Al; Enter turns Alan into Big Al", async () => {
    const h = await open("/learn");
    await h.type("bigal");
    expect(await settle(h)).toContain('alan "big al" rice');
    await h.key("return");
    expect(h.frame()).toContain("Normal Alan");
    await h.key("return");
    expect(h.frame()).toContain("The goat's gone out to pasture. Gabish.");
    await h.unmount();
  });

  test("Ludvig always wins", () => {
    // However hard you push, every pattern ends with Ludvig pinning you.
    for (const pushesPerTick of [0, 1, 2, 5, 20]) {
      let angle = 0;
      let ticks = 0;
      while (angle < PIN && ticks < 2000) {
        for (let i = 0; i < pushesPerTick; i++) angle = pushBack(angle);
        expect(angle).toBeGreaterThanOrEqual(-60);
        angle = ludvigStep(angle, ticks++);
      }
      expect(angle).toBe(PIN);
    }
  });

  test("Ludvig's record counts up and stays undefeated", async () => {
    const h = await open("/docs/components-forms");
    await h.type("ludvig");
    expect(await settle(h)).toContain("0–0");
    for (let i = 0; i < 80 && !h.frame().includes("Ludvig wins"); i++) await h.wait(120);
    expect(h.frame()).toContain("Ludvig wins");
    expect(h.frame()).toContain("1–0");
    await h.unmount();
  }, 15_000);

  test("Brendan's royal flush scores Balatro's 100 × 8 plus the cards' chips", async () => {
    expect(CHIPS).toBe(151);
    const h = await open("/docs/keyboard");
    await h.type("brendan");
    await settle(h);
    await h.key("space");
    await h.wait(1700);
    expect(h.frame()).toContain(`151 × ${MULT} = 1,208`);
    await h.unmount();
  });

  test("Space, c and d do their thing", async () => {
    const cases: Array<[string, string, string, string, string]> = [
      ["/docs/styling", "david", "space", "Beans     22", "Beans     34"],
      ["/docs/devtools-extension", "ryan", "c", "▮▮▮▮▮▮▮▮ 8", "▮▮▮▮▮▮▮▮▮ 9"],
      ["/docs/components-content", "james", "space", "8/8 wedges", "7/8 wedges"],
      ["/store", "aiden", "space", "4 of 9", "5 of 9"],
      ["/playground", "kit", "space", "0 happy", "1 happy"],
    ];
    for (const [path, name, key, before, after] of cases) {
      const h = await open(path);
      await h.type(name);
      expect(await settle(h)).toContain(before);
      await h.key(key, key === "space" ? { input: " " } : {});
      expect(h.frame()).toContain(after);
      await h.unmount();
      await site(() => siteStore.reset());
    }
  });
});
