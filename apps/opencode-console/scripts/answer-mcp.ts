import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
const [url, sid] = process.argv.slice(2);
if (
  !url ||
  !/^http:\/\/127\.0\.0\.1:\d+$/.test(url) ||
  ["4096", "49374"].includes(new URL(url).port) ||
  process.env.OPENCODE_SERVER_URL !== url ||
  !process.env.OPENCODE_PASSWORD ||
  !sid?.startsWith("ses_")
)
  throw Error("Use request-tools.py");
const app = resolve(import.meta.dir, "..");
const client = new Client({ name: "parity-tool-test", version: "1" });
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(app, "../../packages/text/bin/text.ts"), "mcp", app],
      env: { OPENCODE_SERVER_URL: url, OPENCODE_PASSWORD: process.env.OPENCODE_PASSWORD },
    }),
  );
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = await client.callTool({ name, arguments: args });
    if (r.isError) throw Error(JSON.stringify(r.content));
    return r;
  };
  const href = `/session/${sid}`;
  await call("navigate", { path: href });
  await call("wait_for", { href, text: "Permission required", timeoutMs: 20000 });
  await call("wait_for", { href, text: "printf parity-ok" });
  await call("press", { keys: "ctrl+f" });
  await call("wait_for", { text: "minimize" });
  await call("press", { keys: "escape enter" });
  await call("wait_for", { href, text: "2. release", timeoutMs: 20000 });
  await call("press", { keys: "2" });
  await call("wait_for", { href, text: "Fixture finished.", timeoutMs: 15000 });
} finally {
  await client.close();
}
