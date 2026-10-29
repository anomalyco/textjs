/**
 * The Live Preview panel: picks a frame source (the live `text dev` tab or a
 * headless render of the current file), streams frames to the webview as
 * protocol deltas and forwards keyboard input back.
 */

import * as vscode from "vscode";
import { basename, join, relative } from "node:path";
import { FrameEncoder, frameToText, type InputMessage } from "@textjs/next/frame-protocol";
import type { StyledFrame } from "@textjs/core";
import { postInput } from "./dev-server";
import type { DevServerMonitor } from "./dev-monitor";
import { HeadlessSession, type HeadlessError } from "./headless";
import type { PreviewTarget } from "./project";
import type { RunnerTarget } from "./runner/messages";
import { previewHtml } from "./webview-html";
import type { HostToWebview, ModePreference, PreviewMode, PreviewState, ServerState, WebviewToHost } from "./webview-protocol";
import { isTrusted, previewTargetInWorkspace } from "./workspace";

export interface PreviewDeps {
  context: vscode.ExtensionContext;
  monitor: DevServerMonitor;
  output: vscode.OutputChannel;
  serverState(): ServerState;
  /** Called whenever the visible grid size changes (status bar). */
  onGrid(grid: { width: number; height: number } | null): void;
}

export class PreviewController implements vscode.Disposable {
  static readonly viewType = "textjs.preview";

  private panel: vscode.WebviewPanel | null = null;
  private target: PreviewTarget | null = null;
  private headless: HeadlessSession | null = null;
  private headlessFrame: StyledFrame | null = null;
  private headlessPath: string | null = null;
  private error: HeadlessError | null = null;
  private loading = false;
  private mode: PreviewMode = "idle";
  private encoder = new FrameEncoder();
  private viewport: { cols: number; rows: number } | null = null;
  private ready = false;
  private webviewFocused = false;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private lastGrid = "";
  /** The tab whose frame the live preview shows. */
  private liveSource: string | null = null;
  private readonly disposables: vscode.Disposable[] = [];
  /** Listeners and timers of the current panel (released when it closes). */
  private panelDisposables: vscode.Disposable[] = [];
  private viewportTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: PreviewDeps) {
    const { monitor } = deps;
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((e) => {
        if (e && this.panel) this.followDocument(e.document.uri);
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => this.onSave(doc)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("textjs.preview")) this.update();
      }),
      {
        dispose: monitor.onChange(() => {
          this.update();
          this.syncLive();
        }),
      },
      {
        dispose: monitor.onFrame((f) => {
          if (this.mode === "live" && f.source === monitor.activeSource) {
            this.liveSource = f.source;
            this.pushFrame(f.frame);
          }
          if (this.mode !== "live") this.update();
        }),
      },
      {
        dispose: monitor.onSourceGone(() => {
          this.update();
          this.syncLive();
        }),
      },
    );
  }

  get isOpen(): boolean {
    return this.panel !== null;
  }

  private config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("textjs");
  }

  private preference(): ModePreference {
    const p = this.config().get<string>("preview.mode", "auto");
    return p === "live" || p === "headless" ? p : "auto";
  }

  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------

  open(uri: vscode.Uri | undefined, toSide: boolean): void {
    if (uri) this.followDocument(uri, true);
    const column = toSide ? vscode.ViewColumn.Beside : (vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Active);
    if (this.panel) {
      this.panel.reveal(column, toSide);
      return;
    }
    const panel = vscode.window.createWebviewPanel(PreviewController.viewType, this.title(), { viewColumn: column, preserveFocus: toSide }, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(this.deps.context.extensionUri, "dist"), vscode.Uri.joinPath(this.deps.context.extensionUri, "webview"), vscode.Uri.joinPath(this.deps.context.extensionUri, "media")],
    });
    this.attach(panel);
  }

  /** Restore a panel after a window reload. */
  restore(panel: vscode.WebviewPanel): void {
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.deps.context.extensionUri, "dist"), vscode.Uri.joinPath(this.deps.context.extensionUri, "webview"), vscode.Uri.joinPath(this.deps.context.extensionUri, "media")],
    };
    const editor = vscode.window.activeTextEditor;
    if (editor) this.followDocument(editor.document.uri, true);
    this.attach(panel);
  }

  private attach(panel: vscode.WebviewPanel): void {
    this.panel = panel;
    this.ready = false;
    panel.iconPath = {
      light: vscode.Uri.joinPath(this.deps.context.extensionUri, "media", "preview-light.svg"),
      dark: vscode.Uri.joinPath(this.deps.context.extensionUri, "media", "preview-dark.svg"),
    };
    const ext = this.deps.context.extensionUri;
    panel.webview.html = previewHtml({
      cspSource: panel.webview.cspSource,
      scriptUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(ext, "dist", "webview.js")).toString(),
      styleUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(ext, "webview", "styles.css")).toString(),
    });
    this.releasePanel();
    const subs = this.panelDisposables;
    panel.webview.onDidReceiveMessage((m: WebviewToHost) => this.onMessage(m), null, subs);
    panel.onDidChangeViewState(
      () => {
        if (this.panel !== panel) return;
        this.deps.monitor.setWatching(panel.visible);
        // Hidden previews don't keep the project's code running; showing the panel starts it again.
        if (!panel.visible) this.stopHeadless();
        this.update();
      },
      null,
      subs,
    );
    panel.onDidDispose(
      () => {
        if (this.panel !== panel) return;
        this.panel = null;
        this.ready = false;
        this.releasePanel();
        this.deps.monitor.setWatching(false);
        this.stopHeadless();
        this.mode = "idle";
        this.deps.onGrid(null);
        this.lastGrid = "";
        void vscode.commands.executeCommand("setContext", "textjs.previewOpen", false);
      },
      null,
      subs,
    );
    void vscode.commands.executeCommand("setContext", "textjs.previewOpen", true);
    // A panel restored after a reload may be in a background tab.
    this.deps.monitor.setWatching(panel.visible);
    // Hidden or still-loading webviews may not report their size yet.
    this.viewportTimer = setTimeout(() => {
      this.viewportTimer = null;
      if (this.panel !== panel || this.viewport) return;
      this.viewport = { cols: 100, rows: 30 };
      this.update();
    }, 1500);
    this.update();
  }

  /** Drop the current panel's listeners and pending timers. */
  private releasePanel(): void {
    for (const d of this.panelDisposables.splice(0)) d.dispose();
    for (const t of [this.viewportTimer, this.reloadTimer, this.stateTimer]) if (t) clearTimeout(t);
    this.viewportTimer = this.reloadTimer = this.stateTimer = null;
  }

  private title(): string {
    return this.target ? `Preview ${basename(this.target.file)}` : "Text.js Preview";
  }

  private post(msg: HostToWebview): void {
    if (this.panel && this.ready) void this.panel.webview.postMessage(msg);
  }

  // -------------------------------------------------------------------------
  // Targets
  // -------------------------------------------------------------------------

  /**
   * Preview `uri` when it is previewable (keeps the last target otherwise).
   * Only files inside a workspace folder qualify: the preview runs the
   * project's code, so a stray file elsewhere on disk must never pick it.
   */
  followDocument(uri: vscode.Uri, force = false): void {
    if (uri.scheme !== "file") return;
    const next = previewTargetInWorkspace(uri.fsPath);
    if (!next) return;
    const same = this.target && this.target.file === next.file && this.target.root === next.root;
    if (same && !force) return;
    const prevRoot = this.target?.root;
    this.target = next;
    if (this.panel) this.panel.title = this.title();
    if (this.config().get<boolean>("preview.followEditor", false) && this.mode === "live" && next.kind === "route") {
      void this.sendLiveInput({ type: "navigate", href: next.path });
    }
    if (this.headless) {
      if (prevRoot !== next.root) this.stopHeadless();
      else {
        this.error = null;
        this.headlessPath = next.kind === "route" ? next.path : null;
        this.headless.setTarget(toRunnerTarget(next));
      }
    }
    this.update();
  }

  private onSave(doc: vscode.TextDocument): void {
    if (!this.headless || this.mode !== "headless") return;
    const rel = relative(this.headless.root, doc.uri.fsPath);
    if (rel.startsWith("..")) return;
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null;
      this.headless?.reload();
    }, 120);
  }

  // -------------------------------------------------------------------------
  // Mode selection
  // -------------------------------------------------------------------------

  private computeMode(): PreviewMode {
    // Restricted Mode: never run the project's code or connect to a dev server.
    if (!isTrusted()) return "idle";
    const pref = this.preference();
    const snap = this.deps.monitor.snapshot();
    const tabs = snap.status?.sources ?? 0;
    const liveReady = snap.url !== null && (tabs > 0 || this.deps.monitor.live() !== null);
    if (pref === "live") return "live";
    if (pref === "auto" && liveReady) return "live";
    return this.target ? "headless" : "idle";
  }

  private update(): void {
    if (!this.panel) return;
    const mode = this.computeMode();
    if (mode !== this.mode) {
      this.mode = mode;
      this.liveSource = mode === "live" ? (this.deps.monitor.live()?.source ?? null) : null;
      this.encoder.reset();
      this.post({ type: "clearFrame" });
      if (mode === "headless") this.ensureHeadless();
      else this.stopHeadless();
      const f = this.currentFrame();
      if (f) this.pushFrame(f);
    } else if (mode === "headless") this.ensureHeadless();
    this.scheduleState();
  }

  /**
   * When the mirrored tab changes (it closed, or the stream ended) show the
   * new active tab's frame, or clear the preview when no tab is left.
   */
  private syncLive(): void {
    if (this.mode !== "live") return;
    const live = this.deps.monitor.live();
    const source = live?.source ?? null;
    if (source === this.liveSource) return;
    this.liveSource = source;
    this.encoder.reset();
    this.post({ type: "clearFrame" });
    if (live) this.pushFrame(live.frame);
    this.scheduleState();
  }

  private currentFrame(): StyledFrame | null {
    if (this.mode === "live") return this.deps.monitor.live()?.frame ?? null;
    if (this.mode === "headless") return this.headlessFrame;
    return null;
  }

  private pushFrame(frame: StyledFrame): void {
    const grid = `${frame.width}x${frame.height}`;
    if (grid !== this.lastGrid) {
      this.lastGrid = grid;
      this.deps.onGrid({ width: frame.width, height: frame.height });
    }
    if (!this.ready) return;
    const msg = this.encoder.encode(frame);
    if (msg) this.post({ type: "frame", frame: msg });
  }

  // -------------------------------------------------------------------------
  // Headless
  // -------------------------------------------------------------------------

  private ensureHeadless(): void {
    const target = this.target;
    if (!target || this.headless || !this.viewport || !isTrusted() || !this.panel?.visible) return;
    const runtime = this.config().get<string>("preview.runtime", "").trim();
    const session = new HeadlessSession(
      { runnerPath: join(this.deps.context.extensionPath, "dist", "runner.mjs"), root: target.root, execPath: runtime || undefined },
      {
        onFrame: (frame, meta) => {
          if (this.headless !== session) return;
          this.headlessFrame = frame;
          if (meta.path) this.headlessPath = meta.path;
          if (this.loading) {
            this.loading = false;
            this.scheduleState();
          }
          if (this.mode === "headless") this.pushFrame(frame);
          if (meta.path && meta.path !== this.lastPath) this.scheduleState();
        },
        onError: (error) => {
          if (this.headless !== session) return;
          this.error = error;
          if (error) {
            this.loading = false;
            this.deps.output.appendLine(`⨯ ${error.message}${error.stack ? `\n${error.stack}` : ""}`);
          }
          this.scheduleState();
        },
        onExit: (code) => {
          if (this.headless !== session) return;
          this.headless = null;
          this.loading = false;
          if (code !== 0 && code !== null) this.error = { message: `The preview runner exited (code ${code}). See Output → Text.js for details.` };
          this.scheduleState();
        },
        onOutput: (text) => this.deps.output.append(text),
      },
    );
    this.headless = session;
    this.headlessFrame = null;
    this.headlessPath = target.kind === "route" ? target.path : null;
    this.loading = true;
    this.error = null;
    session.start(toRunnerTarget(target), this.viewport.cols, this.viewport.rows, this.deps.monitor.snapshot().url ?? undefined);
    if (this.webviewFocused) session.focus(true);
  }

  private stopHeadless(): void {
    this.headless?.dispose();
    this.headless = null;
    this.headlessFrame = null;
    this.loading = false;
    if (this.mode !== "headless") this.error = null;
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  private lastPath: string | null = null;

  private scheduleState(): void {
    if (this.stateTimer) return;
    this.stateTimer = setTimeout(() => {
      this.stateTimer = null;
      this.post({ type: "state", state: this.state() });
    }, 16);
  }

  state(): PreviewState {
    const snap = this.deps.monitor.snapshot();
    const live = this.deps.monitor.live();
    const serverState: ServerState = snap.url ? "running" : this.deps.serverState();
    const tabs = snap.status?.sources ?? 0;
    const path = this.mode === "live" ? (live?.meta.path ?? snap.status?.path ?? null) : this.mode === "headless" ? this.headlessPath : null;
    this.lastPath = path;
    let hint: string | null = null;
    if (this.mode === "live") {
      if (serverState !== "running") hint = "Start the dev server to mirror the running app";
      else if (tabs === 0) hint = "Waiting for a browser tab — Open in Browser to connect one";
      else hint = `Mirroring ${tabs === 1 ? "the browser tab" : `1 of ${tabs} tabs`} · click the console to interact`;
    } else if (!isTrusted()) {
      hint = "Restricted Mode · trust this workspace to render previews";
    } else if (this.mode === "headless") {
      if (this.preference() === "headless") hint = "Headless render · click the console to interact";
      else if (serverState !== "running") hint = "Headless render · start the dev server to mirror the real app";
      else hint = "Headless render · open the app in a browser to mirror it live";
    }
    const target = this.target ? { label: relative(this.target.root, this.target.file).split("\\").join("/"), kind: this.target.kind } : null;
    return {
      mode: this.mode,
      preference: this.preference(),
      server: { state: serverState, url: snap.url, clients: tabs },
      target,
      path,
      error: this.mode === "headless" ? this.error : null,
      follow: this.config().get<boolean>("preview.followEditor", false),
      fontSize: this.config().get<number>("preview.fontSize", 12),
      mac: process.platform === "darwin",
      hint,
      focused: this.mode === "live" ? (live?.meta.focused ?? true) : this.webviewFocused,
      loading: this.mode === "headless" && this.loading,
      restricted: !isTrusted(),
    };
  }

  // -------------------------------------------------------------------------
  // Messages
  // -------------------------------------------------------------------------

  private async sendLiveInput(msg: InputMessage): Promise<void> {
    const url = this.deps.monitor.snapshot().url;
    if (url) await postInput(url, msg, this.deps.monitor.activeSource ?? undefined);
  }

  private onMessage(m: WebviewToHost): void {
    switch (m.type) {
      case "ready":
        this.ready = true;
        this.encoder.reset();
        this.post({ type: "state", state: this.state() });
        {
          const f = this.currentFrame();
          if (f) this.pushFrame(f);
        }
        break;
      case "viewport": {
        const cols = Math.max(20, Math.min(400, Math.floor(m.cols)));
        const rows = Math.max(6, Math.min(200, Math.floor(m.rows)));
        this.viewport = { cols, rows };
        if (this.headless) this.headless.resize(cols, rows);
        else if (this.mode === "headless") this.ensureHeadless();
        break;
      }
      case "input":
        if (this.mode === "live") void this.sendLiveInput(m.msg);
        else if (this.mode === "headless") {
          if (m.msg.type === "navigate") this.headlessPath = m.msg.href;
          this.headless?.input(m.msg);
        }
        break;
      case "focus":
        this.webviewFocused = m.focused;
        this.headless?.focus(m.focused);
        break;
      case "setMode":
        void this.config().update("preview.mode", m.preference, vscode.ConfigurationTarget.Global);
        break;
      case "copied":
        void vscode.env.clipboard.writeText(m.text).then(() => vscode.window.setStatusBarMessage("$(check) Copied the console frame as text", 2000));
        break;
      case "openLink":
        if (/^https:\/\/textjs\.org\//.test(m.url)) void vscode.env.openExternal(vscode.Uri.parse(m.url));
        break;
      case "command":
        switch (m.command) {
          case "reload":
            if (this.mode === "headless") {
              this.error = null;
              this.headless ? this.headless.reload() : this.ensureHeadless();
              this.scheduleState();
            } else {
              this.encoder.reset();
              const f = this.currentFrame();
              if (f) this.pushFrame(f);
            }
            break;
          case "openBrowser":
            void vscode.commands.executeCommand("textjs.openInBrowser", this.lastPath ?? undefined);
            break;
          case "startServer":
            void vscode.commands.executeCommand("textjs.startDevServer", this.target?.root);
            break;
          case "toggleFollow":
            void this.config().update("preview.followEditor", !this.config().get<boolean>("preview.followEditor", false), vscode.ConfigurationTarget.Global);
            break;
          case "openFile": {
            const file = this.error?.file ?? this.target?.file;
            if (file) void vscode.window.showTextDocument(vscode.Uri.file(file.replace(/:\d+(:\d+)?$/, "")), { viewColumn: vscode.ViewColumn.One });
            break;
          }
          case "manageTrust":
            void vscode.commands.executeCommand("workbench.trust.manage");
            break;
          case "openSettings":
            void vscode.commands.executeCommand("workbench.action.openSettings", "textjs.preview");
            break;
          case "copyText":
            break;
        }
        break;
    }
  }

  /** Re-evaluate the mode (after Workspace Trust is granted). */
  refresh(): void {
    this.update();
  }

  /** Mode and plain-text frame (integration tests and diagnostics). */
  inspect(): { mode: PreviewMode; open: boolean; visible: boolean; column: number | null; text: string | null; state: PreviewState; headlessRoot: string | null } {
    const f = this.currentFrame();
    return {
      mode: this.mode,
      open: this.panel !== null,
      visible: this.panel?.visible ?? false,
      column: this.panel?.viewColumn ?? null,
      text: f ? frameToText(f) : null,
      state: this.state(),
      headlessRoot: this.headless?.root ?? null,
    };
  }

  /** The route currently shown (for "Open in Browser"). */
  currentPath(): string | null {
    return this.lastPath;
  }

  dispose(): void {
    this.stopHeadless();
    this.panel?.dispose();
    this.releasePanel();
    for (const d of this.disposables.splice(0)) d.dispose();
  }
}

function toRunnerTarget(t: PreviewTarget): RunnerTarget {
  return t.kind === "route" ? { kind: "route", path: t.path } : { kind: "component", file: t.file };
}
