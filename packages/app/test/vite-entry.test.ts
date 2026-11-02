import { describe, expect, test } from "bun:test";
import { withFrameworkEntry } from "../src/server/vite-entry";

describe("framework builds and the app's vite config", () => {
  test("a user build.rollupOptions.input or build.ssr entry never replaces the framework's entry", () => {
    const user = { define: { __FLAG__: "1" }, build: { ssr: "src/server.ts", rollupOptions: { input: "src/main.html", external: ["sharp"] } } };
    const merged = withFrameworkEntry({ build: { outDir: "dist/.text/server", rollupOptions: { output: { entryFileNames: "api.mjs" } } } }, user, { input: "virtual:textjs/api", ssr: true });
    expect(merged.build?.ssr).toBe(true);
    expect(merged.build?.rollupOptions?.input).toBe("virtual:textjs/api");
    // Everything else the app configures still applies.
    expect(merged.build?.rollupOptions?.external).toEqual(["sharp"]);
    expect(merged.build?.rollupOptions?.output).toEqual({ entryFileNames: "api.mjs" });
    expect(merged.define).toEqual({ __FLAG__: "1" });
  });

  test("client bundles keep the user's build.ssr setting untouched", () => {
    const merged = withFrameworkEntry({ build: {} }, { build: { rollupOptions: { input: { app: "a.ts" } } } }, { input: { player: "virtual:textjs/player" } });
    expect(merged.build?.rollupOptions?.input).toEqual({ player: "virtual:textjs/player" });
    expect(merged.build?.ssr).toBeUndefined();
  });
});
