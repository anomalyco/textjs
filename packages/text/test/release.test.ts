import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkChannel, preparePackedManifest, publishOrder } from "../../../scripts/release-publish";
import { applyBump, distTagFor, nextVersion, planBump, workspacePackages } from "../../../scripts/release-version";

describe("nextVersion", () => {
  test("stable bumps (prereleases graduate like npm semver.inc)", () => {
    expect(nextVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(nextVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
    expect(nextVersion("1.2.4-canary.3", "patch")).toBe("1.2.4");
    expect(nextVersion("1.3.0-canary.0", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.4-canary.0", "minor")).toBe("1.3.0");
    expect(nextVersion("2.0.0-canary.1", "major")).toBe("2.0.0");
    expect(nextVersion("1.2.4-canary.5", "stable")).toBe("1.2.4");
    expect(() => nextVersion("1.2.4", "stable")).toThrow(/already a stable/);
  });

  test("canary: x.y.(z+1)-canary.N, continuing after the registry", () => {
    expect(nextVersion("1.0.0", "canary")).toBe("1.0.1-canary.0");
    expect(nextVersion("1.0.1-canary.0", "canary")).toBe("1.0.1-canary.1");
    expect(nextVersion("1.0.0", "canary", ["1.0.0", "1.0.1-canary.0", "1.0.1-canary.7", "1.0.2-canary.9", "junk"])).toBe("1.0.1-canary.8");
    expect(nextVersion("1.0.1-canary.9", "canary", ["1.0.1-canary.2"])).toBe("1.0.1-canary.10");
  });

  test("explicit versions are validated", () => {
    expect(nextVersion("1.0.0", "1.4.0-rc.1")).toBe("1.4.0-rc.1");
    expect(() => nextVersion("1.0.0", "1.4")).toThrow(/Invalid version/);
    expect(() => nextVersion("1.0.0", "01.0.0")).toThrow(/Invalid version/);
  });

  test("dist-tags and channel guards", () => {
    expect(distTagFor("1.2.3")).toBe("latest");
    expect(distTagFor("1.2.4-canary.0")).toBe("canary");
    expect(() => distTagFor("1.2.4-rc.0")).toThrow(/explicit dist-tag/);
    expect(() => checkChannel("1.2.4-canary.0", "latest")).toThrow(/Refusing to publish prerelease/);
    expect(() => checkChannel("1.2.4", "canary")).toThrow(/x\.y\.z-canary\.N/);
    expect(() => checkChannel("2.1.0", "v1-lts")).toThrow(/does not belong/);
    expect(() => checkChannel("1.9.3", "v1-lts")).not.toThrow();
    expect(() => checkChannel("1.9.3", "beta")).toThrow(/Unknown dist-tag/);
  });
});

describe("lockstep workspace bump", () => {
  let root = "";
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const pkg = (dir: string, manifest: Record<string, unknown>, files: Record<string, string> = {}): void => {
    mkdirSync(join(root, "packages", dir, "src"), { recursive: true });
    writeFileSync(join(root, "packages", dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    for (const [f, body] of Object.entries(files)) writeFileSync(join(root, "packages", dir, f), body);
  };

  const workspace = (): void => {
    root = mkdtempSync(join(tmpdir(), "textjs-release-"));
    pkg("core", { name: "@textjs/core", version: "1.0.0" }, { "src/index.ts": 'export const VERSION = "1.0.0";\nexport const OTHER = "1.0.0";\n' });
    pkg("react", { name: "@textjs/react", version: "1.0.0", dependencies: { "@textjs/core": "workspace:*" } }, { "src/reconciler.ts": 'const x = { rendererVersion: "1.0.0" };\n' });
    pkg("text", { name: "@textjs/next", version: "1.0.0", dependencies: { "@textjs/react": "workspace:*", "@textjs/core": "workspace:*" } });
    pkg("internal", { name: "internal-tool", version: "0.0.1", private: true });
  };

  test("bumps every public package.json and mirrored version constants only", () => {
    workspace();
    const plan = planBump(root, "canary");
    expect(plan).toMatchObject({ from: "1.0.0", to: "1.0.1-canary.0", distTag: "canary", packages: ["@textjs/core", "@textjs/react", "@textjs/next"] });
    applyBump(plan);
    expect(workspacePackages(root).map((p) => p.version)).toEqual(["1.0.1-canary.0", "1.0.1-canary.0", "1.0.1-canary.0"]);
    expect(readFileSync(join(root, "packages/core/src/index.ts"), "utf8")).toBe('export const VERSION = "1.0.1-canary.0";\nexport const OTHER = "1.0.0";\n');
    expect(readFileSync(join(root, "packages/react/src/reconciler.ts"), "utf8")).toContain('rendererVersion: "1.0.1-canary.0"');
    expect(JSON.parse(readFileSync(join(root, "packages/internal/package.json"), "utf8")).version).toBe("0.0.1");
    expect(JSON.parse(readFileSync(join(root, "packages/react/package.json"), "utf8")).dependencies["@textjs/core"]).toBe("workspace:*");
    applyBump(planBump(root, "stable"));
    expect(workspacePackages(root).map((p) => p.version)).toEqual(["1.0.1", "1.0.1", "1.0.1"]);
  });

  test("refuses drifted versions unless forced", () => {
    workspace();
    pkg("text", { name: "@textjs/next", version: "1.0.5" });
    expect(() => planBump(root, "patch")).toThrow(/not in lockstep/);
    const plan = planBump(root, "1.1.0", { force: true });
    applyBump(plan);
    expect(new Set(workspacePackages(root).map((p) => p.version))).toEqual(new Set(["1.1.0"]));
  });

  test("publish order puts dependencies first", () => {
    workspace();
    expect(publishOrder(workspacePackages(root).reverse()).map((p) => p.name)).toEqual(["@textjs/core", "@textjs/react", "@textjs/next"]);
  });
});

describe("packed manifests", () => {
  test("publishConfig overrides are hoisted; npm keys stay; workspace ranges are rejected", () => {
    const out = preparePackedManifest({
      name: "@textjs/next",
      main: "./src/index.ts",
      exports: { ".": "./src/index.ts" },
      dependencies: { "@textjs/core": "1.0.1" },
      devDependencies: { typescript: "^5" },
      publishConfig: { main: "./dist/index.js", exports: { ".": { default: "./dist/index.js" } }, access: "public" },
    });
    expect(out.main).toBe("./dist/index.js");
    expect(out.exports).toEqual({ ".": { default: "./dist/index.js" } });
    expect(out.publishConfig).toEqual({ access: "public" });
    expect(out.devDependencies).toBeUndefined();
    expect(() => preparePackedManifest({ name: "x", dependencies: { y: "workspace:*" } })).toThrow(/still "workspace:\*"/);
  });
});
