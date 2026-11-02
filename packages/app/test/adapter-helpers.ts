import { join } from "node:path";
import { loadTextConfig } from "../src/cli/config";
import { runBuildAdapter } from "../src/server/adapters/build-step";
import { listApiRoutes, scanApp } from "../src/server/scan";

/** Shared by adapters.test.ts and adapters-server.test.ts. */
export async function adapt(dir: string, adapter: "static" | "bun" | "vercel" | "cloudflare") {
  const { config } = await loadTextConfig(dir, "build");
  const scan = scanApp(dir, config.appDir ?? "app");
  return runBuildAdapter({ root: dir, config, outDir: join(dir, "dist"), scan, api: listApiRoutes(scan), adapter, print: () => undefined });
}

export async function waitForLine(stream: ReadableStream<Uint8Array>, re: RegExp, timeoutMs: number): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { done, value } = await Promise.race([reader.read(), new Promise<{ done: true; value: undefined }>((r) => setTimeout(() => r({ done: true, value: undefined }), deadline - Date.now()))]);
    if (done) break;
    text += decoder.decode(value);
    const m = re.exec(text);
    if (m) {
      reader.releaseLock();
      return m[1] as string;
    }
  }
  throw new Error(`timed out waiting for ${re}:\n${text}`);
}
