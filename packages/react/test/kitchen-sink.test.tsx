import { expect, test } from "bun:test";
import { useState } from "react";
import { initYoga } from "@textjs/core";
import {
  AsciiFont,
  Badge,
  Box,
  Code,
  createConsoleRootSync,
  Diff,
  Divider,
  Input,
  KeyHint,
  Markdown,
  Modal,
  ScrollBox,
  Select,
  Spinner,
  Tabs,
  Text,
  Textarea,
} from "../src/index";
import { captureWarnings, FakeConsole, ManualScheduler, withoutActEnvironment } from "./helpers";

function KitchenSink() {
  const [tab, setTab] = useState("chat");
  const [open, setOpen] = useState(true);
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row items-center gap-1 px-1 bg-surface">
        <AsciiFont text="▼ TEXT.JS" font="compact" color="accent" />
        <Badge variant="accent">beta</Badge>
        <Spinner variant="matrix" label="thinking" paused />
      </Box>
      <Tabs tabs={[{ id: "chat", label: "Chat", shortcut: "1" }, { id: "diff", label: "Diff", shortcut: "2" }]} activeTab={tab} onChange={setTab} />
      <Divider title="Session" />
      <ScrollBox stickyScroll className="grow border rounded border-default" focusable>
        <Markdown>{"## Plan\n\n1. Read `scene.ts`\n2. Ship it\n\n```ts\nconst ok = true\n"}</Markdown>
        <Code code={"echo $HOME"} language="bash" showLineNumbers />
        <Diff patch={{ before: "a\n", after: "b\n", filename: "a.ts" }} />
      </ScrollBox>
      <Select options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta", disabled: true }]} limit={2} />
      <Box className="border rounded px-1">
        <Input placeholder="Ask" autoFocus />
      </Box>
      <Textarea placeholder="Compose" maxRows={3} />
      <Box className="flex-row gap-2">
        <KeyHint keys="tab" label="focus" />
        <KeyHint keys="esc" label="close" />
      </Box>
      <Modal open={open} title="Welcome" onClose={() => setOpen(false)} width={30}>
        <Text>Press esc</Text>
      </Modal>
    </Box>
  );
}

test("kitchen sink mounts, updates and unmounts with zero runtime warnings", async () => {
  await initYoga();
  const con = new FakeConsole();
  const scheduler = new ManualScheduler();
  const warnings = await captureWarnings(() =>
    withoutActEnvironment(async () => {
      const root = createConsoleRootSync({ console: con, scheduler, width: 100, height: 32, registerGlobal: false });
      root.render(<KitchenSink />);
      scheduler.flush();
      const frame = root.renderer.buffer.toPlainString(true);
      expect(frame).toContain("Welcome");
      expect(frame).toContain("Plan");
      // Growable one-row widgets (Divider, Input, Textarea) never stretch vertically in columns.
      const lines = frame.split("\n");
      const divider = lines.findIndex((l) => l.startsWith("── Session"));
      expect(lines[divider + 1]?.startsWith("╭")).toBe(true);
      const composer = lines.findIndex((l) => l.startsWith("Compose"));
      expect(lines[composer + 1]?.startsWith("tab focus")).toBe(true);
      const key = (k: string, mods: Record<string, boolean> = {}) =>
        root.input.handleKeyDown({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, preventDefault() {}, ...mods });
      key("Escape");
      await Promise.resolve();
      key("h");
      key("i");
      key("Tab");
      key("2");
      await new Promise((r) => setTimeout(r, 20));
      scheduler.flush();
      expect(root.renderer.buffer.toPlainString(true)).not.toContain("Welcome");
      expect(root.renderer.buffer.toPlainString(true)).toContain("hi");
      root.unmount();
      expect(root.rootNode.countYogaNodes()).toBe(1);
    }),
  );
  expect(warnings).toEqual([]);
  expect(con.logs.length).toBeGreaterThanOrEqual(2);
});
