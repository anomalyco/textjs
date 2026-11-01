// Starts one ephemeral static preview. Each browser closes before the next
// one starts. All local OpenCode traffic is either blocked or our mock only.
import { preview } from "vite";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const app = fileURLToPath(new URL("..", import.meta.url)),
  web = resolve(app, "../web");
const server = await preview({ root: web, preview: { port: 0, host: "127.0.0.1" } });
try {
  const port = server.httpServer.address().port;
  if ([4173, 4096, 49374].includes(port)) throw Error("Reserved port selected");
  const env = { ROUTES: "/opencode", FILMSTRIP: "0", ...process.env, BASE: `http://127.0.0.1:${port}` };
  async function run(command, args, cwd) {
    await new Promise((res, rej) => {
      const proc = spawn(command, args, { cwd, env, stdio: "inherit", timeout: 180000 });
      proc.on("error", rej);
      proc.on("exit", (code) => (code === 0 ? res() : rej(Error(`${args.join(" ")}: ${code}`))));
    });
  }
  await run(process.execPath, ["scripts/e2e-keys.mjs"], web);
  await run(process.execPath, ["scripts/e2e-examples.mjs"], web);
  for (const name of ["e2e-layout", "e2e-eggs", "cls"]) await run(process.execPath,[`scripts/${name}.mjs`],web);
  await run("bun", ["scripts/devtools-live.ts"], app);
} finally {
  await server.close();
}
