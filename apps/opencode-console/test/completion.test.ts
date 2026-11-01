import { expect, test } from "bun:test";
import { createDemoClient } from "../lib/demo";
import { fileOption, trigger, lineRange, rebaseMarks, v1Parts } from "../lib/mentions";
import { OpenCodeStore } from "../lib/store";
import { createV1Client, createV2Client, type Transport } from "../lib/client";
import type { Attachment } from "../lib/types";

test("V1 shares only through its session route; V2 stages and clears reverts on distinct routes", async () => {
  const hits: { method: string; path: string; body: unknown }[] = [];
  const t: Transport = {
    label: "mock",
    async json<T>(method: string, path: string, body?: unknown) {
      hits.push({ method, path, body });
      return { share: { url: "https://example.invalid/s/test" } } as T;
    },
    async stream() {
      throw Error("not used");
    },
  };
  const v1 = createV1Client(t, "custom"),
    v2 = createV2Client(t, "custom");
  expect(v2.share).toBeUndefined();
  expect(await v1.share!("test/id")).toBe("https://example.invalid/s/test");
  await v1.unshare!("test/id");
  await v2.revert!("sid", "mid");
  await v2.redo!("sid");
  await v2.commitRevert!("sid");
  expect(hits.map((x) => [x.method, x.path])).toEqual([
    ["POST", "/session/test%2Fid/share"],
    ["DELETE", "/session/test%2Fid/share"],
    ["POST", "/api/session/sid/revert/stage"],
    ["DELETE", "/api/session/sid/revert"],
    ["POST", "/api/session/sid/revert/commit"],
  ]);
});

test("token boundaries and attachment edits", () => {
  expect(trigger("mail@host", 9)).toBeUndefined();
  expect(trigger("notes /new", 10)).toBeUndefined();
  expect(trigger("one\n@src rest", 8)).toEqual({ mode: "mention", query: "src", start: 4 });
  expect(fileOption("/project", "../.env", false)).toBeUndefined();
  expect(lineRange("src/a#8-4")).toEqual({ base: "src/a", start: "8", end: undefined });
  const a: Attachment = {
    kind: "file",
    uri: "file:///src/a",
    name: "a",
    mime: "text/plain",
    mention: { start: 2, end: 4, text: "@a" },
  };
  expect(rebaseMarks([a], "x @a", "xx @a", 1)[0]?.mention.start).toBe(3);
  expect(rebaseMarks([a], "x @a", "x @", 4)).toEqual([]);
  expect(v1Parts([a])[0]).toMatchObject({ type: "file", url: "file:///src/a", source: { path: "/src/a" } });
});

test("demo queue cancellation leaves the active turn alone and unsharing revokes its preview", async () => {
  const api = createDemoClient({ tick: 1 }),
    session = await api.create({});
  try {
    await api.prompt(session.id, "first");
    await api.prompt(session.id, "queued", { delivery: "queue" });
    const q = await api.inbox!(session.id);
    expect(q[0]?.text).toBe("queued");
    await api.cancelQueued!(session.id, q[0]!.id);
    expect(await api.inbox!(session.id)).toEqual([]);
    expect((await api.messages(session.id)).length).toBe(1);
    const url = await api.share!(session.id);
    expect(url.startsWith("blob:")).toBe(true);
    expect((await (await fetch(url)).json())[0].text).toBe("first");
    await api.unshare!(session.id);
    await expect(fetch(url)).rejects.toThrow();
  } finally {
    await api.interrupt(session.id);
  }
});

test("demo waits for shell approval, records the decision, and never runs a command", async () => {
  const api = createDemoClient({ tick: 0 }),
    s = await api.create({});
  const run = async (decision: "reject" | "always") => {
    const wait = Promise.withResolvers<void>(),
      done = Promise.withResolvers<void>();
    const off = api.subscribe((e) => {
      if (e.type === "permission.asked") wait.resolve();
      if (e.type === "execution.ended") done.resolve();
    });
    try {
      await api.command!(s.id, "demo-tools", "");
      await wait.promise;
      const req = (await api.permissions!(s.id))[0]!;
      expect(req.resources).toEqual(["bun test"]);
      expect((await api.messages(s.id)).at(-1)).not.toMatchObject({ finish: "stop" });
      await api.replyPermission!(s.id, req.id, decision);
      await done.promise;
      expect(await api.permissions!(s.id)).toEqual([]);
    } finally {
      off();
    }
  };
  await run("reject");
  await run("always");
  const done = Promise.withResolvers<void>();
  let asks = 0;
  const off = api.subscribe((e) => {
    if (e.type === "permission.asked") asks++;
    if (e.type === "execution.ended") done.resolve();
  });
  await api.command!(s.id, "demo-tools", "");
  await done.promise;
  off();
  expect(asks).toBe(0);
});

test("stage, redo, commit a replacement, fork at a message and compact in the sandbox", async () => {
  const api = createDemoClient({ tick: 1 }),
    store = new OpenCodeStore({ client: api });
  try {
    await store.connect();
    const sid = "ses_demo_cart";
    await store.openSession(sid);
    const first = store.getSnapshot().messages[sid]![0]!;
    await store.revert(sid);
    expect(store.session(sid)?.revertedFrom).toBe(first.id);
    expect(store.getSnapshot().restore?.text).toContain("cart badge");
    expect(await api.messages(sid)).toHaveLength(2);
    await store.revert(sid, true);
    expect(store.session(sid)?.revertedFrom).toBeUndefined();
    const fork = await api.fork!(sid, first.id);
    expect(await api.messages(fork)).toEqual([]);
    expect(await api.messages(sid)).toHaveLength(2);
    await store.revert(sid);
    await store.send(sid, "replacement");
    await api.interrupt(sid);
    await api.compact!(sid, null);
    expect((await api.messages(sid)).some((m) => m.id === first.id)).toBe(false);
    expect((await api.messages(sid)).at(-1)).toMatchObject({ type: "note", text: "Conversation compacted · 1 user messages" });
  } finally {
    store.dispose();
  }
});
