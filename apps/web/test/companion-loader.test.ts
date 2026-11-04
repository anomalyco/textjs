import { afterAll, describe, expect, test } from "bun:test";
import { activateCompanion, companionReady, configureCompanionLoader, ensureCompanion, isCompanionConfigured, type Companion } from "../src/console-companion/bridge";
import { siteStore } from "../src/console-companion/store";

describe("loading the companion on intent", () => {
  afterAll(() => {
    configureCompanionLoader(null);
    siteStore.reset();
  });

  test("nothing loads without a loader", () => {
    expect(isCompanionConfigured()).toBe(false);
    expect(ensureCompanion()).toBeNull();
  });

  test("a failed load is forgotten, so the next intent loads again; the click's engaged state is undone", async () => {
    let calls = 0;
    configureCompanionLoader(() => {
      calls++;
      return Promise.reject(new Error("Failed to fetch dynamically imported module"));
    });
    expect(isCompanionConfigured()).toBe(true);
    activateCompanion();
    // The click engages the console before it has loaded.
    expect(siteStore.getSnapshot().consoleInput).toBe(true);
    await expect(companionReady() as Promise<Companion>).rejects.toThrow();
    await Promise.resolve();
    expect(siteStore.getSnapshot().consoleInput).toBe(false);
    expect(companionReady()).toBeNull();
    await expect(ensureCompanion() as Promise<Companion>).rejects.toThrow();
    expect(calls).toBe(2);
  });
});
