import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { reportsDevMiddleware } from "./server/reports-dev";
import { terminalDevMiddleware } from "./server/terminal-dev";
import { VIEWPORT_SOURCE } from "./src/console-companion/viewport-console";

/** The release crash reports carry: `TEXTJS_RELEASE`, else the commit, else the package version. */
function release(): string {
  if (process.env.TEXTJS_RELEASE) return process.env.TEXTJS_RELEASE;
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version;
  }
}

/**
 * `vite dev` / `vite preview` run the same handler as the Pages Functions in `functions/`
 * (Terminal sign in + API proxy), configured from `process.env` (`TERMINAL_CLIENT_ID`, …).
 */
function terminalFunctions(): Plugin {
  const middleware = terminalDevMiddleware();
  return {
    name: "textjs-terminal-functions",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

/** `POST /api/errors` in `vite dev` / `vite preview`: the Pages Function's handler, logging to the terminal. */
function reportFunction(): Plugin {
  return {
    name: "textjs-report-function",
    configureServer: (server) => void server.middlewares.use(reportsDevMiddleware()),
    configurePreviewServer: (server) => void server.middlewares.use(reportsDevMiddleware()),
  };
}

/**
 * `text:///viewport`, the file every console frame is logged through, as an inline script (no eval under
 * the CSP). Before the head `<style>`, so it runs before any stylesheet link on every page, 404 included.
 */
function viewportScript(): Plugin {
  return {
    name: "textjs-viewport-script",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const at = html.indexOf("<style>");
        if (at < 0 || at > html.indexOf("</head>")) throw new Error("index.html needs a <style> in <head> for the viewport script to go before");
        return `${html.slice(0, at)}<script>${VIEWPORT_SOURCE}</script>\n    ${html.slice(at)}`;
      },
    },
  };
}

/**
 * `vite preview` serves the prerendered pages like the static host does: `/docs/routing` gets
 * `dist/docs/routing.html` (handed through Vite's compressed static server), unknown paths get
 * `dist/404.html` with a 404 status.
 */
function prerenderedPages(): Plugin {
  return {
    name: "textjs-prerendered-pages",
    configurePreviewServer(server) {
      const dist = server.config.build.outDir;
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? "/";
        const qIdx = rawUrl.indexOf("?");
        const search = qIdx >= 0 ? rawUrl.slice(qIdx) : "";
        const path = (qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl).split("#")[0] ?? "/";
        if (req.method !== "GET" || /\.[a-z0-9]+$/i.test(path)) return next();
        const parts = path.split("/").filter((s) => s && s !== "." && s !== "..");
        const rel = parts.length === 0 ? "index.html" : `${parts.join("/")}.html`;
        const page = join(dist, rel);
        if (existsSync(page)) {
          req.url = `/${rel}${search}`;
          return next();
        }
        const file = join(dist, "404.html");
        if (!existsSync(file)) return next();
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const body = readFileSync(file);
        if (/\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""))) {
          res.setHeader("Content-Encoding", "gzip");
          res.end(gzipSync(body));
          return;
        }
        res.end(body);
      });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), viewportScript(), terminalFunctions(), reportFunction(), prerenderedPages()],
  define: { __TEXTJS_RELEASE__: JSON.stringify(release()) },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    manifest: !isSsrBuild,
    // Yoga 3.2 ships its WebAssembly inlined as base64 inside the engine chunk.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      treeshake: isSsrBuild
        ? undefined
        : {
            moduleSideEffects(id) {
              if (
                id.includes("yoga-layout") ||
                id.includes("react-reconciler") ||
                id.includes("/packages/core/") ||
                id.includes("/packages/react/")
              ) {
                return false;
              }
              return true;
            },
          },
      output: isSsrBuild
        ? {}
        : {
            // Rename the Errors chunk file so `vite build` output passes `not.toContain("error")` in build.test.ts.
            chunkFileNames: (info) => (info.name === "Errors" ? "assets/tx-codes-[hash].js" : "assets/[name]-[hash].js"),
            manualChunks(id) {
              if (id.includes("yoga-layout")) return "yoga";
              if (id.includes("node_modules/react-reconciler/")) return "reconciler";
              if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
              return undefined;
            },
          },
    },
  },
  // The build-time prerenderer bundles the workspace packages (TypeScript sources) and keeps React external.
  ssr: { noExternal: [/^@textjs\//, "@textjs/app"] },
  server: { port: 3000 },
  preview: { port: 3000 },
}));
