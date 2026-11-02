import { act } from "react";
import { initYoga, InputEngine, type ConsoleTarget, type RendererScheduler } from "@textjs/core";
import { AsciiFont, Box, createConsoleRootSync, renderAsciiFont } from "@textjs/react";

export const LOGO_BANNER = "\u25BC TEXT.JS";

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
 * One `console.log(...)` call that draws `<AsciiFont text="▼ TEXT.JS" />` (geistDark, one cell of
 * padding), encoded by the real Turbolog driver. Run `bun scripts/generate-logo-console.ts` after
 * changing the encoder or the font; a test fails while the committed copy is stale.
 */
export async function encodeLogoConsoleLog(browser: "chromium" | "firefox" = "chromium"): Promise<string> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  await initYoga();
  const rows = renderAsciiFont(LOGO_BANNER, "block", 1);
  const width = Math.max(...rows.map((r) => [...r].length)) + 4;
  const height = rows.length + 2;
  const logs: unknown[][] = [];
  const target: ConsoleTarget = { log: (...args: unknown[]) => void logs.push(args), clear: () => undefined };
  const scheduler = new Scheduler();
  const root = createConsoleRootSync({ width, height, console: target, scheduler, input: new InputEngine({ document: null }), registerGlobal: false, theme: "geistDark", tabFocus: false, browser });
  await act(async () =>
    root.render(
      <Box paddingX={2} paddingY={1}>
        <AsciiFont text={LOGO_BANNER} />
      </Box>,
    ),
  );
  for (let i = 0; i < 4 && scheduler.queue.length > 0; i++) await act(async () => scheduler.flush());
  await act(async () => root.unmount());
  const last = logs[logs.length - 1];
  if (!last) throw new Error("the logo frame was never logged");
  return `console.log(${last.map((a) => JSON.stringify(a)).join(", ")});`;
}
