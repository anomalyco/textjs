import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../src/cli/build";
import { createFixture, LIVE_APP, openLiveStream, STATIC_APP, until } from "./server-fixture";
import { adapt, waitForLine } from "./adapter-helpers";

describe("static adapter", () => {
  let dir = "";
  beforeAll(() => {
    dir = createFixture(STATIC_APP, "textjs-static-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "prerenders force-static GET handlers and adds the SPA 404 fallback",
    async () => {
      const result = await buildApp({ root: dir, log: false, adapter: "static" });
      expect(result.adapter?.adapter).toBe("static");
      expect(result.output).toContain("Prerendered 1 route handler: /api/feed.json");
      const dist = join(dir, "dist");
      expect(JSON.parse(readFileSync(join(dist, "api/feed.json"), "utf8"))).toEqual({ items: [1, 2], query: "" });
      expect(readFileSync(join(dist, "404.html"), "utf8")).toBe(readFileSync(join(dist, "index.html"), "utf8"));
      expect(existsSync(join(dist, ".text/server"))).toBe(false);
    },
    120_000,
  );
});

describe("server-rendered routes and adapters", () => {
  let dir = "";
  beforeAll(async () => {
    dir = createFixture(LIVE_APP, "textjs-live-adapters-");
    await buildApp({ root: dir, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("static, vercel and cloudflare refuse them with TX030 / a listed reason", async () => {
    await expect(adapt(dir, "static")).rejects.toThrow(/\/ops: renders on the server/);
    await expect(adapt(dir, "vercel")).rejects.toThrow(/TX030[\s\S]*\/ops[\s\S]*vercel adapter/);
    await expect(adapt(dir, "cloudflare")).rejects.toThrow(/TX030[\s\S]*cloudflare adapter/);
    expect(existsSync(join(dir, "dist/.text/server/live.mjs"))).toBe(true);
  }, 60_000);

  test("the live manifest's paths use / on every OS, so dist/ deploys from a Windows build", () => {
    const manifest = JSON.parse(readFileSync(join(dir, "dist/.text/live-manifest.json"), "utf8")) as { pages: Record<string, string>; liveHtml: string | null };
    expect(Object.keys(manifest.pages).length).toBeGreaterThan(0);
    for (const file of [...Object.values(manifest.pages), manifest.liveHtml ?? ""]) expect(file).not.toContain("\\");
    expect(manifest.liveHtml).toBe(".text/live.html");
  });

  test(
    "bun: dist/server.js hosts live sessions",
    async () => {
      await adapt(dir, "bun");
      const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const url = await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000);
        const doc = await (await fetch(`${url}/ops`, { headers: { accept: "text/html" } })).text();
        expect(doc).toContain('data-textjs-runtime="server"');
        const live = await openLiveStream(url, "path=/ops&cols=40&rows=4");
        expect(live.status).toBe(200);
        const frames = () => JSON.stringify(live.messages.filter((m) => m.t === "f"));
        await until(() => frames().includes("server"));
        const sid = (live.messages.find((m) => m.t === "hello") as { sid: string }).sid;
        const input = await fetch(`${url}/__textjs/live`, { method: "POST", headers: { "content-type": "application/json", "x-textjs-live": sid }, body: JSON.stringify([{ type: "key", key: "+", input: "+" }]) });
        expect(input.status).toBe(204);
        const count = live.messages.length;
        await until(() => live.messages.length > count && live.messages.slice(count).some((m) => m.t === "f"));
        live.close();
        const client = await openLiveStream(url, "path=/");
        await until(() => client.messages.some((m) => m.t === "load"));
        client.close();
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );
});
