import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { cleanup, render } from "@textjs/app/testing";
import { DEPLOYMENTS } from "../../lib/deployments";
import DeploymentsPage from "./page";

beforeEach(() => {
  spyOn(globalThis, "fetch").mockResolvedValue(Response.json(DEPLOYMENTS));
});

afterEach(() => {
  mock.restore();
  return cleanup();
});

test("lists every deployment", async () => {
  const app = await render(<DeploymentsPage />, { cols: 80, rows: 12 });
  await app.waitForText("feat: stream cells downward");
  expect(app.lines()).toHaveLength(12);
});

test("↓ moves the highlight", async () => {
  const app = await render(<DeploymentsPage />);
  await app.waitForText("feat: stream cells downward");
  await app.press("down");
  const row = app.lines().find((line) => line.includes("›"));
  expect(row).toContain("perf: merge spans across rows");
});

test("4 sorts by build time", async () => {
  const app = await render(<DeploymentsPage />);
  await app.waitForText("Build");
  await app.press("4"); // sort by the 4th column
  expect(app.locate("12s")?.y).toBeLessThan(app.locate("52s")?.y ?? 0);
});
