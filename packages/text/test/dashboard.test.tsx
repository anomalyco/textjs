import { afterEach, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { AppRouter, createMemoryHistory, type RouteManifest, type RouteModule, type RouteSegmentNode } from "../src/router";
import { scanApp, toStaticManifest } from "../src/server/scan";
import { createTestRoot, type TestRoot } from "./helpers";

const DASHBOARD = fileURLToPath(new URL("../../../examples/dashboard", import.meta.url));

/** Build a live manifest for examples/dashboard with the real scanner and real modules. */
async function loadDashboard(): Promise<RouteManifest> {
  const scan = scanApp(DASHBOARD);
  const hydrate = async (node: RouteSegmentNode): Promise<RouteSegmentNode> => {
    const out: RouteSegmentNode = { segment: node.segment, files: node.files };
    for (const [kind, rel] of Object.entries(node.files ?? {})) {
      const mod = (await import(`${DASHBOARD}/${rel}`)) as RouteModule;
      (out as unknown as Record<string, unknown>)[kind === "not-found" ? "notFound" : kind] = mod;
    }
    if (node.children) out.children = await Promise.all(node.children.map(hydrate));
    return out;
  };
  return hydrate(toStaticManifest(scan));
}

let t: TestRoot | null = null;
afterEach(async () => {
  await t?.unmount();
  t = null;
});

async function visit(path: string): Promise<{ t: TestRoot; history: ReturnType<typeof createMemoryHistory> }> {
  const routes = await loadDashboard();
  const history = createMemoryHistory(path);
  t = await createTestRoot({ width: 100, height: 32, onCaughtError: () => undefined });
  await t.render(<AppRouter routes={routes} history={history} errorStore={null} />);
  return { t, history };
}

describe("examples/dashboard", () => {
  test("Overview: header, nav, metric cards, throughput chart and recent deployments", async () => {
    const { t } = await visit("/");
    const frame = t.frame();
    expect(frame).toContain("▼ Edge Console");
    expect(frame).toContain("Overview");
    expect(frame).toContain("Settings");
    expect(frame).toContain("Requests · 24h");
    expect(frame).toContain("Throughput");
    expect(frame).toContain("Recent deployments");
    expect(frame).toContain("dpl_8f2kq1");
    expect(frame).toContain("1-5 pages");
  });

  test("number keys navigate; <Select> + Enter opens the dynamic build-log route", async () => {
    const { t, history } = await visit("/");
    await t.press("2");
    expect(history.location.pathname).toBe("/deployments");
    expect(t.frame()).toContain("8 total");
    await t.press("ArrowDown");
    await t.press("Enter");
    expect(history.location.pathname).toBe("/deployments/dpl_7hx0pz");
    const frame = t.frame();
    expect(frame).toContain("Build Logs");
    expect(frame).toContain("fix/cart-badge");
    expect(frame).toContain("Deployment completed");
    await t.press("Escape");
    expect(history.location.pathname).toBe("/deployments");
  });

  test("unknown deployments render not-found", async () => {
    const { t } = await visit("/deployments/dpl_nope");
    expect(t.frame()).toContain("This page could not be found.");
    expect(t.frame()).toContain("/deployments/dpl_nope");
  });

  test("Logs: filter with / and the <Input>", async () => {
    const { t } = await visit("/logs");
    expect(t.frame()).toContain("Runtime Logs");
    await t.press("/");
    await t.type("favicon");
    const frame = t.frame();
    expect(frame).toContain("favicon");
    const rows = frame.split("\n").filter((l) => /\d\d:\d\d:\d\d\.\d{3}/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((l) => l.includes("/favicon.ico"))).toBe(true);
  });

  test("Settings: switching the theme preset", async () => {
    const { t } = await visit("/settings");
    expect(t.frame()).toContain("Geist Dark · 100×32 · fixed");
    await t.press("ArrowDown");
    await t.press("Enter");
    expect(t.frame()).toContain("Geist Light · 100×32 · fixed");
  });
});
