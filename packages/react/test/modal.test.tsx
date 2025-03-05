import { describe, expect, test } from "bun:test";
import { useState } from "react";
import { Box, Input, Modal, Text, useFocus, useInput } from "../src/index";
import { createTestRoot } from "./helpers";

function Focusable({ id, label }: { id: string; label: string }) {
  const { isFocused } = useFocus({ id });
  return <Text>{`${isFocused ? ">" : " "} ${label}`}</Text>;
}

describe("<Modal>", () => {
  test("traps useInput and focus while open, restores on close", async () => {
    const t = await createTestRoot({ width: 40, height: 12 });
    const background: string[] = [];
    let setOpen: (v: boolean) => void = () => undefined;
    function App() {
      const [open, set] = useState(false);
      setOpen = set;
      useInput((e) => {
        if (e.input) background.push(e.input);
      });
      return (
        <Box flexDirection="column">
          <Input id="bg-input" autoFocus placeholder="background" />
          <Focusable id="bg-other" label="other" />
          {open ? (
            <Modal title="Confirm" width={30} onClose={() => set(false)}>
              <Input id="modal-input" autoFocus placeholder="modal" />
              <Focusable id="modal-a" label="option a" />
            </Modal>
          ) : null}
        </Box>
      );
    }
    await t.render(<App />);
    await t.type("x");
    expect(t.lines()[0]).toBe("x");
    await t.press("Escape");
    await t.type("!");
    // Printable keys are consumed by the focused input; the global handler never sees them.
    expect(background).toEqual([]);

    await t.act(() => setOpen(true));
    const frame = t.frame();
    expect(frame).toContain("Confirm");
    expect(frame).toContain("esc close");
    await t.type("hi");
    expect(t.frame()).toContain("hi");
    expect(t.lines()[0]).toBe("x!");
    // Tab cycles only inside the modal.
    await t.press("Tab");
    expect(t.frame()).toContain("> option a");
    expect(t.frame()).toContain("  other");
    await t.press("Tab");
    expect(t.frame()).toContain("  option a");
    await t.type("q");
    expect(background).toEqual([]);

    // Escape closes; focus returns to the background input.
    await t.press("Escape");
    expect(t.frame()).not.toContain("Confirm");
    await t.type("y");
    expect(t.lines()[0]).toBe("x!y");
    await t.press("Tab");
    expect(t.lines()[1]).toBe("> other");
    await t.type("z");
    expect(background).toEqual(["z"]);
    await t.unmount();
  });

  test("dims the backdrop and renders above the app", async () => {
    const t = await createTestRoot({ width: 30, height: 9 });
    let setOpen: (v: boolean) => void = () => undefined;
    function App() {
      const [open, set] = useState(false);
      setOpen = set;
      return (
        <Box flexDirection="column" bg="#204080">
          <Text color="#ffffff">background content</Text>
          <Modal open={open} title="Hi" width={16} height={5} backdropDim={0.68}>
            <Text>inside</Text>
          </Modal>
        </Box>
      );
    }
    await t.render(<App />);
    const buf = t.root.renderer.buffer;
    const before = buf.getCell(0, 0);
    expect(before?.bg).toBe(0x204080ff);
    await t.act(() => setOpen(true));
    t.frame();
    const after = buf.getCell(0, 0);
    expect(after?.char).toBe("b");
    expect(after?.bg).not.toBe(0x204080ff);
    // Darker after dimming.
    expect(((after?.bg ?? 0) >>> 8) & 255).toBeLessThan(0x80);
    expect(t.frame()).toContain("inside");
    const lines = t.lines();
    const top = lines.findIndex((l) => l.includes("Hi"));
    expect(top).toBe(2);
    expect(lines[top]?.indexOf("╭")).toBe(7);
    await t.act(() => setOpen(false));
    t.frame();
    expect(buf.getCell(0, 0)?.bg).toBe(0x204080ff);
    await t.unmount();
  });
});
