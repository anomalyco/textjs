/**
 * What a new user sees first: every create-text-app template and example
 * leaves the bottom-left corner free for the `[▼]` dev pill that `text dev`
 * draws over the frame, so no key hint is hidden behind it.
 */

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scaffold, type TemplateName } from "../../create-text-app/src/index";
import { AppRouter, createMemoryHistory, type RouteManifest, type RouteModule, type RouteSegmentNode } from "../src/router";
import { scanApp, toStaticManifest } from "../src/server/scan";
import { createTestRoot, type TestRoot } from "./helpers";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

async function loadApp(dir: string): Promise<RouteManifest> {
  const hydrate = async (node: RouteSegmentNode): Promise<RouteSegmentNode> => {
    const out: RouteSegmentNode = { segment: node.segment, files: node.files };
    for (const [kind, rel] of Object.entries(node.files ?? {})) {
      const mod = (await import(join(dir, rel))) as RouteModule;
      (out as unknown as Record<string, unknown>)[kind === "not-found" ? "notFound" : kind] = mod;
    }
    if (node.children) out.children = await Promise.all(node.children.map(hydrate));
    return out;
  };
  return hydrate(toStaticManifest(scanApp(dir)));
}

const tmp = mkdtempSync(join(tmpdir(), "textjs-first-run-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** Scaffold a template and link the workspace `@textjs/next` + React (stands in for `bun install`). */
function scaffoldTemplate(template: TemplateName): string {
  const dir = join(tmp, template);
  scaffold({ dir, template });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/@textjs/next"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  return dir;
}

let t: TestRoot | null = null;
afterEach(async () => {
  await t?.unmount();
  t = null;
});

const APPS: Array<[string, number, number]> = [
  ["template:starter", 100, 32],
  ["template:dashboard", 100, 30],
  ["template:opencode", 100, 32],
  ["examples/dashboard", 100, 32],
];

describe("first run", () => {
  for (const [app, width, height] of APPS) {
    test(`${app}: the bottom-left cells are free for the [▼] dev pill`, async () => {
      const dir = app.startsWith("template:") ? scaffoldTemplate(app.slice(9) as TemplateName) : join(REPO, app);
      const routes = await loadApp(dir);
      t = await createTestRoot({ width, height, onCaughtError: () => undefined });
      await t.render(<AppRouter routes={routes} history={createMemoryHistory("/")} errorStore={null} />);
      const lines = t.lines();
      expect(lines.join("\n").trim().length).toBeGreaterThan(0);
      expect({ app, corner: (lines[height - 1] ?? "").padEnd(3).slice(0, 3) }).toEqual({ app, corner: "   " });
    });
  }
});
