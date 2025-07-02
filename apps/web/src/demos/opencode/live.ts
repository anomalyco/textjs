/**
 * Minimal browser client for a local `opencode serve` HTTP + SSE API.
 * Everything is best-effort: the sandbox simulation is used whenever the
 * server is unreachable from the browser (not running, CORS, mixed content).
 */

import type { Part, Session, ToolPart } from "./model";

export function normalizeServerUrl(input: string): string {
  let url = input.trim();
  if (url.length === 0) return "";
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "");
}

interface RemoteSession {
  id: string;
  title?: string;
  time?: { created?: number; updated?: number };
}

interface RemotePart {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type?: string;
  text?: string;
  tool?: string;
  state?: { status?: string; title?: string; input?: Record<string, unknown>; output?: string; error?: string };
}

function ago(ms: number | undefined): string {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export class OpenCodeHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 4000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (init?.body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });
    if (res.status === 401 || res.status === 403) throw new OpenCodeHttpError(res.status, "Authentication required by this server — use the local proxy template below");
    if (!res.ok) throw new OpenCodeHttpError(res.status, `HTTP ${res.status} ${res.statusText}`);
    if (!(res.headers.get("content-type") ?? "").includes("json")) throw new OpenCodeHttpError(res.status, "Not an OpenCode API endpoint (received HTML)");
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Convert a server part into the Lite model (unknown part types are dropped). */
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

export class OpenCodeClient {
  constructor(readonly baseUrl: string) {}

  /**
   * Find the API root for a server URL (`/` for `opencode serve`, `/api` for
   * the desktop service) and verify it answers `GET /session` with JSON.
   */
  static async discover(url: string): Promise<{ apiBase: string; version?: string }> {
    let lastError: unknown = new Error("Unreachable");
    for (const candidate of [url, `${url}/api`]) {
      try {
        const sessions = await getJson<unknown>(`${candidate}/session`, undefined, 3000);
        if (!Array.isArray(sessions)) throw new Error("Unexpected response from /session");
        let version: string | undefined;
        try {
          version = (await getJson<{ version?: string }>(`${candidate}/app`, undefined, 1500)).version;
        } catch {
          // optional
        }
        return { apiBase: candidate, version };
      } catch (err) {
        lastError = err;
        if (err instanceof OpenCodeHttpError && err.status === 401) break;
      }
    }
    throw lastError;
  }

  async listSessions(): Promise<Session[]> {
    const list = await getJson<RemoteSession[]>(`${this.baseUrl}/session`);
    return list
      .slice()
      .sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))
      .slice(0, 30)
      .map((s) => ({ id: s.id, title: s.title || "Untitled session", updated: ago(s.time?.updated), messages: [], live: true }));
  }

  async loadMessages(sessionId: string): Promise<Session["messages"]> {
    const msgs = await getJson<Array<{ info: { id: string; role: "user" | "assistant"; modelID?: string; providerID?: string }; parts: RemotePart[] }>>(
      `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/message`,
    );
    return msgs.map((m) => ({
      id: m.info.id,
      role: m.info.role,
      model: m.info.providerID && m.info.modelID ? `${m.info.providerID}/${m.info.modelID}` : undefined,
      parts: m.parts.map(toPart).filter((x): x is Part => x !== null),
    }));
  }

  async createSession(title?: string): Promise<Session> {
    const s = await getJson<RemoteSession>(`${this.baseUrl}/session`, { method: "POST", body: JSON.stringify(title ? { title } : {}) });
    return { id: s.id, title: s.title || title || "New session", updated: "just now", messages: [], live: true };
  }

  /**
   * Send a prompt and stream assistant parts through `onParts` (via `/event`
   * SSE when available, falling back to the final POST response).
   */
  async prompt(sessionId: string, text: string, agent: string, onParts: (parts: Part[]) => void): Promise<void> {
    const order: string[] = [];
    const parts = new Map<string, Part>();
    let source: EventSource | null = null;
    const emit = (): void => onParts(order.map((id) => parts.get(id)).filter((p): p is Part => p !== undefined));
    try {
      source = new EventSource(`${this.baseUrl}/event`);
      source.onmessage = (m) => {
        try {
          const ev = JSON.parse(String(m.data)) as { type?: string; properties?: { part?: RemotePart } };
          const part = ev.properties?.part;
          if (ev.type !== "message.part.updated" || !part || part.sessionID !== sessionId || !part.id) return;
          const converted = toPart(part);
          if (!converted) return;
          if (!parts.has(part.id)) order.push(part.id);
          parts.set(part.id, converted);
          emit();
        } catch {
          // ignore malformed events
        }
      };
    } catch {
      source = null;
    }
    try {
      const result = await getJson<{ info?: { role?: string }; parts?: RemotePart[] }>(
        `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/message`,
        { method: "POST", body: JSON.stringify({ agent, parts: [{ type: "text", text }] }) },
        10 * 60_000,
      );
      const final = (result.parts ?? []).map(toPart).filter((x): x is Part => x !== null);
      if (final.length > 0) onParts(final);
    } finally {
      source?.close();
    }
  }
}
