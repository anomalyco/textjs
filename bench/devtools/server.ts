import { fileURLToPath } from "node:url";

export interface BenchServer {
  port: number;
  url: string;
  stop(): void;
}

const HTML_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Text.js DevTools Console Benchmark</title>
  <style>
    body {
      background: #09090b;
      color: #e4e4e7;
      font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;
      padding: 24px;
      margin: 0;
    }
    h1 { font-size: 16px; margin: 0 0 8px; color: #fafafa; }
    #status { font-size: 13px; color: #22c55e; }
  </style>
</head>
<body>
  <h1>▼ Text.js DevTools Console Flicker &amp; CPU Benchmark</h1>
  <div id="status">Initializing Yoga WASM &amp; CssConsoleDriver...</div>
  <script type="module" src="/bundle.js"></script>
</body>
</html>
`;

export async function startBenchServer(port = 0): Promise<BenchServer> {
  const entry = fileURLToPath(new URL("./client.ts", import.meta.url));
  const build = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "esm",
    minify: false,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  if (!build.success || !build.outputs[0]) {
    const logs = build.logs.map((l) => l.message).join("\n");
    throw new Error(`Failed to bundle bench/devtools/client.ts:\n${logs}`);
  }

  const bundleCode = await build.outputs[0].text();

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/bundle.js") {
        return new Response(bundleCode, {
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }
      if (url.pathname === "/doom.wasm" || url.pathname === "/doom.wad") {
        const defaultPath = fileURLToPath(
          new URL(
            url.pathname === "/doom.wasm"
              ? "../../apps/web/src/demos/doom/engine/out/doom.wasm"
              : "../../apps/web/public/doom/DOOM1.WAD",
            import.meta.url,
          ),
        );
        const assetPath = process.env[url.pathname === "/doom.wasm" ? "DOOM_WASM" : "DOOM_WAD"] ?? defaultPath;
        return new Response(Bun.file(assetPath), {
          headers: { "content-type": url.pathname === "/doom.wasm" ? "application/wasm" : "application/octet-stream" },
        });
      }
      if (url.pathname === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }
      return new Response(HTML_PAGE, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    },
  });

  return {
    port: server.port,
    url: `http://127.0.0.1:${server.port}`,
    stop() {
      server.stop(true);
    },
  };
}
