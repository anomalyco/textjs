/**
 * The OpenCode console store: connection, sessions, live message timelines
 * (folded from SSE events), agent / model selection and UI toggles.
 * A plain external store consumed with `useSyncExternalStore`; change
 * notifications coalesce per microtask so token streams render once per frame.
 */

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { connectOpenCode, saveEndpoint, savedEndpoint } from "./client";
import { SessionTabs } from "./session-tabs";
import type {
  AgentOption,
  AppEvent,
  AssistantMessage,
  AssistantPart,
  BackendKind,
  ConnectionMode,
  FormAnswer,
  FormInfo,
  ModelOption,
  ModelRef,
  OpenCodeClient,
  PermissionReply,
  PermissionRequest,
  SessionInfo,
  SessionMessage,
  ToolPart,
} from "./types";

export interface ConnectionState {
  status: "connecting" | "ready";
  kind: BackendKind | null;
  mode: ConnectionMode | null;
  label: string;
  version?: string;
  directory?: string;
  /** Why the demo backend was chosen. */
  reason?: string;
  targetUrl?: string;
  /** SSE stream health. */
  live: boolean;
}

export interface UiState {
  sidebar: boolean;
  toolDetails: boolean;
  thinking: boolean;
  groupExploration: boolean;
}

export interface Toast {
  text: string;
  tone: "info" | "success" | "warning" | "danger";
  at: number;
}

export interface StoreState {
  connection: ConnectionState;
  sessions: SessionInfo[];
  sessionsLoaded: boolean;
  messages: Readonly<Record<string, SessionMessage[]>>;
  loaded: Readonly<Record<string, boolean>>;
  missing: Readonly<Record<string, boolean>>;
  busy: Readonly<Record<string, boolean>>;
  agents: AgentOption[];
  models: ModelOption[];
  agent: string;
  model: ModelRef | null;
  ui: UiState;
  toast: Toast | null;
  history: readonly string[];
  /** Pending permission requests and forms by owning session (children included). */
  permissions: Readonly<Record<string, readonly PermissionRequest[]>>;
  forms: Readonly<Record<string, readonly FormInfo[]>>;
  /** Known parent of each session (`null` = top level), for routing child requests to their root. */
  parents: Readonly<Record<string, string | null>>;
}

const NO_PERMISSIONS: readonly PermissionRequest[] = [];
const NO_FORMS: readonly FormInfo[] = [];

/** The top-level session that owns `id` (itself when the parent chain is unknown). */
export function rootSession(state: Pick<StoreState, "parents">, id: string): string {
  let current = id;
  for (let i = 0; i < 32; i++) {
    const parent = state.parents[current];
    if (!parent) return current;
    current = parent;
  }
  return current;
}

/** Permission requests the TUI would surface while `sessionID` is open: its own and its descendants'. */
export function pendingPermissions(state: StoreState, sessionID: string): readonly PermissionRequest[] {
  if (state.parents[sessionID]) return NO_PERMISSIONS;
  const out: PermissionRequest[] = [];
  for (const [id, list] of Object.entries(state.permissions)) if (list.length && rootSession(state, id) === sessionID) out.push(...list);
  return out.length ? out : NO_PERMISSIONS;
}

export function pendingForms(state: StoreState, sessionID: string): readonly FormInfo[] {
  if (state.parents[sessionID]) return NO_FORMS;
  const out: FormInfo[] = [];
  for (const [id, list] of Object.entries(state.forms)) if (list.length && rootSession(state, id) === sessionID) out.push(...list);
  return out.length ? out : NO_FORMS;
}

const DEFAULT_AGENTS: AgentOption[] = [
  { id: "build", name: "build", description: "Default agent with every tool enabled" },
  { id: "plan", name: "plan", description: "Read-only planning and analysis" },
];

export interface StoreOptions {
  /** Explicit server URL, `"demo"`, or omitted / `null` for auto-discovery. */
  endpoint?: string | null;
  /** Use this client instead of connecting (tests, embeds). */
  client?: OpenCodeClient;
}

export class OpenCodeStore {
  readonly tabs = new SessionTabs();
  private state: StoreState;
  private readonly listeners = new Set<() => void>();
  private notifyQueued = false;
  private client: OpenCodeClient | null = null;
  private unsubscribe: (() => void) | null = null;
  private started = false;
  private refetchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private connectSeq = 0;
  private recentModels: ModelRef[] = [];
  private commands = new Set<string>();
  private requestReads = new Map<string, Set<string>>();

  private touchRequest(id: string) {
    for (const changes of this.requestReads.values()) changes.add(id);
  }
  private drafts = new Map<string, { agent?: string; model?: ModelRef }>();

  constructor(private readonly options: StoreOptions = {}) {
    this.state = {
      connection: { status: "connecting", kind: null, mode: null, label: "", live: false },
      sessions: [],
      sessionsLoaded: false,
      messages: {},
      loaded: {},
      missing: {},
      busy: {},
      agents: DEFAULT_AGENTS,
      models: [],
      agent: "build",
      model: null,
      ui: { sidebar: false, toolDetails: false, thinking: false, groupExploration: true },
      toast: null,
      history: [],
      permissions: {},
      forms: {},
      parents: {},
    };
  }

  // -- external store --------------------------------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): StoreState => this.state;

  private set(patch: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)): void {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...p };
    if (this.notifyQueued) return;
    this.notifyQueued = true;
    queueMicrotask(() => {
      this.notifyQueued = false;
      for (const l of this.listeners) l();
    });
  }

  get api(): OpenCodeClient | null {
    return this.client;
  }

  get hostManagesConnection(): boolean {
    return this.options.client !== undefined;
  }

  // -- connection ------------------------------------------------------------

  /** Connect once (idempotent). */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.connect(this.options.client ? undefined : this.options.endpoint);
  }

  /** (Re)connect: explicit URL, `"demo"`, or `null` for auto-discovery. */
  async connect(endpoint?: string | null, persist = false): Promise<ConnectionState> {
    const seq = ++this.connectSeq;
    this.recentModels = [];
    this.commands.clear();
    this.requestReads.clear();
    this.drafts.clear();
    this.tabs.clear();
    this.client = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (persist) saveEndpoint(endpoint ?? null);
    this.set({ connection: { status: "connecting", kind: null, mode: null, label: endpoint === "demo" ? "demo" : (endpoint ?? ""), live: false } });
    const conn = this.options.client && endpoint === undefined ? { client: this.options.client } : await connectOpenCode({ endpoint: endpoint === undefined ? savedEndpoint() : endpoint });
    if (seq !== this.connectSeq) return this.state.connection;
    const client = conn.client;
    this.client = client;
    const info = await client.info().catch(() => ({ version: "?", directory: undefined as string | undefined }));
    if (seq !== this.connectSeq) return this.state.connection;
    this.set({
      connection: {
        status: "ready",
        kind: client.kind,
        mode: client.mode,
        label: client.label,
        version: info.version,
        directory: info.directory,
        reason: "reason" in conn ? conn.reason : undefined,
        targetUrl: "targetUrl" in conn ? conn.targetUrl : undefined,
        live: false,
      },
      sessions: [],
      sessionsLoaded: false,
      messages: {},
      loaded: {},
      missing: {},
      busy: {},
      model: null,
      history: [],
      permissions: {},
      forms: {},
      parents: {},
    });
    this.unsubscribe = client.subscribe(
      (e) => this.handle(e),
      (s) => this.set((st) => ({ connection: { ...st.connection, live: s === "open" } })),
    );
    await Promise.all([this.refreshSessions(), this.loadCatalog()]);
    return this.state.connection;
  }

  private async loadCatalog(): Promise<void> {
    const client = this.client;
    if (!client) return;
    const [agents, models, model, commands] = await Promise.all([client.agents().catch(() => []), client.models().catch(() => []), client.defaultModel().catch(() => null), client.commands?.().catch(() => []) ?? []]);
    if (client !== this.client) return;
    this.commands = new Set(commands);
    const primary = agents.length > 0 ? agents : DEFAULT_AGENTS;
    const directory = this.state.connection.directory ?? (await client.info().catch(() => null))?.directory;
    if (client !== this.client) return;
    this.set((s) => ({
      agents: primary,
      models,
      model: s.model ?? model ?? (models[0] ? { id: models[0].id, providerID: models[0].providerID } : null),
      agent: primary.some((a) => a.id === s.agent) ? s.agent : (primary[0]?.id ?? "build"),
      connection: { ...s.connection, directory: s.connection.directory ?? directory },
    }));
  }

  async refreshSessions(): Promise<void> {
    const client = this.client;
    if (!client) return;
    try {
      const fetched = await client.sessions();
      if (client !== this.client) return;
      this.set((s) => {
        // Keep locally derived titles until the server names the session.
        const sessions = fetched.map((x) => (x.title ? x : { ...x, title: s.sessions.find((p) => p.id === x.id)?.title }));
        const busy = { ...s.busy };
        for (const x of sessions) if (x.time.busy !== undefined && (x.time.idle ?? 0) < x.time.busy && busy[x.id] === undefined) busy[x.id] = true;
        const parents = { ...s.parents };
        for (const x of sessions) parents[x.id] = x.parentID ?? null;
        return { sessions, sessionsLoaded: true, busy, parents };
      });
    } catch (error) {
      this.set({ sessionsLoaded: true });
      this.notify(`Couldn't load sessions: ${error instanceof Error ? error.message : String(error)}`, "danger");
    }
  }

  dispose(): void {
    this.connectSeq++;
    this.client = null;
    this.started = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const t of this.refetchTimers.values()) clearTimeout(t);
    this.refetchTimers.clear();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.listeners.clear();
  }

  // -- sessions & messages ---------------------------------------------------

  session(id: string): SessionInfo | undefined {
    return this.state.sessions.find((s) => s.id === id);
  }

  /** Load a session's timeline (and mark it viewed). */
  async openSession(id: string): Promise<void> {
    const client = this.client;
    if (!client) return;
    if (!this.session(id)) {
      const info = await client.session(id).catch(() => null);
      if (client !== this.client) return;
      if (!info) {
        this.set((s) => ({ missing: { ...s.missing, [id]: true } }));
        return;
      }
      this.set((s) => ({ sessions: s.sessions.some((x) => x.id === id) ? s.sessions : [info, ...s.sessions] }));
    }
    const sess = this.session(id);
    if (sess) this.set((s) => ({ parents: { ...s.parents, [id]: sess.parentID ?? null } }));
    this.tabs.visit(id);
    const draft = this.drafts.get(id);
    const agent = draft?.agent ?? sess?.agent, model = draft?.model ?? sess?.model;
    if (agent) this.set({ agent });
    if (model) this.set({ model });
    void this.syncRequests(id);
    await this.reloadMessages(id);
    if (client === this.client) void client.view(id).catch(() => undefined);
  }

  /** Load pending permission requests and forms for a session and its child sessions. */
  async syncRequests(id: string): Promise<void> {
    const client = this.client;
    if (!client?.permissions && !client?.forms) return;
    const touched = new Set<string>();
    this.requestReads.set(id, touched);
    const children = await client.children?.(id).catch(() => []) ?? [];
    if (client !== this.client) return;
    const ids = [id, ...children.map((c) => c.id)];
    const [permissions, forms] = await Promise.all([
      Promise.all(ids.map((sid) => client.permissions?.(sid).catch(() => null) ?? null)),
      Promise.all(ids.map((sid) => client.forms?.(sid).catch(() => null) ?? null)),
    ]);
    if (client !== this.client || this.requestReads.get(id) !== touched) return;
    this.requestReads.delete(id);
    const merge = <T extends { id: string }>(remote: readonly T[], live: readonly T[] = []) => [
      ...remote.filter((r) => !touched.has(r.id)), ...live.filter((r) => touched.has(r.id)),
    ];
    this.set((s) => {
      const nextPermissions = { ...s.permissions };
      const nextForms = { ...s.forms };
      const parents = { ...s.parents };
      for (const c of children) parents[c.id] = id;
      ids.forEach((sid, i) => {
        if (permissions[i]) nextPermissions[sid] = merge(permissions[i]!.filter((p) => p.sessionID === sid), s.permissions[sid]);
        if (forms[i]) nextForms[sid] = merge(forms[i]!.filter((f) => f.sessionID === sid), s.forms[sid]);
      });
      return { permissions: nextPermissions, forms: nextForms, parents };
    });
  }

  /** Learn the parent chain of a session that raised a request, so it reaches its root's screen. */
  private async learnParents(id: string): Promise<void> {
    const client = this.client;
    let current: string | undefined = id;
    for (let i = 0; i < 8 && current && this.state.parents[current] === undefined; i++) {
      const info: SessionInfo | null = await client?.session(current).catch(() => null) ?? null;
      if (client !== this.client || !info) return;
      const parent: string | null = info.parentID ?? null;
      const key: string = current;
      this.set((s) => ({ parents: { ...s.parents, [key]: parent } }));
      current = parent ?? undefined;
    }
  }

  async replyPermission(request: PermissionRequest, decision: PermissionReply, message?: string): Promise<void> {
    const client = this.client;
    if (!client?.replyPermission) return;
    if (!this.state.permissions[request.sessionID]?.some((p) => p.id === request.id)) return;
    if (decision === "always" && !request.save?.length) return;
    try {
      await client.replyPermission(request.sessionID, request.id, decision, message);
    } catch (error) {
      if (client !== this.client) return;
      if (!(error instanceof Error && /→ 404/.test(error.message))) {
        this.notify(error instanceof Error ? error.message : String(error), "danger");
        return;
      }
    }
    if (client === this.client) this.dropPermission(request.sessionID, request.id);
  }

  /** Resolves `true` once the server accepted the answer. */
  async replyForm(form: FormInfo, answer: FormAnswer): Promise<string | null> {
    const client = this.client;
    if (!client?.replyForm) return "Forms are unavailable on this server";
    try {
      await client.replyForm(form.sessionID, form.id, answer);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    if (client === this.client) this.dropForm(form.sessionID, form.id);
    return null;
  }

  async cancelForm(form: FormInfo): Promise<string | null> {
    const client = this.client;
    if (!client?.cancelForm) return "Forms are unavailable on this server";
    try {
      await client.cancelForm(form.sessionID, form.id);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    if (client === this.client) this.dropForm(form.sessionID, form.id);
    return null;
  }

  private dropPermission(sessionID: string, requestID: string): void {
    this.touchRequest(requestID);
    const list = this.state.permissions[sessionID];
    if (!list?.some((r) => r.id === requestID)) return;
    this.set((s) => ({ permissions: { ...s.permissions, [sessionID]: (s.permissions[sessionID] ?? []).filter((r) => r.id !== requestID) } }));
  }

  private dropForm(sessionID: string, formID: string): void {
    this.touchRequest(formID);
    const list = this.state.forms[sessionID];
    if (!list?.some((f) => f.id === formID)) return;
    this.set((s) => ({ forms: { ...s.forms, [sessionID]: (s.forms[sessionID] ?? []).filter((f) => f.id !== formID) } }));
  }

  async reloadMessages(id: string): Promise<void> {
    const client = this.client;
    if (!client) return;
    try {
      const fetched = await client.messages(id);
      if (client !== this.client) return;
      this.set((s) => ({ messages: { ...s.messages, [id]: mergeMessages(s.messages[id] ?? [], fetched) }, loaded: { ...s.loaded, [id]: true } }));
    } catch (error) {
      this.set((s) => ({ loaded: { ...s.loaded, [id]: true } }));
      this.notify(`Couldn't load messages: ${error instanceof Error ? error.message : String(error)}`, "danger");
    }
  }

  private scheduleReload(id: string, delay = 80): void {
    if (!this.state.loaded[id] && !this.state.messages[id]) return;
    const prev = this.refetchTimers.get(id);
    if (prev) clearTimeout(prev);
    this.refetchTimers.set(
      id,
      setTimeout(() => {
        this.refetchTimers.delete(id);
        void this.reloadMessages(id);
      }, delay),
    );
  }

  /** Create a session for `text` (when `sessionID` is null) and prompt it. Resolves with the session id once created. */
  async send(sessionID: string | null, text: string, mode: "prompt" | "shell" = "prompt"): Promise<string | null> {
    const client = this.client;
    const body = text.trim();
    if (!client || body.length === 0) return null;
    const { agent, model } = this.state;
    // Local actions are never model prompts. In particular, don't turn a
    // failed/missing route or an unsupported backend into an accidental send.
    const rename = /^\/rename(?:\s+([\s\S]+))?$/.exec(body);
    if (mode === "prompt" && (rename || body === "/compact")) {
      try {
        if (!sessionID) throw new Error("Open a session first");
        if (rename) {
          if (!rename[1]) throw new Error("Use /rename followed by a title");
          if (!client.rename) throw new Error("Renaming is unavailable on this server");
          await client.rename(sessionID, rename[1]);
          if (client === this.client) this.patchSession(sessionID, { title: rename[1] });
        } else {
          if (!client.compact) throw new Error("Compaction is unavailable on this server");
          await client.compact(sessionID, model);
        }
      } catch (error) {
        if (client === this.client) this.notify(error instanceof Error ? error.message : String(error), "warning");
      }
      return null;
    }
    let id = sessionID;
    try {
      if (mode === "shell" && !client.shell) throw new Error("Shell mode unavailable on this server");
      if (!id) {
        const s = await client.create({ agent, model });
        if (client !== this.client) return null;
        id = s.id;
        const created = s;
        this.set((st) => ({ sessions: [created, ...st.sessions.filter((x) => x.id !== created.id)], messages: { ...st.messages, [created.id]: [] }, loaded: { ...st.loaded, [created.id]: true } }));
      } else if (mode === "prompt") {
        const sess = this.session(id);
        if (sess && sess.agent !== agent) await client.setAgent(id, agent);
        if (client !== this.client) return null;
        if (sess && model && (sess.model?.id !== model.id || sess.model?.providerID !== model.providerID || sess.model.variant !== model.variant)) await client.setModel(id, model);
        if (client !== this.client) return null;
      }
    } catch (error) {
      if (client === this.client) this.notify(`Couldn't prepare session: ${error instanceof Error ? error.message : String(error)}`, "danger");
      return null;
    }
    const target = id;
    if (mode === "shell") {
      // Only the deliberate shell-mode keystroke enters this branch. Never
      // execute on the client host or reinterpret pasted !text as a command.
      void client.shell!(target, body).then(() => {
        if (client === this.client) void this.reloadMessages(target);
      }, (error) => {
        if (client === this.client) this.notify(`Failed to run shell command: ${error instanceof Error ? error.message : String(error)}`, "danger");
      });
      return target;
    }
    const pending: SessionMessage = { type: "user", id: `pending_${Date.now().toString(36)}`, time: { created: Date.now() }, text: body, pending: true };
    this.set((s) => ({
      messages: { ...s.messages, [target]: [...(s.messages[target] ?? []), pending] },
      history: s.history.at(-1) === text ? s.history : [...s.history.slice(-99), text],
      busy: { ...s.busy, [target]: true },
      sessions: s.sessions.map((x) => (x.id === target ? { ...x, agent, model: model ?? x.model, title: x.title || truncateTitle(body), time: { ...x.time, updated: Date.now() } } : x)),
    }));
    const head = /^\/([^\s]+)(?:\s+([\s\S]*))?$/.exec(body);
    const send = head?.[1] && this.commands.has(head[1]) && client.command
      ? client.command(target, head[1], head[2] ?? "")
      : client.prompt(target, body, { agent, model });
    void send.catch((error) => {
      if (client !== this.client) return;
      this.set((s) => ({ busy: { ...s.busy, [target]: false }, messages: { ...s.messages, [target]: (s.messages[target] ?? []).filter((m) => m !== pending) } }));
      this.notify(`Prompt failed: ${error instanceof Error ? error.message : String(error)}`, "danger");
    });
    return target;
  }

  async interrupt(sessionID: string): Promise<void> {
    const client = this.client;
    if (!client) return;
    this.notify("Interrupting…", "warning");
    try {
      await client.interrupt(sessionID);
    } catch (error) {
      this.notify(`Interrupt failed: ${error instanceof Error ? error.message : String(error)}`, "danger");
    }
  }

  // -- agent / model ---------------------------------------------------------

  async setAgent(agent: string, sessionID?: string | null): Promise<void> {
    if (sessionID) this.drafts.set(sessionID, { ...this.drafts.get(sessionID), agent });
    this.set({ agent });
  }

  cycleAgent(sessionID?: string | null): void {
    const list = this.state.agents.length > 0 ? this.state.agents : DEFAULT_AGENTS;
    const idx = list.findIndex((a) => a.id === this.state.agent);
    const next = list[(idx + 1) % list.length]?.id ?? "build";
    void this.setAgent(next, sessionID);
  }

  async setModel(model: ModelRef, sessionID?: string | null, remember = true): Promise<void> {
    if (remember) {
      const recent = [model, ...(this.state.model ? [this.state.model] : []), ...this.recentModels];
      this.recentModels = recent.filter((m, i) => recent.findIndex((o) => o.id === m.id && o.providerID === m.providerID) === i).slice(0, 10);
    }
    if (sessionID) this.drafts.set(sessionID, { ...this.drafts.get(sessionID), model });
    this.set({ model });
    this.notify(`Model → ${model.id}`, "info");
  }

  cycleRecentModel(direction: 1 | -1, sessionID?: string | null): void {
    const recent = this.recentModels;
    const index = recent.findIndex((m) => m.id === this.state.model?.id && m.providerID === this.state.model.providerID);
    const next = recent[(index + direction + recent.length) % recent.length];
    if (next) void this.setModel(next, sessionID, false);
  }

  variants(): string[] {
    return this.state.models.find((m) => m.id === this.state.model?.id && m.providerID === this.state.model.providerID)?.variants ?? [];
  }

  cycleVariant(sessionID?: string | null): void {
    const model = this.state.model;
    const variants = this.variants();
    if (!model || variants.length === 0) return;
    const index = model.variant ? variants.indexOf(model.variant) : -1;
    void this.setModel({ ...model, variant: variants[index + 1] }, sessionID);
  }

  // -- ui --------------------------------------------------------------------

  toggle(key: keyof UiState): void {
    this.set((s) => ({ ui: { ...s.ui, [key]: !s.ui[key] } }));
  }

  notify(text: string, tone: Toast["tone"] = "info"): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.set({ toast: { text, tone, at: Date.now() } });
    this.toastTimer = setTimeout(() => this.set({ toast: null }), 3200);
  }

  // -- events ----------------------------------------------------------------

  handle(e: AppEvent): void {
    switch (e.type) {
      case "connected":
        return;
      case "sessions.changed":
        void this.refreshSessions();
        return;
      case "session.renamed":
        this.patchSession(e.sessionID, { title: e.title });
        return;
      case "session.agent":
        this.patchSession(e.sessionID, { agent: e.agent });
        return;
      case "session.model":
        this.patchSession(e.sessionID, { model: e.model });
        return;
      case "status":
        this.set((s) => ({ busy: { ...s.busy, [e.sessionID]: e.busy } }));
        if (!e.busy) this.scheduleReload(e.sessionID, 120);
        if (!this.session(e.sessionID) && e.sessionID) void this.refreshSessions();
        return;
      case "execution.ended":
        this.set((s) => ({ busy: { ...s.busy, [e.sessionID]: false } }));
        this.patchSession(e.sessionID, { outcome: e.outcome, time: { ...(this.session(e.sessionID)?.time ?? { created: Date.now() }), updated: Date.now(), idle: Date.now() } });
        if (e.outcome === "failed" && e.error) this.notify(e.error, "danger");
        this.scheduleReload(e.sessionID, 120);
        return;
      case "messages.changed":
        this.scheduleReload(e.sessionID);
        return;
      case "permission.asked": {
        const { request } = e;
        this.touchRequest(request.id);
        if (this.state.permissions[request.sessionID]?.some((r) => r.id === request.id)) return;
        this.set((s) => ({ permissions: { ...s.permissions, [request.sessionID]: [...(s.permissions[request.sessionID] ?? []), request] } }));
        void this.learnParents(request.sessionID);
        return;
      }
      case "permission.replied":
        this.dropPermission(e.sessionID, e.requestID);
        return;
      case "form.created": {
        const { form } = e;
        this.touchRequest(form.id);
        if (this.state.forms[form.sessionID]?.some((f) => f.id === form.id)) return;
        this.set((s) => ({ forms: { ...s.forms, [form.sessionID]: [...(s.forms[form.sessionID] ?? []), form] } }));
        void this.learnParents(form.sessionID);
        return;
      }
      case "form.settled":
        this.dropForm(e.sessionID, e.formID);
        return;
      default:
        this.applyStream(e);
    }
  }

  private patchSession(id: string, patch: Partial<SessionInfo>): void {
    this.set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }

  /** Fold a streaming event into the session's timeline (mirrors OpenCode's message updater). */
  private applyStream(e: Extract<AppEvent, { messageID: string }>): void {
    const list = this.state.messages[e.sessionID];
    if (!list) return;
    if (e.type === "step.started") {
      const existing = list.find((m) => m.id === e.messageID);
      if (existing) return;
      const msg: AssistantMessage = { type: "assistant", id: e.messageID, time: { created: e.started }, agent: e.agent, model: e.model, content: [] };
      this.set((s) => ({
        messages: { ...s.messages, [e.sessionID]: [...list, msg] },
        busy: { ...s.busy, [e.sessionID]: true },
      }));
      return;
    }
    const idx = list.findIndex((m) => m.id === e.messageID);
    const current = list[idx];
    if (idx < 0 || !current || current.type !== "assistant") return;
    const next = updateAssistant(current, e);
    if (next === current) return;
    const copy = list.slice();
    copy[idx] = next;
    this.set((s) => ({ messages: { ...s.messages, [e.sessionID]: copy } }));
  }
}

function truncateTitle(text: string): string {
  const line = text.split("\n")[0] ?? text;
  return line.length > 48 ? `${line.slice(0, 47).trimEnd()}…` : line;
}

function lastIndex(content: readonly AssistantPart[], pred: (p: AssistantPart) => boolean): number {
  for (let i = content.length - 1; i >= 0; i--) if (pred(content[i] as AssistantPart)) return i;
  return -1;
}

function updateAssistant(msg: AssistantMessage, e: Extract<AppEvent, { messageID: string }>): AssistantMessage {
  const content = msg.content.slice();
  const tool = (id: string): number => lastIndex(content, (p) => p.type === "tool" && p.id === id);
  switch (e.type) {
    case "step.ended":
      return { ...msg, time: { ...msg.time, completed: Date.now() }, finish: e.finish, tokens: e.tokens ?? msg.tokens, cost: e.cost ?? msg.cost };
    case "part.started":
      if (e.ordinal !== undefined && content.some((p) => p.type === e.kind && p.ordinal === e.ordinal)) return msg;
      content.push(e.kind === "text" ? { type: "text", ordinal: e.ordinal, text: "" } : { type: "reasoning", ordinal: e.ordinal, text: "", time: { created: Date.now() } });
      return { ...msg, content };
    case "part.delta": {
      let i = lastIndex(content, (p) => p.type === e.kind && (e.ordinal === undefined || p.ordinal === e.ordinal));
      if (i < 0) {
        content.push({ type: e.kind, ordinal: e.ordinal, text: "" });
        i = content.length - 1;
      }
      const p = content[i] as AssistantPart;
      if (p.type !== "tool") content[i] = { ...p, text: p.text + e.delta };
      return { ...msg, content };
    }
    case "part.ended": {
      const i = lastIndex(content, (p) => p.type === e.kind && (e.ordinal === undefined || p.ordinal === e.ordinal));
      if (i < 0) return { ...msg, content: [...content, { type: e.kind, ordinal: e.ordinal, text: e.text }] };
      const p = content[i] as AssistantPart;
      if (p.type === "reasoning") content[i] = { ...p, text: e.text, time: { created: p.time?.created ?? Date.now(), completed: Date.now() } };
      else if (p.type === "text") content[i] = { ...p, text: e.text };
      return { ...msg, content };
    }
    case "tool.started":
      if (tool(e.toolID) >= 0) return msg;
      content.push({ type: "tool", id: e.toolID, name: e.name, state: { status: "streaming", input: "" }, time: { created: Date.now() } });
      return { ...msg, content };
    case "tool.delta": {
      const i = tool(e.toolID);
      const p = content[i] as ToolPart | undefined;
      if (!p || p.state.status !== "streaming") return msg;
      content[i] = { ...p, state: { status: "streaming", input: p.state.input + e.delta } };
      return { ...msg, content };
    }
    case "tool.called": {
      const i = tool(e.toolID);
      const p = content[i] as ToolPart | undefined;
      if (!p) return msg;
      content[i] = { ...p, state: { status: "running", input: e.input, metadata: {} }, time: { created: p.time?.created ?? Date.now(), ran: Date.now() } };
      return { ...msg, content };
    }
    case "tool.progress": {
      const i = tool(e.toolID);
      const p = content[i] as ToolPart | undefined;
      if (!p || p.state.status !== "running") return msg;
      content[i] = { ...p, state: { ...p.state, metadata: { ...p.state.metadata, ...e.metadata } } };
      return { ...msg, content };
    }
    case "tool.success": {
      const i = tool(e.toolID);
      const p = content[i] as ToolPart | undefined;
      if (!p) return msg;
      const input = p.state.status === "streaming" ? {} : p.state.input;
      content[i] = { ...p, state: { status: "completed", input, content: e.content, metadata: e.metadata }, time: { created: p.time?.created ?? Date.now(), ran: p.time?.ran, completed: Date.now() } };
      return { ...msg, content };
    }
    case "tool.failed": {
      const i = tool(e.toolID);
      const p = content[i] as ToolPart | undefined;
      if (!p) return msg;
      const input = p.state.status === "streaming" ? {} : p.state.input;
      content[i] = { ...p, state: { status: "error", input, error: { message: e.error } }, time: { created: p.time?.created ?? Date.now(), completed: Date.now() } };
      return { ...msg, content };
    }
    default:
      return msg;
  }
}

function textLength(m: AssistantMessage): number {
  let n = 0;
  for (const p of m.content) n += p.type === "tool" ? 1 : p.text.length;
  return n + m.content.length * 1000;
}

/**
 * Merge a fetched timeline with local state: keep optimistic prompts the
 * server hasn't delivered yet, and keep in-flight assistant messages whose
 * streamed content is ahead of the (delta-less) projection.
 */
export function mergeMessages(local: readonly SessionMessage[], fetched: readonly SessionMessage[]): SessionMessage[] {
  const byId = new Map(local.map((m) => [m.id, m]));
  const out = fetched.map((m) => {
    const l = byId.get(m.id);
    if (l && l.type === "assistant" && m.type === "assistant" && !m.time.completed && textLength(l) > textLength(m)) return l;
    return m;
  });
  const ids = new Set(out.map((m) => m.id));
  const lastFetched = fetched.length > 0 ? (fetched[fetched.length - 1] as SessionMessage).time.created : 0;
  for (const m of local) {
    if (ids.has(m.id)) continue;
    if (m.type === "user" && m.pending) {
      if (fetched.some((f) => f.type === "user" && f.text.trim() === m.text.trim() && f.time.created >= m.time.created - 60_000)) continue;
      out.push(m);
    } else if (m.type === "assistant" && !m.time.completed && m.time.created >= lastFetched) out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

let shared: OpenCodeStore | null = null;

/** The app-wide store (survives route changes and Fast Refresh). */
export function getOpenCodeStore(): OpenCodeStore {
  shared ??= new OpenCodeStore();
  return shared;
}

/** Replace the app-wide store (tests, `/connect`). */
export function resetOpenCodeStore(options: StoreOptions = {}): OpenCodeStore {
  shared?.dispose();
  shared = new OpenCodeStore(options);
  return shared;
}

const StoreContext = createContext<OpenCodeStore | null>(null);

export function OpenCodeProvider({ store, children }: { store: OpenCodeStore; children?: ReactNode }): ReactNode {
  return createElement(StoreContext.Provider, { value: store }, children);
}

export function useStore(): OpenCodeStore {
  const store = useContext(StoreContext);
  return store ?? getOpenCodeStore();
}

export function useStoreState<T>(select: (s: StoreState) => T): T {
  const store = useStore();
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getSnapshot()),
    () => select(store.getSnapshot()),
  );
}
