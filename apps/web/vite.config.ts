import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { API_PREFIX, CALLBACK_PATH, handleTerminal, type SessionConfig } from "./server/terminal-session";

/**
 * `vite dev` / `vite preview` run the same handler as the Pages Functions in `functions/`
 * (Terminal sign in + API proxy), configured from `process.env` (`TERMINAL_CLIENT_ID`, …).
 */
function terminalFunctions(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void): void => {
    const path = (req.url ?? "/").split("?")[0] ?? "/";
    if (path !== CALLBACK_PATH && path !== API_PREFIX && !path.startsWith(`${API_PREFIX}/`)) return next();
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const method = (req.method ?? "GET").toUpperCase();
      const body = method === "GET" || method === "HEAD" ? undefined : Buffer.concat(chunks);
      const response = await handleTerminal(new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, { method, headers, body }), process.env as SessionConfig);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") res.setHeader(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader("set-cookie", cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    })().catch(next);
  };
  return {
    name: "textjs-terminal-functions",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

/**
 * `vite preview` serves the prerendered pages like the static host does: `/docs/routing` gets
 * `dist/docs/routing.html`, unknown paths get `dist/404.html` with a 404 status.
 */
function prerenderedPages(): Plugin {
  return {
    name: "textjs-prerendered-pages",
    configurePreviewServer(server) {
      const dist = server.config.build.outDir;
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "/").split(/[?#]/)[0] ?? "/";
        if (req.method !== "GET" || /\.[a-z0-9]+$/i.test(path)) return next();
        const parts = path.split("/").filter((s) => s && s !== "." && s !== "..");
        const page = parts.length === 0 ? join(dist, "index.html") : `${join(dist, ...parts)}.html`;
        const file = existsSync(page) ? page : join(dist, "404.html");
        if (!existsSync(file)) return next();
        res.statusCode = file === page ? 200 : 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), terminalFunctions(), prerenderedPages()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // Yoga 3.2 ships its WebAssembly inlined as base64 inside the engine chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            manualChunks(id) {
              if (id.includes("yoga-layout")) return "yoga";
              if (/node_modules\/(react|react-dom|scheduler|react-reconciler)\//.test(id)) return "react";
              if (id.includes("/packages/core/") || id.includes("/packages/react/")) return "turbolog";
              return undefined;
            },
          },
    },
  },
  // The build-time prerenderer bundles the workspace packages (TypeScript sources) and keeps React external.
  ssr: { noExternal: [/^@textjs\//, "@textjs/next"] },
  server: { port: 3000 },
  preview: { port: 3000 },
}));
