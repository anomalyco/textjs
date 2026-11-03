// Host glue for jacobenget/doom.wasm (GPL-2.0, loaded at runtime from ./engine/, never bundled).
// This file only implements the module's 10 imports, so it's ours to license.
import type { PixelSource } from "@textjs/react/experimental";

const DOOM_TICRATE = 35;
// A normal tickGame() reads the clock twice, once more per tic it runs, and 5 more times to draw a level frame
// (NetUpdate in R_RenderPlayerView and D_Display). Only a busy-wait for the next tic reads it this often.
const BUSY_WAIT_POLLS = 1000;

export interface DoomKeys {
  left: number;
  right: number;
  up: number;
  down: number;
  fire: number;
  use: number;
  run: number;
  strafe: number;
  strafeLeft: number;
  strafeRight: number;
  escape: number;
  enter: number;
  tab: number;
  backspace: number;
}

export interface DoomHost {
  /** 320×200 packed `0xRRGGBBAA`, rewritten in place on every drawn frame. */
  readonly source: PixelSource;
  readonly keys: DoomKeys;
  /** Run the game up to now without busy-spinning between 35Hz tics. Returns `true` when a new frame was drawn. */
  tick(): boolean;
  keyDown(doomKey: number): void;
  keyUp(doomKey: number): void;
}

export interface DoomOptions {
  wasm: ArrayBuffer;
  /** IWAD first, then any PWADs. */
  wads: Uint8Array[];
  now?: () => number;
  log?: (message: string) => void;
}

export async function createDoom({ wasm, wads, now = () => performance.now(), log }: DoomOptions): Promise<DoomHost> {
  const total = wads.reduce((n, w) => n + w.length, 0);
  let memory: WebAssembly.Memory | null = null;
  const mem = (): ArrayBuffer => (memory as WebAssembly.Memory).buffer;
  const text = (p: number, n: number): string => new TextDecoder().decode(new Uint8Array(mem(), p, n));
  const source: PixelSource = { width: 320, height: 200, data: new Uint32Array(320 * 200) };
  let fw = 0;
  let fh = 0;
  let drawn = false;
  let baseMs: number | null = null;
  // Milliseconds since startup, read once per initGame() or tick() so a slow frame can't cross into the next tic.
  let tickMs = 0;
  // The last time handed to the engine. It follows tickMs and only runs ahead of it to end a busy-wait,
  // and the wall clock then catches up to it, so Doom stays at 35 tics per second.
  let engineMs = 0;
  let pollsInTick = 0;

  const elapsedMs = (): number => {
    const ms = Math.floor(now());
    if (baseMs === null) baseMs = ms;
    return Math.max(0, ms - baseMs);
  };
  // Doom's I_GetTime(): whole tics since startup.
  const ticAt = (ms: number): number => Math.floor((ms * DOOM_TICRATE) / 1000);

  const imports = {
    console: {
      onInfoMessage: (p: number, n: number) => log?.(text(p, n)),
      onErrorMessage: (p: number, n: number) => log?.(text(p, n)),
    },
    gameSaving: { readSaveGame: () => 0, sizeOfSaveGame: () => 0, writeSaveGame: () => 0 },
    loading: {
      onGameInit: (w: number, h: number) => {
        fw = w;
        fh = h;
      },
      wadSizes: (pCount: number, pBytes: number) => {
        const dv = new DataView(mem());
        dv.setInt32(pCount, wads.length, true);
        dv.setInt32(pBytes, total, true);
      },
      readWads: (pData: number, pLengths: number) => {
        const bytes = new Uint8Array(mem());
        const dv = new DataView(mem());
        let o = pData;
        wads.forEach((w, i) => {
          bytes.set(w, o);
          o += w.length;
          dv.setInt32(pLengths + i * 4, w.length, true);
        });
      },
    },
    runtimeControl: {
      timeInMilliseconds: () => {
        engineMs = Math.max(engineMs, tickMs);
        // TryRunTics busy-waits for the next tic edge when it has none to run (at startup). Skip to the edge
        // instead of spinning; tick() then waits for the wall clock to reach it.
        if (++pollsInTick > BUSY_WAIT_POLLS) {
          engineMs = Math.ceil(((ticAt(engineMs) + 1) * 1000) / DOOM_TICRATE);
          pollsInTick = 0;
        }
        // i_timer.c takes a first reading of 0 as "not read yet", which would put Doom's tic edges out of phase with ours.
        return BigInt(engineMs + 1);
      },
    },
    ui: {
      // The engine draws 0x00RRGGBB at an integer multiple of 320×200; keep every Nth pixel.
      drawFrame: (p: number) => {
        const px = new Uint32Array(mem(), p, fw * fh);
        const step = Math.max(1, Math.round(fw / 320));
        const out = source.data;
        for (let y = 0; y < 200; y++) {
          const row = y * step * fw;
          const outRow = y * 320;
          for (let x = 0; x < 320; x++) {
            const c = px[row + x * step] as number;
            out[outRow + x] = ((c << 8) | 0xff) >>> 0;
          }
        }
        drawn = true;
      },
    },
  };

  const { instance } = await WebAssembly.instantiate(wasm, imports);
  const ex = instance.exports as Record<string, unknown> & {
    memory: WebAssembly.Memory;
    initGame(): void;
    tickGame(): void;
    reportKeyDown(k: number): void;
    reportKeyUp(k: number): void;
  };
  memory = ex.memory;
  const g = (name: string): number => (ex[name] as WebAssembly.Global).value as number;
  const keys: DoomKeys = {
    left: g("KEY_LEFTARROW"),
    right: g("KEY_RIGHTARROW"),
    up: g("KEY_UPARROW"),
    down: g("KEY_DOWNARROW"),
    fire: g("KEY_FIRE"),
    use: g("KEY_USE"),
    run: g("KEY_SHIFT"),
    strafe: g("KEY_ALT"),
    strafeLeft: g("KEY_STRAFE_L"),
    strafeRight: g("KEY_STRAFE_R"),
    escape: g("KEY_ESCAPE"),
    enter: g("KEY_ENTER"),
    tab: g("KEY_TAB"),
    backspace: g("KEY_BACKSPACE"),
  };
  tickMs = elapsedMs();
  pollsInTick = 0;
  ex.initGame();

  // doom.wasm reports key *state* when the engine polls, so a tap that goes down and up between two
  // ticks would never be seen. Hold each release until a tick has observed the press.
  const unseen = new Set<number>();
  const releaseAfterTick = new Set<number>();
  return {
    source,
    keys,
    tick() {
      // The engine has built tics up to the last time it read, so it only has new work once the wall clock passes that tic.
      const nowMs = elapsedMs();
      if (ticAt(nowMs) <= ticAt(engineMs)) return false;
      tickMs = nowMs;
      drawn = false;
      pollsInTick = 0;
      ex.tickGame();
      unseen.clear();
      for (const k of releaseAfterTick) ex.reportKeyUp(k);
      releaseAfterTick.clear();
      return drawn;
    },
    keyDown(k) {
      releaseAfterTick.delete(k);
      unseen.add(k);
      ex.reportKeyDown(k);
    },
    keyUp(k) {
      if (unseen.has(k)) releaseAfterTick.add(k);
      else ex.reportKeyUp(k);
    },
  };
}
