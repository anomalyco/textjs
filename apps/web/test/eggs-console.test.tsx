import { afterAll, describe, expect, test } from "bun:test";
import { act } from "react";
import { CompanionApp } from "../src/console-companion/App";
import { siteStore } from "../src/console-companion/store";
import { partsFromSteps, scriptFor } from "../src/demos/opencode/model";
import { render } from "../src/entry-server";
import { resetLocation } from "../src/router";
import { mount } from "./helpers";

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
