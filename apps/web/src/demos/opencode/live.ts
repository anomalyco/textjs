/**
 * Browser client for a local OpenCode server: the V2 API (`/api/*`, served by
 * the desktop daemon and current `opencode serve`) with a V1 fallback.
 *
 * Works against both `text proxy` (CORS + Private Network Access + daemon
 * auth on :4096) and `opencode serve --cors <origin>`. GETs stay "simple"
 * (only `Accept`), and the custom `x-opencode-client` header is only sent to
 * the bridge, which advertises itself with `X-Textjs-Bridge: 1`.
 */

import { diffTexts } from "@textjs/react";
import type { Message, Part, Session, ToolPart } from "./model";

export type Protocol = "v1" | "v2";

export const DEFAULT_SERVER_URL = "http://127.0.0.1:4096";
// The public npm `textjs` package is unrelated and has no CLI. Run this in the Text.js checkout.
export const BRIDGE_COMMAND = "bun run opencode:proxy";
const REMEMBER_KEY = "textjs:opencode-server";

export function normalizeServerUrl(input: string): string {
  let raw = input.trim();
  if (raw.length === 0) return "";
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`;
  try {
    const u = new URL(raw);
    if (u.hostname === "0.0.0.0" || u.hostname === "[::]") u.hostname = "127.0.0.1";
    if (!u.username && !u.password && u.pathname === "/" && !u.search && !u.hash) return u.origin;
    return u.href.replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export class OpenCodeHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const rec = (v: unknown): Json => (isRecord(v) ? v : {});

function ago(ms: number | undefined): string {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

/** `/Users/you/code/x/src/a.ts` → `src/a.ts` (relative to `dir`), else `~/…`. */
function shortPath(path: string, dir?: string): string {
  if (dir && path.startsWith(`${dir.replace(/\/+$/, "")}/`)) return path.slice(dir.replace(/\/+$/, "").length + 1);
  return path.replace(/^\/(Users|home)\/[^/]+/, "~");
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  bridge?: boolean;
}

async function request(url: string, { method = "GET", body, timeoutMs = 4000, bridge = false }: RequestOptions = {}): Promise<{ data: unknown; res: Response }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (bridge && method !== "GET" && method !== "HEAD") headers["x-opencode-client"] = "1";
  const init: RequestInit = { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
  if (timeoutMs > 0 && typeof AbortSignal.timeout === "function") init.signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, init);
  const viaBridge = res.headers.get("x-textjs-bridge") === "1";
  if (res.status === 401) {
    throw new OpenCodeHttpError(
      401,
      viaBridge
        ? "OpenCode rejected the bridge password — check opencode service status or OPENCODE_PASSWORD."
        : `Auth required — run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`,
    );
  }
  if (res.status === 403) {
    const origin = typeof location !== "undefined" ? location.origin : "<origin>";
    throw new OpenCodeHttpError(403, `Origin blocked — pass --allow-origin ${origin} to ${BRIDGE_COMMAND}.`);
  }
  if (res.status === 502 && viaBridge) throw new OpenCodeHttpError(502, "Bridge can't reach OpenCode — run opencode service start (or pass --target).");
  if (!res.ok) throw new OpenCodeHttpError(res.status, `HTTP ${res.status}`);
  if (res.status === 204) return { data: undefined, res };
  const text = await res.text();
  if (text.length === 0) return { data: undefined, res };
  if (text.trimStart().startsWith("<")) throw new OpenCodeHttpError(415, "Not an OpenCode server");
  return { data: JSON.parse(text) as unknown, res };
}

/** Parse a `text/event-stream` body, one JSON payload per `data:` block. */
export async function readSse(res: Response, onData: (data: unknown) => void): Promise<void> {
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let carry = "";
    if (!done && buffer.endsWith("\r")) {
      carry = "\r";
      buffer = buffer.slice(0, -1);
    }
    buffer = buffer.replace(/\r\n?/g, "\n");
    let i = buffer.indexOf("\n\n");
    while (i >= 0) {
      const data = buffer
        .slice(0, i)
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      buffer = buffer.slice(i + 2);
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

// ---------------------------------------------------------------------------
// Part mapping
// ---------------------------------------------------------------------------

function toolTitle(name: string, input: Json, dir?: string): string {
  const path = str(input.path) ?? str(input.filePath);
  if (name === "shell" || name === "bash") return str(input.command) ?? name;
  if (name === "grep" || name === "glob") return `"${str(input.pattern) ?? ""}"${path ? ` in ${shortPath(path, dir)}` : ""}`;
  if (path) return shortPath(path, dir);
  return str(input.pattern) ?? str(input.url) ?? str(input.query) ?? str(input.description) ?? name;
}

function outputTail(text: string, lines = 6): string {
  const all = text.replace(/\s+$/, "").split("\n");
  return all.slice(-lines).join("\n");
}

function v2Tool(name: string, state: Json, dir?: string): ToolPart {
  const status = str(state.status);
  const input = rec(state.input);
  const content = Array.isArray(state.content) ? state.content : [];
  const output = content
    .map((c) => (isRecord(c) && c.type === "text" ? (str(c.text) ?? "") : ""))
    .join("\n");
  const part: ToolPart = {
    type: "tool",
    tool: name,
    title: toolTitle(name, input, dir),
    status: status === "completed" ? "completed" : status === "error" ? "error" : status === "running" ? "running" : "pending",
  };
  const path = str(input.path) ?? str(input.filePath);
  if ((name === "edit" || name === "write") && typeof input.newString === "string") {
    part.diff = { before: str(input.oldString) ?? "", after: input.newString, filename: path ? shortPath(path, dir) : "" };
  } else if ((name === "shell" || name === "bash") && output) part.output = outputTail(output);
  else if (status === "error") part.output = str(rec(state.error).message) ?? (str(state.error) || undefined);
  return part;
}

function v2Part(v: unknown, dir?: string): Part | null {
  if (!isRecord(v)) return null;
  if (v.type === "text") return { type: "text", text: str(v.text) ?? "" };
  if (v.type === "reasoning") return { type: "reasoning", text: str(v.text) ?? "" };
  if (v.type === "tool") return v2Tool(str(v.name) ?? "tool", rec(v.state), dir);
  return null;
}

/** Map a V2 message (`/api/session/:id/message`) into the demo model. */
export function v2Message(v: unknown, dir?: string): Message | null {
  if (!isRecord(v) || typeof v.id !== "string") return null;
  if (v.type === "user") return { id: v.id, role: "user", parts: [{ type: "text", text: str(v.text) ?? "" }] };
  if (v.type !== "assistant") return null;
  const model = rec(v.model);
  const time = rec(v.time);
  const tokens = rec(v.tokens);
  const created = num(time.created);
  const completed = num(time.completed);
  return {
    id: v.id,
    role: "assistant",
    agent: str(v.agent) === "plan" ? "plan" : "build",
    model: str(model.providerID) && str(model.id) ? `${model.providerID as string}/${model.id as string}` : undefined,
    parts: (Array.isArray(v.content) ? v.content : []).map((p) => v2Part(p, dir)).filter((p): p is Part => p !== null),
    durationMs: created && completed ? completed - created : undefined,
    tokens: (num(tokens.input) ?? 0) + (num(tokens.output) ?? 0) || undefined,
  };
}

interface RemotePart {
  id?: string;
  sessionID?: string;
  type?: string;
  text?: string;
  tool?: string;
  state?: { status?: string; title?: string; input?: Record<string, unknown>; output?: string; error?: string };
}

/** Convert a V1 server part into the demo model (unknown part types are dropped). */
export function toPart(p: RemotePart): Part | null {
  if (p.type === "text" && typeof p.text === "string") return { type: "text", text: p.text };
  if (p.type === "reasoning" && typeof p.text === "string") return { type: "reasoning", text: p.text };
  if (p.type === "tool") {
    const st = p.state ?? {};
    const status: ToolPart["status"] = st.status === "completed" ? "completed" : st.status === "error" ? "error" : st.status === "running" ? "running" : "pending";
    const input = st.input ?? {};
    const title = st.title ?? String(input.filePath ?? input.command ?? input.pattern ?? p.tool ?? "tool");
    return { type: "tool", tool: p.tool ?? "tool", title, status, output: st.output ?? st.error };
  }
  return null;
}

/** Folds V2 SSE deltas for one session into a growing part list. */
export class V2Turn {
  readonly parts: Part[] = [];
  private readonly tools = new Map<string, number>();
  done = false;
  error: string | null = null;

  constructor(
    readonly sessionID: string,
    private readonly dir?: string,
  ) {}

  private last(kind: "text" | "reasoning"): Part | undefined {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i] as Part;
      if (p.type === kind) return p;
      if (p.type === "tool") return undefined;
    }
    return undefined;
  }

  /** Apply one event. Returns `true` when the visible parts changed. */
  apply(raw: unknown): boolean {
    if (!isRecord(raw) || typeof raw.type !== "string") return false;
    const d = rec(raw.data);
    if (str(d.sessionID) !== this.sessionID) return false;
    switch (raw.type) {
      case "session.text.started":
      case "session.reasoning.started":
        this.parts.push({ type: raw.type === "session.text.started" ? "text" : "reasoning", text: "" });
        return true;
      case "session.text.delta":
      case "session.reasoning.delta": {
        const kind = raw.type === "session.text.delta" ? "text" : "reasoning";
        const p = this.last(kind) ?? (this.parts[this.parts.push({ type: kind, text: "" }) - 1] as Part);
        if (p.type === kind) p.text += str(d.delta) ?? "";
        return true;
      }
      case "session.text.ended":
      case "session.reasoning.ended": {
        const p = this.last(raw.type === "session.text.ended" ? "text" : "reasoning");
        if (p && (p.type === "text" || p.type === "reasoning") && typeof d.text === "string") p.text = d.text;
        return true;
      }
      case "session.tool.input.started": {
        const name = str(d.name) ?? "tool";
        this.tools.set(str(d.id) ?? "", this.parts.push({ type: "tool", tool: name, title: name, status: "pending" }) - 1);
        return true;
      }
      case "session.tool.called":
      case "session.tool.success":
      case "session.tool.failed": {
        const id = str(d.id) ?? "";
        let idx = this.tools.get(id);
        const prev = idx === undefined ? undefined : (this.parts[idx] as ToolPart);
        const name = str(d.name) ?? prev?.tool ?? "tool";
        const input = isRecord(d.input) ? d.input : undefined;
        const status = raw.type === "session.tool.called" ? "running" : raw.type === "session.tool.success" ? "completed" : "error";
        const prevInput = prev?.input;
        const next = v2Tool(name, { status, input: input ?? prevInput ?? {}, content: d.content, error: d.error }, this.dir);
        next.input = input ?? prevInput;
        if (idx === undefined) idx = this.parts.push(next) - 1;
        else this.parts[idx] = next;
        this.tools.set(id, idx);
        return true;
      }
      case "session.execution.succeeded":
      case "session.execution.interrupted":
      case "session.idle":
        this.done = true;
        return false;
      case "session.execution.failed":
        this.done = true;
        this.error = str(rec(d.error).message) ?? str(d.error) ?? "failed";
        return false;
      default:
        return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface DiscoverResult {
  apiBase: string;
  version?: string;
  protocol: Protocol;
  /** The server is `text proxy`. */
  bridge: boolean;
}

export interface ClientOptions {
  protocol?: Protocol;
  bridge?: boolean;
}

/** Remember a server that connected once so later visits reconnect without a prompt. */
export function rememberServer(url: string | null): void {
  try {
    if (url) localStorage.setItem(REMEMBER_KEY, url);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // storage unavailable
  }
}

/**
 * The server to auto-connect to on load, if any. Only servers that connected
 * before (or any page served from localhost) are probed, so first-time
 * visitors never see a local-network permission prompt or a failed request.
 */
export function autoConnectTarget(): string | null {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) return saved;
  } catch {
    // storage unavailable
  }
  if (typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return DEFAULT_SERVER_URL;
  return null;
}

export class OpenCodeClient {
  readonly protocol: Protocol;
  readonly bridge: boolean;
  private readonly dirs = new Map<string, string>();

  constructor(
    readonly baseUrl: string,
    options: ClientOptions = {},
  ) {
    this.protocol = options.protocol ?? "v2";
    this.bridge = options.bridge ?? false;
  }

  /** Detect the protocol (V2 `/api/info`, else V1 `/session`) and whether the server is `text proxy`. */
  static async discover(rawUrl: string, timeoutMs = 3000): Promise<DiscoverResult> {
    const url = normalizeServerUrl(rawUrl);
    const localPage = typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    try {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new OpenCodeHttpError(400, `Invalid URL — enter ${DEFAULT_SERVER_URL} and run ${BRIDGE_COMMAND}.`);
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new OpenCodeHttpError(400, `Invalid URL — enter ${DEFAULT_SERVER_URL} and run ${BRIDGE_COMMAND}.`);
      }
      if (parsed.username || parsed.password) {
        throw new OpenCodeHttpError(400, `Don't put credentials in the URL — run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
      }
      // The first public → loopback fetch may wait for Chrome's Local Network Access prompt.
      if (typeof location !== "undefined" && !localPage) timeoutMs = Math.max(timeoutMs, 60_000);
      try {
        const { data, res } = await request(`${url}/api/info`, { timeoutMs });
        if (isRecord(data) && typeof data.version === "string") return { apiBase: url, version: data.version, protocol: "v2", bridge: res.headers.get("x-textjs-bridge") === "1" };
      } catch (err) {
        if (!(err instanceof OpenCodeHttpError) || ![404, 405, 415].includes(err.status)) throw err;
      }
      const { data, res } = await request(`${url}/session?limit=1`, { timeoutMs });
      if (!Array.isArray(data)) throw new OpenCodeHttpError(415, "Not an OpenCode server");
      return { apiBase: url, protocol: "v1", bridge: res.headers.get("x-textjs-bridge") === "1" };
    } catch (err) {
      const host = url.replace(/^https?:\/\//, "") || "127.0.0.1:4096";
      let hint = localPage
        ? `Can't reach ${host} — run ${BRIDGE_COMMAND} and connect to 127.0.0.1:4096.`
        : `Can't reach ${host} — run ${BRIDGE_COMMAND} and allow local network access.`;
      if (err instanceof OpenCodeHttpError) {
        if ([400, 401, 403, 502].includes(err.status)) hint = err.message;
        else if ([404, 405, 415].includes(err.status)) hint = `Not an OpenCode server at ${host} — run ${BRIDGE_COMMAND} and connect to 127.0.0.1:4096.`;
        else hint = `OpenCode returned HTTP ${err.status} at ${host} — check opencode service status or run ${BRIDGE_COMMAND}.`;
      }
      // Also explain quiet auto-connect failures, without probing first-time public visitors.
      console.warn(`OpenCode Lite: ${hint}`);
      throw new Error(hint);
    }
  }

  private async call(path: string, opts: RequestOptions = {}): Promise<unknown> {
    return (await request(`${this.baseUrl}${path}`, { ...opts, bridge: this.bridge })).data;
  }

  async listSessions(): Promise<Session[]> {
    if (this.protocol === "v2") {
      const res = rec(await this.call("/api/session?parentID=null&limit=30"));
      return (Array.isArray(res.data) ? res.data : []).flatMap((s): Session[] => {
        if (!isRecord(s) || typeof s.id !== "string" || typeof s.parentID === "string") return [];
        const dir = str(rec(s.location).directory);
        if (dir) this.dirs.set(s.id, dir);
        return [{ id: s.id, title: str(s.title) || "Untitled session", updated: ago(num(rec(s.time).updated)), messages: [], live: true, directory: dir }];
      });
    }
    const list = await this.call("/session");
    return (Array.isArray(list) ? list : [])
      .filter(isRecord)
      .filter((s) => typeof s.id === "string" && typeof s.parentID !== "string")
      .sort((a, b) => (num(rec(b.time).updated) ?? 0) - (num(rec(a.time).updated) ?? 0))
      .slice(0, 30)
      .map((s) => ({ id: s.id as string, title: str(s.title) || "Untitled session", updated: ago(num(rec(s.time).updated)), messages: [], live: true, directory: str(s.directory) }));
  }

  async loadMessages(sessionId: string): Promise<Message[]> {
    const id = encodeURIComponent(sessionId);
    if (this.protocol === "v2") {
      const res = rec(await this.call(`/api/session/${id}/message?order=desc&limit=60`));
      const dir = this.dirs.get(sessionId);
      return (Array.isArray(res.data) ? res.data : [])
        .map((m) => v2Message(m, dir))
        .filter((m): m is Message => m !== null)
        .reverse();
    }
    const msgs = await this.call(`/session/${id}/message`);
    return (Array.isArray(msgs) ? msgs : []).filter(isRecord).map((m) => {
      const info = rec(m.info);
      return {
        id: str(info.id) ?? "",
        role: info.role === "user" ? "user" : "assistant",
        model: str(info.providerID) && str(info.modelID) ? `${info.providerID as string}/${info.modelID as string}` : undefined,
        parts: (Array.isArray(m.parts) ? m.parts : []).map((p) => toPart(p as RemotePart)).filter((x): x is Part => x !== null),
      };
    });
  }

  async createSession(title?: string): Promise<Session> {
    if (this.protocol === "v2") {
      const s = rec(rec(await this.call("/api/session", { method: "POST", body: title ? { title } : {} })).data);
      if (typeof s.id !== "string") throw new Error("Invalid session");
      return { id: s.id, title: str(s.title) || title || "New session", updated: "just now", messages: [], live: true, directory: str(rec(s.location).directory) };
    }
    const s = rec(await this.call("/session", { method: "POST", body: title ? { title } : {} }));
    return { id: String(s.id), title: str(s.title) || title || "New session", updated: "just now", messages: [], live: true };
  }

  async interrupt(sessionId: string): Promise<void> {
    const id = encodeURIComponent(sessionId);
    await this.call(this.protocol === "v2" ? `/api/session/${id}/interrupt` : `/session/${id}/abort`, { method: "POST" });
  }

  /** Send a prompt and stream assistant parts through `onParts` until the turn ends. */
  async prompt(sessionId: string, text: string, agent: string, onParts: (parts: Part[]) => void, signal?: AbortSignal): Promise<void> {
    return this.protocol === "v2" ? this.promptV2(sessionId, text, agent, onParts, signal) : this.promptV1(sessionId, text, agent, onParts);
  }

  private async promptV2(sessionId: string, text: string, agent: string, onParts: (parts: Part[]) => void, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return;
    const id = encodeURIComponent(sessionId);
    const ctrl = new AbortController();
    const abort = (): void => ctrl.abort();
    signal?.addEventListener("abort", abort);
    const turn = new V2Turn(sessionId, this.dirs.get(sessionId));
    try {
      const res = await fetch(`${this.baseUrl}/api/event`, { headers: { accept: "text/event-stream" }, signal: ctrl.signal });
      if (!res.ok || !res.body || !res.headers.get("content-type")?.includes("text/event-stream")) throw new OpenCodeHttpError(res.status, "OpenCode event stream unavailable. Check the server URL.");
      const finished = new Promise<void>((resolve, reject) => {
        readSse(res, (raw) => {
          if (turn.apply(raw)) onParts(turn.parts.map((p) => ({ ...p })));
          if (turn.done) resolve();
        }).then(() => (turn.done || ctrl.signal.aborted ? resolve() : reject(new Error("OpenCode event stream disconnected before the turn finished."))), (err: unknown) => (ctrl.signal.aborted ? resolve() : reject(err)));
      });
      const send = async (): Promise<void> => {
        await this.call(`/api/session/${id}/agent`, { method: "POST", body: { agent } });
        if (!ctrl.signal.aborted) await this.call(`/api/session/${id}/prompt`, { method: "POST", body: { text }, timeoutMs: 30_000 });
      };
      await Promise.all([finished, send()]);
      if (turn.error) throw new Error(turn.error);
    } finally {
      signal?.removeEventListener("abort", abort);
      ctrl.abort();
    }
  }

  private async promptV1(sessionId: string, text: string, agent: string, onParts: (parts: Part[]) => void): Promise<void> {
    const order: string[] = [];
    const parts = new Map<string, Part>();
    const ctrl = new AbortController();
    const emit = (): void => onParts(order.map((id) => parts.get(id)).filter((p): p is Part => p !== undefined));
    void fetch(`${this.baseUrl}/event`, { headers: { accept: "text/event-stream" }, signal: ctrl.signal })
      .then((res) =>
        res.ok && res.body
          ? readSse(res, (raw) => {
              const ev = rec(raw);
              const part = rec(rec(ev.properties).part) as RemotePart;
              if (ev.type !== "message.part.updated" || part.sessionID !== sessionId || !part.id) return;
              const converted = toPart(part);
              if (!converted) return;
              if (!parts.has(part.id)) order.push(part.id);
              parts.set(part.id, converted);
              emit();
            })
          : undefined,
      )
      .catch(() => undefined);
    try {
      const result = rec(
        await this.call(`/session/${encodeURIComponent(sessionId)}/message`, { method: "POST", body: { agent, parts: [{ type: "text", text }] }, timeoutMs: 10 * 60_000 }),
      );
      const final = (Array.isArray(result.parts) ? result.parts : []).map((p) => toPart(p as RemotePart)).filter((x): x is Part => x !== null);
      if (final.length > 0) onParts(final);
    } finally {
      ctrl.abort();
    }
  }
}

/** `+3 -1` across every edit in a session. */
export function diffStat(messages: readonly Message[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type !== "tool" || !p.diff) continue;
      const f = diffTexts(p.diff.before, p.diff.after, p.diff.filename, 0);
      additions += f.additions;
      deletions += f.deletions;
    }
  }
  return { additions, deletions };
}
