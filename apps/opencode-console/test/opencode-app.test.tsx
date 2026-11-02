import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { AppRouter, createMemoryHistory, type RouteManifest, type RouteModule, type RouteSegmentNode } from "@textjs/app/router";
import { scanApp, toStaticManifest } from "@textjs/app/vite";
import { createDemoClient } from "../lib/demo";
import { connectOpenCode, createTransport, isLoopbackEndpoint, parseV2Event, readSse } from "../lib/client";
import { getOpenCodeStore, OpenCodeStore, resetOpenCodeStore } from "../lib/store";
import { slashAction } from "../lib/commands";
import type { AssistantMessage, ToolPart } from "../lib/types";
import { createOpencodeProxy, normalizeTargetUrl, opencodeDevMiddleware } from "../server/opencode-proxy";
import { createBridgeHandler, isAllowedOrigin, selectsTarget, startProxy } from "@textjs/opencode";
import { discoverServer, normalizeServerUrl } from "../../web/src/demos/opencode/live";
import { createTestRoot, type TestRoot } from "./helpers";
import { startMockOpenCode, type MockOpenCode } from "./mock-opencode";

const APP = fileURLToPath(new URL("..", import.meta.url));

/** The real `app/` manifest (scanner + modules), exactly as `text dev` builds it. */
async function loadRoutes(): Promise<RouteManifest> {
  const hydrate = async (node: RouteSegmentNode): Promise<RouteSegmentNode> => {
    const out: RouteSegmentNode = { segment: node.segment, files: node.files };
    for (const [kind, rel] of Object.entries(node.files ?? {})) {
      const mod = (await import(`${APP}/${rel}`)) as RouteModule;
      (out as unknown as Record<string, unknown>)[kind === "not-found" ? "notFound" : kind] = mod;
    }
    if (node.children) out.children = await Promise.all(node.children.map(hydrate));
    return out;
  };
  return hydrate(toStaticManifest(scanApp(APP)));
}

let mock: MockOpenCode;
let t: TestRoot | null = null;

beforeEach(() => {
  mock = startMockOpenCode();
});

afterEach(async () => {
  await t?.unmount();
  t = null;
  resetOpenCodeStore();
  mock.stop();
});

async function mount(path = "/") {
  resetOpenCodeStore({ endpoint: mock.url });
  const routes = await loadRoutes();
  const history = createMemoryHistory(path);
  t = await createTestRoot({ width: 112, height: 34, theme: "opencodeDark", onCaughtError: (e) => console.error(e) });
  await t.render(<AppRouter routes={routes} history={history} theme="opencodeDark" errorStore={null} documentTitle={false} />);
  await t.waitFor(() => getOpenCodeStore().getSnapshot().sessionsLoaded && getOpenCodeStore().getSnapshot().models.length > 0, "sessions from the server");
  await mock.waitForSubscriber();
  return { t, history };
}

const requested = (method: string, prefix: string): boolean => mock.requests.some((r) => r.method === method && r.path.startsWith(prefix));

describe("OpenCode Lite console app (live V2 server)", () => {
  test("a slash action at the caret preserves text to its right",async()=>{
    const {t}=await mount();await t.paste("/help remaining draft");await t.press("a",{ctrlKey:true});
    for(let i=0;i<5;i++)await t.press("ArrowRight");await t.press("Enter");await t.waitFor(()=>t.frame().includes("see all available"));
    await t.press("Escape");expect(t.frame()).toContain("remaining draft");expect(t.frame()).not.toContain("/help");
  });
  test("leader+Enter queues without dropping the draft into the command palette", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.type("Run tests later");
    await t.press("x", { ctrlKey: true });
    await t.press("Enter");
    await t.waitFor(() => requested("POST", "/api/session/ses_alpha/prompt"));
    expect(mock.requests.find((r) => r.path.endsWith("/prompt"))?.body).toEqual({ text: "Run tests later", delivery: "queue" });
  });
  test("timeline leader and message actions keep keyboard focus out of the composer", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.press("x", { ctrlKey: true });
    await t.press("g");
    expect(t.frame()).toContain("Timeline");
    await t.press("Enter");
    expect(t.frame()).toContain("Message Actions");
    expect(t.frame()).toContain("Revert");
    await t.press("Enter");
    expect(t.frame()).not.toContain("Message Actions");
    expect(requested("POST", "/api/session/ses_alpha/prompt")).toBe(false);
    await t.press("x", { ctrlKey: true });
    await t.press("x");
    expect(t.frame()).toContain("Export session transcript");
    await t.press("Escape");
  });
  test("inline slash menu filters, owns Ctrl+P/N and leaves custom commands ready for arguments", async () => {
    const { t } = await mount();
    await t.type("/");
    expect(t.frame()).toContain("Switch agent");
    await t.press("p", { ctrlKey: true });
    expect(t.frame()).not.toContain("Suggested");
    await t.press("Escape");
    expect(t.frame()).not.toContain("Switch agent");
    await t.type("rvw");
    expect(t.frame()).toContain("Review changes");
    await t.press("Tab");
    expect(t.frame()).toContain("/review");
    expect(requested("POST", "/api/session")).toBe(false);
    await t.type("staged");
    await t.press("Enter");
    await t.waitFor(() => mock.requests.some((r) => r.method === "POST" && r.path.endsWith("/command")));
    expect(mock.requests.find((r) => r.method === "POST" && r.path.endsWith("/command"))?.body).toEqual({
      name: "review",
      text: "staged",
    });
  });
  test("Tab descends into directories; Enter attaches a file and a subagent without sending", async () => {
    const { t } = await mount();
    await t.type("Review @src");
    await t.waitFor(() => t.frame().includes("cart badge.ts"));
    const rows=t.frame().split("\n"), y=rows.findIndex(row=>row.includes("cart badge.ts")), x=rows[y]!.indexOf("┃");
    expect(t.root.renderer.buffer.getCell(x,y)?.bg).toBe(t.root.renderer.buffer.getCell(0,y)?.bg);
    await t.press("Tab");
    await t.waitFor(() => mock.requests.some((r) => r.path.includes("query=src%2F")));
    await t.type("cart#2-4");
    await t.waitFor(() => t.frame().includes("cart badge.ts#2-4"));
    await t.press("Enter");
    await t.type("with @expl");
    expect(t.frame()).toContain("@explore");
    await t.press("Enter");
    expect(requested("POST", "/api/session")).toBe(false);
    await t.press("Enter");
    await t.waitFor(() => mock.requests.some((r) => r.path.endsWith("/prompt")));
    expect(mock.requests.find((r) => r.path.endsWith("/prompt"))?.body).toEqual({
      text: "Review @src/cart badge.ts#2-4 with @explore ",
      files: [
        {
          uri: "file:///fixture/src/cart%20badge.ts?start=2&end=4",
          name: "src/cart badge.ts#2-4",
          mention: { start: 7, end: 29, text: "@src/cart badge.ts#2-4" },
        },
      ],
      agents: [{ name: "explore", mention: { start: 35, end: 43, text: "@explore" } }],
    });
  });
  test("home: two-tone logo, split-border prompt with metadata, quiet status bar", async () => {
    const { t } = await mount("/");
    await t.waitFor(() => t.frame().includes("Claude Opus 5.5"), "model metadata");
    const frame = t.frame();
    expect(frame).toContain("█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█");
    expect(frame).toContain('┃  Ask anything… "');
    expect(frame).toContain("Build · Claude Opus 5.5 Anthropic");
    expect(frame).toContain("shift+tab agents  ctrl+p commands");
    expect(frame).toContain("╹▀▀▀");
    expect(frame).toContain("2.0.0-mock");
    expect(frame).toContain("~/code/storefront");
    expect(frame).not.toContain("SESSIONS");
    // The logo's shadow cells are tinted toward the glyph color.
    const row = frame.split("\n").findIndex((l) => l.includes("█  █ █  █ █▀▀▀"));
    const col = (frame.split("\n")[row] ?? "").indexOf("█  █") + 1;
    expect(t.root.renderer.buffer.getCell(col, row)?.bg).not.toBe(0);
    expect(requested("GET", "/api/info")).toBe(true);
    expect(requested("GET", "/api/session")).toBe(true);
    expect(requested("GET", "/api/agent")).toBe(true);
    expect(requested("GET", "/api/model")).toBe(true);

    // Shift+Tab cycles build ↔ plan; a plain Tab isn't the agent command.
    await t.press("Tab", { shiftKey: true });
    expect(t.frame()).toContain("Plan · Claude Opus 5.5");
    await t.press("Tab", { shiftKey: true });
    expect(t.frame()).toContain("Build · Claude Opus 5.5");

    // Typing never changes the prompt's height.
    const before = t.frame().split("\n").findIndex((l) => l.includes("Build · Claude"));
    await t.type("x");
    expect(t.frame().split("\n").findIndex((l) => l.includes("Build · Claude"))).toBe(before);
    await t.press("Backspace");

    // The sidebar belongs to a session. Home has no session rail.
    await t.press("x", { ctrlKey: true });
    await t.press("b");
    await t.settle();
    expect(t.frame()).not.toContain("SESSIONS 2");
    await t.press("x", { ctrlKey: true });
    await t.press("b");
    await t.settle();
    expect(t.frame()).not.toContain("SESSIONS 2");
  });

  test("prompt → new session → streamed reasoning, edit diff and Markdown, one console.log per frame; Esc interrupts", async () => {
    const { t, history } = await mount("/");
    await t.type("Add rate limiting");
    await t.press("Enter");
    await t.waitFor(() => history.location.pathname.startsWith("/session/ses_new"), "navigation to the new session");
    const sessionID = history.location.pathname.split("/").pop() as string;
    await t.waitFor(() => requested("POST", `/api/session/${sessionID}/prompt`), "POST /prompt");
    // No idle transition has been observed on a new session, so there is nothing to mark viewed.
    expect(requested("POST", `/api/session/${sessionID}/view`)).toBe(false);
    const create = mock.requests.find((r) => r.method === "POST" && r.path === "/api/session");
    expect(create?.body).toMatchObject({ agent: "build", model: { id: "claude-opus-5-5", providerID: "anthropic" } });
    expect(mock.requests.find((r) => r.path === `/api/session/${sessionID}/prompt`)?.body).toEqual({ text: "Add rate limiting" });
    expect(t.frame()).toContain("Add rate limiting");

    const m = "msg_stream1";
    const base = { sessionID, assistantMessageID: m };
    mock.emit({ type: "session.status", data: { sessionID, status: { type: "busy" } } });
    mock.emit({ type: "session.inbox.delivered", data: { sessionID, inboxID: "msg_u" } });
    mock.emit({ type: "session.step.started", data: { ...base, agent: "build", model: { id: "claude-opus-5-5", providerID: "anthropic" }, started: Date.now() } });
    mock.emit({ type: "session.reasoning.started", data: { ...base, ordinal: 0 } });
    mock.emit({ type: "session.reasoning.delta", data: { ...base, ordinal: 0, delta: "**Choosing a limiter**\n\nNeed a token bucket per IP." } });
    await t.waitFor(() => t.frame().includes("Thinking: Choosing a limiter"), "thinking disclosure");
    expect(t.frame()).toContain("esc interrupt");

    mock.emit({ type: "session.reasoning.ended", data: { ...base, ordinal: 0, text: "Need a token bucket per IP." } });
    mock.emit({ type: "session.tool.input.started", data: { ...base, id: "call_edit", name: "edit" } });
    mock.emit({
      type: "session.tool.called",
      data: { ...base, id: "call_edit", executed: true, input: { path: "src/middleware.ts", oldString: "export const limit = 10;\n", newString: "export const limit = 100;\nexport const windowMs = 60_000;\n" } },
    });
    await t.waitFor(() => t.frame().includes("← Edit src/middleware.ts"), "running tool");
    mock.emit({ type: "session.tool.success", data: { ...base, id: "call_edit", executed: true, content: [{ type: "text", text: "Edit applied." }] } });
    await t.waitFor(() => t.frame().includes("Thought"), "completed reasoning");
    let frame = t.frame();
    expect(frame).toContain("← Edit src/middleware.ts");
    expect(frame).toContain("- export const limit = 10;");
    expect(frame).toContain("+ export const limit = 100;");
    expect(frame).toContain("2 + export const windowMs");

    mock.emit({ type: "session.text.started", data: { ...base, ordinal: 1 } });
    for (const delta of ["## Rate ", "limiting\n\nAdded a **token bucket** in ", "`src/middleware.ts`.\n\n```ts\nconst windowMs = 60_000;\n"]) {
      mock.emit({ type: "session.text.delta", data: { ...base, ordinal: 1, delta } });
    }
    await t.waitFor(() => t.frame().includes("token bucket in"), "streamed markdown");
    await t.waitFor(() => t.frame().includes("const windowMs = 60_000;"), "streamed code block");
    frame = t.frame();
    expect(frame).toContain("Rate limiting");
    expect(frame).toContain("Added a token bucket in src/middleware.ts.");
    expect(frame).not.toContain("```ts");

    // Each dirty frame is exactly one console.log(format, ...css) of the whole grid, appended without a clear.
    const logs = t.console.logs.length;
    const clears = t.console.clears;
    mock.emit({ type: "session.text.delta", data: { ...base, ordinal: 1, delta: "```\n\nDone." } });
    await t.settle(60);
    t.frame();
    expect(t.console.logs.length).toBe(logs + 1);
    expect(t.console.clears).toBe(clears);
    const last = t.console.logs[t.console.logs.length - 1] as unknown[];
    expect(typeof last[0]).toBe("string");
    expect((last[0] as string).split("\n").length).toBe(34);
    expect(last.length).toBeGreaterThan(10);
    expect((last[0] as string).match(/%c/g)?.length).toBe(last.length - 1);
    expect(t.frame()).toContain("Done.");

    await t.press("Escape");
    expect(t.frame()).toContain("esc again to interrupt");
    expect(requested("POST", `/api/session/${sessionID}/interrupt`)).toBe(false);
    await t.press("Escape");
    await t.waitFor(() => requested("POST", `/api/session/${sessionID}/interrupt`), "POST /interrupt");

    mock.emit({ type: "session.text.ended", data: { ...base, ordinal: 1, text: "## Rate limiting\n\nAdded a **token bucket** in `src/middleware.ts`.\n\n```ts\nconst windowMs = 60_000;\n```\n\nDone." } });
    mock.emit({ type: "session.step.ended", data: { ...base, finish: "stop", cost: 0.02, tokens: { input: 1200, output: 300, reasoning: 20, cache: { read: 0, write: 0 } } } });
    mock.emit({ type: "session.execution.interrupted", data: { sessionID, reason: "user" } });
    mock.emit({ type: "session.status", data: { sessionID, status: { type: "idle" } } });
    await t.waitFor(() => !t.frame().includes("esc interrupt"), "idle footer");
    expect(t.frame()).toContain("Build · Claude Opus 5.5");

    // Idle: no further frames without changes.
    const idleLogs = t.console.logs.length;
    t.frame();
    t.frame();
    expect(t.console.logs.length).toBe(idleLogs);
  });

  test("Ctrl+P opens the command palette over a dimmed backdrop and switches sessions", async () => {
    const { t, history } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in src/middleware.ts."), "session timeline");
    expect(mock.requests.find((r) => r.path === "/api/session/ses_alpha/view")?.body).toMatchObject({ idle: (mock.sessions[0]?.time as { idle: number }).idle });
    const frame = t.frame();
    expect(frame).toContain("Where is the auth middleware?");
    expect(frame).toContain("→ Explored: 1 search");
    await t.press("x",{ctrlKey:true});await t.press("b");
    expect(t.frame()).toContain("1,020 tokens");await t.press("Escape");

    const before = t.root.renderer.buffer.getCell(3, 0);
    await t.press("p", { ctrlKey: true });
    await t.settle();
    const open = t.frame();
    expect(open).toContain("Commands");
    expect(open).toContain("New session");
    expect(open).toContain("Switch model");
    expect(open).toContain("Open settings");
    const after = t.root.renderer.buffer.getCell(3, 0);
    expect(after?.char).toBe(before?.char);
    expect(after?.fg).not.toBe(before?.fg);

    await t.type("flaky");
    expect(t.frame()).toContain("Investigate flaky CI");
    await t.press("Enter");
    await t.waitFor(() => history.location.pathname === "/session/ses_beta", "navigation");
    await t.waitFor(() => t.frame().includes("Why does CI flake on Tuesdays?"), "beta timeline");
    expect(t.frame()).not.toContain("Commands");

    // The leader opens the model picker with models from /api/model.
    await t.press("x", { ctrlKey: true });
    await t.press("m");
    await t.settle();
    expect(t.frame()).toContain("Select model");
    expect(t.frame()).toContain("GPT-6.1 Terra");
    await t.press("Escape");
    await t.settle();
    expect(t.frame()).not.toContain("Select model");
  });

  test("unknown sessions render a not-found state", async () => {
    const { t } = await mount("/session/ses_nope");
    await t.waitFor(() => t.frame().includes("Session ses_nope not found"), "missing session");
  });

  test("themes preview on filter, roll back on Escape, and commit on Enter", async () => {
    const {t} = await mount(); const bg=()=>t.root.renderer.buffer.getCell(0,0)?.bg;
    const before=bg();
    await t.type("/themes"); await t.press("Enter"); await t.type("dracula");
    expect(t.frame()).toContain("dracula");
    await t.press("Escape"); t.frame(); expect(bg()).toBe(before);
    await t.type("/themes"); await t.press("Enter"); await t.type("dracula"); await t.press("Enter");
    expect(t.frame()).not.toContain("Themes"); expect(bg()).not.toBe(before);
  });

  test("connected models use provider sections and Ctrl+F adds/removes a favorite locally", async()=>{
    mock.stop();mock=startMockOpenCode({connectedProvider:true});
    const {t}=await mount();await t.press("x",{ctrlKey:true});await t.press("m");
    expect(t.frame()).toContain("Connect an integration");
    expect(t.frame()).toContain("OpenAI");await t.press("f",{ctrlKey:true});
    expect(t.frame()).toContain("Favorites");await t.press("f",{ctrlKey:true});
    expect(t.frame()).not.toContain("Favorites");expect(mock.requests.every(r=>r.method==="GET")).toBe(true);
  });

  test("queued permission and form prompts retain owners, choices and the unsent draft", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.type("my draft");
    const sessionID = "ses_alpha";
    for (const id of ["per_a", "per_b"]) mock.emit({ type: "permission.asked", data: { id, sessionID, action: "shell", resources: [`echo ${id}`], save: ["echo *"] } });
    mock.emit({ type: "form.created", data: { form: { id: "frm_c", sessionID, title: "Pick a branch", fields: [{ key: "branch", type: "string", options: [{value:"main",label:"main"},{value:"next",label:"next"}] }] } } });
    await t.waitFor(() => t.frame().includes("echo per_a"));
    await t.press("ArrowRight");
    expect(t.frame()).toContain("This will always allow the following patterns");
    await t.press("f", {ctrlKey:true});
    expect(t.frame()).toContain("minimize");
    await t.press("Escape");
    expect(requested("POST", `/api/session/${sessionID}/permission`)).toBe(false);
    await t.press("Enter");
    await t.waitFor(() => t.frame().includes("echo per_b"));
    await t.press("Escape");
    await t.waitFor(() => t.frame().includes("2. next"));
    await t.press("2");
    await t.waitFor(() => t.frame().includes("my draft"));
    expect(mock.requests.filter((r) => r.path.endsWith("/reply")).map((r) => [r.path, r.body])).toEqual([
      [`/api/session/${sessionID}/permission/per_a/reply`, {decision:"always"}], [`/api/session/${sessionID}/permission/per_b/reply`, {decision:"reject"}],
      [`/api/session/${sessionID}/form/frm_c/reply`, {answer:{branch:"next"}}],
    ]);
  });

  test("session tab cycling, numeric selection, closing and reopening never delete a session", async () => {
    const { t, history } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.press("x", { ctrlKey: true }); await t.press("l");
    await t.type("flaky"); await t.press("Enter");
    await t.waitFor(() => t.frame().includes("Why does CI"));
    await t.press("ArrowUp", { altKey: true });
    expect(history.location.pathname).toBe("/session/ses_alpha");
    await t.press("2", { ctrlKey: true });
    expect(history.location.pathname).toBe("/session/ses_beta");
    await t.press("x", { ctrlKey: true }); await t.press("w");
    expect(history.location.pathname).toBe("/session/ses_alpha");
    await t.press("T", { ctrlKey: true, shiftKey: true });
    expect(history.location.pathname).toBe("/session/ses_beta");
    expect(mock.requests.some((r) => r.method === "DELETE")).toBe(false);
  });

  test("multi-field questions validate conditional inputs, review multiselect values, and cancel separately", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(()=>t.frame().includes("It lives in"));
    const form={id:"frm_many",sessionID:"ses_alpha",title:"Release options",fields:[
      {key:"stage",type:"string",required:true,options:[{value:"test",label:"Test"},{value:"deploy",label:"Deploy"}]},
      {key:"count",type:"integer",minimum:1,required:true,when:[{key:"stage",op:"eq",value:"deploy"}]},
      {key:"tags",type:"multiselect",options:[{value:"linux",label:"Linux"},{value:"mac",label:"macOS"}]},
    ]};
    mock.emit({type:"form.created",data:{form}}); await t.waitFor(()=>t.frame().includes("2. Deploy"));
    await t.press("2"); await t.type("0"); await t.press("Enter");
    expect(t.frame()).toContain("Must be at least 1");
    await t.press("u",{ctrlKey:true});await t.type("2");await t.press("Enter");
    await t.press("1");await t.press("2");await t.press("Tab");
    expect(t.frame()).toContain("Linux, macOS");
    await t.press("Enter");await t.waitFor(()=>requested("POST","/api/session/ses_alpha/form/frm_many/reply"));
    expect(mock.requests.find(r=>r.path.endsWith("frm_many/reply"))?.body).toEqual({answer:{stage:"deploy",count:2,tags:["linux","mac"]}});
    mock.emit({type:"form.created",data:{form:{...form,id:"frm_cancel"}}});await t.waitFor(()=>t.frame().includes("2. Deploy"));await t.press("Escape");
    await t.waitFor(()=>requested("DELETE","/api/session/ses_alpha/form/frm_cancel"));
  });

  test("rejecting a child's request asks for a reason and replies to the child, not its parent", async () => {
    const sessionID = "ses_child";
    mock.sessions.push({id:sessionID,parentID:"ses_alpha",title:"Child",time:{created:1,updated:1}});
    const {t}=await mount("/session/ses_alpha"); await t.waitFor(()=>t.frame().includes("It lives in"));
    mock.emit({type:"permission.asked",data:{id:"per_child",sessionID,action:"read",resources:["a.txt"]}});
    await t.waitFor(()=>t.frame().includes("Permission required")); await t.press("Escape");
    expect(t.frame()).toContain("Tell OpenCode what to do differently");
    expect(requested("POST",`/api/session/${sessionID}/permission`)).toBe(false);
    await t.type("Use the fixture instead"); await t.press("Enter");
    await t.waitFor(()=>requested("POST",`/api/session/${sessionID}/permission/per_child/reply`));
    expect(mock.requests.find(r=>r.path.endsWith("per_child/reply"))?.body).toEqual({decision:"reject",message:"Use the fixture instead"});
  });

  test("shell mode is a keystroke, not a prefix interpreted on submit", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.type("!");
    expect(t.frame()).toContain("exit shell mode");
    await t.press("Escape");
    expect(t.frame()).not.toContain("exit shell mode");
    await t.type("!echo fixture");
    await t.press("Enter");
    await t.waitFor(() => requested("POST", "/api/session/ses_alpha/shell"));
    expect(mock.requests.find((r) => r.path.endsWith("/shell"))?.body).toEqual({ command: "echo fixture" });
    expect(requested("POST", "/api/session/ses_alpha/prompt")).toBe(false);
    await t.paste("!not a shell command");
    expect(t.frame()).not.toContain("exit shell mode");
    await t.press("Enter");
    await t.waitFor(() => requested("POST", "/api/session/ses_alpha/prompt"));
    expect(mock.requests.filter((r) => r.path.endsWith("/shell"))).toHaveLength(1);
  });

  test("slash commands are local, variants use catalog order, and editing chords stay in the editor", async () => {
    const { t } = await mount();
    const state = () => getOpenCodeStore().getSnapshot();
    await t.press("t", { ctrlKey: true });
    expect(state().model?.variant).toBe("low");
    await t.press("t", { ctrlKey: true });
    expect(state().model?.variant).toBe("high");
    await t.press("t", { ctrlKey: true });
    expect(state().model?.variant).toBeUndefined();
    await t.type("/modelz");
    await t.press("b", { ctrlKey: true });
    await t.press("k", { ctrlKey: true });
    await t.type("s");
    await t.press("Enter");
    expect(t.frame()).toContain("Select model");
    await t.type("terra");
    await t.press("Enter");
    expect(state().model?.id).toBe("gpt-6.1-terra");
    await t.press("F2");
    expect(state().model?.id).toBe("claude-opus-5-5");
    expect(mock.requests.filter((r) => r.method !== "GET")).toEqual([]);
  });

  test("commits picker drafts only at send, runs known server commands, and never prompts for local actions", async () => {
    const { t } = await mount("/session/ses_alpha");
    await t.waitFor(() => t.frame().includes("It lives in"));
    await t.press("Tab", { shiftKey: true });
    await t.press("t", { ctrlKey: true });
    expect(requested("POST", "/api/session/ses_alpha/agent")).toBe(false);
    expect(requested("POST", "/api/session/ses_alpha/model")).toBe(false);
    await t.type("/help");
    await t.press("Enter");
    expect(t.frame()).toContain("see all available");
    await t.press("Escape");
    await t.type("/rename Review fixture");
    await t.press("Enter");
    await t.waitFor(() => t.frame().includes("Review fixture"));
    expect(requested("PATCH", "/api/session/ses_alpha")).toBe(true);
    await t.type("/review my changes");
    await t.press("Enter");
    await t.waitFor(() => requested("POST", "/api/session/ses_alpha/command"));
    const posts = mock.requests.filter((r) => r.method === "POST" && !r.path.endsWith("/view"));
    expect(posts.map((r) => [r.path.split("/").pop(), r.body])).toEqual([
      ["agent", { agent: "plan" }], ["model", { model: { id: "claude-opus-5-5", providerID: "anthropic", variant: "low" } }], ["command", { name: "review", text: "my changes" }],
    ]);
  });
});

describe("/exit", () => {
  test("exits the app like the native TUI, with /quit, /q and the bare exit words as aliases", async () => {
    for (const word of ["/exit", "/quit", "/q", "exit", "quit", ":q"]) expect(slashAction(` ${word} `)).toBe("exit");
    expect(slashAction("/exits")).toBeUndefined();
    expect(slashAction("exit the loop")).toBeUndefined();
    const { t } = await mount();
    await t.type("/exit");
    await t.press("Enter");
    await t.waitFor(() => t.root.unmounted, "the app to exit");
    expect(mock.requests.filter((r) => r.method !== "GET")).toEqual([]);
  });

  test("an embed's store hands /exit to the host instead", () => {
    let exits = 0;
    const store = new OpenCodeStore({ client: createDemoClient(), onExit: () => void exits++ });
    expect(store.exitToHost()).toBe(true);
    expect(exits).toBe(1);
    expect(new OpenCodeStore({ client: createDemoClient() }).exitToHost()).toBe(false);
  });
});

describe("dev proxy (/__opencode)", () => {
  test("status, credential injection and streaming SSE passthrough without leaking the password", async () => {
    mock.stop();
    const secret = "s3cr3t-pa55word";
    mock = startMockOpenCode({ password: secret });
    const authorization = `Basic ${Buffer.from(`opencode:${secret}`).toString("base64")}`;
    const proxy = createOpencodeProxy({ discover: async () => ({ url: mock.url, mode: "service", authorization }) });
    let server: Server | null = null;
    try {
      server = createServer(opencodeDevMiddleware("/__opencode", proxy) as never);
      await new Promise<void>((r) => server?.listen(0, "127.0.0.1", r));
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

      const statusRes = await fetch(`${origin}/__opencode/_status`);
      const statusText = await statusRes.text();
      expect(JSON.parse(statusText)).toEqual({ connected: true, targetUrl: mock.url, mode: "service" });
      expect(statusText).not.toContain(secret);
      expect(statusText).not.toContain(authorization);

      const sessions = await fetch(`${origin}/__opencode/api/session?limit=5`);
      expect(sessions.status).toBe(200);
      expect(sessions.headers.get("cache-control")).toBe("no-cache");
      expect(((await sessions.json()) as { data: unknown[] }).data.length).toBe(2);
      expect(mock.requests.find((r) => r.path === "/api/session?limit=5")?.authorization).toBe(authorization);

      const prompt = await fetch(`${origin}/__opencode/api/session/ses_alpha/prompt`, { method: "POST", headers: { "content-type": "application/json", "x-opencode-client": "1" }, body: JSON.stringify({ text: "hi" }) });
      expect(prompt.status).toBe(200);
      expect(mock.requests.find((r) => r.path === "/api/session/ses_alpha/prompt")?.body).toEqual({ text: "hi" });

      const abort = new AbortController();
      const sse = await fetch(`${origin}/__opencode/api/event`, { signal: abort.signal });
      expect(sse.headers.get("content-type")).toContain("text/event-stream");
      expect(sse.headers.get("cache-control")).toBe("no-cache");
      const events: unknown[] = [];
      const reading = readSse(sse, (d) => events.push(d)).catch(() => undefined);
      await mock.waitForSubscriber();
      mock.emit({ type: "session.text.delta", data: { sessionID: "ses_alpha", assistantMessageID: "m", ordinal: 0, delta: "hello" } });
      const deadline = Date.now() + 3000;
      while (events.length < 2 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
      abort.abort();
      await reading;
      expect(events.map((e) => parseV2Event(e))).toEqual([
        { type: "connected" },
        { type: "part.delta", sessionID: "ses_alpha", messageID: "m", ordinal: 0, kind: "text", delta: "hello" },
      ]);

      // Non-loopback custom targets are refused.
      const ssrf = await fetch(`${origin}/__opencode/api/info`, { headers: { "x-opencode-target": "http://example.com" } });
      expect(ssrf.status).toBe(403);
    } finally {
      await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
    }
  });

  test("refuses DNS rebinding, cross-site requests, header-less writes and oversized bodies", async () => {
    const proxy = createOpencodeProxy({ discover: async () => ({ url: mock.url, mode: "direct" }) });
    let server: Server | null = null;
    try {
      server = createServer(opencodeDevMiddleware("/__opencode", proxy) as never);
      await new Promise<void>((r) => server?.listen(0, "127.0.0.1", r));
      const port = (server.address() as AddressInfo).port;
      const origin = `http://127.0.0.1:${port}`;
      const before = mock.requests.length;

      const rebound = await fetch(`${origin}/__opencode/api/session`, { headers: { host: `attacker.example:${port}` } });
      expect(rebound.status).toBe(403);
      for (const host of [`localhost:${port}`, `[::1]:${port}`, "127.0.0.1"]) {
        expect((await fetch(`${origin}/__opencode/api/session`, { headers: { host } })).status).toBe(200);
      }

      const crossSite = await fetch(`${origin}/__opencode/api/session`, { headers: { "sec-fetch-site": "cross-site" } });
      expect(crossSite.status).toBe(403);
      expect((await fetch(`${origin}/__opencode/api/session`, { headers: { "sec-fetch-site": "same-site" } })).status).toBe(403);
      expect((await fetch(`${origin}/__opencode/api/session`, { headers: { "sec-fetch-site": "same-origin" } })).status).toBe(200);
      expect((await fetch(`${origin}/__opencode/api/session`, { headers: { "sec-fetch-site": "none" } })).status).toBe(200);

      const csrf = await fetch(`${origin}/__opencode/api/session/ses_alpha/prompt`, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ text: "pwned" }) });
      expect(csrf.status).toBe(403);
      expect(mock.requests.some((r) => r.path === "/api/session/ses_alpha/prompt")).toBe(false);

      const huge = await fetch(`${origin}/__opencode/api/session/ses_alpha/prompt`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-opencode-client": "1" },
        body: "x".repeat(4 * 1024 * 1024 + 1),
      });
      expect(huge.status).toBe(413);
      expect(mock.requests.slice(before).some((r) => r.method === "POST")).toBe(false);
    } finally {
      await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
    }
  });

  test("the route handler (text start) applies the same guards", async () => {
    const proxy = createOpencodeProxy({ discover: async () => ({ url: mock.url, mode: "direct" }) });
    const ok = await proxy.handle(new Request("http://localhost:3001/api/opencode/api/session", { headers: { host: "localhost:3001" } }), "/api/session");
    expect(ok.status).toBe(200);
    const rebound = await proxy.handle(new Request("http://evil.test:3001/api/opencode/api/session", { headers: { host: "evil.test:3001" } }), "/api/session");
    expect(rebound.status).toBe(403);
    const put = await proxy.handle(new Request("http://localhost:3001/api/opencode/api/session/x", { method: "PUT", headers: { host: "localhost:3001" }, body: "{}" }), "/api/session/x");
    expect(put.status).toBe(403);
  });

  test("readSse handles CRLF split across chunk boundaries", async () => {
    const enc = new TextEncoder();
    const chunks = ['data: {"a":1}\r', '\ndata: {"b":2}\r\n\r', '\n'];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const chunk of chunks) c.enqueue(enc.encode(chunk));
        c.close();
      },
    });
    const events: unknown[] = [];
    await readSse(new Response(body), (d) => events.push(d));
    // `data:` lines of one block join with "\n": a false blank line would have split this into two frames.
    expect(events).toEqual([]);
    const events2: unknown[] = [];
    const body2 = new ReadableStream<Uint8Array>({
      start(c) {
        for (const chunk of ['data: {"a":', "1}\r", "\n\r", "\ndata: 2\r\n\r\n"]) c.enqueue(enc.encode(chunk));
        c.close();
      },
    });
    await readSse(new Response(body2), (d) => events2.push(d));
    expect(events2).toEqual([{ a: 1 }, 2]);
  });

  test("custom loopback servers are reached through the same-origin proxy, never cross-origin", async () => {
    const g = globalThis as { window?: unknown; fetch: typeof fetch };
    const realFetch = g.fetch;
    const calls: Array<{ url: string; target: string | null }> = [];
    g.window = { location: { origin: "http://localhost:3001", search: "" } };
    g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, target: new Headers(init?.headers).get("x-opencode-target") });
      if (url === "/__opencode/_status") return Response.json({ connected: true, targetUrl: "http://127.0.0.1:49374", mode: "service" });
      if (url === "/__opencode/api/info") return Response.json({ version: "2.0.0" });
      return new Response("nope", { status: 404 });
    }) as typeof fetch;
    try {
      const conn = await connectOpenCode({ endpoint: "http://127.0.0.1:4096" });
      expect(conn.client.kind).toBe("v2");
      expect(calls.some((c) => c.url.startsWith("http://127.0.0.1:4096"))).toBe(false);
      expect(calls.find((c) => c.url === "/__opencode/api/info")?.target).toBe("http://127.0.0.1:4096");
    } finally {
      g.fetch = realFetch;
      delete g.window;
    }
  });

  test("?server= only accepts loopback hosts", () => {
    expect(isLoopbackEndpoint("http://localhost:4096")).toBe(true);
    expect(isLoopbackEndpoint("127.0.0.1:4096")).toBe(true);
    expect(isLoopbackEndpoint("http://[::1]:4096")).toBe(true);
    expect(isLoopbackEndpoint("https://evil.example")).toBe(false);
    expect(isLoopbackEndpoint("http://localhost.evil.example")).toBe(false);
    expect(isLoopbackEndpoint("javascript:alert(1)")).toBe(false);
  });

  test("normalizes `opencode service status` output", () => {
    expect(normalizeTargetUrl("http://0.0.0.0:49374\n")).toBe("http://127.0.0.1:49374");
    expect(normalizeTargetUrl("running at http://127.0.0.1:4096/")).toBe("http://127.0.0.1:4096");
    expect(normalizeTargetUrl("not running")).toBeNull();
    expect(selectsTarget("http://localhost:49374", "http://127.0.0.1:49374")).toBe(true);
    expect(selectsTarget("http://127.0.0.1:49374", "http://localhost:49374")).toBe(true);
    expect(selectsTarget("http://localhost:4096", "http://127.0.0.1:49374")).toBe(false);
    expect(isAllowedOrigin("http://[::1]:3000")).toBe(true);
  });

  test("transport only sends x-opencode-client on proxy/bridge writes, never on GETs or direct servers", async () => {
    const g = globalThis as { fetch: typeof fetch };
    const realFetch = g.fetch;
    const seen: Array<{ method: string; client: string | null }> = [];
    let advertiseBridge = false;
    g.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({ method: init?.method ?? "GET", client: headers.get("x-opencode-client") });
      return new Response(JSON.stringify({ version: "2.0.0" }), {
        status: 200,
        headers: { "content-type": "application/json", ...(advertiseBridge ? { "x-textjs-bridge": "1" } : {}) },
      });
    }) as typeof fetch;
    try {
      const direct = createTransport("http://127.0.0.1:4123", "localhost:4123");
      await direct.json("GET", "/api/info");
      await direct.json("POST", "/api/session", {});
      expect(seen.map((s) => s.client)).toEqual([null, null]);

      seen.length = 0;
      advertiseBridge = true;
      const bridged = createTransport("http://127.0.0.1:4096", "localhost:4096");
      await bridged.json("GET", "/api/info");
      await bridged.json("POST", "/api/session", {});
      expect(seen.map((s) => s.client)).toEqual([null, "1"]);

      seen.length = 0;
      const sameOrigin = createTransport("/__opencode", "localhost:49374");
      await sameOrigin.json("GET", "/api/info");
      await sameOrigin.json("POST", "/api/session", {});
      expect(seen.map((s) => s.client)).toEqual([null, "1"]);
    } finally {
      g.fetch = realFetch;
    }
  });

  test("localhost custom target alias preserves service auth, and daemon restarts recover on the first GET", async () => {
    mock.stop();
    const secret1 = "pass-one";
    const secret2 = "pass-two";
    mock = startMockOpenCode({ password: secret1 });
    let current = { url: mock.url, secret: secret1 };
    const authOf = (s: string) => `Basic ${Buffer.from(`opencode:${s}`).toString("base64")}`;

    const proxy = createOpencodeProxy({
      discover: async () => ({ url: current.url, mode: "service", authorization: authOf(current.secret) }),
    });
    const port = new URL(mock.url).port;
    const viaAlias = await proxy.handle(
      new Request(`http://localhost:3001/__opencode/api/info`, {
        headers: { host: "localhost:3001", "x-opencode-target": `http://localhost:${port}` },
      }),
      "/api/info",
    );
    expect(viaAlias.status).toBe(200);

    // Simulate daemon restarting on a new port + new password while previous target is still cached.
    const nextMock = startMockOpenCode({ password: secret2 });
    try {
      mock.stop();
      current = { url: nextMock.url, secret: secret2 };
      const recovered = await proxy.handle(
        new Request("http://localhost:3001/__opencode/api/info", { headers: { host: "localhost:3001" } }),
        "/api/info",
      );
      expect(recovered.status).toBe(200);

      const bridge = createBridgeHandler({
        pairingCode: "K7F2QM",
        discover: async () => ({ url: current.url, source: "service", authorization: authOf(current.secret) }),
      });
      const paired = await bridge(
        new Request("http://127.0.0.1:4096/__bridge/pair", {
          method: "POST",
          headers: { host: "127.0.0.1:4096", origin: "http://localhost:3000", "content-type": "application/json", "x-opencode-client": "1" },
          body: JSON.stringify({ code: "K7F2QM" }),
        }),
      );
      const { token } = (await paired.json()) as { token: string };
      // Prime cache with stale password first:
      current = { url: nextMock.url, secret: "stale-pass" };
      await bridge.target(true);
      current = { url: nextMock.url, secret: secret2 };
      const bridgeRecovered = await bridge(
        new Request("http://127.0.0.1:4096/api/info", { headers: { host: "127.0.0.1:4096", origin: "http://localhost:3000", "x-textjs-bridge-token": token } }),
      );
      expect(bridgeRecovered.status).toBe(200);
    } finally {
      nextMock.stop();
    }
  });

  test("clear single-line failure diagnostics for SPA HTML, 401, stale /connect port, and duplicate bridge port", async () => {
    const g = globalThis as { window?: unknown; fetch: typeof fetch };
    const realFetch = g.fetch;
    const warns: string[] = [];
    const notes: string[] = [];
    const origWarn = console.warn;
    const origInfo = console.info;
    console.warn = (...args: unknown[]) => warns.push(args.join(" "));
    console.info = (...args: unknown[]) => notes.push(args.join(" "));
    try {
      g.window = { location: { origin: "http://localhost:3001", hostname: "localhost", search: "" } };

      // 1. Custom /connect points at dead :4096 while service is live on :49374.
      g.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/__opencode/_status") return Response.json({ connected: true, targetUrl: "http://127.0.0.1:49374", mode: "service" });
        return new Response(JSON.stringify({ error: "unreachable" }), { status: 502, headers: { "content-type": "application/json" } });
      }) as typeof fetch;
      const stale = await connectOpenCode({ endpoint: "http://0.0.0.0:4096" });
      expect(stale.client.kind).toBe("demo");
      expect(stale.reason).toBe("Can't reach localhost:4096. Clear /connect to use localhost:49374");

      // 2. HTML SPA shell on both V2 and V1 endpoints is rejected as Not OpenCode, never misdetected.
      g.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/__opencode/_status") return new Response("not found", { status: 404 });
        return new Response("<!doctype html><html></html>", { status: 200, headers: { "content-type": "text/html" } });
      }) as typeof fetch;
      const spa = await connectOpenCode({ endpoint: "http://127.0.0.1:5173" });
      expect(spa.client.kind).toBe("demo");
      expect(spa.reason).toBe("Not OpenCode at localhost:5173. Check /connect");

      // 3. Web /opencode client normalizes 0.0.0.0 and gives actionable 1-line errors.
      expect(normalizeServerUrl("http://0.0.0.0:49374")).toBe("http://127.0.0.1:49374");
      await expect(discoverServer("http://opencode:pw@127.0.0.1:49374")).rejects.toThrow("Don't put credentials in the URL. Run bunx @textjs/opencode proxy and connect to http://127.0.0.1:4096.");

      g.fetch = (async (_input: RequestInfo | URL) => new Response("{}", { status: 401, headers: { "content-type": "application/json" } })) as typeof fetch;
      await expect(discoverServer("http://0.0.0.0:49374")).rejects.toThrow("Auth required. Run bunx @textjs/opencode proxy and connect to http://127.0.0.1:4096.");

      // Falling back to the demo is the documented first run: a one-line note, never a console warning.
      expect(warns.every((w) => !w.includes("\n") && !w.includes("demo mode"))).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.every((w) => !w.includes("\n") && w.endsWith("(demo mode)"))).toBe(true);
    } finally {
      console.warn = origWarn;
      console.info = origInfo;
      g.fetch = realFetch;
      delete g.window;
    }

    // 4. Starting a second bridge on the same port detects the existing bridge.
    const first = await startProxy({ port: 0, log: false, discover: async () => ({ url: mock.url, source: "service" }) });
    try {
      const boundPort = Number(new URL(first.url).port);
      await expect(startProxy({ port: boundPort, log: false, discover: async () => null })).rejects.toThrow(`Bridge already running at http://127.0.0.1:${boundPort}`);
    } finally {
      await first.close();
    }
  });
});

describe("demo backend", () => {
  test("streams reasoning, read / edit / shell tool calls and Markdown through the same store", async () => {
    const store = new OpenCodeStore({ client: createDemoClient({ tick: 1 }) });
    try {
      store.start();
      const deadline = Date.now() + 3000;
      while (!store.getSnapshot().sessionsLoaded && Date.now() < deadline) await new Promise((r) => setTimeout(r, 5));
      expect(store.getSnapshot().connection.kind).toBe("demo");
      expect(store.getSnapshot().sessions.length).toBe(4);
      const id = await store.send(null, "Fix the cart badge");
      expect(id).toBeTruthy();
      const sid = id as string;
      while (store.getSnapshot().busy[sid] !== false && Date.now() < deadline + 5000) await new Promise((r) => setTimeout(r, 10));
      await new Promise((r) => setTimeout(r, 200));
      const msgs = store.getSnapshot().messages[sid] ?? [];
      expect(msgs[0]).toMatchObject({ type: "user", text: "Fix the cart badge" });
      const assistant = msgs.find((m): m is AssistantMessage => m.type === "assistant");
      expect(assistant).toBeDefined();
      const tools = (assistant?.content ?? []).filter((p): p is ToolPart => p.type === "tool");
      expect(tools.map((p) => `${p.name}:${p.state.status}`)).toEqual(["read:completed", "edit:completed", "shell:completed"]);
      expect(assistant?.content.some((p) => p.type === "text" && p.text.includes("99+"))).toBe(true);
      expect(store.getSnapshot().sessions.find((s) => s.id === sid)?.title).toBe("Fix the cart badge");
    } finally {
      store.dispose();
    }
  });
});
