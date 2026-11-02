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
  cost?: number;
  revertedFrom?: string;
  time: { created: number; updated: number; busy?: number; idle?: number; viewed?: number };
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
export type ToolPart = {
  type: "tool";
  id: string;
  name: string;
  state: ToolState;
  time?: { created: number; ran?: number; completed?: number };
};
export type AssistantPart = TextPart | ReasoningPart | ToolPart;

export type UserMessage = {
  type: "user";
  id: string;
  time: { created: number };
  text: string;
  pending?: boolean;
  files?: { name: string; mime: string }[];
  mentions?: readonly Attachment[];
};
export type AssistantMessage = {
  type: "assistant";
  id: string;
  time: { created: number; completed?: number };
  agent: string;
  model: ModelRef;
  content: AssistantPart[];
  finish?: string;
  error?: { message: string };
  tokens?: { input: number; output: number; reasoning: number; cache?: { read: number; write: number } };
  cost?: number;
};
export type NoteMessage = {
  type: "note";
  id: string;
  time: { created: number };
  text: string;
  tone: "muted" | "info" | "warning" | "danger";
};
export type ShellMessage = { type: "shell"; id: string; time: { created: number }; command: string; status: string; output?: string };

export type SessionMessage = UserMessage | AssistantMessage | NoteMessage | ShellMessage;

/** A pending V2 permission request (`Permission.Request`). */
export type PermissionRequest = {
  id: string;
  sessionID: string;
  action: string;
  resources: string[];
  save?: string[];
  metadata?: JsonRecord;
  source?: { type: "tool"; messageID: string; id: string };
  message?: string;
};
export type PermissionReply = "once" | "always" | "reject";

export type FormOption = { value: string; label: string; description?: string };
export type FormWhen = { key: string; op: "eq" | "neq"; value: string | number | boolean };
type FormFieldBase = { key: string; title?: string; description?: string; required?: boolean; hidden?: boolean; when?: FormWhen[] };
export type FormField =
  | (FormFieldBase & {
      type: "string";
      format?: "email" | "uri" | "date" | "date-time";
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      placeholder?: string;
      default?: string;
      options?: FormOption[];
      custom?: boolean;
    })
  | (FormFieldBase & { type: "number" | "integer"; minimum?: number; maximum?: number; default?: number })
  | (FormFieldBase & { type: "boolean"; default?: boolean })
  | (FormFieldBase & {
      type: "multiselect";
      options: FormOption[];
      minItems?: number;
      maxItems?: number;
      custom?: boolean;
      default?: string[];
    })
  | { key: string; type: "external"; url: string; title?: string; description?: string };
export type FormValue = string | number | boolean | string[];
export type FormAnswer = Record<string, FormValue>;
/** A pending V2 form (`Form.Info`): structured questions from a tool, MCP elicitation or plugin. */
export type FormInfo = { id: string; sessionID: string; title: string; metadata?: JsonRecord; fields: FormField[] };

/** `colorIndex` is the agent's position among all visible agents (subagents included), as the TUI colors them. */
export type AgentOption = { id: string; name: string; mode?: string; description?: string; color?: string; colorIndex?: number };
export type CommandOption = { name: string; description?: string };
export type FileOption = { path: string; directory: boolean; uri: string };
export type ReportKind = "usage" | "stats" | "plugins";
export type FilePatch = { file: string; patch: string; additions: number; deletions: number; status?: string };
export type DiffSource = "branch" | "working" | "committed" | "turn";
export type Mention = { start: number; end: number; text: string };
export type Attachment = ({ kind: "file"; uri: string; mime: string } | { kind: "agent" } | { kind: "skill" }) & {
  name: string;
  mention: Mention;
};
export type PromptOptions = { agent?: string; model?: ModelRef | null; attachments?: readonly Attachment[]; delivery?: "queue" };
export type ModelOption = {
  id: string;
  providerID: string;
  name: string;
  context?: number;
  variants?: string[];
  free?: boolean;
  providerName?: string;
  group?: string;
};

export type ServerInfo = { version: string; directory?: string };
export type KeySettings = { keybinds: Record<string, string | false>; timeout: number };

/** Events consumed by the store, parsed from V2 SSE (or synthesized by V1 / demo backends). */
export type AppEvent =
  | { type: "connected" }
  | { type: "catalog.changed" }
  | { type: "management.changed" }
  | { type: "revert.changed"; sessionID: string; before?: string; committed?: boolean }
  | { type: "sessions.changed" }
  | { type: "session.renamed"; sessionID: string; title: string }
  | { type: "session.agent"; sessionID: string; agent: string }
  | { type: "session.usage"; sessionID: string; cost: number }
  | { type: "session.model"; sessionID: string; model: ModelRef }
  | { type: "status"; sessionID: string; busy: boolean }
  | { type: "messages.changed"; sessionID: string }
  | { type: "step.started"; sessionID: string; messageID: string; agent: string; model: ModelRef; started: number }
  | {
      type: "step.ended";
      sessionID: string;
      messageID: string;
      finish?: string;
      tokens?: AssistantMessage["tokens"];
      cost?: number;
      error?: string;
    }
  | { type: "part.started"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number }
  | { type: "part.delta"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number; delta: string }
  | { type: "part.ended"; sessionID: string; messageID: string; kind: "text" | "reasoning"; ordinal?: number; text: string }
  | { type: "tool.started"; sessionID: string; messageID: string; toolID: string; name: string }
  | { type: "tool.delta"; sessionID: string; messageID: string; toolID: string; delta: string }
  | { type: "tool.called"; sessionID: string; messageID: string; toolID: string; input: JsonRecord }
  | { type: "tool.progress"; sessionID: string; messageID: string; toolID: string; metadata: JsonRecord }
  | { type: "tool.success"; sessionID: string; messageID: string; toolID: string; content: ToolContent[]; metadata?: JsonRecord }
  | { type: "tool.failed"; sessionID: string; messageID: string; toolID: string; error: string }
  | { type: "execution.ended"; sessionID: string; outcome: "succeeded" | "failed" | "interrupted"; error?: string }
  | { type: "permission.asked"; request: PermissionRequest }
  | { type: "permission.replied"; sessionID: string; requestID: string }
  | { type: "form.created"; form: FormInfo }
  | { type: "form.settled"; sessionID: string; formID: string };

export type BackendKind = "v2" | "v1" | "demo";
export type ConnectionMode = "service" | "direct" | "custom" | "demo";

export interface OpenCodeClient {
  management?: import("./management").Management;
  terminals?: import("./terminals").Terminals;
  workspace?: import("./workspaces").WorkspaceApi;
  readonly kind: BackendKind;
  readonly mode: ConnectionMode;
  /** Human label: `localhost:49374`, `demo`. */
  readonly label: string;
  info(): Promise<ServerInfo>;
  keySettings?(): Promise<KeySettings>;
  shells?(id: string, dir?: string): Promise<{ id: string; command: string; status: string }[]>;
  shellOutput?(id: string, dir?: string): Promise<string>;
  killShell?(id: string, dir?: string): Promise<void>;
  background?(id: string): Promise<void>;
  branch?(directory: string): Promise<string | null>;
  sessions(): Promise<SessionInfo[]>;
  searchSessions?(query: string, directory?: string): Promise<SessionInfo[]>;
  session(id: string): Promise<SessionInfo | null>;
  messages(sessionID: string): Promise<SessionMessage[]>;
  historyPage?(sessionID: string, cursor?: string): Promise<{ messages: SessionMessage[]; next?: string }>;
  create(input: { agent?: string; model?: ModelRef | null; title?: string; directory?: string }): Promise<SessionInfo>;
  prompt(sessionID: string, text: string, options?: PromptOptions): Promise<void>;
  interrupt(sessionID: string): Promise<void>;
  setAgent(sessionID: string, agent: string): Promise<void>;
  setModel(sessionID: string, model: ModelRef): Promise<void>;
  view(sessionID: string): Promise<void>;
  agents(): Promise<AgentOption[]>;
  models(): Promise<ModelOption[]>;
  commands?(directory?: string): Promise<CommandOption[]>;
  command?(sessionID: string, name: string, text: string, options?: PromptOptions): Promise<void>;
  findFiles?(query: string, directory?: string): Promise<FileOption[]>;
  skills?(directory?: string): Promise<{ id: string; description?: string }[]>;
  references?(directory?: string): Promise<{ name: string; description?: string; file: FileOption }[]>;
  rename?(sessionID: string, title: string): Promise<void>;
  removeSession?(sessionID: string): Promise<void>;
  integrations?(): Promise<{ id: string; name: string; connected: boolean }[]>;
  mcpServers?(directory: string): Promise<{ name: string; status: string }[]>;
  workspaces?(): Promise<string[]>;
  compact?(sessionID: string, model: ModelRef | null): Promise<void>;
  shell?(sessionID: string, command: string, agent?: string): Promise<void>;
  revert?(id: string, before: string): Promise<void>;
  redo?(id: string): Promise<void>;
  commitRevert?(id: string): Promise<void>;
  fork?(id: string, before?: string): Promise<string>;
  exportSession?(id: string): Promise<unknown>;
  share?(id: string): Promise<string>;
  unshare?(id: string): Promise<void>;
  reload?(directory?: string): Promise<void>;
  report?(kind: ReportKind, directory?: string): Promise<{ label: string; value: string }[]>;
  diff?(id?: string, dir?: string, source?: DiffSource, base?: string): Promise<FilePatch[]>;
  diffBase?(directory?: string): Promise<{ name: string; ref: string } | null>;
  branches?(directory?: string): Promise<string[]>;
  aside?(id: string, question: string): Promise<string>;
  inbox?(id: string): Promise<{ id: string; text: string; delivery: string }[]>;
  cancelQueued?(id: string, item: string): Promise<void>;
  defaultModel(): Promise<ModelRef | null>;
  /** Child sessions (subagents) whose requests surface in the parent. */
  children?(sessionID: string): Promise<SessionInfo[]>;
  permissions?(sessionID: string): Promise<PermissionRequest[]>;
  replyPermission?(sessionID: string, requestID: string, decision: PermissionReply, message?: string): Promise<void>;
  forms?(sessionID: string): Promise<FormInfo[]>;
  replyForm?(sessionID: string, formID: string, answer: FormAnswer): Promise<void>;
  cancelForm?(sessionID: string, formID: string): Promise<void>;
  /** Live events. Returns an unsubscribe function; reconnects on its own. */
  subscribe(onEvent: (event: AppEvent) => void, onState?: (state: "open" | "closed") => void): () => void;
}
