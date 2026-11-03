import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { defaultFocusPadMessages, FocusPad } from "@textjs/react/dom";
import { FocusPadMessage, type FocusPadConsole, type FocusPadState } from "../../../packages/react/src/dom/FocusPad";
import { DOOM_ERROR_HINTS, DOOM_LOADING_HINTS, PAGE_HINTS, PRESETS } from "../src/console-companion/store";
import { CERTIFICATE_HINTS, CHAPTERS, OVERVIEW_HINTS } from "../src/learn/course";
import { extractMessages, readCatalog } from "../scripts/i18n/sources";
import { PAD_MESSAGES, padHints, padText } from "../src/site/pad-messages";

/** Every demo the site shows on a pad: the Playground's, OpenCode and terminal.shop, Doom's states and Learn. */
const PAD_HINT_SETS = [...PRESETS, PAGE_HINTS.opencode, PAGE_HINTS.terminal, DOOM_LOADING_HINTS, DOOM_ERROR_HINTS, ...CHAPTERS, OVERVIEW_HINTS, CERTIFICATE_HINTS];
/** Commands read the same in every language. */
const KEEP = new Set(["text run"]);

/** The catalog keys `pad-messages.tsx` marks. */
const padKeys = (): string[] => [...extractMessages().values()].filter((m) => m.files.includes("src/site/pad-messages.tsx")).map((m) => m.key);

describe("focus pad strings", () => {
  test("in English, the site's pad is the package's pad (apart from the size control's \"Custom size\")", () => {
    expect(Object.keys(PAD_MESSAGES).sort()).toEqual(Object.keys(defaultFocusPadMessages).sort());
    const hints = [{ keys: "← →", label: "switch region" }];
    // The prerendered (open) state, with hydration markers.
    const pad = (messages?: Partial<typeof PAD_MESSAGES>): string => renderToString(<FocusPad root={null} hints={hints} action="press ← →" sizeControl messages={messages} />);
    // One English difference: the size option reads "Custom size", because the catalog's "Custom" is a price.
    expect(PAD_MESSAGES.custom).toBe("Custom size");
    expect(pad(PAD_MESSAGES)).toBe(pad({ custom: "Custom size" }));
    for (const state of ["open", "click", "live"] as FocusPadState[]) {
      for (const devtools of [null, "chromium-mac", "safari", "firefox-other"] as (FocusPadConsole | null)[]) {
        for (const h of [hints, []]) {
          const render = (messages = defaultFocusPadMessages): string => renderToStaticMarkup(<FocusPadMessage state={state} hints={h} doThis="press ← →" devtools={devtools} messages={messages} />);
          expect(render(PAD_MESSAGES)).toBe(render());
        }
      }
    }
  });

  test("every hint label and action on a pad can be translated", () => {
    const marked = new Set(padKeys());
    const missing = PAD_HINT_SETS.flatMap((s) => [s.action, ...s.hints.map((h) => h.label)]).filter((text) => !KEEP.has(text) && !marked.has(text));
    expect([...new Set(missing)]).toEqual([]);
    expect(padText("switch region")).toBe("switch region");
    expect(padHints([{ keys: "↑ ↓", label: "count" }, { keys: "Enter", label: "text run" }])).toEqual([{ keys: "↑ ↓", label: "count" }, { keys: "Enter", label: "text run" }]);
  });

  test("Japanese translates every pad string", () => {
    const ja = readCatalog("ja");
    const keys = padKeys();
    expect(keys.length).toBeGreaterThan(50);
    expect(keys.filter((k) => typeof ja[k] !== "string" || ja[k] === "")).toEqual([]);
  });
});
