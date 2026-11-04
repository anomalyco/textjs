import { act } from "react";
import { extractStyledFrame, initYoga, InputEngine, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync } from "@textjs/react";
import { CompanionApp } from "../../console-companion/App";
import { COMPANION_COLS, COMPANION_ROWS } from "../../console-companion/bridge";
import { siteStore } from "../../console-companion/store";
import { preloadCompanionTab } from "../../console-companion/tabs-loader";
import { packStyledFrame, type PackedFrame } from "../../site/packed-frame";

class Scheduler implements RendererScheduler {
  queue: Array<() => void> = [];
  request(cb: () => void): unknown {
    this.queue.push(cb);
    return cb;
  }
  cancel(handle: unknown): void {
    this.queue = this.queue.filter((c) => c !== handle);
  }
  flush(): void {
    const q = this.queue;
    this.queue = [];
    for (const cb of q) cb();
  }
}

/**
 * The console companion's first frame on Home at the hero mirror's 100×26, which the hero shows
 * until the companion boots. Run `bun scripts/generate-home-frame.ts` after changing `HomeTab` or
 * `CompanionApp` (the build does too); a test fails while the committed copy is stale.
 */
export async function renderHomeFrame(): Promise<PackedFrame> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  await Promise.all([initYoga(), preloadCompanionTab("home")]);
  const before = siteStore.getSnapshot();
  siteStore.reset();
  siteStore.syncRoute("/");
  const scheduler = new Scheduler();
  const root = createConsoleRootSync({
    width: COMPANION_COLS,
    height: COMPANION_ROWS,
    console: { log: () => undefined, clear: () => undefined },
    scheduler,
    input: new InputEngine({ document: null }),
    registerGlobal: false,
    theme: "geistDark",
    tabFocus: false,
  });
  try {
    await act(async () => root.render(<CompanionApp />));
    for (let i = 0; i < 4 && scheduler.queue.length > 0; i++) await act(async () => scheduler.flush());
    return packStyledFrame(extractStyledFrame(root.renderer.buffer));
  } finally {
    await act(async () => root.unmount());
    siteStore.set(before);
  }
}
