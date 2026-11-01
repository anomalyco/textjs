/**
 * middleware.ts guards server-rendered routes on every way in: opening a live
 * session, in-session navigation (router.push and Back / Forward), and a
 * session whose credentials changed. Async middleware must not break live
 * input either.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { loadTextConfig } from "../src/cli/config";
import { startProductionServer, type StartedServer } from "../src/cli/start";
import { runBuildAdapter } from "../src/server/adapters/build-step";
import { listApiRoutes, scanApp } from "../src/server/scan";
import { createFixture, LIVE_AUTH_APP, openLiveStream, until } from "./server-fixture";

const frames = (s: { messages: Array<Record<string, unknown>> }) => JSON.stringify(s.messages.filter((m) => m.t === "f"));
const input = (base: string, sid: string, events: unknown[], cookie?: string) =>
  fetch(`${base}/__textjs/live`, { method: "POST", headers: { "content-type": "application/json", "x-textjs-live": sid, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(events) });
const key = (k: string) => ({ type: "key", key: k, input: k });

async function exerciseLiveAuth(base: string): Promise<void> {
  // Opening a protected route without credentials streams nothing: the browser is sent to the document (middleware redirects it).
  const denied = await openLiveStream(base, "path=/ops&cols=40&rows=4");
  await until(() => denied.messages.length > 0);
  await new Promise((r) => setTimeout(r, 100));
  expect(denied.messages).toEqual([{ t: "load", href: "/ops" }]);
  denied.close();

  const allowed = await openLiveStream(base, "path=/ops&cols=40&rows=4", { cookie: "auth=1" });
  await until(() => frames(allowed).includes("secret"));
  allowed.close();

  // Async middleware (matching the live endpoint) must leave the input body intact.
  const home = await openLiveStream(base, "path=/&cols=40&rows=4");
  await until(() => frames(home).includes("home 0"));
  const sid = (home.messages.find((m) => m.t === "hello") as { sid: string }).sid;
  expect((await input(base, sid, [key("+")])).status).toBe(204);
  await until(() => frames(home).includes("home 1"));

  // In-session navigation to the protected route: a document load, never a render.
  expect((await input(base, sid, [key("o")])).status).toBe(204);
  await until(() => home.messages.some((m) => m.t === "load"));
  expect(home.messages.find((m) => m.t === "load")).toEqual({ t: "load", href: "/ops" });
  expect(frames(home)).not.toContain("secret");
  home.close();

  // Back / Forward onto the protected route.
  const back = await openLiveStream(base, "path=/&cols=40&rows=4");
  await until(() => frames(back).includes("home"));
  const sid2 = (back.messages.find((m) => m.t === "hello") as { sid: string }).sid;
  await input(base, sid2, [{ type: "nav", href: "/ops" }]);
  await until(() => back.messages.some((m) => m.t === "load"));
  expect(frames(back)).not.toContain("secret");
  back.close();

  // A session opened with credentials can't be driven after they're gone.
  const authed = await openLiveStream(base, "path=/ops&cols=40&rows=4", { cookie: "auth=1" });
  await until(() => frames(authed).includes("secret"));
  const sid3 = (authed.messages.find((m) => m.t === "hello") as { sid: string }).sid;
  expect((await input(base, sid3, [key("x")], "auth=1")).status).toBe(204);
  expect((await input(base, sid3, [key("x")])).status).toBe(403);
  expect((await input(base, sid3, [key("x")], "auth=1")).status).toBe(410);
  authed.close();
}

describe("middleware guards server-rendered routes", () => {
  let dir = "";
  beforeAll(() => {
    dir = createFixture(LIVE_AUTH_APP, "textjs-live-auth-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "text dev",
    async () => {
      const server: ViteDevServer = await startDevServer({ root: dir, port: 39000 + Math.floor(Math.random() * 500), log: false });
      try {
        await exerciseLiveAuth((server.resolvedUrls?.local[0] ?? "").replace(/\/$/, ""));
      } finally {
        await server.waitForRequestsIdle();
        await server.close();
      }
    },
    60_000,
  );

  test(
    "text start",
    async () => {
      await buildApp({ root: dir, log: false });
      const server: StartedServer = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        await exerciseLiveAuth(server.url);
      } finally {
        await server.close();
      }
    },
    120_000,
  );

  test(
    "bun adapter",
    async () => {
      const { config } = await loadTextConfig(dir, "build");
      const scan = scanApp(dir, "app");
      await runBuildAdapter({ root: dir, config, outDir: join(dir, "dist"), scan, api: listApiRoutes(scan), adapter: "bun", print: () => undefined });
      const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const reader = proc.stdout.getReader();
        let text = "";
        while (!/ready on (http:\/\/\S+)/.test(text)) {
          const { value, done } = await reader.read();
          if (done) throw new Error(text);
          text += new TextDecoder().decode(value);
        }
        reader.releaseLock();
        await exerciseLiveAuth((/ready on (http:\/\/\S+)/.exec(text)?.[1] as string).replace(/\/$/, ""));
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );
});
