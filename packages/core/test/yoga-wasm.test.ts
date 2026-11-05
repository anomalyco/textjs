import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { generateYoga, OUTPUTS } from "../scripts/gen-yoga-wasm";
import { isTextJsError } from "../src";
import { instantiateYoga, type YogaWasmSource } from "../src/yoga-wasm";

const CORE = join(import.meta.dir, "..");
const WASM = readFileSync(OUTPUTS.wasm);
const CONDITION = "@textjs/client";
/** A valid module that isn't Yoga: it instantiates, then Yoga's loader can't find its exports. */
const NOT_YOGA = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

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

async function rejection(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => new Error("resolved"),
    (e: unknown) => e,
  );
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

  test("a module that isn't Yoga rejects instead of hanging", async () => {
    const error = await rejection(instantiateYoga(NOT_YOGA));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toBe("resolved");
  });

  test("initYoga rejects a bad module, then loads on the next call", async () => {
    // A fresh copy of layout.ts: other test files may already have loaded Yoga in this process.
    const spec = `../src/layout.ts?retry=${Date.now()}`;
    const layout = (await import(spec)) as typeof import("../src/layout");
    expect(await rejection(layout.initYoga({ wasm: NOT_YOGA }))).toBeInstanceOf(Error);
    expect(layout.isYogaReady()).toBe(false);
    const yoga = await layout.initYoga({ wasm: WASM });
    expect(layout.isYogaReady()).toBe(true);
    expect(layout.getYogaConfig()).toBeDefined();
    expect(layoutWidth(yoga)).toBe(20);
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
          // A single-page app's HTML fallback.
          if (path === "/spa/yoga.wasm") return new Response("<!doctype html><title>app</title>", { headers: { "content-type": "text/html; charset=utf-8" } });
          return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
        },
      });
    });
    afterAll(() => server.stop(true));

    test("streams application/wasm, and compiles the bytes of any other type", async () => {
      expect(layoutWidth(await instantiateYoga(`${server.url}yoga.wasm`))).toBe(20);
      expect(layoutWidth(await instantiateYoga(new URL("/octet/yoga.wasm", server.url)))).toBe(20);
    });

    test("an error status or an HTML fallback is TX032 with the URL and content type", async () => {
      const missing = `${server.url}assets/missing.wasm`;
      const notFound = await rejection(instantiateYoga(missing));
      expect(isTextJsError(notFound) && notFound.code).toBe("TX032");
      expect((notFound as Error).message).toContain(`from ${missing} (HTTP 404, Content-Type text/plain)`);
      const spa = `${server.url}spa/yoga.wasm`;
      const html = await rejection(instantiateYoga(spa));
      expect(isTextJsError(html) && html.code).toBe("TX032");
      expect((html as Error).message).toContain(`from ${spa} (`);
      expect((html as Error).message).toContain("Content-Type text/html");
    });
  });
});

describe("zero-config bundles use the inline copy", () => {
  let dir = "";
  beforeAll(() => {
    dir = realpathSync.native(mkdtempSync(join(tmpdir(), "textjs-yoga-bundle-")));
    writeFileSync(
      join(dir, "entry.ts"),
      `import { createYogaNode, initYoga } from ${JSON.stringify(join(CORE, "src/index.ts"))};
export async function width(): Promise<number> {
  await initYoga();
  const root = createYogaNode();
  root.setWidth(80);
  const child = createYogaNode();
  child.setWidth("25%");
  root.insertChild(child, 0);
  root.calculateLayout();
  return child.getComputedWidth();
}
`,
    );
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  async function run(file: string, code: string): Promise<number> {
    expect(code).toContain("AGFzbQ");
    expect(code).not.toContain("yoga.wasm");
    writeFileSync(join(dir, file), code);
    return ((await import(pathToFileURL(join(dir, file)).href)) as { width(): Promise<number> }).width();
  }

  test("esbuild, platform browser", async () => {
    const esbuild = createRequire(createRequire(import.meta.url).resolve("vite")).resolve("esbuild");
    const { build } = (await import(esbuild)) as typeof import("esbuild");
    const out = await build({ entryPoints: [join(dir, "entry.ts")], bundle: true, platform: "browser", format: "esm", write: false, logLevel: "silent" });
    expect(await run("esbuild.mjs", out.outputFiles[0]?.text ?? "")).toBe(20);
  }, 30_000);

  test("Bun.build, target browser", async () => {
    const out = await Bun.build({ entrypoints: [join(dir, "entry.ts")], target: "browser", format: "esm" });
    expect(out.success).toBe(true);
    expect(await run("bun.mjs", (await out.outputs[0]?.text()) ?? "")).toBe(20);
  }, 30_000);
});

describe("plain Vite, without the Text.js plugin", () => {
  let dir = "";
  beforeAll(() => {
    dir = realpathSync.native(mkdtempSync(join(tmpdir(), "textjs-yoga-vite-")));
    mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
    symlinkSync(CORE, join(dir, "node_modules/@textjs/core"));
    writeFileSync(join(dir, "index.html"), `<!doctype html><script type="module" src="/main.ts"></script>`);
    writeFileSync(join(dir, "main.ts"), `import { initYoga } from "@textjs/core";\nconsole.log(await initYoga());\n`);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  async function viteBuild(conditions?: string[]): Promise<{ wasm?: string; js: string }> {
    const { build, defaultClientConditions } = await import("vite");
    rmSync(join(dir, "dist"), { recursive: true, force: true });
    await build({ root: dir, configFile: false, logLevel: "silent", build: { target: "es2022" }, ...(conditions ? { resolve: { conditions: [...conditions, ...defaultClientConditions] } } : {}) });
    const assets = readdirSync(join(dir, "dist/assets"));
    const js = assets.filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(dir, "dist/assets", f), "utf8")).join("\n");
    return { wasm: assets.find((f) => /^yoga-[\w-]+\.wasm$/.test(f)), js };
  }

  test("vite build keeps Yoga inline by default", async () => {
    const out = await viteBuild();
    expect(out.wasm).toBeUndefined();
    expect(out.js).toContain("AGFzbQ");
  }, 60_000);

  test("vite build with the @textjs/client condition emits yoga.wasm as a hashed asset", async () => {
    const out = await viteBuild([CONDITION]);
    expect(out.wasm).toBeDefined();
    expect(Buffer.compare(readFileSync(join(dir, "dist/assets", out.wasm as string)), WASM)).toBe(0);
    expect(out.js).toContain(`new URL("/assets/${out.wasm}",import.meta.url)`);
    expect(out.js).not.toContain("AGFzbQ");
  }, 60_000);

  test("vite dev with the condition serves yoga.wasm from a pre-bundled @textjs/core", async () => {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: dir,
      configFile: false,
      logLevel: "silent",
      // @textjs/core is symlinked from outside the app here (installed packages sit in its node_modules).
      server: { middlewareMode: true, hmr: false, fs: { allow: [dir, CORE] } },
      resolve: { conditions: [CONDITION, "module", "browser", "development|production"] },
      optimizeDeps: { include: ["@textjs/core"], force: true, esbuildOptions: { conditions: [CONDITION] } },
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
      expect(code).not.toContain("AGFzbQ");
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
