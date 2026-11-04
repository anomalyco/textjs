import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { defaultClientConditions, defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { translatedCaptions } from "./scripts/i18n/sources";
import { i18nPlugin } from "./scripts/i18n/vite-plugin";
import { datePatterns, intlTag } from "./src/i18n/intl";
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
        // Like Pages, the nearest 404.html: /ja/missing gets dist/ja/404.html.
        const localized = parts.length > 1 ? join(dist, parts[0] as string, "404.html") : "";
        const file = localized && existsSync(localized) ? localized : join(dist, "404.html");
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

/**
 * Cloudflare Pages does not compress `.WAD` (`application/octet-stream`). Emit `dist/doom/DOOM1.WAD.gz`
 * at build time and serve `/doom/DOOM1.WAD.gz` in `vite dev` from the committed `public/doom/DOOM1.WAD`.
 */
function doomWadGzip(isSsrBuild: boolean): Plugin {
  const wadPath = join(import.meta.dirname, "public/doom/DOOM1.WAD");
  let cachedGz: Buffer | null = null;
  const getGz = (): Buffer | null => {
    if (cachedGz) return cachedGz;
    if (!existsSync(wadPath)) return null;
    cachedGz = gzipSync(readFileSync(wadPath), { level: 9 });
    return cachedGz;
  };
  let outDir = "dist";
  return {
    name: "textjs-doom-wad-gzip",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if ((req.method !== "GET" && req.method !== "HEAD") || path !== "/doom/DOOM1.WAD.gz") return next();
        const gz = getGz();
        if (!gz) return next();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Length", String(gz.length));
        res.setHeader("Cache-Control", "no-cache");
        res.end(req.method === "HEAD" ? undefined : gz);
      });
    },
    closeBundle() {
      if (isSsrBuild) return;
      const gz = getGz();
      if (!gz) return;
      const dest = join(outDir, "doom/DOOM1.WAD.gz");
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, gz);
    },
  };
}

/** The locale this build compiles in (`scripts/build.ts` runs one build per locale). */
const LOCALE = process.env.TEXTJS_LOCALE || "en";
const SOURCE = LOCALE === "en";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    i18nPlugin(LOCALE),
    react(),
    viewportScript(),
    terminalFunctions(),
    reportFunction(),
    prerenderedPages(),
    // Locale builds only contribute pages and chunks; English ships public/ and the Doom WAD.
    ...(SOURCE ? [doomWadGzip(Boolean(isSsrBuild))] : []),
  ],
  define: {
    __TEXTJS_RELEASE__: JSON.stringify(release()),
    __TEXTJS_LOCALE__: JSON.stringify(LOCALE),
    __TEXTJS_LOCALES__: JSON.stringify(process.env.TEXTJS_LOCALES ?? ""),
    // Dates are formatted here, once, so the prerendered page and the browser show the same text (src/i18n/intl.ts).
    __TEXTJS_DATES__: JSON.stringify(datePatterns(intlTag(LOCALE))),
    // Chapters whose captions this locale has translated (scripts/postbuild-pages.ts writes their tracks).
    __TEXTJS_CAPTIONS__: JSON.stringify(SOURCE ? [] : translatedCaptions(LOCALE)),
  },
  publicDir: SOURCE ? "public" : false,
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    manifest: !isSsrBuild,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      treeshake: isSsrBuild
        ? undefined
        : {
            moduleSideEffects(id) {
              if (
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
            // Chunk names without "error" (the Errors page, the loading-and-errors doc), so `vite build` output passes
            // `not.toContain("error")` in build.test.ts. Each docs page's Markdown is a `doc-` chunk.
            chunkFileNames: (info) =>
              info.name === "Errors" ? "assets/tx-codes-[hash].js" : info.facadeModuleId?.includes("/src/docs/content/") ? "assets/doc-[hash].js" : "assets/[name]-[hash].js",
            manualChunks(id) {
              // Only the Emscripten glue: the loader imports Text.js's error table, which the site's entry also needs,
              // and a manual chunk takes its modules' dependencies with it.
              if (/\/packages\/core\/src\/yoga-(glue|enums)\./.test(id)) return "yoga";
              if (id.includes("node_modules/react-reconciler/")) return "reconciler";
              if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
              return undefined;
            },
          },
    },
  },
  // The client loads Yoga's WebAssembly as a hashed .wasm asset (@textjs/core's #yoga-loader); the prerenderer keeps the inline copy.
  ...(isSsrBuild || process.env.VITEST
    ? {}
    : {
        resolve: { conditions: ["@textjs/wasm-asset", ...defaultClientConditions] },
        optimizeDeps: { esbuildOptions: { conditions: ["@textjs/wasm-asset"] } },
      }),
  // The build-time prerenderer bundles the workspace packages (TypeScript sources) and keeps React external.
  ssr: { noExternal: [/^@textjs\//, "@textjs/app"] },
  server: { port: 3000 },
  preview: { port: 3000 },
}));
