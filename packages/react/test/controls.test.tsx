import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { parseColor } from "@textjs/core";
import { Box, Button, Checkbox, Confirm, Dialog, geistDark, RadioGroup, Slider, Switch, Text, Toaster, useToast, type ToastApi } from "../src/index";
import { cleanup, render } from "../src/testing";

afterEach(cleanup);

describe("form controls", () => {
  test("Tab moves focus; Space toggles checkboxes and switches", async () => {
    const seen: string[] = [];
    const app = await render(
      <Box className="flex-col">
        <Checkbox label="Analytics" autoFocus onChange={(v) => seen.push(`check:${v}`)} />
        <Switch label="Edge" defaultChecked onChange={(v) => seen.push(`switch:${v}`)} />
        <Checkbox label="Locked" disabled />
      </Box>,
      { cols: 30, rows: 3 },
    );
    expect(app.lines()).toEqual(["[ ] Analytics", "  ●  Edge", "[ ] Locked"]);
    await app.press("space");
    expect(app.lines()[0]).toBe("[✓] Analytics");
    await app.press("tab space");
    expect(app.lines()[1]).toBe(" ●   Edge");
    expect(seen).toEqual(["check:true", "switch:false"]);
    // Disabled controls are skipped by Tab.
    await app.press("tab space");
    expect(app.lines()[2]).toBe("[ ] Locked");
    expect(app.lines()[0]).toBe("[ ] Analytics");
  });

  test("RadioGroup skips disabled options; Slider steps and clamps", async () => {
    let plan = "";
    let level = 0;
    const app = await render(
      <Box className="flex-col">
        <RadioGroup
          autoFocus
          options={[
            { value: "hobby", label: "Hobby" },
            { value: "pro", label: "Pro", disabled: true },
            { value: "ent", label: "Enterprise" },
          ]}
          onChange={(v) => (plan = v)}
        />
        <Slider label="CPU" width={10} defaultValue={50} step={10} onChange={(v) => (level = v)} />
      </Box>,
      { cols: 30, rows: 4 },
    );
    expect(app.lines()[0]).toBe("(•) Hobby");
    await app.press("down");
    expect(plan).toBe("ent");
    expect(app.lines()[2]).toBe("(•) Enterprise");
    await app.press("tab right right");
    expect(level).toBe(70);
    expect(app.lines()[3]).toBe("CPU ━━━━━━●─── 70");
    await app.press("end right");
    expect(app.lines()[3]).toBe("CPU ━━━━━━━━━● 100");
  });

  test("Button presses on Enter / Space and paints focus with the accent", async () => {
    let n = 0;
    const app = await render(
      <Box className="flex-row gap-1">
        <Button variant="primary" autoFocus onPress={() => n++}>
          Deploy
        </Button>
        <Button>Cancel</Button>
      </Box>,
      { cols: 20, rows: 1 },
    );
    expect(app.lastFrame()).toBe(" Deploy   Cancel");
    await app.press("return space");
    expect(n).toBe(2);
    expect(app.cell(1, 0)?.bg).toBe(parseColor(geistDark.accent));
    expect(app.cell(10, 0)?.bg).toBe(parseColor(geistDark.elevated));
  });
});

describe("dialogs", () => {
  test("<Confirm> answers with y/n, arrows and Enter; destructive focuses Cancel", async () => {
    const answers: string[] = [];
    function App() {
      const [open, setOpen] = useState(true);
      return (
        <Box className="flex-col grow">
          <Text>{open ? "asking" : "done"}</Text>
          <Confirm
            open={open}
            destructive
            title="Delete project?"
            message="This removes 312 deployments."
            confirmLabel="Delete"
            onConfirm={() => {
              answers.push("yes");
              setOpen(false);
            }}
            onCancel={() => {
              answers.push("no");
              setOpen(false);
            }}
          />
        </Box>
      );
    }
    const app = await render(<App />, { cols: 60, rows: 12 });
    expect(app.lastFrame()).toContain("Delete project?");
    expect(app.lastFrame()).toMatch(/Cancel\s+Delete/);
    await app.press("return");
    expect(answers).toEqual(["no"]);
    await app.rerender(<App key="2" />);
    await app.press("right return");
    expect(answers).toEqual(["no", "yes"]);
    await app.rerender(<App key="3" />);
    await app.press("y");
    await app.rerender(<App key="4" />);
    await app.press("escape");
    expect(answers).toEqual(["no", "yes", "yes", "no"]);
    expect(app.lastFrame()).toBe("done");
  });

  test("<Dialog> renders description, body and actions", async () => {
    const app = await render(
      <Dialog title="Invite" description="Send an invite link." actions={<Button>Send</Button>} onClose={() => {}}>
        <Text>rauno@vercel.com</Text>
      </Dialog>,
      { cols: 64, rows: 12 },
    );
    const f = app.lastFrame();
    expect(f).toContain("Invite");
    expect(f).toContain("Send an invite link.");
    expect(f).toContain("rauno@vercel.com");
    expect(f).toContain(" Send ");
    expect(f).toContain("esc close");
  });
});

describe("toasts", () => {
  test("show, update in place, auto-dismiss and promise()", async () => {
    let toast: ToastApi | null = null;
    function App() {
      toast = useToast();
      return (
        <Box className="flex-col grow">
          <Text>app</Text>
          <Toaster width={30} />
        </Box>
      );
    }
    const app = await render(<App />, { cols: 40, rows: 12 });
    await app.act(() => {
      toast!.success("Deployed", { description: "dpl_8f2k is live.", duration: 40 });
    });
    expect(app.lastFrame()).toContain("✓ Deployed");
    expect(app.lastFrame()).toContain("dpl_8f2k is live.");
    await app.wait(80);
    expect(app.lastFrame()).not.toContain("Deployed");

    let resolve: (v: string) => void = () => {};
    let p: Promise<string> = Promise.resolve("");
    await app.act(() => {
      p = toast!.promise(new Promise<string>((r) => (resolve = r)), { loading: "Building…", success: (v) => `Built ${v}`, error: "Failed" });
    });
    expect(app.lastFrame()).toContain("Building…");
    await app.act(async () => {
      resolve("dpl_9");
      await p;
    });
    expect(app.lastFrame()).toContain("✓ Built dpl_9");
    expect(app.lastFrame()).not.toContain("Building…");
    await app.act(() => toast!.dismiss());
    expect(app.lastFrame()).toBe("app");
  });
});
