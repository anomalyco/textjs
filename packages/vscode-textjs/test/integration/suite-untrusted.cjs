/**
 * Runs inside the VS Code extension host in Restricted Mode (see run.mjs): the
 * workspace's `.vscode/settings.json` points `textjs.preview.runtime`,
 * `textjs.devServer.command` and `textjs.devServer.url` at a script that drops
 * a marker file. Nothing may run.
 */

const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");

const fixture = process.env.TEXTJS_FIXTURE;
const marker = process.env.TEXTJS_MARKER;

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

test("the workspace is untrusted and the extension activates in limited mode", async () => {
  assert.equal(vscode.workspace.isTrusted, false, "Restricted Mode");
  const ext = vscode.extensions.getExtension("textjs.vscode-textjs");
  api = await ext.activate();
  await until(() => api.projects().length > 0, 10000, "project detection");
});

test("restricted settings from the workspace are ignored", () => {
  const cfg = vscode.workspace.getConfiguration("textjs");
  assert.equal(cfg.get("preview.runtime"), "");
  assert.equal(cfg.get("devServer.command"), "");
  assert.equal(cfg.get("devServer.url"), "");
});

test("the preview opens but never starts the runner", async () => {
  const doc = await vscode.workspace.openTextDocument(join(fixture, "app/logs/page.tsx"));
  await vscode.window.showTextDocument(doc);
  await vscode.commands.executeCommand("textjs.openPreviewToSide");
  await until(() => api.preview.inspect().open, 10000, "the preview panel");
  await new Promise((r) => setTimeout(r, 3000));
  const snap = api.preview.inspect();
  assert.equal(snap.mode, "idle");
  assert.equal(snap.headlessRoot, null);
  assert.equal(snap.state.restricted, true);
  assert.equal(api.monitor.snapshot().url, null, "no dev server discovery");
  assert.equal(existsSync(marker), false);
});

test("Start Dev Server does nothing in Restricted Mode", async () => {
  const before = vscode.window.terminals.length;
  // The warning message is not awaited by the test: it stays open, and the command resolves after it is dismissed.
  void vscode.commands.executeCommand("textjs.startDevServer", fixture);
  await new Promise((r) => setTimeout(r, 2000));
  assert.equal(vscode.window.terminals.length, before, "no terminal was created");
  assert.equal(existsSync(marker), false);
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
