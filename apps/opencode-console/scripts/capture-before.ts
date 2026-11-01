// Used only with a historical tree extracted by before.py and its private server.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const [app, out, url, permission, form] = process.argv.slice(2),
  root = resolve(import.meta.dir, "..");
if (
  !app?.startsWith(root + "/.text/") ||
  !url?.startsWith("http://127.0.0.1:") ||
  ["4096", "49374"].includes(new URL(url).port) ||
  url !== process.env.OPENCODE_SERVER_URL ||
  !process.env.OPENCODE_PASSWORD
)
  throw Error("Use before.py");
const client = new Client({ name: "before-capture", version: "1" });
const call = async (name: string, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw Error(JSON.stringify(r.content));
  return r.structuredContent!;
};
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(root, "../../packages/text/bin/text.ts"), "mcp", app],
      env: { OPENCODE_SERVER_URL: url, OPENCODE_PASSWORD: process.env.OPENCODE_PASSWORD },
    }),
  );
  for (const [cols, rows] of [
    [100, 32],
    [120, 40],
  ]) {
    await call("resize", { cols, rows });
    const dir = `${out}/${cols}x${rows}`;
    await mkdir(dir, { recursive: true });
    const save = async (label: string) => {
      const f = await call("read_frame", { styles: true, trim: false });
      await writeFile(`${dir}/${label}-mcp.json`, JSON.stringify(f));
    };
    await call("navigate", { path: "/" });
    await call("wait_for", { text: "Ask anything" });
    for (const label of ["help", "themes"]) {
      await call("type", { text: `/${label}` });
      await call("press", { keys: "enter" });
      await save(label);
      await call("press", { keys: "escape" });
    }
    await call("navigate",{path:"/session/ses_parityfixture"});await call("wait_for",{text:"Ready",idle:true});
    await save("session");await call("press",{keys:"ctrl+x b"});await save("sidebar");await call("press",{keys:"ctrl+x b"});
    for (const [label, id] of [
      ["permission", permission],
      ["question", form],
    ]) {
      const href = `/session/${id}`;
      await call("navigate", { path: href });
      await call("wait_for", { text: `${label![0]!.toUpperCase()}${label!.slice(1)} fixture`, href, idle: true });
      await save(label!);
    }
  }
} finally {
  await client.close();
}
