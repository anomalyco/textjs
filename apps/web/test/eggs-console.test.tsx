import { afterAll, describe, expect, test } from "bun:test";
import { act } from "react";
import { CompanionApp } from "../src/console-companion/App";
import { siteStore } from "../src/console-companion/store";
import { DashboardDemo } from "../src/demos/Dashboard";
import { partsFromSteps, scriptFor } from "../src/demos/opencode/model";
import { render } from "../src/entry-server";
import { getLocation, resetLocation } from "../src/router";
import { mount } from "./helpers";
import { VIEWPORT_SOURCE, viewportConsole } from "../src/console-companion/viewport-console";

async function site(fn: () => void): Promise<void> {
  await act(async () => fn());
}

describe("/errors/TX020", () => {
  afterAll(() => resetLocation("/"));

  test("How to fix it says there is no text deploy and links to Deploying", async () => {
    const html = await render("/errors/TX020");
    expect(html).toContain("There is no <code>text deploy</code>.");
    expect(html).toContain("<code>text build --adapter &lt;name&gt;</code>");
    expect(html).toContain('href="/docs/deploying"');
  });
});

describe("OpenCode sandbox: center a div", () => {
  afterAll(async () => site(() => siteStore.reset()));

  test("any build prompt that mentions a div reaches the script, ahead of the fix and style branches", () => {
    for (const prompt of ["how do I center a div?", "fix the div", "style the div", "Center this <div>"]) {
      const parts = partsFromSteps(scriptFor(prompt, "build"));
      expect(parts[0]).toMatchObject({ type: "reasoning", text: "Wrapping the heading in a centered div." });
    }
    expect(partsFromSteps(scriptFor("divide the list", "build"))[0]).not.toMatchObject({ text: "Wrapping the heading in a centered div." });
    // Plan mode stays read-only.
    expect(partsFromSteps(scriptFor("center a div", "plan")).some((p) => p.type === "tool" && p.tool === "edit")).toBe(false);
  });

  test("the agent writes a <div>, the real lint rule catches it, and <Center> fixes it", () => {
    const parts = partsFromSteps(scriptFor("how do I center a div?", "build"));
    const tools = parts.flatMap((p) => (p.type === "tool" ? [p] : []));
    expect(tools.map((t) => `${t.tool} ${t.title}`)).toEqual(["edit app/page.tsx", "shell bun run lint", "edit app/page.tsx", "shell bun run lint"]);
    const [wrap, lint, fix, relint] = tools;
    const divLine = wrap?.diff?.after.split("\n")[5] ?? "";
    expect(divLine.indexOf("div") + 1).toBe(8);
    expect(lint?.output).toContain(
      "app/page.tsx\n  6:8  error  <div> is a DOM element; the console renderer only draws Text.js components (TX003). Use <Box> instead  textjs/no-dom-elements\n\n✖ 1 problem (1 error, 0 warnings)",
    );
    expect(fix?.diff?.before).toBe(wrap?.diff?.after);
    expect(fix?.diff?.after).toContain('import { Box, Center, Text } from "@textjs/next";');
    expect(fix?.diff?.after).toContain("<Center>\n        <Text bold>Sessions</Text>\n      </Center>");
    expect(fix?.diff?.after).not.toContain("div");
    expect(relint?.output).toBe("$ eslint .");
    expect(parts.at(-1)).toEqual({ type: "text", text: "`<div>` can't render in the console (TX003). I used `<Center>`, which centers its children on both axes." });
  });

  test("it plays in the console's OpenCode sandbox", async () => {
    await site(() => siteStore.syncRoute("/opencode"));
    const h = await mount(<CompanionApp />, { cols: 120, rows: 60, tabFocus: false });
    await h.type("how do I center a div?");
    await h.key("return");
    let f = "";
    for (let i = 0; i < 40 && !f.includes("which centers its children on both axes"); i++) {
      await h.wait(250);
      f = h.frame();
    }
    expect(f).toContain("which centers its children on both axes");
    expect(f).toContain("bun run lint");
    await h.unmount();
  });
});

describe("Dashboard: dev1", () => {
  test("the fifth region shows this renderer's own stats", async () => {
    const h = await mount(<DashboardDemo />, { cols: 100, rows: 26 });
    let f = h.frame();
    expect(f).toContain("iad1  sfo1  fra1  hnd1  dev1");
    expect(f).toContain("Requests / s");
    for (let i = 0; i < 4; i++) await h.key("right");
    f = h.frame();
    expect(f).toContain("Frames / s");
    expect(f).toContain("Frame time");
    expect(f).toContain("%c spans");
    expect(f).not.toContain("Requests / s");
    // The next series tick re-renders with the stats of the frame just emitted.
    const s = h.root.renderer.stats();
    expect(s.frameCount).toBeGreaterThan(0);
    await h.wait(950);
    f = h.frame();
    const values = f.split("\n").find((l) => l.includes("ms") && !l.includes("Frame time")) ?? "";
    expect(values.split(/\s+/).filter(Boolean)).toEqual([s.fps.toFixed(1), `${s.totalMs.toFixed(3)}ms`, String(s.spanCount)]);
    await h.key("right");
    expect(h.frame()).toContain("Requests / s");
    await h.unmount();
  });

  test("the region row fits the narrowest console (40 cols)", async () => {
    const h = await mount(<DashboardDemo />, { cols: 40, rows: 26 });
    expect(h.frame().split("\n")[0]).toBe("  iad1  sfo1  fra1  hnd1  dev1");
    await h.unmount();
  });
});

/** Just enough of `window` for `navigate()`. */
function fakeWindow(pathname: string): { restore(): void; pushed: string[] } {
  const g = globalThis as { window?: unknown };
  const prev = g.window;
  const pushed: string[] = [];
  const location = { href: `https://textjs.org${pathname}`, origin: "https://textjs.org", assign: () => undefined };
  g.window = { location, history: { pushState: (_s: unknown, _t: string, url: string) => pushed.push(url), replaceState: () => undefined } };
  return { pushed, restore: () => void (g.window = prev) };
}

describe("404 in the console", () => {
  afterAll(async () => {
    await site(() => resetLocation("/"));
    await site(() => siteStore.reset());
  });

  test("an unknown path shows Next's 404, centered, with Enter to go home", async () => {
    await site(() => resetLocation("/this-page-does-not-exist"));
    const h = await mount(<CompanionApp />, { cols: 100, rows: 26, tabFocus: false });
    const f = h.frame();
    const lines = f.split("\n");
    expect(siteStore.getSnapshot().tab).toBe("home");
    expect(lines[1]?.trim()).toBe("▼ Text.js");
    const row = lines.find((l) => l.includes("404")) ?? "";
    expect(row.trim()).toBe("404 │ This page could not be found.");
    const left = row.indexOf("404");
    const right = 100 - (left + "404 │ This page could not be found.".length);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
    expect(lines.at(-1)?.trim()).toBe("Enter home");
    expect(f).not.toContain("React 19 in console.log");

    const w = fakeWindow("/this-page-does-not-exist");
    try {
      await h.key("return");
    } finally {
      w.restore();
    }
    expect(w.pushed).toEqual(["/"]);
    expect(getLocation().pathname).toBe("/");
    expect(h.frame()).toContain("React 19 in console.log");
    expect(h.frame()).not.toContain("could not be found");
    await h.unmount();
  });

  test("real pages that share the Home view are not 404s", async () => {
    const h = await mount(<CompanionApp />, { cols: 100, rows: 26, tabFocus: false });
    for (const path of ["/", "/changelog", "/status", "/errors/TX020", "/enterprise"]) {
      await site(() => resetLocation(path));
      expect(h.frame()).not.toContain("could not be found");
    }
    await site(() => resetLocation("/docs/no-such-doc"));
    // /docs/* keeps the Docs view.
    expect(h.frame()).not.toContain("could not be found");
    await h.unmount();
  });
});

describe("blog posts in the console", () => {
  afterAll(async () => {
    await site(() => resetLocation("/"));
    await site(() => siteStore.reset());
  });

  test("a post is readable and scrollable, with its title and date", async () => {
    await site(() => resetLocation("/blog/the-inverted-architecture"));
    expect(siteStore.getSnapshot().tab).toBe("blog");
    const h = await mount(<CompanionApp />, { cols: 100, rows: 26, tabFocus: false });
    let f = h.frame();
    for (let i = 0; i < 20 && !f.includes("The Inverted Architecture"); i++) {
      await h.wait(25);
      f = h.frame();
    }
    const lines = f.split("\n");
    expect(lines[1]?.trim()).toMatch(/^▼ Text.js +\/ blog$/);
    // The right column is the ScrollBox's scrollbar.
    expect(lines[3]?.slice(0, -1).trim()).toBe("The Inverted Architecture");
    expect(lines[4]?.slice(0, -1).trim()).toBe("October 31, 2026");
    expect(f).toContain("Our logo is ▼.");
    expect(lines.at(-1)?.trim()).toBe("↑ ↓ scroll");
    expect(f).not.toContain("What the page sees");
    for (let i = 0; i < 60; i++) await h.key("down");
    f = h.frame();
    expect(f).not.toContain("Our logo is ▼.");
    expect(f).toContain("What the page sees");
    for (let i = 0; i < 60; i++) await h.key("up");
    expect(h.frame()).toContain("Our logo is ▼.");

    await site(() => resetLocation("/blog/text-js-1-0"));
    f = h.frame();
    expect(f).toContain("Today we're releasing Text.js 1.0");
    for (let i = 0; i < 60; i++) await h.key("down");
    expect(h.frame()).toMatch(/Full repaint \(layout, paint, encode\) +│ +0\.163ms/);

    await site(() => resetLocation("/blog/no-such-post"));
    f = h.frame();
    expect(f).toContain("404 │ This page could not be found.");
    expect(f.split("\n")[1]?.trim()).toBe("▼ Text.js");

    await site(() => resetLocation("/blog"));
    expect(siteStore.getSnapshot().tab).toBe("home");
    expect(h.frame()).toContain("React 19 in console.log");
    await h.unmount();
  });
});

describe("Ctrl+` opens Text.js DevTools", () => {
  afterAll(async () => {
    await site(() => resetLocation("/"));
    await site(() => siteStore.reset());
  });

  test("the real inspector opens without a pill, F2 stays the wireframe key, T and W drive the site", async () => {
    await site(() => resetLocation("/docs/routing"));
    const h = await mount(<CompanionApp />, { cols: 120, rows: 36, tabFocus: false });
    const before = h.frame();
    expect(before).not.toContain("[▼]");
    expect(before).not.toContain("Text.js DevTools");

    // F2: wireframe on, no panel.
    await h.key("f2");
    expect(h.frame()).not.toContain("Text.js DevTools");
    expect(h.frame()).toContain("┌");
    await h.key("f2");
    expect(h.frame()).toBe(before);

    await h.key("`", { ctrl: true });
    let f = h.frame();
    expect(f).toContain("Text.js DevTools · Turbolog");
    for (const label of ["FRAME", "TOGGLES", "ROUTE", "%c spans", "noop frames", "120×36 cells"]) expect(f).toContain(label);
    expect(f).toMatch(/pathname +—|pathname +\//);
    expect(f).toContain("[W] wire  off");
    expect(f).toContain("[T] theme Geist Dark");

    await h.key("t", { input: "t" });
    expect(siteStore.getSnapshot().theme).toBe("opencodeDark");
    expect(h.frame()).toContain("[T] theme OpenCode Dark");

    await h.key("w", { input: "w" });
    expect(h.frame()).toContain("┌devtools");
    await h.key("escape");
    expect(h.frame()).not.toContain("┌devtools");
    expect(h.frame()).toContain("┌box");
    // F2 sees the wireframe the panel turned on, and turns it off.
    await h.key("f2");
    expect(h.frame()).not.toContain("┌box");
    await h.key("`", { ctrl: true });
    expect(h.frame()).toContain("[W] wire  off");
    await h.key("`", { ctrl: true });
    expect(h.frame()).not.toContain("Text.js DevTools");

    // OpenCode and terminal.shop own every key.
    await site(() => resetLocation("/opencode"));
    await h.key("`", { ctrl: true });
    expect(h.frame()).not.toContain("Text.js DevTools");
    await h.unmount();
  });
});

describe("/exit in OpenCode", () => {
  afterAll(async () => {
    await site(() => resetLocation("/"));
    await site(() => siteStore.reset());
  });

  test("pauses and leaves the console to the DevTools prompt; engaging the pad restarts and repaints", async () => {
    await site(() => resetLocation("/opencode"));
    await site(() => siteStore.set({ consoleInput: true }));
    const h = await mount(<CompanionApp />, { cols: 100, rows: 32, tabFocus: false });
    await h.type("/exit");
    expect(h.frame()).toContain("/exit");
    await h.key("return");
    await h.wait(10);
    expect(siteStore.getSnapshot().opencodeExited).toBe(true);
    expect(siteStore.getSnapshot().consoleInput).toBe(false);
    expect(h.root.renderer.stats().paused).toBe(true);
    const logs = h.console.logs.length;
    const clears = h.console.clears;
    await h.wait(50);
    h.frame();
    expect(h.console.logs.length).toBe(logs);

    // FocusPad's click: getCompanion().activate()
    await site(() => siteStore.set({ consoleInput: true }));
    expect(siteStore.getSnapshot().opencodeExited).toBe(false);
    expect(h.root.renderer.stats().paused).toBe(false);
    const f = h.frame();
    expect(h.console.clears).toBe(clears + 1);
    expect(h.console.logs.length).toBe(logs + 1);
    expect(f).toContain("Ask anything");
    expect(f).not.toContain("/exit");
    await h.unmount();
  });

  test("leaving the page while exited resumes the console", async () => {
    await site(() => resetLocation("/opencode"));
    await site(() => siteStore.set({ consoleInput: true }));
    const h = await mount(<CompanionApp />, { cols: 100, rows: 32, tabFocus: false });
    await h.type("/q");
    await h.key("return");
    await h.wait(10);
    expect(h.root.renderer.stats().paused).toBe(true);
    await site(() => resetLocation("/"));
    expect(siteStore.getSnapshot().opencodeExited).toBe(false);
    expect(h.root.renderer.stats().paused).toBe(false);
    expect(h.frame()).toContain("React 19 in console.log");
    await h.unmount();
  });

  test("the page pad says how to restart", async () => {
    await site(() => resetLocation("/opencode"));
    expect(await render("/opencode")).toContain('<span class="pad-title">OpenCode in the console</span>');
    await site(() => siteStore.set({ opencodeExited: true }));
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { OpenCodePage } = await import("../src/pages/OpenCode");
    expect(renderToStaticMarkup(<OpenCodePage />)).toContain('<span class="pad-title">OpenCode exited. Click to restart.</span>');
  });
});

describe("text:///viewport", () => {
  test("the file Sources opens is the one every frame is logged through", () => {
    expect(VIEWPORT_SOURCE).toBe(
      "// Every frame in the Console is one call to log() below.\n({\n  log(...args) { console.log(...args) },\n  clear() { console.clear() },\n})\n//# sourceURL=text:///viewport",
    );
    // DevTools labels the link with the line of the console.log call.
    expect(VIEWPORT_SOURCE.split("\n")[2]).toContain("console.log(");
    expect(VIEWPORT_SOURCE).not.toContain("\u25B2");
  });

  test("log and clear look up the console at call time", () => {
    const target = viewportConsole();
    expect(target).not.toBeNull();
    const original = { log: console.log, clear: console.clear };
    const seen: unknown[][] = [];
    let clears = 0;
    console.log = (...args: unknown[]) => void seen.push(args);
    console.clear = () => void clears++;
    try {
      target?.clear();
      target?.log("%cframe", "color:red");
    } finally {
      console.log = original.log;
      console.clear = original.clear;
    }
    expect(clears).toBe(1);
    expect(seen).toEqual([["%cframe", "color:red"]]);
  });
});
