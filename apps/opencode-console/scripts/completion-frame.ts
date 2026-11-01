import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createTransport, createV2Client } from "../lib/client";
const [tmp, version] = process.argv.slice(2),
  app = resolve(import.meta.dir, ".."),
  out = resolve(app, "parity/round3");
const endpoint = process.env.OPENCODE_SERVER_URL!;
if (
  !tmp ||
  tmp !== process.env.HOME ||
  !/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint) ||
  ["4096", "49374"].includes(new URL(endpoint).port) ||
  !process.env.OPENCODE_PASSWORD
)
  throw Error("Use compare-completion.py");
const env = Object.fromEntries(Object.entries(process.env).filter((p): p is [string, string] => typeof p[1] === "string"));
const mcp = new Client({ name: "completion-capture", version: "1" });
const { chromium } = await import(process.env.PLAYWRIGHT!);
const browser = await chromium.launch({ headless: true });
try {
  await mcp.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [resolve(app, "../../packages/app/bin/text.ts"), "mcp", app, "--cols", "100", "--rows", "32"],
      env,
    }),
  );
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = await mcp.callTool({ name, arguments: args });
    if (r.isError) throw Error(JSON.stringify(r.content));
    return r.structuredContent as any;
  };
  await call("navigate", { path: "/" });
  await call("wait_for", { text: version });
  const page = await browser.newPage({ viewport: { width: 1640, height: 555 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  await page.route("**/*", (r: any) => r.abort());
  for (const [name, typed, marker] of [
    ["slash", "/model", "Switch model"],
    ["mention", "@readm", "README.md"],
    ["shell", "!pwd", "Shell"],
  ] as const) {
    if (name === "shell") {
      await call("press", { keys: "!" });
      await call("type", { text: "pwd" });
    } else await call("type", { text: typed });
    const f = await call("wait_for", { text: marker, styles: true, trim: false });
    if (f.focus?.id !== "opencode-prompt") throw Error("Lost composer focus");
    await Bun.write(
      resolve(out, `${name}.json.gz`),
      gzipSync(
        JSON.stringify({
          realSGR: await Bun.file(resolve(tmp, `${name}.ansi`)).text(),
          mcp: { cols: f.cols, rows: f.rows, text: f.text, styles: f.styles },
        }),
      ),
    );
    const cells = await Bun.file(resolve(tmp, `${name}.json`)).json();
    await Bun.write(
      resolve(out, `${name}.txt`),
      Array.from(
        { length: 32 },
        (_, i) =>
          cells
            .slice(i * 100, (i + 1) * 100)
            .map((c: any) => c[0])
            .join("") +
          " │ " +
          f.text.split("\n")[i].trimEnd(),
      )
        .map((row) => row.trimEnd())
        .join("\n") + "\n",
    );
    await page.setContent(
      '<body style="margin:0;background:#101010;color:#eee;font:13px/16px monospace"><canvas width="1640" height="555"></canvas></body>',
    );
    await page.evaluate(
      ({ cells, f, version }: any) => {
        const ctx = document.querySelector("canvas")!.getContext("2d")!;
        ctx.font = "13px monospace";
        ctx.fillStyle = "#eee";
        ctx.fillText("OpenCode " + version + " · tmux", 8, 20);
        ctx.fillText("Text.js · console framebuffer", 828, 20);
        const draw = (x: number, y: number, char: string, fg: string, bg: string, attrs: string[] = []) => {
          if (attrs.includes("inverse")) [fg, bg] = [bg, fg];
          ctx.fillStyle = bg?.startsWith("#") ? bg : "#101010";
          ctx.fillRect(x, y, 8, 16);
          ctx.fillStyle = fg?.startsWith("#") ? fg : "#eee";
          ctx.font = (attrs.includes("bold") ? "bold " : "") + "13px monospace";
          ctx.fillText(char, x, y + 13);
        };
        cells.forEach(([c, fg, bg, attr]: any, i: number) => draw(8 + (i % 100) * 8, 30 + Math.floor(i / 100) * 16, c, fg, bg, attr));
        for (const row of f.styles)
          for (const run of row.runs)
            Array.from(run.text as string).forEach((c, i) =>
              draw(828 + (run.x + i) * 8, 30 + row.y * 16, c, run.fg, run.bg, run.attrs),
            );
      },
      { cells, f, version },
    );
    await page.screenshot({ path: resolve(out, `${name}.png`) });
    await call("press", { keys: "escape ctrl+u" });
  }
  // Verify the live wire contract without prompting a model or executing a tool.
  const http = createTransport(endpoint, "capture", {
    authorization: `Basic ${Buffer.from("opencode:" + process.env.OPENCODE_PASSWORD).toString("base64")}`,
  });
  const api = createV2Client(http, "direct");
  await api.agents();
  if ((await api.info()).directory !== resolve(tmp, "project") || (await api.sessions()).length)
    throw Error("Expected empty disposable capture project");
  const seed = await http.json<{ data: Record<string, unknown> }>("POST", "/api/session", {
    title: "Capture seed",
    location: { directory: resolve(tmp, "project") },
  });
  const messages = await Bun.file(resolve(app, "scripts/transcript.json")).json();
  const imported = await http.json<{ data: { id: string } }>("POST", "/api/experimental/session/import", {
    info: { ...seed.data, id: "ses_round3capture", title: "Revert fixture" },
    messages,
    location: { directory: resolve(tmp, "project") },
  });
  const id = imported.data.id,
    first = messages[0].id;
  const fork = await api.fork!(id, first);
  if (fork === id || (await api.messages(fork)).some((m) => m.id === first)) throw Error("Incorrect fork boundary");
  await api.revert!(id, first);
  if ((await api.session(id))?.revertedFrom !== first) throw Error("Revert not staged");
  await api.redo!(id);
  if ((await api.session(id))?.revertedFrom) throw Error("Redo did not clear the boundary");
  const exported = (await api.exportSession!(id)) as { messages?: unknown[] };
  if (!exported.messages?.length) throw Error("Empty export");
  await api.revert!(id, first);
  await api.commitRevert!(id);
  if ((await api.messages(id)).some((m) => m.id === first)) throw Error("Revert not committed");
  console.log("Private V2: verified fork, stage, redo, sanitized export and commit");
} finally {
  await mcp.close();
  await browser.close();
}
