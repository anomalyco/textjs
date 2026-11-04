import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateYoga, OUTPUTS } from "../scripts/gen-yoga-wasm";
import { isTextJsError } from "../src";
import { instantiateYoga, type YogaWasmSource } from "../src/yoga-wasm";

const CORE = join(import.meta.dir, "..");
const WASM = readFileSync(OUTPUTS.wasm);

function layoutWidth(yoga: Awaited<ReturnType<typeof instantiateYoga>>): number {
  const root = yoga.Node.create();
  const child = yoga.Node.create();
  root.setWidth(80);
  child.setWidth("25%");
  root.insertChild(child, 0);
  root.calculateLayout();
  const width = child.getComputedWidth();
  root.freeRecursive();
  return width;
}

describe("yoga.wasm", () => {
  test("yoga.wasm, yoga-glue.ts and yoga-enums.ts match the installed yoga-layout", () => {
    const out = generateYoga();
    expect(Buffer.compare(Buffer.from(out.wasm), WASM)).toBe(0);
    expect(readFileSync(OUTPUTS.glue, "utf8")).toBe(out.glue);
    expect(readFileSync(OUTPUTS.enums, "utf8")).toBe(out.enums);
    expect(out.glue).not.toContain("AGFzbQ");
    expect(out.glue).not.toContain("import.meta");
  });

  test("instantiates from bytes, a compiled module and responses", async () => {
    const sources: YogaWasmSource[] = [
      new Uint8Array(WASM),
      WASM.buffer.slice(WASM.byteOffset, WASM.byteOffset + WASM.byteLength),
      await WebAssembly.compile(WASM),
      new Response(WASM, { headers: { "content-type": "application/wasm" } }),
      Promise.resolve(new Response(WASM)),
    ];
    for (const source of sources) expect(layoutWidth(await instantiateYoga(source))).toBe(20);
  });

  describe("over HTTP", () => {
    let server: ReturnType<typeof Bun.serve>;
    beforeAll(() => {
      server = Bun.serve({
        hostname: "127.0.0.1",
        port: 0,
        fetch(req) {
          const path = new URL(req.url).pathname;
          if (path === "/yoga.wasm") return new Response(WASM, { headers: { "content-type": "application/wasm" } });
          // Static hosts that don't know .wasm.
          if (path === "/octet/yoga.wasm") return new Response(WASM, { headers: { "content-type": "application/octet-stream" } });
          return new Response("not found", { status: 404 });
        },
      });
    });
    afterAll(() => server.stop(true));

    test("streams a URL, and falls back to the bytes without Content-Type: application/wasm", async () => {
      expect(layoutWidth(await instantiateYoga(`${server.url}yoga.wasm`))).toBe(20);
      expect(layoutWidth(await instantiateYoga(new URL("/octet/yoga.wasm", server.url)))).toBe(20);
    });

    test("a failed request is TX032 with the URL and status", async () => {
      const url = `${server.url}assets/missing.wasm`;
      const error = await instantiateYoga(url).catch((e: unknown) => e);
      expect(isTextJsError(error) && error.code).toBe("TX032");
      expect((error as Error).message).toContain(`from ${url} (HTTP 404)`);
    });
  });
});

describe("plain Vite, without the Text.js plugin", () => {
  let dir = "";
  beforeAll(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "textjs-yoga-vite-")));
    mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
    symlinkSync(CORE, join(dir, "node_modules/@textjs/core"));
    writeFileSync(join(dir, "index.html"), `<!doctype html><script type="module" src="/main.ts"></script>`);
    writeFileSync(join(dir, "main.ts"), `import { initYoga } from "@textjs/core";\nconsole.log(await initYoga());\n`);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("vite build emits yoga.wasm as a hashed asset", async () => {
    const { build } = await import("vite");
    await build({ root: dir, configFile: false, logLevel: "silent", build: { target: "es2022" } });
    const assets = readdirSync(join(dir, "dist/assets"));
    const wasm = assets.find((f) => /^yoga-[\w-]+\.wasm$/.test(f)) as string;
    expect(wasm).toBeDefined();
    expect(Buffer.compare(readFileSync(join(dir, "dist/assets", wasm)), WASM)).toBe(0);
    const js = assets.filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(dir, "dist/assets", f), "utf8")).join("\n");
    expect(js).toContain(`new URL("/assets/${wasm}",import.meta.url)`);
    expect(js).not.toContain("AGFzbQ");
  }, 60_000);

  test("vite dev serves yoga.wasm from a pre-bundled @textjs/core", async () => {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: dir,
      configFile: false,
      logLevel: "silent",
      // @textjs/core is symlinked from outside the app here (installed packages sit in its node_modules).
      server: { middlewareMode: true, hmr: false, fs: { allow: [dir, CORE] } },
      optimizeDeps: { include: ["@textjs/core"], force: true },
    });
    let http: Server | null = null;
    try {
      http = createHttpServer(vite.middlewares);
      await new Promise<void>((resolve) => http?.listen(0, "127.0.0.1", resolve));
      const origin = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
      const main = (await vite.transformRequest("/main.ts"))?.code ?? "";
      const dep = /from\s*"([^"]*\.vite\/deps\/@textjs_core\.js[^"]*)"/.exec(main)?.[1];
      expect(dep).toBeDefined();
      const depUrl = new URL(dep as string, origin);
      const code = await (await fetch(depUrl)).text();
      const ref = /new URL\(\s*"([^"]*yoga[^"]*\.wasm[^"]*)"\s*,\s*import\.meta\.url\s*\)/.exec(code)?.[1];
      expect(ref).toBeDefined();
      const res = await fetch(new URL(ref as string, depUrl));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/wasm");
      expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), WASM)).toBe(0);
    } finally {
      await new Promise<void>((resolve) => (http ? http.close(() => resolve()) : resolve()));
      await vite.close();
    }
  }, 60_000);
});
