/**
 * Runs inside the VS Code extension host (see run.mjs). Dependency-free: a
 * tiny sequential runner instead of mocha.
 */

const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");

const fixture = process.env.TEXTJS_FIXTURE;

async function until(fn, timeout = 20000, label = "condition") {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

let api;

test("activates and registers commands", async () => {
  const ext = vscode.extensions.getExtension("textjs.vscode-textjs");
  assert.ok(ext, "extension is installed");
  api = await ext.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const id of ["textjs.startDevServer", "textjs.openPreview", "textjs.openInBrowser", "textjs.newPage", "textjs.newLayout", "textjs.newRouteHandler"]) {
    assert.ok(commands.includes(id), `${id} is registered`);
  }
  await until(() => api.projects().length > 0, 10000, "project detection");
  assert.equal(api.projects()[0], fixture);
});

test("live preview renders the open page headlessly", async () => {
  const doc = await vscode.workspace.openTextDocument(join(fixture, "app/logs/page.tsx"));
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("textjs.openPreviewToSide");
  const snap = await until(() => {
    const s = api.preview.inspect();
    return s.text && s.text.includes("Filter by path") ? s : null;
  }, 30000, "a headless frame").catch((e) => {
    console.error(JSON.stringify(api.preview.inspect(), null, 2));
    throw e;
  });
  assert.equal(snap.mode, "headless");
  assert.equal(snap.state.path, "/logs");
  assert.equal(snap.state.target.label, "app/logs/page.tsx");
  assert.match(snap.text, /▼ Edge/);
});

test("preview follows the active editor", async () => {
  const doc = await vscode.workspace.openTextDocument(join(fixture, "app/settings/page.tsx"));
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  await until(() => api.preview.inspect().state.path === "/settings", 20000, "route switch");
});

test("TX codes get hovers and document links", async () => {
  const doc = await vscode.workspace.openTextDocument({ language: "plaintext", content: "▼ TX001: Yoga is not initialized." });
  await vscode.window.showTextDocument(doc);
  const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", doc.uri, new vscode.Position(0, 4));
  const text = hovers.flatMap((h) => h.contents.map((c) => (typeof c === "string" ? c : c.value))).join("\n");
  assert.match(text, /textjs\.org\/errors\/TX001/);
  const links = await vscode.commands.executeCommand("vscode.executeLinkProvider", doc.uri);
  assert.ok(links.some((l) => String(l.target).includes("/errors/TX001")), "document link to the error page");
});

test("snippets are contributed for TSX", async () => {
  const ext = vscode.extensions.getExtension("textjs.vscode-textjs");
  const snippets = JSON.parse(readFileSync(join(ext.extensionPath, "snippets/textjs.code-snippets"), "utf8"));
  assert.ok(snippets["Text.js page"]);
  const doc = await vscode.workspace.openTextDocument({ language: "typescriptreact", content: "txpa" });
  await vscode.window.showTextDocument(doc);
  const list = await vscode.commands.executeCommand("vscode.executeCompletionItemProvider", doc.uri, new vscode.Position(0, 4));
  assert.ok(list.items.some((i) => (typeof i.label === "string" ? i.label : i.label.label) === "txpage"), "txpage completion");
});

test("scaffolding writes App Router files", async () => {
  await vscode.commands.executeCommand("textjs.newPage", vscode.Uri.file(join(fixture, "app")), "team/[member]");
  const page = join(fixture, "app/team/[member]/page.tsx");
  await until(() => existsSync(page), 10000, "scaffolded page");
  assert.match(readFileSync(page, "utf8"), /PageProps<\{ member: string \}>/);
  assert.equal(vscode.window.activeTextEditor.document.uri.fsPath, page);
  await vscode.commands.executeCommand("textjs.newRouteHandler", undefined, "api/team/[member]");
  assert.match(readFileSync(join(fixture, "app/api/team/[member]/route.ts"), "utf8"), /export async function GET/);
});

exports.run = async function run() {
  let failed = 0;
  for (const t of tests) {
    const started = Date.now();
    try {
      await t.fn();
      console.log(`  ✓ ${t.name} (${Date.now() - started}ms)`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${t.name}\n    ${error && error.stack ? error.stack : error}`);
    }
  }
  console.log(`\n▼ ${tests.length - failed} passed, ${failed} failed`);
  if (failed > 0) throw new Error(`${failed} integration test(s) failed`);
};
