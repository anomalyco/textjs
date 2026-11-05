/**
 * `<text-console>`: the parts that don't need a browser. The element itself
 * runs in Chromium in `embed-e2e.test.ts`.
 */

import { describe, expect, test } from "bun:test";
import { ATTR_BOLD, CellBuffer, CssConsoleDriver, packRGBA } from "@textjs/core";
import { focusPadState } from "@textjs/react/dom";
import { embedHub } from "../src/embed/hub";
import type { HostInput } from "../src/embed/host-input";
import { publishEmbed } from "../src/embed/mirror";
import { consoleRuns, keycapMatches, parseHints, shortcutKeys, textConsoleState } from "../src/embed/text-console-element";
import { reserveCss } from "../src/embed/reserve";
import { createEmbedEntry, textConsoleConfig, textConsoleReserveCss } from "../src/server/embed";
import { compileShellCalls, createShellReplayCode, shellData } from "../src/server/ppr";
import { FakeConsole } from "./helpers";

describe("<text-console> states", () => {
  test("open, click and live as <FocusPad> has them, for every signal", () => {
    for (let bits = 0; bits < 16; bits++) {
      const [focused, engaged, devtools, keySeen] = [1, 2, 4, 8].map((b) => (bits & b) !== 0) as [boolean, boolean, boolean, boolean];
      expect({ bits, state: textConsoleState(focused, engaged, devtools, keySeen) }).toEqual({
        bits,
        state: focusPadState({ pageFocused: focused, capturing: engaged, devtoolsLikelyOpen: devtools, keySeen }),
      });
    }
  });

  test("the DevTools console shortcut for each browser", () => {
    expect(shortcutKeys(true, "chromium")).toBe("⌘ ⌥ J");
    expect(shortcutKeys(false, "chromium")).toBe("Ctrl Shift J");
    expect(shortcutKeys(true, "firefox")).toBe("⌘ ⌥ K");
    expect(shortcutKeys(false, "firefox")).toBe("Ctrl Shift K");
    expect(shortcutKeys(true, "safari")).toBe("⌘ ⌥ C");
  });
});

describe("<text-console> attributes", () => {
  test("hints: comma-separated keys:label pairs, and a key can be a colon", () => {
    expect(parseHints("← →:switch region")).toEqual([{ keys: "← →", label: "switch region" }]);
    expect(parseHints(" ↑ ↓ : move , Enter:open,  ")).toEqual([
      { keys: "↑ ↓", label: "move" },
      { keys: "Enter", label: "open" },
    ]);
    expect(parseHints("::command, q")).toEqual([
      { keys: ":", label: "command" },
      { keys: "q", label: "" },
    ]);
    expect(parseHints("")).toEqual([]);
  });

  test("keycaps light for the key pressed", () => {
    expect(keycapMatches("←", "ArrowLeft")).toBe(true);
    expect(keycapMatches("Space", " ")).toBe(true);
    expect(keycapMatches("Enter", "Enter")).toBe(true);
    expect(keycapMatches("W/A/S/D", "a")).toBe(true);
    expect(keycapMatches("q", "Q")).toBe(true);
    expect(keycapMatches("←", "ArrowRight")).toBe(false);
  });

  test("title, hints and action fall back to text.config.ts; the element sizes itself with the CSS a page would write", () => {
    const config = { title: "Acme", hints: [{ keys: "← →", label: "switch" }], action: "type a prompt", viewport: { width: 100, height: 28 } };
    const page = textConsoleReserveCss(config);
    const { css, ...rest } = textConsoleConfig(config);
    expect(rest).toEqual({ title: "Acme", hints: [{ keys: "← →", label: "switch" }], action: "type a prompt" });
    expect(css).toBe(page.replaceAll("text-console:is([mirror],[chrome])", ":host(:is([mirror],[chrome]))").replaceAll("text-console[chrome]", ":host([chrome])").replaceAll("text-console:not([mirror],[chrome])", ":host(:not([mirror],[chrome]))").replaceAll("text-console{", ":host{"));
    expect(textConsoleConfig({}).css).toContain("aspect-ratio:882/522");
  });

  test("reserved size: a 58px bar, and a mirror at the grid's ratio for a 7.2×14px cell, 43px taller with chrome", () => {
    const css = reserveCss(100, 20);
    expect(css).toBe(
      "text-console{display:block;min-height:58px}" +
        "text-console:is([mirror],[chrome]){position:relative;box-sizing:content-box;min-height:0;max-width:738px;aspect-ratio:738/298}" +
        "text-console[chrome]{padding-top:43px}" +
        "@media (hover:none) and (pointer:coarse){text-console:not([mirror],[chrome]){display:none}}",
    );
  });
});

describe("<text-console mirror> frames", () => {
  test("a format string as runs: %% is a percent sign and embed.js's curtain is dropped", () => {
    expect(consoleRuns("%c\u200b%c\n%cab%%c%c d", ["line-height:100vh;", "", "color:red;", "color:blue;"])).toEqual([
      ["ab%c", "color:red;"],
      [" d", "color:blue;"],
    ]);
    expect(consoleRuns("plain %cx", ["color:red;"])).toEqual([
      ["plain ", ""],
      ["x", "color:red;"],
    ]);
  });

  test("live frames have the CSS embed.js's first frame has, and none until the app paints", () => {
    const buffer = new CellBuffer(24, 3);
    const hub = embedHub();
    let notified = 0;
    const listener = (): void => void notified++;
    hub.listeners.add(listener);
    try {
      const published = publishEmbed(() => buffer, { engaged: true } as HostInput);
      expect(notified).toBe(1);
      expect(hub.app?.frame()).toBeNull();
      expect(hub.app?.engaged()).toBe(true);
      for (const [i, ch] of [..."Acme 100%"].entries()) buffer.setCell(i, 1, ch, packRGBA(69, 165, 87), packRGBA(10, 10, 10), ATTR_BOLD);
      published.frame();
      expect(notified).toBe(2);
      const [format, css, cols, rows] = hub.app?.frame() as [string, string[], number, number];
      expect([cols, rows]).toEqual([24, 3]);
      // What embed.js's first frame carries for inline consoles: the same driver, with its curtain.
      const con = new FakeConsole();
      new CssConsoleDriver({ console: con, browser: "firefox", curtain: true, initialClear: false }).render(buffer, { force: true });
      const [shellFormat, ...shellCss] = con.logs[0] as [string, ...string[]];
      expect(consoleRuns(format, css)).toEqual(consoleRuns(shellFormat, shellCss));
      expect(consoleRuns(format, css).map(([t]) => t).join("")).toContain("Acme 100%");
      expect(css.every((c) => c === "" || c.includes("line-height:14px"))).toBe(true);
      // An unchanged buffer (a focus hint blinking in the console only) keeps the frame elements drew.
      const drawn = hub.app?.frame();
      published.frame();
      expect(hub.app?.frame()).toBe(drawn);
      published.dispose();
      expect(hub.app).toBeNull();
      expect(notified).toBe(4);
    } finally {
      hub.listeners.delete(listener);
    }
  });
});

describe("embed.js and <text-console>", () => {
  const shell = compileShellCalls([{ method: "log", args: ["%cA", "color:red"], inlineArgs: ["color:red;line-height:14px"] }]);

  test("embed.js shares its first frame with the element, which it loads only for the tag", () => {
    const code = createEmbedEntry({ shell, runtime: "./assets/embed-client-x.js", element: "./assets/text-console-x.js", loader: "loader" });
    expect(code).toContain(`const S = ${shellData(shell)};`);
    expect(code).toContain(createShellReplayCode(shell, { data: "S" }));
    expect(code).toContain(`(e) => import("./assets/text-console-x.js").then((m) => m.mount(e, S))`);
    const none = createEmbedEntry({ shell: null, runtime: "./r.js", element: "./e.js", loader: "loader" });
    expect(none).toContain(`import("./e.js").then((m) => m.mount(e))`);
    expect(none).not.toContain("const S");
  });

  test("the shared frame replays as the inlined one does", () => {
    const con = new FakeConsole();
    const S = JSON.parse(shellData(shell)) as unknown;
    new Function("console", "S", `return ${createShellReplayCode(shell, { data: "S" })}`)(con, S);
    const inlined = new FakeConsole();
    new Function("console", `return ${createShellReplayCode(shell)}`)(inlined);
    expect(con.logs).toEqual(inlined.logs);
    expect(() => createShellReplayCode(shell, { data: "S", path: "/" })).toThrow();
  });
});
