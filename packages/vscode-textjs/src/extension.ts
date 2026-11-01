/**
 * ▼ Text.js for VS Code — Live Preview, dev server control, App Router
 * scaffolding, snippets, `TX###` error links and a status bar item.
 */

import * as vscode from "vscode";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { DevServerMonitor } from "./dev-monitor";
import { appUrl, loopbackOrigin } from "./dev-server";
import { PreviewController } from "./preview";
import { devCommand, isProjectRoot, usesTypeScript } from "./project";
import { parseRouteInput, scaffold, scaffoldConflict, SCAFFOLD_LABELS, type ScaffoldKind } from "./scaffold";
import { StatusBar, type StatusInput } from "./status-bar";
import { findTxCodes, txHoverMarkdown, txUrl } from "./tx-codes";
import type { ServerState } from "./webview-protocol";
import { isTrusted, previewTargetInWorkspace, projectRootInWorkspace } from "./workspace";

const PROJECT_GLOB = "**/{text.config.ts,text.config.mts,text.config.js,text.config.mjs,app/page.tsx,app/page.jsx,app/layout.tsx,app/layout.jsx}";
const START_TIMEOUT_MS = 60_000;

let projects: string[] = [];

async function findProjects(): Promise<string[]> {
  const files = await vscode.workspace.findFiles(PROJECT_GLOB, "**/node_modules/**", 200);
  const roots = new Set<string>();
  for (const f of files) {
    const p = f.fsPath;
    const dir = /[\\/]app[\\/](page|layout)\.(tsx|jsx)$/.test(p) ? dirname(dirname(p)) : dirname(p);
    if (isProjectRoot(dir)) roots.add(dir);
  }
  return [...roots].sort();
}

/** The project for the active editor (or the only one, or ask). */
async function pickProject(hint?: string | vscode.Uri): Promise<string | undefined> {
  const fromHint = typeof hint === "string" ? hint : hint?.fsPath;
  const candidates = [fromHint, vscode.window.activeTextEditor?.document.uri.fsPath].filter((p): p is string => typeof p === "string");
  for (const c of candidates) {
    const root = projectRootInWorkspace(c);
    if (root) return root;
  }
  if (projects.length === 1) return projects[0];
  if (projects.length === 0) {
    void vscode.window.showWarningMessage("No Text.js app found in this workspace. Create one with `bunx create-text-app@latest`.");
    return undefined;
  }
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
  const pick = await vscode.window.showQuickPick(
    projects.map((p) => ({ label: relative(folder, p) || ".", description: p, root: p })),
    { placeHolder: "Select a Text.js app" },
  );
  return pick?.root;
}

// ---------------------------------------------------------------------------
// Dev server launcher
// ---------------------------------------------------------------------------

class DevServerLauncher implements vscode.Disposable {
  private terminal: vscode.Terminal | null = null;
  private startedAt = 0;
  private readonly sub: vscode.Disposable;

  constructor(
    private readonly monitor: DevServerMonitor,
    private readonly onChange: () => void,
  ) {
    this.sub = vscode.window.onDidCloseTerminal((t) => {
      if (t === this.terminal) {
        this.terminal = null;
        this.startedAt = 0;
        this.onChange();
      }
    });
  }

  get state(): ServerState {
    if (this.monitor.snapshot().url) return "running";
    if (this.startedAt > 0 && Date.now() - this.startedAt < START_TIMEOUT_MS) return "starting";
    return "stopped";
  }

  get owned(): boolean {
    return this.terminal !== null;
  }

  async start(root: string): Promise<void> {
    if (!isTrusted()) {
      const manage = "Manage Workspace Trust";
      const choice = await vscode.window.showWarningMessage("▼ Text.js can't start the dev server in Restricted Mode. Trust this workspace to run it.", manage);
      if (choice === manage) void vscode.commands.executeCommand("workbench.trust.manage");
      return;
    }
    const running = this.monitor.snapshot();
    if (running.url) {
      const open = "Open in Browser";
      const choice = await vscode.window.showInformationMessage(`▼ Text.js dev server is already running at ${running.url}.`, open, "Open Preview");
      if (choice === open) void vscode.commands.executeCommand("textjs.openInBrowser");
      else if (choice) void vscode.commands.executeCommand("textjs.openPreviewToSide");
      return;
    }
    const custom = vscode.workspace.getConfiguration("textjs").get<string>("devServer.command", "").trim();
    const command = custom || devCommand(root);
    this.terminal?.dispose();
    this.terminal = vscode.window.createTerminal({
      name: "▼ Text.js dev",
      cwd: root,
      iconPath: new vscode.ThemeIcon("triangle-down"),
      env: { FORCE_COLOR: "1" },
    });
    this.terminal.sendText(command, true);
    this.terminal.show(true);
    this.startedAt = Date.now();
    this.onChange();
    const deadline = Date.now() + START_TIMEOUT_MS;
    const poll = (): void => {
      if (this.monitor.snapshot().url || Date.now() > deadline || !this.terminal) {
        this.startedAt = 0;
        this.onChange();
        return;
      }
      this.monitor.poke();
      setTimeout(poll, 700);
    };
    setTimeout(poll, 700);
  }

  stop(): void {
    if (!this.terminal) {
      void vscode.window.showInformationMessage("The dev server wasn't started from VS Code. Stop it in the terminal where it runs.");
      return;
    }
    this.terminal.dispose();
    this.terminal = null;
    this.startedAt = 0;
    setTimeout(() => this.monitor.poke(), 500);
    this.onChange();
  }

  dispose(): void {
    this.sub.dispose();
  }
}

// ---------------------------------------------------------------------------
// Scaffolding
// ---------------------------------------------------------------------------

/** `route` skips the prompt (keybindings, tasks and tests can pass it). */
async function scaffoldCommand(kind: ScaffoldKind, uri?: vscode.Uri, route?: string): Promise<void> {
  const root = await pickProject(uri);
  if (!root) return;
  let initial = kind === "route" ? "api/" : "";
  if (uri) {
    const rel = relative(join(root, "app"), uri.fsPath).split("\\").join("/");
    if (rel && !rel.startsWith("..")) initial = `${rel.replace(/\/$/, "")}/`;
    else if (rel === "") initial = "";
  }
  const label = SCAFFOLD_LABELS[kind];
  const input = typeof route === "string" ? route : await vscode.window.showInputBox({
    title: `▼ New ${label}`,
    prompt: kind === "route" ? "Route path under app/, for example api/users/[id]" : "Route path under app/, for example settings, blog/[slug] or (marketing)/about. Leave empty for the root.",
    value: initial,
    valueSelection: [initial.length, initial.length],
    placeHolder: kind === "route" ? "api/health" : "settings",
    validateInput: (v) => {
      const parsed = parseRouteInput(v);
      if ("error" in parsed) return parsed.error;
      const dir = join(root, "app", parsed.path);
      const siblings = existsSync(dir) ? readdirSync(dir) : [];
      const conflict = scaffoldConflict(kind, siblings);
      return conflict ? { message: conflict, severity: vscode.InputBoxValidationSeverity.Error } : null;
    },
  });
  if (input === undefined) return;
  const parsed = parseRouteInput(input);
  if ("error" in parsed) {
    void vscode.window.showErrorMessage(parsed.error);
    return;
  }
  const conflict = scaffoldConflict(kind, existsSync(join(root, "app", parsed.path)) ? readdirSync(join(root, "app", parsed.path)) : []);
  if (conflict) {
    void vscode.window.showErrorMessage(conflict);
    return;
  }
  const result = scaffold(kind, parsed, { typescript: usesTypeScript(root) });
  const target = vscode.Uri.file(join(root, result.file));
  if (existsSync(target.fsPath)) {
    void vscode.window.showErrorMessage(`${result.file} already exists.`);
    return;
  }
  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(result.content));
  const doc = await vscode.workspace.openTextDocument(target);
  const editor = await vscode.window.showTextDocument(doc);
  const pos = new vscode.Position(result.cursor.line, result.cursor.character);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos));
  vscode.window.setStatusBarMessage(`$(check) Created ${result.file}`, 2500);
}

// ---------------------------------------------------------------------------
// TX### hovers and links
// ---------------------------------------------------------------------------

const TX_SELECTOR: vscode.DocumentSelector = [
  { scheme: "file" },
  { scheme: "untitled" },
  { scheme: "output" },
];

class TxHoverProvider implements vscode.HoverProvider {
  provideHover(doc: vscode.TextDocument, pos: vscode.Position): vscode.Hover | undefined {
    const range = doc.getWordRangeAtPosition(pos, /TX\d{3}/);
    if (!range) return undefined;
    const code = doc.getText(range);
    const md = new vscode.MarkdownString(txHoverMarkdown(code));
    md.isTrusted = false;
    return new vscode.Hover(md, range);
  }
}

class TxLinkProvider implements vscode.DocumentLinkProvider {
  provideDocumentLinks(doc: vscode.TextDocument): vscode.DocumentLink[] {
    if (doc.lineCount > 20_000) return [];
    const links: vscode.DocumentLink[] = [];
    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i).text;
      if (!line.includes("TX")) continue;
      for (const m of findTxCodes(line)) {
        const link = new vscode.DocumentLink(new vscode.Range(i, m.start, i, m.end), vscode.Uri.parse(txUrl(m.code)));
        link.tooltip = `Text.js error ${m.code}: open textjs.org/errors/${m.code}`;
        links.push(link);
      }
    }
    return links;
  }
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export interface TextjsExtensionApi {
  preview: PreviewController;
  monitor: DevServerMonitor;
  projects(): string[];
}

export async function activate(context: vscode.ExtensionContext): Promise<TextjsExtensionApi> {
  const output = vscode.window.createOutputChannel("Text.js");
  const monitor = new DevServerMonitor();
  const status = new StatusBar();
  let previewGrid: { width: number; height: number } | null = null;

  const refreshStatus = (): void => {
    const snap = monitor.snapshot();
    const s = snap.status;
    const input: StatusInput = {
      server: launcher.state,
      url: snap.url,
      tabs: s?.sources ?? 0,
      grid: s?.grid ?? previewGrid,
      gridSource: s?.grid ? "browser" : previewGrid ? "preview" : null,
      path: s?.path ?? null,
    };
    status.update(input, projects.length > 0);
  };

  const launcher = new DevServerLauncher(monitor, refreshStatus);
  const preview = new PreviewController({
    context,
    monitor,
    output,
    serverState: () => launcher.state,
    onGrid: (g) => {
      previewGrid = g;
      refreshStatus();
    },
  });

  let warnedUrl = "";
  const configuredDevUrl = (): string => {
    const raw = vscode.workspace.getConfiguration("textjs").get<string>("devServer.url", "").trim();
    if (!raw) return "";
    const url = loopbackOrigin(raw);
    if (url) return url;
    if (warnedUrl !== raw) {
      warnedUrl = raw;
      void vscode.window.showWarningMessage(`▼ Ignoring textjs.devServer.url "${raw}": only http:// loopback addresses (localhost, 127.0.0.1, [::1]) are supported.`);
    }
    return "";
  };

  const refreshProjects = async (): Promise<void> => {
    projects = await findProjects();
    await vscode.commands.executeCommand("setContext", "textjs.isProject", projects.length > 0);
    // Untrusted workspaces never talk to a dev server (`devServer.url` is a restricted setting).
    if (isTrusted()) monitor.configure(projects, configuredDevUrl());
    refreshStatus();
  };

  const watcher = vscode.workspace.createFileSystemWatcher(PROJECT_GLOB);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const queueRefresh = (): void => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refreshProjects(), 500);
  };

  context.subscriptions.push(
    output,
    status,
    launcher,
    preview,
    watcher,
    { dispose: () => monitor.dispose() },
    { dispose: monitor.onChange(refreshStatus) },
    watcher.onDidCreate(queueRefresh),
    watcher.onDidDelete(queueRefresh),
    vscode.workspace.onDidChangeWorkspaceFolders(queueRefresh),
    vscode.workspace.onDidGrantWorkspaceTrust(async () => {
      await refreshProjects();
      monitor.start();
      preview.refresh();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("textjs.devServer")) void refreshProjects();
    }),

    vscode.commands.registerCommand("textjs.startDevServer", async (hint?: string | vscode.Uri) => {
      const root = await pickProject(hint);
      if (root) await launcher.start(root);
    }),
    vscode.commands.registerCommand("textjs.stopDevServer", () => launcher.stop()),
    vscode.commands.registerCommand("textjs.openPreview", (uri?: vscode.Uri) => preview.open(uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor?.document.uri, false)),
    vscode.commands.registerCommand("textjs.openPreviewToSide", (uri?: vscode.Uri) => preview.open(uri instanceof vscode.Uri ? uri : vscode.window.activeTextEditor?.document.uri, true)),
    vscode.commands.registerCommand("textjs.openInBrowser", async (path?: string) => {
      let url = monitor.snapshot().url;
      if (!url) {
        const start = "Start Dev Server";
        const choice = await vscode.window.showInformationMessage("▼ The Text.js dev server isn't running.", start);
        if (choice !== start) return;
        await vscode.commands.executeCommand("textjs.startDevServer");
        for (let i = 0; i < 80 && !url; i++) {
          await new Promise((r) => setTimeout(r, 500));
          url = monitor.snapshot().url;
        }
        if (!url) return;
      }
      let route = typeof path === "string" ? path : preview.currentPath();
      if (!route) {
        const file = vscode.window.activeTextEditor?.document.uri.fsPath;
        const target = file ? previewTargetInWorkspace(file) : null;
        route = target?.kind === "route" ? target.path : "/";
      }
      await vscode.env.openExternal(vscode.Uri.parse(appUrl(url, monitor.snapshot().status?.basePath, route)));
      const keys = process.platform === "darwin" ? "⌘⌥J" : "Ctrl+Shift+J";
      vscode.window.setStatusBarMessage(`$(triangle-down) Opened ${route}. Press ${keys} in the browser to open the console.`, 6000);
    }),
    vscode.commands.registerCommand("textjs.newPage", (uri?: vscode.Uri, route?: string) => scaffoldCommand("page", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.newLayout", (uri?: vscode.Uri, route?: string) => scaffoldCommand("layout", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.newRouteHandler", (uri?: vscode.Uri, route?: string) => scaffoldCommand("route", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.newLoading", (uri?: vscode.Uri, route?: string) => scaffoldCommand("loading", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.newError", (uri?: vscode.Uri, route?: string) => scaffoldCommand("error", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.newNotFound", (uri?: vscode.Uri, route?: string) => scaffoldCommand("not-found", uri instanceof vscode.Uri ? uri : undefined, route)),
    vscode.commands.registerCommand("textjs.showMenu", async () => {
      const snap = monitor.snapshot();
      type Item = vscode.QuickPickItem & { command?: string };
      const items: Item[] = [
        { label: "$(open-preview) Open Preview", description: "Live console frame beside the editor", command: "textjs.openPreviewToSide" },
        snap.url
          ? { label: "$(link-external) Open in Browser Console", description: snap.url, command: "textjs.openInBrowser" }
          : { label: "$(play) Start Dev Server", description: "text dev", command: "textjs.startDevServer" },
      ];
      if (launcher.owned) items.push({ label: "$(debug-stop) Stop Dev Server", command: "textjs.stopDevServer" });
      items.push(
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        { label: "$(new-file) New Page…", command: "textjs.newPage" },
        { label: "$(layout) New Layout…", command: "textjs.newLayout" },
        { label: "$(server) New Route Handler…", command: "textjs.newRouteHandler" },
        { label: "", kind: vscode.QuickPickItemKind.Separator },
        { label: "$(book) Documentation", description: "textjs.org/docs/vscode", command: "vscode.open:https://textjs.org/docs/vscode" },
      );
      const pick = await vscode.window.showQuickPick(items, { title: "▼ Text.js" });
      if (!pick?.command) return;
      if (pick.command.startsWith("vscode.open:")) void vscode.env.openExternal(vscode.Uri.parse(pick.command.slice(12)));
      else void vscode.commands.executeCommand(pick.command);
    }),

    vscode.languages.registerHoverProvider(TX_SELECTOR, new TxHoverProvider()),
    vscode.languages.registerDocumentLinkProvider(TX_SELECTOR, new TxLinkProvider()),

    vscode.window.registerWebviewPanelSerializer(PreviewController.viewType, {
      async deserializeWebviewPanel(panel) {
        preview.restore(panel);
      },
    }),
  );

  await refreshProjects();
  if (isTrusted()) monitor.start();

  // Exposed for the integration test.
  return { preview, monitor, projects: () => projects };
}

export function deactivate(): void {}
