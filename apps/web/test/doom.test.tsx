import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render } from "@textjs/react/testing";
import { DOOM_CREDIT, DoomDemo, fetchVerifiedWad, WAD_BYTES, WAD_SHA256 } from "../src/demos/doom/Doom";
import { LICENSE_HEADER, TRADEMARK_NOTICE, verifyDoomAssets, WAD } from "../src/demos/doom/fetch-wad";
import { createDoom } from "../src/demos/doom/host";
import { DOOM_ERROR_HINTS, DOOM_LOADING_HINTS, hintsFor, PRESETS, siteStore } from "../src/console-companion/store";
import { PlaygroundPage } from "../src/pages/Playground";

const WEB_ROOT = join(import.meta.dir, "..");

afterEach(() => {
  cleanup();
  siteStore.reset();
});

describe("Doom shareware & GPL engine assets", () => {
  test("DOOM1.WAD, README.TXT, and LICENSE-DOOM1.TXT match published v1.9 hashes, colon header, and trademark notice", () => {
    expect(WAD.sha256).toBe("1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771");
    expect(LICENSE_HEADER).not.toContain("—");
    expect(LICENSE_HEADER).toContain("DOOM1.WAD:");
    expect(TRADEMARK_NOTICE).toBe("DOOM is a trademark of id Software. Text.js is not affiliated with or endorsed by id Software.");
    expect(existsSync(join(WEB_ROOT, "public/doom/.gitignore"))).toBe(false);
    verifyDoomAssets(join(WEB_ROOT, "public/doom"));
  });

  test("web pad renders trademark link beside View source, presets use new hints, and engine directory retains GPL-2.0 license and source link", () => {
    const preset = PRESETS.find((p) => p.id === "doom")!;
    expect(preset.label).toBe("Doom");
    expect(preset.hints).toEqual([
      { keys: "← ↑ → ↓", label: "move" },
      { keys: "F", label: "fire" },
      { keys: "Space", label: "open" },
    ]);

    const html = renderToStaticMarkup(<PlaygroundPage demo="doom" />);
    expect(html).toContain("View source");
    expect(html).toContain('href="/doom/LICENSE-DOOM1.TXT"');
    expect(html).toContain(TRADEMARK_NOTICE);

    const engineLicense = readFileSync(join(WEB_ROOT, "src/demos/doom/engine/LICENSE"), "utf8");
    expect(engineLicense).toContain("GNU GENERAL PUBLIC LICENSE");

    const engineReadme = readFileSync(join(WEB_ROOT, "src/demos/doom/engine/README.md"), "utf8");
    expect(engineReadme).toContain("https://github.com/jacobenget/doom.wasm");
    expect(engineReadme).toContain("about 150 KB gzipped");
    expect(engineReadme).toContain("10 imports and 19 exports");
  });

  test("fetchVerifiedWad decompresses gzipped DOOM1.WAD.gz, reports progress to 4.2 MB, and rejects tampered bytes", async () => {
    const rawWad = readFileSync(join(WEB_ROOT, "public/doom/DOOM1.WAD"));
    const gzWad = gzipSync(rawWad, { level: 1 });
    const progress: number[] = [];

    const streamGz = () =>
      new ReadableStream<Uint8Array>({
        start(c) {
          const mid = Math.floor(gzWad.length / 2);
          c.enqueue(new Uint8Array(gzWad.subarray(0, mid)));
          c.enqueue(new Uint8Array(gzWad.subarray(mid)));
          c.close();
        },
      });

    const verified = await fetchVerifiedWad(
      "/doom/DOOM1.WAD.gz",
      new AbortController().signal,
      (b) => progress.push(b),
      async () => new Response(streamGz(), { status: 200 }),
    );
    expect(verified.byteLength).toBe(WAD_BYTES);
    expect(progress[progress.length - 1]).toBe(WAD_BYTES);
    expect(WAD_SHA256).toBe(WAD.sha256);

    // Tampered payload fails SHA-256 verification
    const tampered = Buffer.from(rawWad);
    tampered[100] = (tampered[100] ?? 0) ^ 0xff;
    const tamperedGz = gzipSync(tampered, { level: 1 });
    await expect(
      fetchVerifiedWad(
        "/doom/DOOM1.WAD.gz",
        new AbortController().signal,
        () => {},
        async () => new Response(new Uint8Array(tamperedGz), { status: 200 }),
      ),
    ).rejects.toThrow("SHA-256");
  });

  test("Doom runs at 35 tics per second however often the page polls it", async () => {
    const wasm = readFileSync(join(WEB_ROOT, "src/demos/doom/engine/out/doom.wasm"));
    const wad = new Uint8Array(readFileSync(join(WEB_ROOT, "public/doom/DOOM1.WAD")));
    // Doom's tics come only from the clock it reads (I_GetTime), so watch what the host hands it.
    let engineMs = 0;
    let reads = 0;
    const instantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = ((bytes: BufferSource, imports: { runtimeControl: { timeInMilliseconds: () => bigint } }) => {
      const read = imports.runtimeControl.timeInMilliseconds;
      imports.runtimeControl.timeInMilliseconds = () => {
        const ms = read();
        engineMs = Number(ms);
        reads++;
        return ms;
      };
      return instantiate(bytes, imports as unknown as WebAssembly.Imports);
    }) as typeof WebAssembly.instantiate;
    try {
      // From a clock at exactly 0 (Doom treats a first reading of 0 as unset) and from one 58 days in.
      for (const start of [0, 5_000_000_000.25]) {
        // Every 1ms, at 120Hz and 60Hz animation frames, at Doom's own 35Hz, and at the console's 51ms keyframes.
        for (const pollMs of [1, 1000 / 120, 1000 / 60, 1000 / 35, 51]) {
          let t = start;
          reads = 0;
          const doom = await createDoom({ wasm: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer, wads: [wad], now: () => t });
          // Startup busy-waits once for the first tic.
          expect(reads).toBeLessThan(1100);
          let mostReads = 0;
          const run = (ms: number): number => {
            let frames = 0;
            for (const end = t + ms; t < end; t += pollMs) {
              reads = 0;
              if (doom.tick()) frames++;
              mostReads = Math.max(mostReads, reads);
            }
            return frames;
          };
          // The title screen gives way to the first demo, a level, after 170 tics.
          run(6000);
          mostReads = 0;
          const frames = run(10_000);
          expect(frames).toBeLessThanOrEqual(351);
          // Polled at least once a tic, every tic gets its own frame.
          if (pollMs <= 1000 / 35 - 1) expect(frames).toBeGreaterThanOrEqual(349);
          else expect(frames).toBeGreaterThan(150);
          // A level frame reads the clock 8 times; only a busy-wait reads it more.
          expect(mostReads).toBeLessThanOrEqual(12);
          expect(Math.abs(engineMs - (t - start))).toBeLessThan(pollMs + 1000 / 35);
        }
      }
    } finally {
      WebAssembly.instantiate = instantiate;
    }
  }, 30_000);

  test("DoomDemo skips download on mobile touch fallback and while inactive, shows 4:3 loading progress, and retries on Enter after error", async () => {
    let calls = 0;
    let triggerProgress = (_b: number): void => {};
    let rejectLoad = (_err: Error): void => {};

    const loadAssets = (_signal: AbortSignal, onProgress: (b: number) => void) => {
      calls++;
      triggerProgress = onProgress;
      return new Promise<{ wasm: ArrayBuffer; wad: Uint8Array }>((_resolve, reject) => {
        rejectLoad = reject;
      });
    };

    // 1. Mobile touch fallback: zero downloads even with active={true}
    const prevMatchMedia = globalThis.matchMedia;
    (globalThis as { matchMedia?: unknown }).matchMedia = (q: string) => ({
      matches: q === "(hover: none) and (pointer: coarse)",
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    });
    try {
      const mobileApp = await render(<DoomDemo active={true} loadAssets={loadAssets} />, { cols: 80, rows: 24 });
      expect(calls).toBe(0);
      expect(mobileApp.lastFrame()).toContain(DOOM_CREDIT);
      await mobileApp.unmount();
    } finally {
      if (prevMatchMedia === undefined) delete (globalThis as { matchMedia?: unknown }).matchMedia;
      else globalThis.matchMedia = prevMatchMedia;
    }

    // 2. Desktop inactive -> 0 downloads; once active -> loading state with progress, credit directly on bottom row, and loading hint swap
    const app = await render(<DoomDemo reserveRows={0} active={false} loadAssets={loadAssets} />, { cols: 80, rows: 24 });
    expect(calls).toBe(0);

    await app.rerender(<DoomDemo reserveRows={0} active={true} loadAssets={loadAssets} />);
    expect(calls).toBe(1);
    expect(siteStore.getSnapshot().doomStatus).toBe("loading");
    expect(hintsFor("playground", "doom", siteStore.getSnapshot().doomStatus)).toEqual(DOOM_LOADING_HINTS);

    await app.act(() => triggerProgress(1_200_000));
    const loadingLines = app.lines();
    expect(app.lastFrame()).toContain("Loading DOOM1.WAD… 1.2 / 4.2 MB");
    // Item 11: Credit sits on the very last row of DoomDemo (no dead rows below it)
    expect(loadingLines[loadingLines.length - 1]?.trim()).toBe(DOOM_CREDIT);

    // 3. Error state swaps hints to Enter try again, and pressing Enter retries!
    await app.act(async () => {
      rejectLoad(new Error("network down"));
      await Promise.resolve();
    });
    expect(siteStore.getSnapshot().doomStatus).toBe("failed");
    expect(hintsFor("playground", "doom", siteStore.getSnapshot().doomStatus)).toEqual(DOOM_ERROR_HINTS);
    expect(app.lastFrame()).toContain("Couldn't download DOOM1.WAD. Press Enter to try again.");

    await app.press("return");
    expect(calls).toBe(2);
    expect(siteStore.getSnapshot().doomStatus).toBe("loading");
  });
});
