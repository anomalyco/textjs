/** Drives the real stdio CLI; never inherit a server target from the calling shell.
 * No arguments: demo only. compare-pty.py passes its dedicated listener + fixture id. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const app = resolve(import.meta.dir, "..");
const [output, endpoint, sid, permission, question] = process.argv.slice(2);
const out = resolve(output ?? `${app}/.text/captures/demo`);
const env: Record<string, string> = {};
if (endpoint) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint) || ["4096", "49374"].includes(new URL(endpoint).port) || !sid?.startsWith("ses_") || endpoint !== process.env.OPENCODE_SERVER_URL || !process.env.OPENCODE_PASSWORD) {
    throw Error("Use compare-pty.py to provision the private fixture");
  }
  env.OPENCODE_SERVER_URL = endpoint;
  env.OPENCODE_PASSWORD = process.env.OPENCODE_PASSWORD;
}
const client = new Client({ name: "textjs-parity", version: "1" });
const transport = new StdioClientTransport({ command: process.execPath, args: [resolve(app, "../../packages/text/bin/text.ts"), "mcp", app, "--cols", "120", "--rows", "40"], env });
async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args }) as CallToolResult;
  if (result.isError) throw Error(`${name}: ${JSON.stringify(result.content)}`);
  return result.structuredContent!;
}
const wait = (text: string) => call("wait_for", { text, timeoutMs: 8000 });
const press = (keys: string) => call("press", { keys });
try {
  await client.connect(transport);
  await call("list_routes");
  await call("navigate", { path: "/" });
  await call("reload");
  await wait(endpoint ? "Big Pickle" : "● demo");
  for (const [cols, rows] of [[120, 40], [100, 32], [80, 24]] as const) {
    const dir = resolve(out, `${cols}x${rows}`);
    await mkdir(dir, { recursive: true });
    await call("resize", { cols, rows });
    const capture = async (name: string, matched?: Record<string, unknown>) => {
      const frame = matched ?? await call("read_frame", { styles: true, trim: false });
      const expectedFocus = name==="sidebar" ? "session-sidebar" : ["home", "home-draft", "session", "session-top", "session-dracula"].includes(name) ? "opencode-prompt" : name === "help" ? "opencode-help" : `opencode-picker-${name}`;
      if ((frame.focus as { id?: string } | null)?.id !== expectedFocus) throw Error(`${name}: expected focus on ${expectedFocus}`);
      await writeFile(`${dir}/${name}-mcp.json`, JSON.stringify(frame));
      await writeFile(`${dir}/${name}-mcp.txt`, String(frame.text) + "\n");
    };
    await capture("home");
    await call("type",{text:"Review the changes"}); await capture("home-draft"); await press("ctrl+u");
    await call("find", { text: "Ask anything" });
    await press("ctrl+p");
    await capture("commands");
    const tree = await call("inspect_tree", { component: "Palette", format: "json", maxDepth: 4 });
    await writeFile(`${dir}/commands-tree.json`, JSON.stringify(tree));
    await press("escape");
    for (const name of ["help", "themes"]) {
      await call("type",{text:`/${name}`}); await press("enter"); await capture(name); await press("escape");
    }
    for (const [key, name] of [["m", "models"], ["a", "agents"], ["l", "sessions"]]) {
      await press(`ctrl+x ${key}`);
      await capture(name!);
      if (key === "l") {
        await call("type", { text: endpoint ? "Parity fixture" : "Fix cart" });
        await press("enter");
        await capture("session", await call("wait_for", { text: endpoint ? ["Ready", "~/project:master"] : "99+", href: `/session/${sid ?? "ses_demo_cart"}`, idle: true, styles: true, trim: false }));
        await press("ctrl+g");await capture("session-top");await press("end");
        await press("ctrl+x b");await capture("sidebar",await call("wait_for",{text:"Context",idle:true,styles:true,trim:false}));await press("ctrl+x b");
        for(const theme of ["dracula","opencode"]) {
          await call("type",{text:"/themes"}); await press("enter"); await wait("Themes");
          await call("type",{text:theme}); await press("enter");
          if(theme==="dracula")await capture("session-dracula");
        }
        await call("scroll", { rows: -10 });
        await press("ctrl+x n");
      } else await press("escape");
    }
    console.log(`MCP ${cols}×${rows}: styled route and picker frames captured`);
  }
  if (endpoint) {
    for (const [label, session] of [["permission", permission], ["question", question]]) {
      if (!session?.startsWith("ses_")) throw Error(`Missing ${label} fixture`);
      const href = `/session/${session}`;
      await call("navigate", { path: href });
      for(const [cols, rows] of [[100,32],[120,40]]) {
        await call("resize", {cols, rows});
        const frame = await call("wait_for", { href, text: label === "permission" ? "Allow once" : "2. release", styles: true, trim: false, idle: true });
        const save=async(name:string, f:Record<string,unknown>)=>{
          await writeFile(`${out}/${cols}x${rows}/${name}-mcp.json`, JSON.stringify(f));
          await writeFile(`${out}/${cols}x${rows}/${name}-mcp.txt`, f.text + "\n");
        };
        await save(label!,frame);
        if(label==="permission"){
          await press("right"); await save("permission-always",await call("wait_for",{href,text:"This will always allow",styles:true,trim:false}));
          await press("ctrl+f");await save("permission-full",await call("wait_for",{href,text:"minimize",styles:true,trim:false}));
          await press("escape left");
        }
      }
    }
  }
  const logs = await call("logs", { level: ["error"] });
  if (Array.isArray(logs.entries) && logs.entries.length) throw Error(`Unexpected app errors: ${JSON.stringify(logs.entries)}`);
} finally {
  await client.close();
}
