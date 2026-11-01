/**
 * Dual-protocol OpenCode browser client.
 *
 * - **V2** (`/api/info`, `/api/session`, `/api/session/:id/message`, `/prompt`,
 *   `/interrupt`, `/agent`, `/model`, `/view`, SSE `/api/event`).
 * - **V1** fallback (`/session`, `/session/:id/message`, `/prompt_async`, `/abort`, SSE `/event`).
 * - **Demo** fallback (see `./demo`) when no server is reachable.
 */

import { createDemoClient } from "./demo";
import type {
  AgentOption,
  AppEvent,
  AssistantPart,
  ConnectionMode,
  FormInfo,
  JsonRecord,
  ModelOption,
  ModelRef,
  OpenCodeClient,
  PermissionRequest,
  SessionInfo,
  SessionMessage,
  ToolContent,
  ToolState,
} from "./types";

export * from "./types";

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Transport {
  /** Display label for the server (`localhost:49374`). */
  label: string;
  json<T>(method: string, path: string, body?: unknown, timeoutMs?: number): Promise<T>;
  stream(path: string, signal: AbortSignal): Promise<Response>;
}

export function createTransport(base: string, label: string, extraHeaders: Record<string, string> = {}): Transport {
  const root = base.replace(/\/+$/, "");
  // Direct servers need no custom headers. Both proxies require a CSRF header on writes.
  let proxy = root.startsWith("/");
  return {
    label,
    async json<T>(method: string, path: string, body?: unknown, timeoutMs = 15_000): Promise<T> {
      const headers: Record<string, string> = { accept: "application/json", ...extraHeaders };
      if (proxy && method !== "GET" && method !== "HEAD") headers["x-opencode-client"] = "1";
      const init: RequestInit = { method, headers };
      if (body !== undefined) {
        init.body = JSON.stringify(body);
        init.headers = { ...init.headers, "content-type": "application/json" };
      }
      if (timeoutMs > 0 && typeof AbortSignal.timeout === "function") init.signal = AbortSignal.timeout(timeoutMs);
      const res = await fetch(`${root}${path}`, init);
      if (res.headers.get("x-textjs-bridge") === "1") proxy = true;
      if (!res.ok) throw new HttpError(res.status, `${method} ${path} → ${res.status}`);
      if (res.status === 204) return undefined as T;
      const text = await res.text();
      if (text.length === 0) return undefined as T;
      if (text.trimStart().startsWith("<")) throw new HttpError(415, `${method} ${path} returned HTML`);
      return JSON.parse(text) as T;
    },
    async stream(path, signal) {
      const res = await fetch(`${root}${path}`, { headers: { accept: "text/event-stream", ...extraHeaders }, signal });
      if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
        await res.body?.cancel();
        throw new HttpError(res.status, `Event stream unavailable at ${path}`);
      }
      return res;
    },
  };
}

/** Parse a `text/event-stream` body into JSON payloads (one per `data:` block). */
export async function readSse(res: Response, onData: (data: unknown) => void): Promise<void> {
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    // A `\r` at a chunk boundary may be the first half of `\r\n`: hold it until the next chunk.
    let carry = "";
    if (!done && buffer.endsWith("\r")) {
      carry = "\r";
      buffer = buffer.slice(0, -1);
    }
    buffer = buffer.replace(/\r\n?/g, "\n");
    let i = buffer.indexOf("\n\n");
    while (i >= 0) {
      const block = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (data) {
        try {
          onData(JSON.parse(data));
        } catch {
          // ignore malformed frames
        }
      }
      i = buffer.indexOf("\n\n");
    }
    buffer += carry;
    if (done) return;
  }
}

/** Subscribe to an SSE endpoint with automatic reconnect (1s → 8s backoff). */
function subscribeSse(t: Transport, path: string, onData: (data: unknown) => void, onState?: (s: "open" | "closed") => void): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let delay = 1000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const loop = async (): Promise<void> => {
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await t.stream(path, controller.signal);
        delay = 1000;
        onState?.("open");
        await readSse(res, onData);
      } catch {
        // reconnect below
      }
      if (stopped) return;
      onState?.("closed");
      await new Promise<void>((r) => {
        timer = setTimeout(r, delay);
      });
      delay = Math.min(8000, delay * 2);
    }
  };
  void loop();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    controller?.abort();
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const rec = (v: unknown): JsonRecord => (isRecord(v) ? v : {});

function modelRef(v: unknown): ModelRef | undefined {
  if (!isRecord(v)) return undefined;
  const id = str(v.id) ?? str(v.modelID);
  const providerID = str(v.providerID);
  return id && providerID ? { id, providerID, variant: v.variant === "default" ? undefined : str(v.variant) } : undefined;
}

function toolContent(v: unknown): ToolContent[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((c): ToolContent[] => {
    if (!isRecord(c)) return [];
    if (c.type === "text" && typeof c.text === "string") return [{ type: "text", text: c.text }];
    if (c.type === "file" && typeof c.uri === "string") return [{ type: "file", uri: c.uri, mime: str(c.mime) ?? "", name: str(c.name) }];
    return [];
  });
}

function errorMessage(v: unknown): string {
  if (typeof v === "string") return v;
  if (isRecord(v)) return str(v.message) ?? str(v.type) ?? "error";
  return "error";
}

function hostLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname === "127.0.0.1" ? "localhost" : u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// V2
// ---------------------------------------------------------------------------

function v2Session(v: unknown): SessionInfo | null {
  if (!isRecord(v) || typeof v.id !== "string") return null;
  const time = rec(v.time);
  return {
    id: v.id,
    parentID: str(v.parentID),
    title: str(v.title),
    agent: str(v.agent),
    model: modelRef(v.model),
    directory: str(rec(v.location).directory),
    outcome: v.outcome === "succeeded" || v.outcome === "failed" || v.outcome === "interrupted" ? v.outcome : undefined,
    time: { created: num(time.created) ?? 0, updated: num(time.updated) ?? num(time.created) ?? 0, busy: num(time.busy), idle: num(time.idle) },
  };
}

function v2ToolState(v: unknown): ToolState {
  const s = rec(v);
  switch (s.status) {
    case "streaming":
      return { status: "streaming", input: str(s.input) ?? "" };
    case "running":
      return { status: "running", input: rec(s.input), metadata: rec(s.metadata) };
    case "completed":
      return { status: "completed", input: rec(s.input), content: toolContent(s.content), metadata: isRecord(s.metadata) ? s.metadata : undefined };
    default:
      return { status: "error", input: rec(s.input), error: { message: errorMessage(s.error) }, content: toolContent(s.content), metadata: isRecord(s.metadata) ? s.metadata : undefined };
  }
}

function v2Part(v: unknown): AssistantPart | null {
  if (!isRecord(v)) return null;
  if (v.type === "text") return { type: "text", text: str(v.text) ?? "" };
  if (v.type === "reasoning") return { type: "reasoning", text: str(v.text) ?? "", time: isRecord(v.time) ? { created: num(v.time.created) ?? 0, completed: num(v.time.completed) } : undefined };
  if (v.type === "tool") {
    const time = rec(v.time);
    return { type: "tool", id: str(v.id) ?? "", name: str(v.name) ?? "tool", state: v2ToolState(v.state), time: { created: num(time.created) ?? 0, ran: num(time.ran), completed: num(time.completed) } };
  }
  return null;
}

/** Map a V2 `SessionMessageInfo` into the console's message shape. */
export function v2Message(v: unknown): SessionMessage | null {
  if (!isRecord(v) || typeof v.id !== "string") return null;
  const created = num(rec(v.time).created) ?? 0;
  const base = { id: v.id, time: { created } };
  switch (v.type) {
    case "user": {
      // Attachment bytes/URIs don't belong in the cell grid or the app store.
      const files = Array.isArray(v.files) ? v.files.filter(isRecord).map((f) => ({ mime: str(f.mime) ?? "", name: str(f.name) || "attachment" })) : undefined;
      return { ...base, type: "user", text: str(v.text) ?? "", files };
    }
    case "assistant": {
      const tokens = rec(v.tokens);
      // Snapshot arrays omit ordinals. They number each kind independently
      // in the event stream (text 0, reasoning 0, reasoning 1, ...).
      const counts = { text: 0, reasoning: 0 };
      const content = (Array.isArray(v.content) ? v.content : []).map(v2Part).filter((p): p is AssistantPart => p !== null);
      for (const part of content) if (part.type !== "tool") part.ordinal = counts[part.type]++;
      return {
        ...base,
        type: "assistant",
        time: { created, completed: num(rec(v.time).completed) },
        agent: str(v.agent) ?? "build",
        model: modelRef(v.model) ?? { id: "unknown", providerID: "unknown" },
        content,
        finish: str(v.finish),
        error: v.error ? { message: errorMessage(v.error) } : undefined,
        tokens: isRecord(v.tokens) ? { input: num(tokens.input) ?? 0, output: num(tokens.output) ?? 0, reasoning: num(tokens.reasoning) ?? 0, cache: {read:num(rec(tokens.cache).read) ?? 0,write:num(rec(tokens.cache).write) ?? 0} } : undefined,
        cost: num(v.cost),
      };
    }
    case "synthetic":
    case "system":
      return { ...base, type: "note", text: str(v.description) ?? str(v.text) ?? v.type, tone: "muted" };
    case "shell":
      return { ...base, type: "shell", command: str(v.command) ?? "", status: str(v.status) ?? "exited", output: str(rec(v.output).output) };
    case "idle":
      if (v.outcome === "succeeded") return null;
      return { ...base, type: "note", text: v.outcome === "interrupted" ? "interrupted" : `failed${v.error ? ` · ${errorMessage(v.error)}` : ""}`, tone: v.outcome === "interrupted" ? "warning" : "danger" };
    case "model-switched":
      return { ...base, type: "note", text: `model → ${modelRef(v.model)?.id ?? "?"}`, tone: "muted" };
    case "agent-switched":
      return { ...base, type: "note", text: `agent → ${str(v.agent) ?? "?"}`, tone: "muted" };
    case "compaction":
      if (v.status === "failed") return { ...base, type: "note", text: `Compaction failed: ${errorMessage(v.error)}`, tone: "danger" };
      return { ...base, type: "note", text: v.status === "running" ? "compacting conversation…" : "conversation compacted", tone: "info" };
    case "skill":
      return { ...base, type: "note", text: `skill · ${str(v.name) ?? str(v.skill) ?? ""}`, tone: "info" };
    default:
      return null;
  }
}

export function v2Permission(v: unknown): PermissionRequest | null {
  if (!isRecord(v) || typeof v.id !== "string" || typeof v.sessionID !== "string" || typeof v.action !== "string") return null;
  const strings = (x: unknown): string[] | undefined => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : undefined);
  const source = isRecord(v.source) && v.source.type === "tool" && typeof v.source.messageID === "string" && typeof v.source.id === "string"
    ? { type: "tool" as const, messageID: v.source.messageID, id: v.source.id }
    : undefined;
  return { id: v.id, sessionID: v.sessionID, action: v.action, resources: strings(v.resources) ?? [], save: strings(v.save), metadata: isRecord(v.metadata) ? v.metadata : undefined, source, message: str(v.message) };
}

export function v2Form(v: unknown): FormInfo | null {
  if (!isRecord(v) || typeof v.id !== "string" || typeof v.sessionID !== "string" || !Array.isArray(v.fields)) return null;
  const fields = v.fields.filter((f): f is FormInfo["fields"][number] => isRecord(f) && typeof f.key === "string" && typeof f.type === "string");
  return { id: v.id, sessionID: v.sessionID, title: str(v.title) ?? "", metadata: isRecord(v.metadata) ? v.metadata : undefined, fields };
}

/** Parse a raw V2 SSE payload (`V2Event`) into an `AppEvent`. Unknown events are dropped. */
export function parseV2Event(raw: unknown): AppEvent | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;
  const d = rec(raw.data);
  const sessionID = str(d.sessionID) ?? "";
  const messageID = str(d.assistantMessageID) ?? "";
  const ordinal = num(d.ordinal);
  switch (raw.type) {
    case "server.connected":
      return { type: "connected" };
    case "session.created":
    case "session.deleted":
    case "session.archived":
    case "session.unarchived":
    case "session.forked":
      return { type: "sessions.changed" };
    case "session.renamed":
      return { type: "session.renamed", sessionID, title: str(d.title) ?? "" };
    case "session.agent.selected":
      return { type: "session.agent", sessionID, agent: str(d.agent) ?? "build" };
    case "session.model.selected": {
      const model = modelRef(d.model);
      return model ? { type: "session.model", sessionID, model } : null;
    }
    case "session.status":
      return { type: "status", sessionID, busy: rec(d.status).type !== "idle" };
    case "session.execution.started":
      return { type: "status", sessionID, busy: true };
    case "session.idle":
      return { type: "status", sessionID, busy: false };
    case "session.execution.succeeded":
      return { type: "execution.ended", sessionID, outcome: "succeeded" };
    case "session.execution.failed":
      return { type: "execution.ended", sessionID, outcome: "failed", error: errorMessage(d.error) };
    case "session.execution.interrupted":
      return { type: "execution.ended", sessionID, outcome: "interrupted" };
    case "session.inbox.delivered":
    case "session.synthetic":
    case "session.shell.started":
    case "session.shell.ended":
    case "session.compaction.started":
    case "session.compaction.ended":
    case "session.step.failed":
    case "session.message.content.updated":
    case "session.revert.committed":
    case "session.skill.activated":
      return { type: "messages.changed", sessionID };
    case "session.step.started":
      return { type: "step.started", sessionID, messageID, agent: str(d.agent) ?? "build", model: modelRef(d.model) ?? { id: "unknown", providerID: "unknown" }, started: num(d.started) ?? Date.now() };
    case "session.step.ended": {
      const tokens = rec(d.tokens);
      return { type: "step.ended", sessionID, messageID, finish: str(d.finish), cost: num(d.cost), tokens: isRecord(d.tokens) ? { input: num(tokens.input) ?? 0, output: num(tokens.output) ?? 0, reasoning: num(tokens.reasoning) ?? 0 } : undefined };
    }
    case "session.text.started":
      return { type: "part.started", sessionID, messageID, ordinal, kind: "text" };
    case "session.text.delta":
      return { type: "part.delta", sessionID, messageID, ordinal, kind: "text", delta: str(d.delta) ?? "" };
    case "session.text.ended":
      return { type: "part.ended", sessionID, messageID, ordinal, kind: "text", text: str(d.text) ?? "" };
    case "session.reasoning.started":
      return { type: "part.started", sessionID, messageID, ordinal, kind: "reasoning" };
    case "session.reasoning.delta":
      return { type: "part.delta", sessionID, messageID, ordinal, kind: "reasoning", delta: str(d.delta) ?? "" };
    case "session.reasoning.ended":
      return { type: "part.ended", sessionID, messageID, ordinal, kind: "reasoning", text: str(d.text) ?? "" };
    case "session.tool.input.started":
      return { type: "tool.started", sessionID, messageID, toolID: str(d.id) ?? "", name: str(d.name) ?? "tool" };
    case "session.tool.input.delta":
      return { type: "tool.delta", sessionID, messageID, toolID: str(d.id) ?? "", delta: str(d.delta) ?? "" };
    case "session.tool.called":
      return { type: "tool.called", sessionID, messageID, toolID: str(d.id) ?? "", input: rec(d.input) };
    case "session.tool.progress":
      return { type: "tool.progress", sessionID, messageID, toolID: str(d.id) ?? "", metadata: rec(d.metadata) };
    case "session.tool.success":
      return { type: "tool.success", sessionID, messageID, toolID: str(d.id) ?? "", content: toolContent(d.content), metadata: isRecord(d.metadata) ? d.metadata : undefined };
    case "session.tool.failed":
      return { type: "tool.failed", sessionID, messageID, toolID: str(d.id) ?? "", error: errorMessage(d.error) };
    case "permission.asked": {
      const request = v2Permission(d);
      return request ? { type: "permission.asked", request } : null;
    }
    case "permission.replied":
      return { type: "permission.replied", sessionID, requestID: str(d.requestID) ?? "" };
    case "form.created": {
      const form = v2Form(d.form);
      return form ? { type: "form.created", form } : null;
    }
    case "form.replied":
    case "form.cancelled":
      return { type: "form.settled", sessionID, formID: str(d.id) ?? "" };
    default:
      return null;
  }
}

export function createV2Client(t: Transport, mode: ConnectionMode): OpenCodeClient {
  let directory: string | undefined;
  // /view acknowledges a specific unviewed idle transition, never one the client hasn't seen.
  const idleTimes = new Map<string, number>();
  const session = (v: unknown): SessionInfo | null => {
    const s = v2Session(v);
    if (s && s.time.idle !== undefined) {
      const viewed = num(rec(isRecord(v) ? v.time : undefined).viewed);
      if (viewed === undefined || viewed < s.time.idle) idleTimes.set(s.id, s.time.idle);
      else idleTimes.delete(s.id);
    }
    return s;
  };
  return {
    kind: "v2",
    mode,
    label: t.label,
    async branch(dir) {
      const res = await t.json<{data?:{branch?:{current?:string}}}>("GET", `/api/vcs?${new URLSearchParams({"location[directory]": dir})}`);
      return res.data?.branch?.current ?? null;
    },
    async info() {
      const info = await t.json<{ version?: string }>("GET", "/api/info");
      return { version: info?.version ?? "?", directory };
    },
    async sessions() {
      const res = await t.json<{ data?: unknown[] }>("GET", "/api/session?limit=50&order=desc&parentID=null");
      return (res?.data ?? []).map(session).filter((s): s is SessionInfo => s !== null && s.parentID === undefined);
    },
    async session(id) {
      try {
        const res = await t.json<{ data?: unknown }>("GET", `/api/session/${encodeURIComponent(id)}`);
        return session(res?.data);
      } catch (error) {
        if (error instanceof HttpError && (error.status === 404 || error.status === 400)) return null;
        throw error;
      }
    },
    async messages(sessionID) {
      const res = await t.json<{ data?: unknown[] }>("GET", `/api/session/${encodeURIComponent(sessionID)}/message?limit=200&order=desc`);
      return (res?.data ?? [])
        .map(v2Message)
        .filter((m): m is SessionMessage => m !== null)
        .reverse();
    },
    async create(input) {
      const res = await t.json<{ data?: unknown }>("POST", "/api/session", {
        title: input.title,
        agent: input.agent,
        model: input.model ? { id: input.model.id, providerID: input.model.providerID, variant: input.model.variant } : undefined,
        location: directory ? { directory } : undefined,
      });
      const s = v2Session(res?.data);
      if (!s) throw new Error("OpenCode returned an invalid session");
      return s;
    },
    async prompt(sessionID, text) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/prompt`, { text });
    },
    async commands() {
      const res = await t.json<{ data?: unknown[] }>("GET", "/api/command");
      return (res.data ?? []).flatMap((v) => isRecord(v) && typeof v.name === "string" ? [v.name] : []);
    },
    async command(sessionID, name, text) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/command`, { name, text });
    },
    async compact(sessionID, model) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/compact`, model ? { model } : {});
    },
    async shell(sessionID, command) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/shell`, { command });
    },
    async rename(sessionID, title) {
      await t.json("PATCH", `/api/session/${encodeURIComponent(sessionID)}`, { title });
    },
    async interrupt(sessionID) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/interrupt`, { resume: true });
    },
    async setAgent(sessionID, agent) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/agent`, { agent });
    },
    async setModel(sessionID, model) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/model`, { model: { id: model.id, providerID: model.providerID, variant: model.variant } });
    },
    async view(sessionID) {
      const idle = idleTimes.get(sessionID);
      if (idle !== undefined) {
        await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/view`, { idle });
        idleTimes.delete(sessionID);
      }
    },
    async agents() {
      const res = await t.json<{ location?: { directory?: string }; data?: unknown[] }>("GET", "/api/agent");
      directory ??= res?.location?.directory;
      const visible = (res?.data ?? []).filter((a): a is JsonRecord => isRecord(a) && typeof a.id === "string" && a.hidden !== true);
      return visible.flatMap((a, colorIndex): AgentOption[] => {
        if (a.mode === "subagent") return [];
        return [{ id: a.id as string, name: str(a.name) ?? (a.id as string), description: str(a.description), color: str(a.color), colorIndex }];
      });
    },
    async models() {
      const res = await t.json<{ data?: unknown[] }>("GET", "/api/model");
      return (res?.data ?? []).flatMap((m): ModelOption[] => {
        if (!isRecord(m) || typeof m.id !== "string" || typeof m.providerID !== "string" || m.enabled === false || (m.type && m.type !== "chat")) return [];
        return [{ id: m.id, providerID: m.providerID, name: str(m.name) ?? m.id, context: num(rec(m.limit).context), variants: Array.isArray(m.variants) ? m.variants.flatMap((v) => typeof v?.id === "string" && v.id !== "default" ? [v.id] : []) : [] }];
      });
    },
    async children(sessionID) {
      const res = await t.json<{ data?: unknown[] }>("GET", `/api/session?limit=50&order=desc&parentID=${encodeURIComponent(sessionID)}`);
      return (res?.data ?? []).map(session).filter((s): s is SessionInfo => s !== null && s.parentID === sessionID);
    },
    async permissions(sessionID) {
      const res = await t.json<{ data?: unknown[] }>("GET", `/api/session/${encodeURIComponent(sessionID)}/permission`);
      return (res?.data ?? []).map(v2Permission).filter((p): p is PermissionRequest => p !== null);
    },
    async replyPermission(sessionID, requestID, decision, message) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/permission/${encodeURIComponent(requestID)}/reply`, message ? { decision, message } : { decision });
    },
    async forms(sessionID) {
      const res = await t.json<{ data?: unknown[] }>("GET", `/api/session/${encodeURIComponent(sessionID)}/form`);
      return (res?.data ?? []).map(v2Form).filter((f): f is FormInfo => f !== null);
    },
    async replyForm(sessionID, formID, answer) {
      await t.json("POST", `/api/session/${encodeURIComponent(sessionID)}/form/${encodeURIComponent(formID)}/reply`, { answer });
    },
    async cancelForm(sessionID, formID) {
      await t.json("DELETE", `/api/session/${encodeURIComponent(sessionID)}/form/${encodeURIComponent(formID)}`);
    },
    async defaultModel() {
      try {
        const res = await t.json<{ data?: unknown }>("GET", "/api/model/default");
        return modelRef(res?.data) ?? null;
      } catch {
        return null;
      }
    },
    subscribe(onEvent, onState) {
      return subscribeSse(
        t,
        "/api/event",
        (raw) => {
          const e = parseV2Event(raw);
          if (e) onEvent(e);
        },
        onState,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// V1 (legacy `opencode serve`)
// ---------------------------------------------------------------------------

function v1Session(v: unknown): SessionInfo | null {
  if (!isRecord(v) || typeof v.id !== "string") return null;
  const time = rec(v.time);
  return { id: v.id, parentID: str(v.parentID), title: str(v.title), directory: str(v.directory), time: { created: num(time.created) ?? 0, updated: num(time.updated) ?? num(time.created) ?? 0 } };
}

function v1ToolState(v: unknown): ToolState {
  const s = rec(v);
  const input = rec(s.input);
  if (s.status === "pending") return { status: "streaming", input: "" };
  if (s.status === "running") return { status: "running", input, metadata: rec(s.metadata) };
  if (s.status === "completed") return { status: "completed", input, content: [{ type: "text", text: str(s.output) ?? "" }], metadata: rec(s.metadata) };
  return { status: "error", input, error: { message: errorMessage(s.error) } };
}

export function v1Message(v: unknown): SessionMessage | null {
  if (!isRecord(v)) return null;
  const info = rec(v.info);
  const parts = Array.isArray(v.parts) ? v.parts.filter(isRecord) : [];
  const id = str(info.id);
  if (!id) return null;
  const time = rec(info.time);
  const created = num(time.created) ?? 0;
  if (info.role === "user") {
    return { type: "user", id, time: { created }, text: parts.filter((p) => p.type === "text" && p.synthetic !== true).map((p) => str(p.text) ?? "").join("\n") };
  }
  return {
    type: "assistant",
    id,
    time: { created, completed: num(time.completed) },
    agent: str(info.agent) ?? str(info.mode) ?? "build",
    model: { id: str(info.modelID) ?? "unknown", providerID: str(info.providerID) ?? "unknown" },
    content: parts.flatMap((p): AssistantPart[] => {
      if (p.type === "text") return [{ type: "text", text: str(p.text) ?? "" }];
      if (p.type === "reasoning") return [{ type: "reasoning", text: str(p.text) ?? "" }];
      if (p.type === "tool") return [{ type: "tool", id: str(p.callID) ?? str(p.id) ?? "", name: str(p.tool) ?? "tool", state: v1ToolState(p.state) }];
      return [];
    }),
    error: info.error ? { message: errorMessage(rec(info.error).data ?? info.error) } : undefined,
  };
}

export function createV1Client(t: Transport, mode: ConnectionMode): OpenCodeClient {
  let agentModel: ModelRef | null = null;
  return {
    kind: "v1",
    mode,
    label: t.label,
    async info() {
      const app = await t.json<{ path?: { cwd?: string }; version?: string }>("GET", "/path").catch(() => null);
      return { version: app?.version ?? "v1", directory: str(rec(app?.path).cwd) ?? str(rec(app).directory) };
    },
    async sessions() {
      const list = await t.json<unknown[]>("GET", "/session");
      return (Array.isArray(list) ? list : [])
        .map(v1Session)
        .filter((s): s is SessionInfo => s !== null && s.parentID === undefined)
        .sort((a, b) => b.time.updated - a.time.updated);
    },
    async session(id) {
      try {
        return v1Session(await t.json("GET", `/session/${encodeURIComponent(id)}`));
      } catch {
        return null;
      }
    },
    async messages(sessionID) {
      const list = await t.json<unknown[]>("GET", `/session/${encodeURIComponent(sessionID)}/message`);
      return (Array.isArray(list) ? list : []).map(v1Message).filter((m): m is SessionMessage => m !== null);
    },
    async create(input) {
      const s = v1Session(await t.json("POST", "/session", input.title ? { title: input.title } : {}));
      if (!s) throw new Error("OpenCode returned an invalid session");
      agentModel = input.model ?? agentModel;
      return s;
    },
    async prompt(sessionID, text, options) {
      const model = options?.model ?? agentModel;
      const body = { parts: [{ type: "text", text }], agent: options?.agent, model: model ? { providerID: model.providerID, modelID: model.id } : undefined };
      try {
        await t.json("POST", `/session/${encodeURIComponent(sessionID)}/prompt_async`, body);
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 404) throw error;
        // Older servers only expose the blocking endpoint: fire and let SSE drive the UI.
        void t.json("POST", `/session/${encodeURIComponent(sessionID)}/message`, body, 0).catch(() => undefined);
      }
    },
    async interrupt(sessionID) {
      await t.json("POST", `/session/${encodeURIComponent(sessionID)}/abort`);
    },
    async setAgent() {},
    async setModel(_sessionID, model) {
      agentModel = model;
    },
    async view() {},
    async agents() {
      const list = await t.json<unknown[]>("GET", "/agent").catch(() => []);
      return (Array.isArray(list) ? list : []).flatMap((a): AgentOption[] => {
        if (!isRecord(a) || typeof a.name !== "string" || a.mode === "subagent" || a.hidden === true) return [];
        return [{ id: a.name, name: a.name, description: str(a.description) }];
      });
    },
    async models() {
      const res = await t.json<{ providers?: unknown[] }>("GET", "/config/providers").catch(() => null);
      return (res?.providers ?? []).flatMap((p): ModelOption[] => {
        if (!isRecord(p) || typeof p.id !== "string") return [];
        const providerID = p.id;
        return Object.values(rec(p.models)).flatMap((m): ModelOption[] => (isRecord(m) && typeof m.id === "string" ? [{ id: m.id, providerID, name: str(m.name) ?? m.id }] : []));
      });
    },
    async defaultModel() {
      return agentModel;
    },
    subscribe(onEvent, onState) {
      return subscribeSse(
        t,
        "/event",
        (raw) => {
          if (!isRecord(raw) || typeof raw.type !== "string") return;
          const p = rec(raw.properties);
          const sessionID = str(p.sessionID) ?? str(rec(p.info).sessionID) ?? str(rec(p.part).sessionID) ?? "";
          if (raw.type === "server.connected") onEvent({ type: "connected" });
          else if (raw.type === "session.status") onEvent({ type: "status", sessionID, busy: rec(p.status).type !== "idle" });
          else if (raw.type === "session.idle") {
            onEvent({ type: "status", sessionID, busy: false });
            onEvent({ type: "messages.changed", sessionID });
          } else if (raw.type.startsWith("message.")) onEvent({ type: "messages.changed", sessionID });
          else if (raw.type.startsWith("session.")) onEvent({ type: "sessions.changed" });
        },
        onState,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export interface ConnectOptions {
  /**
   * An explicit OpenCode server URL (`http://localhost:4096`), `"demo"`, or
   * omitted for auto-discovery through the dev proxy.
   */
  endpoint?: string | null;
  /** Override the proxy prefixes probed during auto-discovery. */
  proxyPrefixes?: string[];
}

export interface Connection {
  client: OpenCodeClient;
  /** Why demo mode was chosen, when it was. */
  reason?: string;
  targetUrl?: string;
}

const PROXY_PREFIXES = ["/__opencode", "/api/opencode"];

let defaultEndpoint: string | null | undefined;

/** Pin the endpoint used by `connectOpenCode()` (tests, embeds). `undefined` restores auto-discovery. */
export function setDefaultEndpoint(endpoint: string | null | undefined): void {
  defaultEndpoint = endpoint;
}

const STORAGE_KEY = "opencode-console:server";

/** The endpoint chosen via `/connect`, `?server=`, or `setDefaultEndpoint()`. */
export function savedEndpoint(): string | null {
  if (defaultEndpoint !== undefined) return defaultEndpoint;
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location?.search ?? "");
  if (q.has("demo")) return "demo";
  const fromQuery = q.get("server");
  // Crafted links must not point the console (and your prompts) at a remote server.
  if (fromQuery && isLoopbackEndpoint(fromQuery)) return fromQuery;
  try {
    return window.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function saveEndpoint(endpoint: string | null): void {
  if (defaultEndpoint !== undefined) defaultEndpoint = endpoint;
  if (typeof window === "undefined") return;
  try {
    if (endpoint) window.localStorage?.setItem(STORAGE_KEY, endpoint);
    else window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}

async function detect(t: Transport, mode: ConnectionMode): Promise<OpenCodeClient> {
  try {
    const info = await t.json<{ version?: string }>("GET", "/api/info");
    if (typeof info?.version === "string") return createV2Client(t, mode);
  } catch (err) {
    // V1 servers return 404 or their HTML app shell here. An auth/network failure isn't V1.
    if (!(err instanceof HttpError) || ![404, 405, 415].includes(err.status)) throw err;
  }
  const list = await t.json<unknown>("GET", "/session?limit=1");
  if (Array.isArray(list)) return createV1Client(t, mode);
  throw new HttpError(415, "Not an OpenCode server");
}

function offline(reason: string, targetUrl?: string): Connection {
  console.warn(`OpenCode Lite: ${reason} (demo mode)`);
  return { client: createDemoClient(), reason, targetUrl };
}

function failure(status: number, label: string, discoveredUrl?: string): string {
  const alt = discoveredUrl ? hostLabel(discoveredUrl) : "";
  if (status === 401) {
    return alt && alt !== label
      ? `Auth required at ${label} — clear /connect to use ${alt}`
      : "Auth required — check opencode service status or OPENCODE_PASSWORD";
  }
  if (status === 403) return "Forbidden — open the app on localhost";
  if ([404, 405, 415].includes(status)) return `Not OpenCode at ${label} — check /connect`;
  if (status && status !== 502) return `HTTP ${status} at ${label} — check opencode service status`;
  if (alt && alt !== label) return `Can't reach ${label} — clear /connect to use ${alt}`;
  return `Can't reach ${label} — run opencode service start`;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `true` for `localhost`, `127.0.0.1` and `[::1]` URLs (scheme optional). */
export function isLoopbackEndpoint(input: string): boolean {
  try {
    const u = new URL(normalizeUrl(input));
    return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password && LOOPBACK_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  // `service status` may print the bind address, which isn't a connect address.
  const u = new URL(withScheme);
  if (u.username || u.password) throw new Error("Use a server URL without credentials");
  if (u.hostname === "0.0.0.0" || u.hostname === "[::]") u.hostname = "127.0.0.1";
  return u.href.replace(/\/+$/, "");
}

interface ProxyCheck {
  connected: boolean;
  targetUrl?: string;
  mode?: string;
  upstreamStatus?: number;
}

async function fetchProxyStatus(prefix: string): Promise<ProxyCheck | null> {
  const status = await createTransport(prefix, "").json<unknown>("GET", "/_status");
  if (!isRecord(status) || typeof status.connected !== "boolean") return null;
  return {
    connected: status.connected,
    targetUrl: str(status.targetUrl),
    mode: str(status.mode),
    upstreamStatus: num(status.upstreamStatus),
  };
}

/** Resolve a live OpenCode client, falling back to the interactive demo backend. */
export async function connectOpenCode(options: ConnectOptions = {}): Promise<Connection> {
  const endpoint = options.endpoint === undefined ? savedEndpoint() : options.endpoint;
  if (endpoint === "demo") return { client: createDemoClient(), reason: "Demo mode selected" };

  if (endpoint) {
    let url: string;
    try {
      url = normalizeUrl(endpoint);
    } catch {
      return offline("Invalid URL — omit credentials and use /connect or OPENCODE_PASSWORD");
    }
    const label = hostLabel(url);
    let discoveredUrl: string | undefined;
    try {
      // Prefer the local same-origin proxy. The website's deployed server is not the user's Mac.
      if (typeof window !== "undefined" && window.location && isLoopbackEndpoint(url) && isLoopbackEndpoint(window.location.origin)) {
        for (const prefix of options.proxyPrefixes ?? PROXY_PREFIXES) {
          const st = await fetchProxyStatus(prefix).catch(() => null);
          if (!st) continue;
          if (st.connected && st.targetUrl) discoveredUrl = st.targetUrl;
          return { client: await detect(createTransport(prefix, label, { "x-opencode-target": url }), "custom"), targetUrl: url };
        }
      }
      return { client: await detect(createTransport(url, label), "custom"), targetUrl: url };
    } catch (err) {
      return offline(failure(err instanceof HttpError ? err.status : 0, label, discoveredUrl), url);
    }
  }

  if (typeof window === "undefined" || !window.location) {
    // text run dispatches relative fetches directly to app/api handlers. Stay
    // offline unless explicitly pointed at a server; the handler, not this
    // browser-shared module, owns its credentials. Pin every request to the
    // supplied target (never silently pick the managed service).
    const target = typeof process !== "undefined" && process.env.OPENCODE_SERVER_URL;
    if (target && isLoopbackEndpoint(target)) {
      const url = normalizeUrl(target);
      try {
        const client = await detect(createTransport("/api/opencode", hostLabel(url), { "x-opencode-target": url }), "direct");
        return { client, targetUrl: url };
      } catch {
        return offline(`Can't connect to ${hostLabel(url)}`, url);
      }
    }
    return { client: createDemoClient(), reason: "No browser origin" };
  }
  for (const prefix of options.proxyPrefixes ?? PROXY_PREFIXES) {
    let status: ProxyCheck | null = null;
    try {
      status = await fetchProxyStatus(prefix);
    } catch (err) {
      if (err instanceof HttpError && err.status === 403) return offline("Proxy blocked — open the app on localhost");
      continue;
    }
    if (!status || !status.targetUrl) continue;
    const targetUrl = status.targetUrl;
    const label = hostLabel(targetUrl);
    if (!status.connected) return offline(failure(status.upstreamStatus ?? 0, label), targetUrl);
    try {
      return { client: await detect(createTransport(prefix, label), status.mode === "service" ? "service" : "direct"), targetUrl };
    } catch (err) {
      return offline(failure(err instanceof HttpError ? err.status : 0, label), targetUrl);
    }
  }
  return offline("No local proxy — run bun run dev:opencode");
}
