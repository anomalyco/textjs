/** Exercise all bundled themes via actual search, preview, commit, mode change
 * and redraw. No live endpoint is configured or inherited. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import catalog from "../lib/themes.json";
const app = resolve(import.meta.dir, ".."),
  client = new Client({ name: "theme-matrix", version: "1" });
async function call(name: string, args: Record<string, unknown> = {}) {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw Error(JSON.stringify(r.content));
  return r.structuredContent as Record<string, any>;
}
const press = (keys: string) => call("press", { keys }),
  type = (text: string) => call("type", { text });
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(app, "../../packages/app/bin/text.ts"), "mcp", app, "--cols", "100", "--rows", "32"],
      env: {},
    }),
  );
  await call("wait_for", { text: "● demo" });
  const host = (await call("read_frame", { styles: true })).styles[0].runs[0].bg;
  let mode: "dark" | "light" = "dark",
    checks = 0;
  for (const [name, pair] of Object.entries(catalog)) {
    await type("/themes");
    await press("enter");
    await type(name);
    await press("enter");
    if (!(mode in pair)) mode = "dark" in pair ? "dark" : "light";
    async function check() {
      const result = await call("read_frame", { styles: true });
      const tokens = (pair as Record<string, { bg: string; agents: string[] }>)[mode]!;
      // Transparent themes reveal the existing host surface. Also check a
      // foreground run, so sharing a background cannot mask a failed switch.
      const build = result.styles.flatMap((r: any) => r.runs).find((r: any) => r.text.trim() === "Build");
      if (result.styles[0].runs[0].bg !== (tokens.bg === "transparent" ? host : tokens.bg) || build?.fg !== tokens.agents[0])
        throw Error(`Wrong colors for ${name}/${mode}`);
      checks++;
    }
    await check();
    if ("light" in pair && "dark" in pair) {
      await press("ctrl+p");
      await type("Switch theme mode");
      await press("enter");
      mode = mode === "dark" ? "light" : "dark";
      await check();
    }
  }
  console.log(`${Object.keys(catalog).length} theme selections, ${checks} mode/background checks through text mcp`);
} finally {
  await client.close();
}
