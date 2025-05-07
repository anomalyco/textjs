/** A tiny client for the OpenCode server HTTP API (proxied at `/opencode`). */

export const BASE = "/opencode";

export interface Session {
  id: string;
  title: string;
  time: { created: number; updated: number };
}

export interface MessagePart {
  type: string;
  text?: string;
}

export interface Message {
  info: { id: string; role: "user" | "assistant" };
  parts: MessagePart[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error(`OpenCode ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export const opencode = {
  listSessions: () => request<Session[]>("/session"),
  createSession: (title?: string) => request<Session>("/session", { method: "POST", body: JSON.stringify(title ? { title } : {}) }),
  messages: (id: string) => request<Message[]>(`/session/${id}/message`),
  prompt: (id: string, text: string) => request<Message>(`/session/${id}/message`, { method: "POST", body: JSON.stringify({ parts: [{ type: "text", text }] }) }),
};

export function messageText(m: Message): string {
  return m.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
