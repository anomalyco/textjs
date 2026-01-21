import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteDevServer } from "vite";
import { CellBuffer } from "@textjs/core";
import { startDevServer } from "../src/cli/dev";
import { LIVE_PATH, LIVE_SESSION_HEADER, LiveFrameDecoder, type LiveFrame, type LiveServerMessage } from "../src/live-protocol";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

let dir = "";
let server: ViteDevServer;
let base = "";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, timeout = 10_000): Promise<void> {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await sleep(20);
  }
}

const SERVER_PAGE = (greeting: string): string => `import { Suspense } from "react";
import os from "node:os";
import { Box, Text, useInput } from "@textjs/next";
import { useRouter } from "@textjs/next/navigation";
import { secret } from "../../lib/secret.server";

export const runtime = "server";
export const metadata = { title: "Ops" };

async function Host() {
  await new Promise((r) => setTimeout(r, 60));
  return <Text>{"cpus " + os.cpus().length + " " + secret()}</Text>;
}

export default function Page() {
  const router = useRouter();
  useInput((e) => { if (e.input === "h") router.push("/"); });
  return (
    <Box flexDirection="column">
      <Text>${greeting}</Text>
      <Suspense fallback={<Text>loading host</Text>}><Host /></Suspense>
    </Box>
  );
}
`;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "textjs-live-dev-"));
  mkdirSync(join(dir, "app/ops"), { recursive: true });
  mkdirSync(join(dir, "lib"), { recursive: true });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/@textjs/next"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "live-fixture", type: "module", private: true }));
  writeFileSync(join(dir, "text.config.ts"), 'import { defineConfig } from "@textjs/next";\nexport default defineConfig({ title: "Live Fixture" });\n');
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport default function Page() { return <Text>client home</Text>; }\n');
  writeFileSync(join(dir, "lib/secret.server.ts"), 'export const secret = () => "sk_live_DO_NOT_SHIP";\n');
  writeFileSync(join(dir, "app/ops/page.tsx"), SERVER_PAGE("ops v1"));
  server = await startDevServer({ root: dir, port: 36000 + Math.floor(Math.random() * 2000), host: "127.0.0.1", log: false });
  base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
}, 30_000);

afterAll(async () => {
  await server?.close();
  rmSync(dir, { recursive: true, force: true });
});

async function stream(query: string): Promise<{ messages: LiveServerMessage[]; text(): string; close(): void }> {
  const ctrl = new AbortController();
  const res = await fetch(`${base}${LIVE_PATH}?${query}`, { signal: ctrl.signal });
  const messages: LiveServerMessage[] = [];
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const dec = new TextDecoder();
  let buf = "";
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          for (const line of buf.slice(0, i).split("\n")) if (line.startsWith("data: ")) messages.push(JSON.parse(line.slice(6)) as LiveServerMessage);
          buf = buf.slice(i + 2);
        }
      }
    } catch {
      // aborted
    }
  })();
  return {
    messages,
    text() {
      const b = new CellBuffer(0, 0);
      const d = new LiveFrameDecoder();
      for (const m of messages) if (m.t === "f") d.apply(b, m as LiveFrame);
      return b.toPlainString(true);
    },
    close: () => ctrl.abort(),
  };
}

describe("text dev: server-rendered routes", () => {
  test("serves the frame player document for server routes only", async () => {
    const html = await (await fetch(`${base}/ops`, { headers: { accept: "text/html" } })).text();
    expect(html).toContain('data-textjs-runtime="server"');
    expect(html).toContain('src="/@textjs/player"');
    expect(html).toContain("/@vite/client");
    const client = await (await fetch(`${base}/`, { headers: { accept: "text/html" } })).text();
    expect(client).not.toContain("data-textjs-runtime");
    const player = await (await fetch(`${base}/@textjs/player`)).text();
    expect(player).toContain("bootFramePlayer");
  });

  test("the client manifest stubs server pages (their modules never reach the browser)", async () => {
    const routes = await (await fetch(`${base}/@id/__x00__virtual:textjs/routes`)).text();
    expect(routes).toContain("textjs-server-stub");
    expect(routes).not.toMatch(/"\/@fs[^"]*app\/ops\/page\.tsx"/);
    const stub = routes.match(/"(\/@id\/__x00__textjs-server-stub:[^"]+)"/)?.[1] as string;
    const code = await (await fetch(`${base}${stub}`)).text();
    expect(code).toContain("live-stub");
    expect(code).not.toContain("secret");
  });

  test("async server components with node:* and server-only modules stream; edits re-render live sessions", async () => {
    const s = await stream("path=/ops&cols=60&rows=8");
    await until(() => s.text().includes("sk_live_DO_NOT_SHIP"));
    expect(s.text()).toContain("ops v1");
    expect(s.text()).toMatch(/cpus \d+/);
    expect(s.messages.some((m) => m.t === "title" && m.title === "Ops")).toBe(true);

    writeFileSync(join(dir, "app/ops/page.tsx"), SERVER_PAGE("ops v2"));
    await until(() => s.text().includes("ops v2"));
    await until(() => s.text().includes("sk_live_DO_NOT_SHIP"));

    // Navigating to a client route hands the document back to the browser.
    const sid = (s.messages.find((m) => m.t === "hello") as { sid: string }).sid;
    const r = await fetch(`${base}${LIVE_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sid },
      body: JSON.stringify([{ type: "key", key: "h", input: "h" }]),
    });
    expect(r.status).toBe(204);
    await until(() => s.messages.some((m) => m.t === "load" && m.href === "/"));
    s.close();
    writeFileSync(join(dir, "app/ops/page.tsx"), SERVER_PAGE("ops v1"));
  }, 30_000);

  test("switching a page's runtime swaps the client stub", async () => {
    writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport const runtime = "server";\nexport default function Page() { return <Text>server home</Text>; }\n');
    let html = "";
    for (let i = 0; i < 100 && !html.includes("data-textjs-runtime"); i++) {
      await sleep(50);
      html = await (await fetch(`${base}/`, { headers: { accept: "text/html" } })).text();
    }
    expect(html).toContain('data-textjs-runtime="server"');
    const routes = await (await fetch(`${base}/@id/__x00__virtual:textjs/routes`)).text();
    expect(routes.match(/textjs-server-stub/g)?.length).toBeGreaterThanOrEqual(2);
    expect(readFileSync(join(dir, "app/page.tsx"), "utf8")).toContain("server home");
  }, 30_000);
});
