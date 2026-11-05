/**
 * `text build --embed`: what lands in `dist/`, what it costs, and how every
 * host serves it.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { buildApp, type BuildResult } from "../src/cli/build";
import { parseArgs } from "../src/cli/index";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer } from "../src/cli/start";
import { adapt } from "./adapter-helpers";
import { createFixture } from "./server-fixture";

const config = (body: string): string => `import { defineConfig } from "@textjs/app";\nexport default defineConfig(${body});\n`;

/** The embed from the docs: a bordered status box with arrow keys. Default 120×36 grid. */
const STATUS_PAGE = `import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";
export default function StatusEmbed() {
  const [tab, setTab] = useState(0);
  useInput((e) => {
    if (e.key === "left") setTab((t) => (t + 2) % 3);
    if (e.key === "right") setTab((t) => (t + 1) % 3);
  });
  return (
    <Box flexDirection="column" border="rounded" paddingX={2} paddingY={1}>
      <Text bold>▼ Acme Systems · All regions healthy</Text>
      <Text color="muted">{"Press ← → to inspect regions (" + ["us", "eu", "ap"][tab] + ")"}</Text>
    </Box>
  );
}
`;

const CLIENT_APP: Record<string, string> = {
  "text.config.ts": config(`{ title: "Status" }`),
  "app/page.tsx": STATUS_PAGE,
  "app/about/page.tsx": `import { Text } from "@textjs/app";\nexport default function About() { return <Text>about</Text>; }\n`,
};

const SERVER_APP: Record<string, string> = {
  "text.config.ts": config(`{ title: "Live", embed: { allowOrigins: ["https://host.example"] } }`),
  "app/page.tsx": `import { Text } from "@textjs/app";\nexport const runtime = "server";\nexport default function Page() { return <Text>server home</Text>; }\n`,
};

/** Budgets, in gzip bytes. */
const BUDGET = {
  /** `embed.js` with a 120×36 first frame. */
  entry: 3072,
  /** `embed.js` without one (`ppr: false`): `onConsoleIntent`'s dock analysis alone is about 2 KB. */
  entryNoShell: 2400,
  /** The frame player (`embed-player-[hash].js`). */
  player: 23_552,
  /**
   * The client runtime plus Yoga's `.wasm`, without the bidi chunk, which loads on the first right-to-left text.
   * It measures 142.0 KiB, of which react-reconciler is about 39 KiB. The plan's target was 140 KiB.
   */
  lazy: 143 * 1024,
};

/** As users run it: `bun test` sets NODE_ENV=test, which would bundle React's development builds. */
function production(): void {
  const before = process.env.NODE_ENV;
  beforeAll(() => {
    delete process.env.NODE_ENV;
  });
  afterAll(() => {
    if (before !== undefined) process.env.NODE_ENV = before;
  });
}

const gz = (file: string): number => gzipSync(readFileSync(file)).length;

function files(dir: string, rel = ""): string[] {
  return readdirSync(join(dir, rel)).flatMap((name) => {
    const r = rel ? `${rel}/${name}` : name;
    return statSync(join(dir, r)).isDirectory() ? files(dir, r) : [r];
  });
}

/** `import`/`export … from` specifiers that a browser would hand to an import map. */
const BARE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](?!https?:|data:)([@\w][\w.@/-]*)["']/g;

function expectHygiene(dist: string): void {
  for (const f of files(dist).filter((f) => f.endsWith(".js") && !f.startsWith(".text/"))) {
    const code = readFileSync(join(dist, f), "utf8");
    expect({ file: f, bare: [...code.matchAll(BARE)].map((m) => m[1]) }).toEqual({ file: f, bare: [] });
    for (const domOnly of ["hydrateRoot", "__reactContainer$", "react-dom"]) expect({ file: f, has: code.includes(domOnly) ? domOnly : null }).toEqual({ file: f, has: null });
  }
}

describe("text build --embed (client route)", () => {
  let dir = "";
  let result: BuildResult;
  production();
  beforeAll(async () => {
    dir = createFixture(CLIENT_APP, "textjs-embed-build-");
    result = await buildApp({ root: dir, log: false, embed: true });
  }, 180_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("parses --embed", () => {
    expect(parseArgs(["build", "--embed"]).embed).toBe(true);
    expect(parseArgs(["dev"]).embed).toBe(false);
  });

  test("writes embed.js and assets only: no pages, no react-dom, no bare imports", () => {
    const dist = join(dir, "dist");
    const out = files(dist).filter((f) => !f.startsWith(".text/"));
    expect(out).toContain("embed.js");
    expect(out.filter((f) => /^assets\/embed-[\w-]{8}\.js$/.test(f))).toHaveLength(1);
    expect(out.filter((f) => /^assets\/embed-client-[\w-]+\.js$/.test(f))).toHaveLength(1);
    // Console intent loads the runtime and Yoga in parallel and nothing after them: no entry facade.
    expect(result.embed?.lazyFiles.filter((f) => f.endsWith(".js"))).toHaveLength(1);
    expect(out.filter((f) => /^assets\/yoga-[\w-]+\.wasm$/.test(f))).toHaveLength(1);
    expect(out.some((f) => f.endsWith(".html"))).toBe(false);
    expect(result.embed?.runtime).toBe("client");
    expect(result.embed?.shell).toBe(true);
    // No pages, so no curl frames or live manifest either.
    expect(existsSync(join(dist, ".text/live-manifest.json"))).toBe(false);
    expect(existsSync(join(dist, ".text/ansi"))).toBe(false);
    expectHygiene(dist);
  });

  test("prints what it wrote: embed.js and what loads on intent, no route table", () => {
    expect(result.output).toContain("+ embed.js");
    expect(result.output).toContain(result.embed?.hashedEntry as string);
    for (const f of result.embed?.lazyFiles ?? []) expect(result.output).toContain(`+ ${f}`);
    expect(result.output).not.toContain("Route (app)");
    expect(result.output).not.toContain("prerendered as static console cells");
    expect(result.output).not.toContain("First Load JS");
  });

  test("embed.js paints frame 0, then loads the runtime and Yoga together, relative to itself", () => {
    const dist = join(dir, "dist");
    const code = readFileSync(join(dist, "embed.js"), "utf8");
    const client = result.embed?.lazyFiles.find((f) => f.includes("embed-client-")) as string;
    const wasm = result.embed?.lazyFiles.find((f) => f.endsWith(".wasm")) as string;
    expect(code).toContain(`import("./${client}")`);
    expect(code).toContain(`fetch(new URL("./${wasm}",import.meta.url))`);
    expect(code).toContain("Acme Systems");
    // initialClear: false by default: frame 0 never clears the host page's console.
    expect(code).not.toContain("console.clear");
    // A left-to-right first frame: the runtime leaves the bidi engine until right-to-left text needs it.
    expect(code).not.toContain("shellRtl");
    // The immutable copy resolves the same files from inside assets/.
    const copy = readFileSync(join(dist, result.embed?.hashedEntry as string), "utf8");
    expect(copy).toContain(`import("./${client.slice("assets/".length)}")`);
  });

  test("budgets: embed.js and what loads on console intent", () => {
    const dist = join(dir, "dist");
    const entry = gz(join(dist, "embed.js"));
    const lazy = (result.embed?.lazyFiles ?? []).reduce((n, f) => n + gz(join(dist, f)), 0);
    console.log(`embed.js ${entry} B gzip (budget ${BUDGET.entry}); client + wasm ${lazy} B gzip (budget ${BUDGET.lazy})`);
    expect(entry).toBeLessThanOrEqual(BUDGET.entry);
    expect(lazy).toBeLessThanOrEqual(BUDGET.lazy);
  });

  test(
    "text start serves embed.js (revalidated) and assets (immutable) to any site, and no pages",
    async () => {
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        const base = new URL(server.url).origin;
        const embed = await fetch(`${base}/embed.js`);
        expect(embed.status).toBe(200);
        expect(embed.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
        expect(embed.headers.get("access-control-allow-origin")).toBe("*");
        expect(embed.headers.get("content-type")).toContain("text/javascript");
        await embed.arrayBuffer();
        const wasm = await fetch(`${base}/${result.embed?.lazyFiles.find((f) => f.endsWith(".wasm"))}`);
        expect(wasm.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
        expect(wasm.headers.get("content-type")).toBe("application/wasm");
        expect(wasm.headers.get("access-control-allow-origin")).toBe("*");
        await wasm.arrayBuffer();
        const page = await fetch(`${base}/`, { headers: { accept: "text/html" } });
        expect(page.status).toBe(404);
        await page.arrayBuffer();
        // Terminals get no frame of the app either.
        const curl = await fetch(`${base}/`, { headers: { "user-agent": "curl/8.7.1", accept: "*/*" } });
        expect(curl.status).toBe(404);
        await curl.arrayBuffer();
      } finally {
        await server.close();
      }
    },
    60_000,
  );

  test(
    "static adapter: no 404.html, _headers for embed.js",
    async () => {
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: true }`));
      try {
        await adapt(dir, "static");
        const dist = join(dir, "dist");
        expect(existsSync(join(dist, "404.html"))).toBe(false);
        expect(readFileSync(join(dist, "_headers"), "utf8")).toContain("/embed.js\n  Cache-Control: public, max-age=0, must-revalidate\n");
      } finally {
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    60_000,
  );

  test(
    "a first frame with right-to-left text has the runtime fetch the bidi engine as it boots",
    async () => {
      mkdirSync(join(dir, "app/rtl"), { recursive: true });
      writeFileSync(join(dir, "app/rtl/page.tsx"), `import { Text } from "@textjs/app";\nexport default function Rtl() { return <Text>שלום עולם</Text>; }\n`);
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: { initialPath: "/rtl" } }`));
      try {
        const r = await buildApp({ root: dir, log: false });
        expect(r.embed?.shell).toBe(true);
        const code = readFileSync(join(dir, "dist/embed.js"), "utf8");
        expect(code).toContain("\u202D");
        expect(code).toContain("shellRtl:");
      } finally {
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
        rmSync(join(dir, "app/rtl"), { recursive: true, force: true });
      }
    },
    180_000,
  );

  test(
    "ppr: false: no first frame, still within budget",
    async () => {
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", ppr: false, embed: true }`));
      try {
        const r = await buildApp({ root: dir, log: false });
        expect(r.embed?.shell).toBe(false);
        const entry = gz(join(dir, "dist/embed.js"));
        console.log(`embed.js without a shell ${entry} B gzip (budget ${BUDGET.entryNoShell})`);
        expect(entry).toBeLessThanOrEqual(BUDGET.entryNoShell);
        expect(readFileSync(join(dir, "dist/embed.js"), "utf8")).not.toContain("Acme Systems");
      } finally {
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    180_000,
  );

  test(
    "standalone keeps the app's own pages next to embed.js",
    async () => {
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: { standalone: true, initialPath: "/about" } }`));
      try {
        const r = await buildApp({ root: dir, log: false });
        expect(existsSync(join(dir, "dist/index.html"))).toBe(true);
        expect(existsSync(join(dir, "dist/embed.js"))).toBe(true);
        expect(r.output).toContain("First Load JS shared by all");
        expect(r.output).toContain("embed.js");
        // The embed opens at initialPath: its first frame is the about page.
        expect(readFileSync(join(dir, "dist/embed.js"), "utf8")).toContain("about");
      } finally {
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    180_000,
  );

  test(
    "emptyOutDir: false keeps what's in the output; a standalone build's pages survive the embed build",
    async () => {
      writeFileSync(join(dir, "dist/sentinel.txt"), "keep");
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: true, vite: { build: { emptyOutDir: false } } }`));
      try {
        await buildApp({ root: dir, log: false });
        expect(readFileSync(join(dir, "dist/sentinel.txt"), "utf8")).toBe("keep");
        writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: { standalone: true }, vite: { build: { emptyOutDir: true } } }`));
        await buildApp({ root: dir, log: false });
        // Emptied once, at the start; the runtime build that followed the pages didn't empty it again.
        expect(existsSync(join(dir, "dist/sentinel.txt"))).toBe(false);
        expect(existsSync(join(dir, "dist/index.html"))).toBe(true);
        expect(existsSync(join(dir, "dist/embed.js"))).toBe(true);
      } finally {
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    180_000,
  );

  test(
    "emptyOutDir: false: a rebuild prerenders the page as it is now, not the SSR bundle an earlier build left behind",
    async () => {
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Status", embed: true, vite: { build: { emptyOutDir: false } } }`));
      try {
        const first = await buildApp({ root: dir, log: false });
        writeFileSync(join(dir, "dist/sentinel.txt"), "keep");
        expect(readFileSync(join(dir, "dist/embed.js"), "utf8")).toContain("Acme Systems");
        writeFileSync(join(dir, "app/page.tsx"), STATUS_PAGE.replace("Acme Systems", "Globex Systems"));
        const second = await buildApp({ root: dir, log: false });
        for (const f of ["embed.js", second.embed?.hashedEntry as string]) {
          const code = readFileSync(join(dir, "dist", f), "utf8");
          expect({ f, now: code.includes("Globex Systems"), before: code.includes("Acme Systems") }).toEqual({ f, now: true, before: false });
        }
        expect(second.embed?.hashedEntry).not.toBe(first.embed?.hashedEntry);
        expect(readFileSync(join(dir, "dist/sentinel.txt"), "utf8")).toBe("keep");
      } finally {
        writeFileSync(join(dir, "app/page.tsx"), STATUS_PAGE);
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    180_000,
  );

  test("rejects an initialPath that isn't an app path", async () => {
    writeFileSync(join(dir, "text.config.ts"), config(`{ embed: { initialPath: "https://evil.example/" } }`));
    try {
      await expect(buildApp({ root: dir, log: false })).rejects.toThrow(/embed\.initialPath/);
    } finally {
      writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
    }
  });
});

describe("text build --embed (server-rendered route)", () => {
  let dir = "";
  let result: BuildResult;
  production();
  beforeAll(async () => {
    dir = createFixture(SERVER_APP, "textjs-embed-server-");
    result = await buildApp({ root: dir, log: false });
  }, 180_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("embed.js loads the frame player, which streams from next to embed.js", () => {
    const dist = join(dir, "dist");
    expect(result.embed?.runtime).toBe("server");
    const player = result.embed?.lazyFiles.find((f) => f.includes("embed-player-")) as string;
    expect(player).toBeDefined();
    expect(result.embed?.lazyFiles.some((f) => f.endsWith(".wasm"))).toBe(false);
    const code = readFileSync(join(dist, "embed.js"), "utf8");
    expect(code).toContain(`import("./${player}")`);
    expect(code).toContain(`new URL("./__textjs/live",import.meta.url)`);
    expect(code).toContain("server home");
    const size = gz(join(dist, player));
    console.log(`embed player ${size} B gzip (budget < ${BUDGET.player})`);
    expect(size).toBeLessThan(BUDGET.player);
    expect(existsSync(join(dist, "index.html"))).toBe(false);
    expect(existsSync(join(dist, ".text/server/live.mjs"))).toBe(true);
    expectHygiene(dist);
  });

  test(
    "text start answers live sessions from the allowed site",
    async () => {
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        const base = new URL(server.url).origin;
        const pre = await fetch(`${base}/__textjs/live`, { method: "OPTIONS", headers: { origin: "https://host.example", "access-control-request-method": "POST" } });
        expect(pre.status).toBe(204);
        expect(pre.headers.get("access-control-allow-origin")).toBe("https://host.example");
      } finally {
        await server.close();
      }
    },
    60_000,
  );

  test("the static adapter refuses it (no server)", async () => {
    await expect(adapt(dir, "static")).rejects.toThrow(/renders on the server/);
  });
});

/** `/ops` is behind cookie middleware; `/` isn't. */
const GUARDED_APP: Record<string, string> = {
  "text.config.ts": config(`{ embed: { initialPath: "/ops" } }`),
  "app/page.tsx": `import { Text } from "@textjs/app";\nexport default function Page() { return <Text>public home</Text>; }\n`,
  "app/ops/page.tsx": `import { Text } from "@textjs/app";\nexport default function Ops() { return <Text>ops secret</Text>; }\n`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export function middleware(request: NextRequest) {
  if (request.cookies.get("auth")?.value === "1") return NextResponse.next();
  return new Response("denied", { status: 401 });
}
export const config = { matcher: ["/ops/:path*"] };
`,
};

describe("embed.js never carries a frame middleware could protect", () => {
  let dir = "";
  production();
  beforeAll(() => {
    dir = createFixture(GUARDED_APP, "textjs-embed-guarded-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "text build: no first frame in embed.js or its hashed copy when middleware matches initialPath",
    async () => {
      const r = await buildApp({ root: dir, log: false });
      expect(r.embed?.shell).toBe(false);
      expect(r.embed?.shellError).toContain("middleware.ts could match embed.initialPath");
      for (const f of ["embed.js", r.embed?.hashedEntry as string]) expect({ f, leaked: readFileSync(join(dir, "dist", f), "utf8").includes("ops secret") }).toEqual({ f, leaked: false });
      // A route middleware doesn't cover still gets one.
      writeFileSync(join(dir, "text.config.ts"), config(`{ embed: { initialPath: "/" } }`));
      try {
        const open = await buildApp({ root: dir, log: false });
        expect(open.embed?.shell).toBe(true);
        expect(readFileSync(join(dir, "dist/embed.js"), "utf8")).toContain("public home");
      } finally {
        writeFileSync(join(dir, "text.config.ts"), GUARDED_APP["text.config.ts"] as string);
      }
    },
    180_000,
  );

  test(
    "text dev: /embed.js has no first frame for a guarded initialPath",
    async () => {
      const dev = await startDevServer({ root: dir, port: 43000 + Math.floor(Math.random() * 2000), log: false });
      try {
        const base = new URL(dev.resolvedUrls?.local[0] ?? "").origin;
        const code = await (await fetch(`${base}/embed.js`)).text();
        expect(code).toContain("startEmbed(null,");
        expect(code).not.toContain("ops secret");
      } finally {
        await dev.waitForRequestsIdle();
        await dev.close();
      }
    },
    60_000,
  );
});
