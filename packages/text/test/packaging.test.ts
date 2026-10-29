import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sharedContext } from "@textjs/react";
import { externals } from "../../../scripts/build-bin";
import { rewriteDir, rewriteSource } from "../../../scripts/esm-specifiers";
import { AppShellContext, RouterContext } from "../src/context";
import { ServerComponentCacheContext } from "../src/server/server-components";

const tmp = mkdtempSync(join(tmpdir(), "textjs-packaging-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("published module graph", () => {
  test("the bin loads the CLI through the package's own exports", () => {
    const bin = readFileSync(resolve(import.meta.dir, "../bin/text.js"), "utf8");
    expect(bin).toContain('import.meta.resolve("@textjs/next/cli")');
    expect(readFileSync(resolve(import.meta.dir, "../bin/text.ts"), "utf8")).toContain('from "@textjs/next/cli"');
    const pkg = JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf8")) as {
      exports: Record<string, string>;
      publishConfig: { exports: Record<string, { default: string }> };
    };
    expect(pkg.exports["./cli"]).toBe("./src/cli/index.ts");
    expect(pkg.publishConfig.exports["./cli"]?.default).toBe("./dist/cli/index.js");
    // In the repo the self-reference resolves to the same sources the app imports.
    expect(fileURLToPath(import.meta.resolve("@textjs/next/cli"))).toBe(resolve(import.meta.dir, "../src/cli/index.ts"));
  });

  test("CLI bundles never inline @textjs packages or their dependencies", () => {
    const ext = externals({ name: "@textjs/next", dependencies: { "@textjs/core": "1", "@textjs/react": "1", vite: "6" }, peerDependencies: { react: "19" } });
    for (const n of ["@textjs/core", "@textjs/react", "@textjs/next", "@textjs/next/*", "react", "react/*", "react-reconciler/*", "vite"]) expect(ext).toContain(n);
    expect(externals({ name: "create-text-app" })).toContain("create-text-app");
  });

  test("router, shell, runtime and theme contexts are realm singletons", () => {
    const g = globalThis as Record<symbol, unknown>;
    expect(g[Symbol.for("textjs.routerContext")]).toBe(RouterContext);
    expect(g[Symbol.for("textjs.appShellContext")]).toBe(AppShellContext);
    expect(g[Symbol.for("textjs.serverComponentCache")]).toBe(ServerComponentCacheContext);
    expect(g[Symbol.for("textjs.runtimeContext")]).toBeDefined();
    // A second copy of the module (e.g. a bundled CLI) gets the same context object.
    expect(sharedContext("routerContext", null, "Other")).toBe(RouterContext as never);
  });
});

describe("Node-loadable dist", () => {
  test("rewrites extensionless relative specifiers to files and directory indexes", () => {
    const dist = join(tmp, "dist");
    mkdirSync(join(dist, "dom"), { recursive: true });
    mkdirSync(join(dist, "drivers"), { recursive: true });
    writeFileSync(join(dist, "root.js"), "export const x = 1;\n");
    writeFileSync(join(dist, "root.d.ts"), "export declare const x = 1;\n");
    writeFileSync(join(dist, "dom/index.js"), "export const y = 2;\n");
    writeFileSync(join(dist, "drivers/style.js"), 'export * from "../root";\n');
    const index = [
      'export * from "./root";',
      'export { y } from "./dom";',
      'import "./drivers/style";',
      'const lazy = () => import("./root");',
      'import data from "./data.json" with { type: "json" };',
      'import React from "react";',
      'import { C } from "react-reconciler/constants.js";',
      'export * from "./already.js";',
    ].join("\n");
    writeFileSync(join(dist, "index.js"), index);
    writeFileSync(join(dist, "index.d.ts"), 'export * from "./root";\n');
    expect(rewriteDir(dist)).toBe(3);
    expect(readFileSync(join(dist, "index.js"), "utf8").split("\n")).toEqual([
      'export * from "./root.js";',
      'export { y } from "./dom/index.js";',
      'import "./drivers/style.js";',
      'const lazy = () => import("./root.js");',
      'import data from "./data.json" with { type: "json" };',
      'import React from "react";',
      'import { C } from "react-reconciler/constants.js";',
      'export * from "./already.js";',
    ]);
    expect(readFileSync(join(dist, "drivers/style.js"), "utf8")).toBe('export * from "../root.js";\n');
    expect(readFileSync(join(dist, "index.d.ts"), "utf8")).toBe('export * from "./root.js";\n');
    // Idempotent.
    expect(rewriteDir(dist)).toBe(0);
    // Unresolvable specifiers are left alone.
    expect(rewriteSource(join(dist, "index.js"), 'import "./missing";')).toBe('import "./missing";');
  });
});
