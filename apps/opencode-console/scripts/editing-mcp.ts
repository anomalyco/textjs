/** Multiline/Unicode caret smoke through the same stdin MCP driver as the captures. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const app = resolve(import.meta.dir, ".."),
  c = new Client({ name: "editing-trace", version: "1" });
const call = async (name: string, args: Record<string, unknown>) => {
  const r = await c.callTool({ name, arguments: args });
  assert(!r.isError, JSON.stringify(r.content));
  return r.structuredContent as Record<string, any>;
};
try {
  await c.connect(
    new StdioClientTransport({ command: process.execPath, args: [resolve(app, "../../packages/text/bin/text.ts"), "mcp", app], env: {} }),
  );
  await call("wait_for", { text: "● demo" });
  await call("type", { text: "alpha beta gamma" });
  await call("press", { keys: "alt+b ctrl+k" });
  await call("paste", { text: "日本\r\nsecond line" });
  await call("press", { keys: "ctrl+a alt+f ctrl+k shift+enter" });
  await call("paste", { text: "🔍" });
  for (const [cols, rows] of [
    [100, 32],
    [80, 24],
    [120, 40],
  ]) {
    await call("resize", { cols, rows });
    const f = await call("wait_for", { href: "/", text: ["alpha beta 日本", "second", "🔍"], styles: true });
    assert(!f.text.includes("gamma") && !f.text.includes("second line"));
    assert.equal(f.focus.id, "opencode-prompt");
    const { matches } = await call("find", { text: "🔍" });
    assert.deepEqual(f.cursor, { x: matches[0].x + matches[0].width, y: matches[0].y });
  }
  await call("press", { keys: "left delete ctrl+c" });
  await call("wait_for", { href: "/", text: "Ask anything", gone: "🔍" });
  console.log("MCP: word jumping, kill-to-end, CRLF paste, Shift+Enter, wide caret across 3 resizes, Delete and clear verified");
} finally {
  await c.close();
}
