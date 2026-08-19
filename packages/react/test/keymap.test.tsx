import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import {
  Box,
  CommandPalette,
  formatKeys,
  fuzzyFilter,
  fuzzyMatch,
  Input,
  KeyHelp,
  KeyHints,
  matchesKey,
  Modal,
  parseKeys,
  Text,
  useKeymap,
  useKeymapBindings,
} from "../src/index";
import { cleanup, keyEventFromCombo, render } from "../src/testing";

afterEach(cleanup);

describe("key combos", () => {
  test("parse modifiers, sequences, alternatives and literal commas", () => {
    expect(parseKeys("ctrl+shift+k")[0]?.[0]).toMatchObject({ key: "k", ctrl: true, shift: true });
    expect(parseKeys("g g")[0]?.length).toBe(2);
    expect(parseKeys("j, down").length).toBe(2);
    expect(parseKeys(",")[0]?.[0]?.key).toBe(",");
    expect(parseKeys("ctrl+,")[0]?.[0]).toMatchObject({ key: ",", ctrl: true });
    expect(parseKeys("G")[0]?.[0]).toMatchObject({ key: "g", shift: true });
    expect(parseKeys("enter")[0]?.[0]?.key).toBe("return");
    expect(() => parseKeys("hyper+k")).toThrow(/unknown modifier/);
  });

  test("match events", () => {
    expect(matchesKey(keyEventFromCombo("ctrl+k"), "ctrl+k")).toBe(true);
    expect(matchesKey(keyEventFromCombo("k"), "ctrl+k")).toBe(false);
    expect(matchesKey(keyEventFromCombo("ctrl+k"), "mod+k")).toBe(true);
    expect(matchesKey({ ...keyEventFromCombo("?"), shift: true }, "?")).toBe(true);
    expect(matchesKey(keyEventFromCombo("G"), "G")).toBe(true);
    expect(matchesKey(keyEventFromCombo("g"), "G")).toBe(false);
    expect(matchesKey(keyEventFromCombo("down"), "j, down")).toBe(true);
  });

  test("format for humans", () => {
    expect(formatKeys("mod+k", { apple: true })).toBe("⌘K");
    expect(formatKeys("ctrl+shift+p", { apple: true })).toBe("⌃⇧P");
    expect(formatKeys("ctrl+shift+p", { apple: false })).toBe("ctrl+shift+P");
    expect(formatKeys("j, down")).toBe("j/↓");
    expect(formatKeys("g g")).toBe("g g");
    expect(formatKeys("shift+tab", { apple: true })).toBe("⇧tab");
  });
});

describe("fuzzy", () => {
  test("ranks contiguous and word-start matches first and reports indices", () => {
    expect(fuzzyMatch("dep", "Open deployments")?.indices).toEqual([5, 6, 7]);
    expect(fuzzyMatch("odp", "Open deployments")?.indices).toEqual([0, 5, 7]);
    expect(fuzzyMatch("xyz", "Open deployments")).toBeNull();
    const ranked = fuzzyFilter("set", ["Reset cache", "Settings", "Toggle sidebar"], (s) => s).map((r) => r.item);
    expect(ranked[0]).toBe("Settings");
    expect(ranked).not.toContain("Toggle sidebar");
  });
});

describe("useKeymap", () => {
  test("bindings, sequences, alternatives and disabled bindings", async () => {
    function App() {
      const [log, setLog] = useState<string[]>([]);
      const add = (s: string) => () => setLog((l) => [...l, s]);
      useKeymap({
        "j, down": add("next"),
        "g g": add("top"),
        "ctrl+s": { label: "Save", run: add("save") },
        x: { label: "Off", run: add("x"), disabled: true },
      });
      return <Text>{log.join(" ")}</Text>;
    }
    const app = await render(<App />, { cols: 40, rows: 1 });
    await app.press("j down g g ctrl+s x");
    expect(app.lastFrame()).toBe("next next top save");
    // An abandoned prefix doesn't swallow the next binding.
    await app.press("g j");
    expect(app.lastFrame()).toBe("next next top save next");
  });

  test("focused inputs win over global keys; modals hide outside bindings", async () => {
    let fired = 0;
    function App({ modal }: { modal: boolean }) {
      useKeymap({ a: { label: "Archive", run: () => fired++ } }, { group: "Mail" });
      const visible = useKeymapBindings();
      return (
        <Box className="flex-col">
          <Input autoFocus placeholder="type" />
          <Text>{visible.map((b) => b.label).join(",") || "none"}</Text>
          {modal ? (
            <Modal title="m">
              <Text>inside</Text>
            </Modal>
          ) : null}
        </Box>
      );
    }
    const app = await render(<App modal={false} />, { cols: 30, rows: 6 });
    await app.type("a");
    expect(fired).toBe(0);
    expect(app.lines()[1]).toBe("Archive");
    await app.press("escape");
    await app.rerender(<App modal />);
    expect(app.lastFrame()).toContain("none");
  });

  test("<KeyHelp> lists grouped bindings and <KeyHints> shows hint bindings", async () => {
    function App() {
      useKeymap(
        {
          "j, down": { label: "Next", run: () => {}, hint: true },
          "ctrl+s": { label: "Save", run: () => {}, group: "File" },
        },
        { group: "Navigation" },
      );
      return (
        <Box className="flex-col grow">
          <Box className="grow" />
          <KeyHints />
          <KeyHelp />
        </Box>
      );
    }
    const app = await render(<App />, { cols: 60, rows: 16 });
    expect(app.lines().at(-1)).toBe("j/↓ Next");
    await app.press("?");
    const frame = app.lastFrame();
    expect(frame).toContain("Keyboard shortcuts");
    expect(frame).toContain("Navigation");
    expect(frame).toMatch(/j\/↓\s+Next/);
    expect(frame).toContain("File");
    await app.press("?");
    expect(app.lastFrame()).not.toContain("Keyboard shortcuts");
  });
});

describe("<CommandPalette>", () => {
  test("fuzzy-filters commands and keymap bindings, runs the pick and closes", async () => {
    const ran: string[] = [];
    function App() {
      useKeymap({ "ctrl+d": { label: "Open deployments", run: () => ran.push("deployments") } }, { group: "Go" });
      return (
        <Box className="flex-col grow">
          <Text>app</Text>
          <CommandPalette commands={[{ id: "theme", label: "Toggle theme", group: "View", run: () => ran.push("theme") }]} />
        </Box>
      );
    }
    const app = await render(<App />, { cols: 70, rows: 16 });
    await app.press("ctrl+k");
    expect(app.lastFrame()).toContain("Type a command…");
    expect(app.lastFrame()).toContain("Toggle theme");
    expect(app.lastFrame()).toContain("Open deployments");
    await app.type("depl");
    expect(app.lastFrame()).not.toContain("Toggle theme");
    await app.press("return");
    await app.wait(1);
    expect(ran).toEqual(["deployments"]);
    expect(app.lastFrame()).not.toContain("Type a command");
    await app.press("ctrl+p");
    await app.type("zzz");
    expect(app.lastFrame()).toContain("No matching commands");
    await app.press("escape");
    expect(app.lastFrame()).toBe("app");
  });
});
