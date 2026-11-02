import { test, expect, afterEach } from "bun:test";
import { EmbeddedOpenCode } from "../embed";
import { createDemoClient } from "../lib/demo";
import { createTestRoot, type TestRoot } from "./helpers";
import { management } from "../lib/management";
import { createV2Client, type Transport } from "../lib/client";
import { reviewRows } from "../lib/review";
import { PromptHistory } from "../lib/history";
import { expandedDraft } from "../lib/mentions";
import { markdownTranscript } from "../lib/transcript";
import { wrapRows } from "../lib/review";
import { OpenCodeStore } from "../lib/store";
let t: TestRoot;
afterEach(async () => {
  await t?.unmount();
});
async function mount(custom: boolean | Record<string, string | false> = false) {
  const api = createDemoClient({ tick: 1 });
  if (custom)
    api.keySettings = async () => ({
      keybinds: typeof custom === "object" ? custom : { leader: "ctrl+space", "model.list": "<leader>z", "help.show": "f1" },
      timeout: 500,
    });
  t = await createTestRoot({ width: 140, height: 40 });
  await t.render(<EmbeddedOpenCode client={api} />);
  await t.waitFor(() => t.frame().includes("Claude Opus"));
  return api;
}
async function slash(name: string) {
  await t.type("/" + name);
  await t.press("Enter");
  await t.settle();
}
async function leader(key: string) {
  await t.press("x", { ctrlKey: true });
  await t.press(key);
}
test("inline command ranking and reference alias parts", async () => {
  const api = await mount();
  let sent: unknown;
  api.prompt = async (_id, _text, opts) => {
    sent = opts;
  };
  await t.type("/model");
  const rows = t
    .frame()
    .split("\n")
    .filter((s) => s.includes("Switch model"));
  expect(rows.map((s) => s.match(/\/\w+/)?.[0])).toEqual(["/models", "/thinking", "/variants", "/effort"]);
  expect(rows.join("")).not.toContain("ctrl+x m");
  await t.press("c", { ctrlKey: true });
  await t.type("Review @docs/");
  expect(t.frame()).toContain("reference");
  await t.press("Tab");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("interrupt"));
  expect(sent).toMatchObject({
    attachments: [{ kind: "file", name: "docs", uri: "file:///sandbox/docs", mime: "application/x-directory" }],
  });
});
test("which-key previews the configured leader, cancels cleanly, groups and closes", async () => {
  await mount(true);
  await t.press(" ", { ctrlKey: true });
  expect(t.frame()).toContain("Leader · ctrl+space");
  expect(t.frame()).toContain("ctrl+space z");
  await t.press("Escape");
  expect(t.frame()).not.toContain("Leader ·");
  await t.press(" ", { ctrlKey: true });
  await t.press("z");
  expect(t.frame()).toContain("Switch model");
  await t.press("Escape");
  await t.press("k", { ctrlKey: true, altKey: true });
  expect(t.frame()).toContain("Which-key");
  const frame = t.frame();
  await t.press("ArrowRight", { ctrlKey: true, altKey: true });
  expect(t.frame()).not.toBe(frame);
  await t.press("k", { ctrlKey: true, altKey: true });
  await t.press("F1");
  expect(t.frame()).toContain("see all available");
});
test("diff scopes, reviewed files, individual patches and shortcuts", async () => {
  await mount();
  await slash("diff");
  await t.waitFor(() => t.frame().includes("README.md"));
  expect(t.frame()).toContain("src/events.ts");
  await t.press("s");
  await t.press("m");
  expect(t.frame()).toContain("1/2");
  expect(t.frame()).toContain("emit(event.value)");
  await t.press("d");
  expect(t.frame()).toContain("Diff source");
  await t.type("Uncommitted");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("vs HEAD"));
  await t.press("?");
  expect(t.frame()).toContain("Diff shortcuts");
  await t.press("Escape");
  await t.press("q");
  expect(t.frame()).toContain("Ask anything");
});

test("model picker follows replacement navigation and submit bindings", async () => {
  await mount({ "dialog.select.next": "f7", "dialog.select.submit": "f8" });
  await slash("models");
  await t.type("GPT-6.1");
  await t.press("F7");
  await t.press("Enter");
  expect(t.frame()).toContain("Switch model");
  await t.press("F8");
  expect(t.frame()).not.toContain("Switch model");
  expect(t.frame()).toContain("GPT-6.1 Terra Fast");
});
test("MCP retry and disconnect, plugin error and explicit package update", async () => {
  await mount();
  await slash("mcps");
  await t.type("design-files");
  await t.press("Enter");
  expect(t.frame()).toContain("timed out");
  await t.press(" ");
  await t.waitFor(() => t.frame().includes("connected"));
  await t.press(" ");
  await t.waitFor(() => t.frame().includes("disabled"));
  await t.press("Escape");
  await slash("plugins");
  await t.type("example-plugin");
  await t.press(" ");
  expect(t.frame()).toContain("entrypoint not found");
  await t.press("Escape");
  await slash("plugins");
  await t.type("project-tools");
  await t.press("u", { ctrlKey: true });
  expect(t.frame()).toContain("Update plugin");
  await t.press("ArrowDown");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("1.1.0"));
});
test("sandbox integration key is masked and account mutations require selecting the account", async () => {
  const api = await mount();
  await slash("connect");
  await t.type("Anthropic");
  await t.press("Enter");
  await t.press("Enter");
  await t.type("sandbox-fixture");
  expect(t.frame()).not.toContain("sandbox-fixture");
  expect(t.frame()).toContain("•••");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Connected Anthropic"));
  const p = (await api.management!.providers()).find((p) => p.id === "anthropic")!;
  expect(p.connections).toHaveLength(1);
  expect(JSON.stringify(p)).not.toContain("sandbox-fixture");
});
test("scripted terminal retains output on hide and reopen; input never reaches the session shell", async () => {
  const api = await mount();
  await slash("sessions");
  await t.type("Fix cart");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("99+"));
  await slash("terminal");
  await t.waitFor(() => t.frame().includes("Scripted sandbox terminal"));
  await t.type("pwd");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("$ pwd"));
  await t.press("Escape");
  expect(t.frame()).not.toContain("Scripted sandbox terminal");
  await leader("t");
  await t.waitFor(() => t.frame().includes("$ pwd"));
  expect((await api.messages("ses_demo_cart")).some((m) => m.type === "shell")).toBe(false);
});
test("message history cursor, diff source and auth attempt paths use their V2 contract", async () => {
  const hits: { path: string; method: string; body: unknown }[] = [];
  const t: Transport = {
    label: "fixture",
    async stream() {
      throw Error("unused");
    },
    async json<T>(method: string, path: string, body?: unknown) {
      hits.push({ method, path, body });
      return { data: [], cursor: { next: "cursor/2" } } as T;
    },
  };
  const a = createV2Client(t, "custom"),
    m = management(t);
  expect((await a.historyPage!("s/id", "old")).next).toBe("cursor/2");
  await a.diff!("s/id", "/dir", "committed", "release");
  await m.connect("p/id", { type: "oauth", id: "device" }, "/dir");
  await m.attempt("p/id", { type: "oauth" }, "a/id", "cancel", "/dir");
  await m.account("acc/id", "rename", "Fixture");
  expect(hits[0]!.path).toContain("/s%2Fid/message?limit=100&order=desc&cursor=old");
  expect(hits[1]!.path).toContain("mode=committed&context=12&base=release");
  expect(hits[2]!.body).toEqual({ methodID: "device", answer: undefined });
  expect(hits[3]).toMatchObject({
    method: "DELETE",
    path: "/api/integration/p%2Fid/connect/oauth/a%2Fid?location%5Bdirectory%5D=%2Fdir",
  });
  expect(hits[4]!.path).toBe("/api/credential/acc%2Fid");
});
test("split rows align replacement runs and history bounds entries", () => {
  const f = { file: "a", patch: "@@ -1,2 +1,3 @@\n-a\n+A\n+B\n c", additions: 2, deletions: 1 };
  const rows = reviewRows([f], new Set(), null, true);
  expect(rows.slice(2).map((r) => [r.left?.text, r.right?.text])).toEqual([
    ["a", "A"],
    [undefined, "B"],
    ["c", "c"],
  ]);
  const h = new PromptHistory();
  for (let i = 0; i < 510; i++) h.append({ text: "hello" + i, marks: [] });
  expect(h.entries).toHaveLength(500);
  expect(h.entries[0]?.text).toBe("hello10");
});

test("workspace names, move and safe removal are scoped to the selected project", async () => {
  const api = await mount();
  await slash("worktrees");
  await t.press("a", { ctrlKey: true });
  await t.press("Tab");
  expect(t.frame()).toContain("workspace-1");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("storefront-workspace-1"));
  await t.type("workspace-1");
  await t.press("d", { ctrlKey: true });
  expect(t.frame()).toContain("Delete workspace");
  await t.press("Escape");
  expect((await api.workspace!.list("sandbox")).length).toBe(3);
  await t.type("workspace-1");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("storefront-workspace-1:main"));
  expect(t.frame()).toContain("Ask anything");
});

test("sandbox OAuth can cancel, authorize, rename, activate and delete a fixture account", async () => {
  const api = await mount(),
    m = api.management!;
  const method = { type: "oauth" as const, id: "device" };
  const attempt = await m.connect("opencode", method);
  await m.attempt("opencode", method, attempt!.attemptID, "cancel");
  await expect(m.attempt("opencode", method, attempt!.attemptID, "status")).rejects.toThrow();
  await slash("connect");
  await t.type("OpenAI");
  await t.press("Enter");
  await t.press("Enter");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Authorization code"));
  await t.type("fixture-only");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Connected OpenAI"));
  await t.type("OpenAI");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Add account"));
  await t.type("Sandbox account");
  await t.press("Enter");
  expect(t.frame()).toContain("Account actions");
  await t.press("Enter");
  expect(t.frame()).toContain("Rename account");
  await t.type("round4");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Add account") && t.frame().includes("round4"));
  await t.type("round4");
  await t.press("d", { ctrlKey: true });
  expect(t.frame()).toContain("Disconnect account");
  await t.press("ArrowDown");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Add account"));
  expect((await m.providers()).find((p) => p.id === "openai")!.connections).toEqual([]);
});

test("history browses older pages, restores draft parts and never resubmits them", async () => {
  const api = await mount();
  const cursors: (string | undefined)[] = [];
  api.historyPage = async (_sid, cursor) => {
    cursors.push(cursor);
    return {
      messages: [
        {
          id: cursor ? "old" : "new",
          type: "user",
          time: { created: 1 },
          text: cursor ? "Inspect @docs" : "Recent request",
          mentions: cursor
            ? [
                {
                  kind: "file",
                  name: "docs",
                  uri: "file:///sandbox/docs",
                  mime: "application/x-directory",
                  mention: { text: "@docs", start: 8, end: 13 },
                },
              ]
            : [],
        },
      ],
      next: cursor ? undefined : "older",
    };
  };
  await slash("sessions");
  await t.type("Fix cart");
  await t.press("Enter");
  await slash("history");
  await t.type("Load earlier messages");
  await t.press("Enter");
  await t.press("u", { ctrlKey: true });
  await t.type("Inspect @docs");
  await t.press("Enter");
  expect(t.frame()).toContain("Inspect @docs");
  expect(cursors).toEqual([undefined, "older"]);
  expect((await api.messages("ses_demo_cart")).length).toBe(2);
});

test("child switcher and shell tasks operate on the owning session", async () => {
  const api = await mount();
  await slash("sessions");
  await t.type("Fix cart");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("99+"));
  await t.press("ArrowDown");
  expect(t.frame()).toContain("Subagents");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("Found the project test files"));
  await t.press("ArrowUp");
  await t.waitFor(() => t.frame().includes("99+"));
  await t.press("p", { ctrlKey: true });
  await t.type("View shell output");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("bun test --watch"));
  await t.press("Enter");
  expect(t.frame()).toContain("Watching for changes");
  await t.press("Escape");
  await t.press("d", { ctrlKey: true });
  expect(t.frame()).toContain("Stop shell command");
  await t.press("ArrowDown");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("killed"));
  expect((await api.shells!("ses_demo_cart"))[0]?.status).toBe("killed");
});

test("CLI-only dialogs preserve the composer and do not perform service operations", async () => {
  await mount();
  for (const [cmd, label] of [
    ["editor", "$VISUAL"],
    ["restart", "opencode service restart"],
    ["update", "native TUI"],
    ["web", "Sandbox preview"],
    ["debug", "Session ID"],
    ["highlights", "What's new"],
  ]) {
    await slash(cmd!);
    expect(t.frame()).toContain(label!);
    await t.press("Escape");
    expect(t.frame()).toContain("Ask anything");
  }
});

test("summary paste expands before submission and shifts following attachment offsets", async () => {
  const api = await mount();
  let sent: unknown;
  api.prompt = async (_id, text, options) => {
    sent = { text, options };
  };
  const raw = "one\ntwo\nthree";
  await t.paste(raw);
  expect(t.frame()).toContain("[Pasted ~3 lines]");
  await t.type(" @docs");
  await t.press("Enter");
  await t.press("Enter");
  expect(sent).toMatchObject({
    text: raw + " @docs ",
    options: { attachments: [{ name: "docs", mention: { start: raw.length + 1, end: raw.length + 6, text: "@docs" } }] },
  });
  expect(
    expandedDraft("edited label", [], [{ content: "never restored", mention: { text: "[Pasted]", start: 0, end: 8 } }]).text,
  ).toBe("edited label");
});

test("Markdown export options include or omit reasoning and tools without serializing media", async () => {
  const api = createDemoClient();
  const s = (await api.sessions())[0]!,
    m = await api.messages(s.id);
  const md = markdownTranscript(s, m);
  expect(md).toContain("## User");
  expect(md).toContain("_Thinking:_");
  expect(md).toContain("**Tool: read**");
  expect(markdownTranscript(s, m, false, false)).not.toContain("**Tool:");
});

test("word-wrapped diff lines keep their source line number only on the first display row", () => {
  const r = wrapRows([{ file: 0, left: { kind: "add", text: "abcdef", oldLine: null, newLine: 1 } }], 3);
  expect(r.map((l) => [l.left?.text, l.left?.newLine])).toEqual([
    ["abc", 1],
    ["def", null],
  ]);
});

test("settings rebinds a previously unbound editor action", async () => {
  await mount();
  await slash("settings");
  await t.type("Keybinds");
  await t.press("Enter");
  await t.type("input.buffer.home");
  await t.press("Enter");
  await t.press("u", { ctrlKey: true });
  await t.type("f6");
  await t.press("Enter");
  await t.press("Escape");
  await t.type("first");
  await t.press("Enter", { shiftKey: true });
  await t.type("second");
  await t.press("F6");
  await t.type("A");
  expect(t.frame()).toContain("Afirst");
});

test("a docked review gives the draft its keys back without losing reviewed files", async () => {
  await mount();
  await slash("sessions");
  await t.type("Fix cart");
  await t.press("Enter");
  await slash("diff");
  await t.waitFor(() => t.frame().includes("README.md"));
  await t.press("m");
  expect(t.frame()).toContain("1/2");
  await leader("ArrowLeft");
  await t.type("draft remains");
  expect(t.frame()).toContain("draft remains");
  await leader("ArrowRight");
  await t.press("f");
  expect(t.frame()).toContain("1/2");
  await t.press("q");
  expect(t.frame()).toContain("draft remains");
});

test("MCP registration leaves the server disabled; cancelling removal leaves it listed", async () => {
  const api = await mount();
  await slash("mcps");
  await t.type("Add MCP server");
  await t.press("Enter");
  await t.type("docs-test");
  await t.press("Enter");
  await t.press("Enter");
  await t.type("https://docs.example.invalid/mcp");
  await t.press("Enter");
  expect(t.frame()).toContain("Register disabled server");
  expect((await api.management!.mcps()).some((m) => m.name === "docs-test")).toBe(false);
  await t.press("ArrowDown");
  await t.press("Enter");
  await t.waitFor(() => t.frame().includes("docs-test"));
  expect((await api.management!.mcps()).find((m) => m.name === "docs-test")?.status.status).toBe("disabled");
  await t.type("Remove MCP server");
  await t.press("Enter");
  await t.type("docs-test");
  await t.press("Enter");
  await t.press("Enter");
  expect((await api.management!.mcps()).some((m) => m.name === "docs-test")).toBe(true);
});

test("pairing only issues after confirmation and no frame contains even the fixture code", async () => {
  const api = await mount();
  let calls = 0,
    copied = "";
  api.pairing!.issue = async () => {
    calls++;
    return { code: "not-a-redeemable-test-code", expires_in: 300 };
  };
  const old = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (v: string) => {
        copied = v;
      },
    },
  });
  try {
    await slash("pair");
    await t.press("Enter");
    expect(calls).toBe(0);
    await t.press("ArrowDown");
    await t.press("Enter");
    expect(calls).toBe(1);
    expect(copied).toBe("https://sandbox.example.invalid/auth/connect/not-a-redeemable-test-code");
    expect(JSON.stringify(t.console.logs)).not.toContain("not-a-redeemable-test-code");
  } finally {
    if (old) Object.defineProperty(navigator, "clipboard", old);
    else Reflect.deleteProperty(navigator, "clipboard");
  }
});

test("live recall stays in memory while pinned sessions and model preferences survive reconnect", async () => {
  const values = new Map<string, string>();
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) },
  });
  const api = { ...createDemoClient(), kind: "v2" as const };
  api.prompt = async () => {};
  const store = new OpenCodeStore({ client: api });
  try {
    await store.connect();
    store.togglePin("ses_demo_cart");
    store.toggleFavorite("model:openai/test");
    await store.setModel({ id: "test", providerID: "openai" });
    await store.send("ses_demo_cart", "private fixture prompt");
    await store.connect();
    const s = store.getSnapshot();
    expect(s.history).toEqual([]);
    expect(s.pins).toEqual(["ses_demo_cart"]);
    expect(s.favorites).toEqual(["model:openai/test"]);
    expect(store.recent()[0]?.id).toBe("test");
    expect([...values.values()].join("")).not.toContain("private fixture prompt");
  } finally {
    store.dispose();
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("last-turn review excludes edits from previous user turns", async () => {
  const api = createDemoClient();
  expect((await api.diff!("ses_demo_cart", undefined, "turn")).map((p) => p.file)).toEqual(["src/components/cart-badge.tsx"]);
  try {
    await api.prompt("ses_demo_cart", "Explain the changes");
    expect(await api.diff!("ses_demo_cart", undefined, "turn")).toEqual([]);
  } finally {
    await api.interrupt("ses_demo_cart");
  }
});

test("switching locations immediately removes old reference aliases, including while a search is pending", async () => {
  const api = createDemoClient(),
    store = new OpenCodeStore({ client: api });
  try {
    await store.connect();
    expect(store.getSnapshot().references[0]?.name).toBe("docs");
    const gate = Promise.withResolvers<[]>();
    api.references = () => gate.promise;
    const load = store.refreshCommands("/new-project");
    expect(store.getSnapshot().references).toEqual([]);
    gate.resolve([]);
    await load;
  } finally {
    store.dispose();
  }
});
