import { expect, test } from "bun:test";
import { render } from "@textjs/react/testing";
import { ToolCard } from "../components/ToolCard";
import { sessionDiffStat } from "../components/Shell";
import { v2Message } from "../lib/client";
import { createDemoClient } from "../lib/demo";
import { OpenCodeStore } from "../lib/store";
import type { AssistantMessage, ToolPart } from "../lib/types";

test("concurrent reasoning fragments are keyed by ordinal, not the last reasoning row", async () => {
  const store = new OpenCodeStore({ client: createDemoClient() });
  try {
    await store.connect();
    const sessionID = store.getSnapshot().sessions[0]!.id;
    await store.openSession(sessionID);
    const e = { messageID: "msg_interleaved", sessionID };
    store.handle({ ...e, type: "step.started", agent: "build", started: 123, model: { id: "m", providerID: "p" } });
    for (const ordinal of [0, 1, 1]) store.handle({ ...e, kind: "reasoning", type: "part.started", ordinal });
    store.handle({ ...e, kind: "reasoning", type: "part.delta", ordinal: 1, delta: "second" });
    store.handle({ ...e, kind: "reasoning", type: "part.delta", ordinal: 0, delta: "first" });
    store.handle({ ...e, kind: "reasoning", type: "part.ended", ordinal: 0, text: "" });
    const msg = store.getSnapshot().messages[sessionID]!.at(-1) as AssistantMessage;
    expect(msg.content).toMatchObject([{ text: "", ordinal: 0 }, { text: "second", ordinal: 1 }]);
  } finally { store.dispose(); }
});

test("doesn't retain file bytes or report failed compactions as successes", () => {
  const msg = v2Message({ id: "m", type: "user", files: [{ mime: "image/png", name: "chart.png", data: "huge" }], text: "chart" });
  expect(msg).toMatchObject({ files: [{ name: "chart.png", mime: "image/png" }] });
  expect(JSON.stringify(msg)).not.toContain("huge");
  expect(v2Message({ id: "c", type: "compaction", status: "failed", error: { message: "offline" } })).toMatchObject({ text: "Compaction failed: offline", tone: "danger" });
});

test("multi-file patch metadata, todo states, question answers and read ranges reach the frame", async () => {
  const part = (name: string, input: Record<string, unknown>, metadata = {}): ToolPart => ({ id: "t", type: "tool", name, state: { status: "completed", input, metadata, content: [] } });
  const patch = part("patch", { patchText: "model input" }, { files: ["a.ts", "b.ts"].map((file) => ({ file, status: "modified", patch: "@@ -1 +1 @@\n-before\n+after", additions: 1, deletions: 1 })) });
  expect(sessionDiffStat([{ type: "assistant", id: "m", time: { created: 0 }, agent: "build", model: { id: "m", providerID: "p" }, content: [patch] }])).toMatchObject({ additions: 2, deletions: 2 });
  const view = (p: ToolPart) => <ToolCard part={p} expanded={false} directory="/repo" />;
  const ui = await render(view(patch));
  try {
    expect(ui.lastFrame()).toContain("Patched a.ts");
    expect(ui.lastFrame()).toContain("Patched b.ts");
    expect(ui.lastFrame()).toContain("+ after");
    await ui.rerender(view(part("todowrite", { todos: [null, { content: "Done", status: "completed" }, { content: "Next", status: "in_progress" }] })));
    expect(ui.lastFrame()).toContain("[✓] Done");
    expect(ui.lastFrame()).toContain("[•] Next");
    await ui.rerender(view(part("question", { questions: [{ question: "Which branch?" }] }, { answers: [["main"]] })));
    expect(ui.lastFrame()).toContain("Which branch?");
    expect(ui.lastFrame()).toContain("main");
    await ui.rerender(view(part("read", { path: "/repo/src/util.ts", offset: 3, limit: 5 }, { loaded: ["/repo/AGENTS.md"] })));
    expect(ui.lastFrame()).toContain("Read src/util.ts:3-7");
    expect(ui.lastFrame()).toContain("↳ Loaded AGENTS.md");
  } finally { await ui.unmount(); }
});
