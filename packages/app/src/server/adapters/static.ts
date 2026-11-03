/**
 * `text build --adapter static`: a pure static export. Static `GET` route
 * handlers (`dynamic = "force-static"` / `revalidate`) are prerendered into
 * files; anything that needs a server is a build error.
 */

import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { isDynamicPattern, matchAppRoutes, type RouteManifest, type RouteSegmentNode } from "../../routing";
import { routeCacheConfig, runRouteHandlerWithCache } from "../cache-route";
import type { RouteHandlerModule } from "../http";
import type { MiddlewareModule } from "../middleware";
import { removeServerBundle, serverRoutePatterns, type AdapterContext, type AdapterResult } from "./shared";

export async function adaptStatic(ctx: AdapterContext, middleware: MiddlewareModule | null, apiBundle: string): Promise<AdapterResult> {
  const problems: string[] = [];
  if (middleware) problems.push("middleware.ts needs a server. Use --adapter bun, vercel or cloudflare (or `text start`).");
  for (const pattern of serverRoutePatterns(ctx)) problems.push(`${pattern}: renders on the server (\`export const runtime = "server"\`). Use --adapter bun (or \`text start\`).`);
  const notes: string[] = [];
  if (ctx.rewrites.length > 0) notes.push("rewrites in text.config.ts are not applied by static hosts; configure them on your host.");
  if (ctx.config.ansi !== false) notes.push("Static hosts serve curl the HTML page. To serve curl frames, use --adapter bun, vercel or cloudflare. Set `ansi: false` to hide this note.");

  const written: string[] = [];
  if (ctx.api.length > 0 && problems.length === 0) {
    const bundle = (await import(`${pathToFileURL(apiBundle).href}?t=${Date.now()}`)) as { manifest: RouteManifest; handlers: Record<string, RouteHandlerModule> };
    for (const route of ctx.api) {
      if (isDynamicPattern(route.pattern)) {
        problems.push(`${route.pattern}: dynamic segments need a server.`);
        continue;
      }
      const m = matchAppRoutes(bundle.manifest, route.pattern);
      const id = m ? (m.chain[m.chain.length - 1] as RouteSegmentNode).files?.page : undefined;
      const mod = id ? bundle.handlers[id] : undefined;
      if (!mod) continue;
      const others = ["POST", "PUT", "PATCH", "DELETE"].filter((k) => typeof mod[k] === "function");
      if (typeof mod.GET !== "function" || others.length > 0) {
        problems.push(`${route.pattern}: only GET route handlers can be exported statically${others.length ? ` (found ${others.join(", ")})` : ""}.`);
        continue;
      }
      if (!routeCacheConfig(mod, `${route.pattern}/route`).static) {
        problems.push(`${route.pattern}: the route handler is dynamic. Add \`export const dynamic = "force-static"\` to prerender it.`);
        continue;
      }
      const res = await runRouteHandlerWithCache(mod, new Request(`http://localhost${ctx.basePath}${route.pattern}`), { params: {}, pattern: route.pattern, pathname: route.pattern, cache: false });
      if (!res.ok) {
        problems.push(`${route.pattern}: prerendering returned ${res.status}.`);
        continue;
      }
      const file = join(ctx.outDir, ...route.pattern.split("/").filter(Boolean));
      if (existsSync(file) && statSync(file).isDirectory()) {
        problems.push(`${route.pattern}: conflicts with a directory of the same name in the output.`);
        continue;
      }
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
      written.push(route.pattern);
    }
  }
  if (problems.length > 0) {
    throw new Error(`▼ Text.js: the static adapter can't export this app:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  removeServerBundle(ctx.outDir);
  // SPA fallback for hosts that serve 404.html for unknown paths (GitHub Pages, S3, …).
  const fallback = join(ctx.outDir, "404.html");
  if (!existsSync(fallback)) copyFileSync(join(ctx.outDir, "index.html"), fallback);
  if (written.length > 0) notes.unshift(`Prerendered ${written.length} route handler${written.length === 1 ? "" : "s"}: ${written.join(", ")}`);
  return { adapter: "static", output: ctx.outDir, notes };
}
