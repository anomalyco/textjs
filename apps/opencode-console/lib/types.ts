/**
 * Normalized OpenCode shapes used by the console UI. They mirror the V2 HTTP
 * API (`SessionInfo`, `SessionMessage*`, `V2Event`) closely; V1 servers and the
 * demo backend are adapted into the same shapes at the client boundary.
 */

export type ModelRef = { id: string; providerID: string; variant?: string };

export type SessionInfo = {
  id: string;
  parentID?: string;
  title?: string;
  agent?: string;
  model?: ModelRef;
  directory?: string;
  outcome?: "succeeded" | "failed" | "interrupted";
  time: { created: number; updated: number; busy?: number; idle?: number };
};

export type ToolContent = { type: "text"; text: string } | { type: "file"; uri: string; mime: string; name?: string | null };

export type JsonRecord = Record<string, unknown>;

export type ToolState =
  | { status: "streaming"; input: string }
  | { status: "running"; input: JsonRecord; metadata?: JsonRecord }
  | { status: "completed"; input: JsonRecord; content: ToolContent[]; metadata?: JsonRecord }
  | { status: "error"; input: JsonRecord; error: { type?: string; message: string }; content?: ToolContent[]; metadata?: JsonRecord };

export type TextPart = { type: "text"; text: string; ordinal?: number };
export type ReasoningPart = { type: "reasoning"; text: string; ordinal?: number; time?: { created: number; completed?: number } };
export type ToolPart = { type: "tool"; id: string; name: string; state: ToolState; time?: { created: number; ran?: number; completed?: number } };
export type AssistantPart = TextPart | ReasoningPart | ToolPart;

export type UserMessage = { type: "user"; id: string; time: { created: number }; text: string; pending?: boolean; files?: { name: string; mime: string }[] };
export type AssistantMessage = {
  type: "assistant";
  id: string;
  time: { created: number; completed?: number };
  agent: string;
  model: ModelRef;
  content: AssistantPart[];
  finish?: string;
  error?: { message: string };
  tokens?: { input: number; output: number; reasoning: number };
  cost?: number;
};
export type NoteMessage = { type: "note"; id: string; time: { created: number }; text: string; tone: "muted" | "info" | "warning" | "danger" };
export type ShellMessage = { type: "shell"; id: string; time: { created: number }; command: string; status: string; output?: string };

export type SessionMessage = UserMessage | AssistantMessage | NoteMessage | ShellMessage;

export type AgentOption = { id: string; name: string; description?: string };
export type ModelOption = { id: string; providerID: string; name: string; context?: number; variants?: string[] };

export type ServerInfo = { version: string; directory?: string };

/** Events consumed by the store, parsed from V2 SSE (or synthesized by V1 / demo backends). */
export type AppEvent =
  | { type: "connected" }
  | { type: "sessions.changed" }
  | { type: "session.renamed"; sessionID: string; title: string }
  | { type: "session.agent"; sessionID: string; agent: string }
  | { type: "session.model"; sessionID: string; model: ModelRef }
  | { type: "status"; sessionID: string; busy: boolean }
  | { type: "messages.changed"; sessionID: string }
  | { type: "step.started"; sessionID: string; messageID: string; agent: string; model: ModelRef; started: number }
  | { type: "step.ended"; sessionID: string; messageID: string; finish?: string; tokens?: AssistantMessage["tokens"]; cost?: number; error?: string }
  | { type: "part.started"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number }
  | { type: "part.delta"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number; delta: string }
  | { type: "part.ended"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number; text: string }
  | { type: "tool.started"; sessionID: string; messageID: string; toolID: string; name: string }
  | { type: "tool.delta"; sessionID: string; messageID: string; toolID: string; delta: string }
  | { type: "tool.called"; sessionID: string; messageID: string; toolID: string; input: JsonRecord }
  | { type: "tool.progress"; sessionID: string; messageID: string; toolID: string; metadata: JsonRecord }
  | { type: "tool.success"; sessionID: string; messageID: string; toolID: string; content: ToolContent[]; metadata?: JsonRecord }
  | { type: "tool.failed"; sessionID: string; messageID: string; toolID: string; error: string }
  | { type: "execution.ended"; sessionID: string; outcome: "succeeded" | "failed" | "interrupted"; error?: string };

export type BackendKind = "v2" | "v1" | "demo";
export type ConnectionMode = "service" | "direct" | "custom" | "demo";

export interface OpenCodeClient {
  readonly kind: BackendKind;
  readonly mode: ConnectionMode;
  /** Human label: `localhost:49374`, `demo`. */
  readonly label: string;
  info(): Promise<ServerInfo>;
  sessions(): Promise<SessionInfo[]>;
  session(id: string): Promise<SessionInfo | null>;
  messages(sessionID: string): Promise<SessionMessage[]>;
  create(input: { agent?: string; model?: ModelRef | null; title?: string }): Promise<SessionInfo>;
  prompt(sessionID: string, text: string, options?: { agent?: string; model?: ModelRef | null }): Promise<void>;
  interrupt(sessionID: string): Promise<void>;
  setAgent(sessionID: string, agent: string): Promise<void>;
  setModel(sessionID: string, model: ModelRef): Promise<void>;
  view(sessionID: string): Promise<void>;
  agents(): Promise<AgentOption[]>;
  models(): Promise<ModelOption[]>;
  commands?(): Promise<string[]>;
  command?(sessionID: string, name: string, text: string): Promise<void>;
  rename?(sessionID: string, title: string): Promise<void>;
  compact?(sessionID: string, model: ModelRef | null): Promise<void>;
  defaultModel(): Promise<ModelRef | null>;
  /** Live events. Returns an unsubscribe function; reconnects on its own. */
  subscribe(onEvent: (event: AppEvent) => void, onState?: (state: "open" | "closed") => void): () => void;
}
