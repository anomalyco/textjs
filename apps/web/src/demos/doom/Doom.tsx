import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Text, useInput, useViewport } from "@textjs/react";
import { Pixels, useKeyState, type PixelSource } from "@textjs/react/experimental";
import { siteStore, type DoomStatus } from "../../console-companion/store";
import wasmUrl from "./engine/out/doom.wasm?url";
import { createDoom, type DoomHost, type DoomKeys } from "./host";

// id's shareware DOOM1.WAD v1.9, gzipped from the unmodified file (see fetch-wad.ts) and verified by SHA-256 after decompression.
export const WAD_URL = "/doom/DOOM1.WAD.gz";
export const WAD_BYTES = 4_196_020;
export const WAD_SHA256 = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";
export const DOOM_CREDIT = "DOOM shareware © 1993–1995 id Software";
const TIC_MS = 1000 / 35;

/** Physical key → Doom key. Letters and digits not listed here go through as themselves (menus, weapons, y/n). */
const BINDINGS: Record<string, keyof DoomKeys> = {
  ArrowLeft: "left",
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  KeyW: "up",
  KeyS: "down",
  KeyA: "strafeLeft",
  KeyD: "strafeRight",
  Comma: "strafeLeft",
  Period: "strafeRight",
  KeyF: "fire",
  ControlLeft: "fire",
  ControlRight: "fire",
  Space: "use",
  KeyE: "use",
  ShiftLeft: "run",
  ShiftRight: "run",
  AltLeft: "strafe",
  AltRight: "strafe",
  Enter: "enter",
  Escape: "escape",
  Tab: "tab",
  Backspace: "backspace",
};

function doomKeyFor(code: string, keys: DoomKeys): number | null {
  const bound = BINDINGS[code];
  if (bound) return keys[bound];
  const m = /^(?:Key([A-Z])|Digit(\d))$/.exec(code);
  if (m) return (m[1] ?? (m[2] as string)).toLowerCase().charCodeAt(0);
  return null;
}

export function isMobileTouchFallback(): boolean {
  return typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>));
  let hex = "";
  for (let i = 0; i < digest.length; i++) hex += (digest[i] as number).toString(16).padStart(2, "0");
  return hex;
}

/** Stream `DOOM1.WAD.gz`, decompress with `DecompressionStream("gzip")`, report byte progress, and verify SHA-256. */
export async function fetchVerifiedWad(
  url: string,
  signal: AbortSignal,
  onProgress: (loadedBytes: number) => void,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<Uint8Array> {
  const res = await fetchImpl(url, { signal });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const rawReader = res.body.getReader();
  const first = await rawReader.read();
  if (first.done || !first.value) throw new Error("Empty WAD response");
  const isGzip = first.value.length >= 2 && first.value[0] === 0x1f && first.value[1] === 0x8b;

  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first.value);
    },
    async pull(controller) {
      const next = await rawReader.read();
      if (next.done) controller.close();
      else if (next.value) controller.enqueue(next.value);
    },
    cancel(reason) {
      return rawReader.cancel(reason);
    },
  });

  const stream = isGzip ? source.pipeThrough(new DecompressionStream("gzip") as ReadableWritablePair<Uint8Array, Uint8Array>) : source;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let lastTenth = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      chunks.push(value);
      total += value.byteLength;
      const clamped = Math.min(total, WAD_BYTES);
      const tenth = Math.round(clamped / 100_000);
      if (tenth !== lastTenth) {
        lastTenth = tenth;
        onProgress(clamped);
      }
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  if (out.byteLength !== WAD_BYTES || (await sha256Hex(out)) !== WAD_SHA256) {
    throw new Error("DOOM1.WAD SHA-256 mismatch");
  }
  onProgress(WAD_BYTES);
  return out;
}

export interface DoomDemoProps {
  reserveRows?: number;
  /** On desktop, fetch only once the companion is active. */
  active?: boolean;
  /** Injected in tests to control download progress, errors, and retries. */
  loadAssets?: (signal: AbortSignal, onProgress: (bytes: number) => void) => Promise<{ wasm: ArrayBuffer; wad: Uint8Array }>;
}

export function DoomDemo({ reserveRows = 4, active = true, loadAssets }: DoomDemoProps): ReactNode {
  const vp = useViewport();
  const host = useRef<DoomHost | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  if (active && !isMobileTouchFallback()) startedRef.current = true;
  const started = startedRef.current;
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<DoomStatus>(() => (started ? "loading" : "idle"));
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [frame, setFrame] = useState(0);
  // Doom runs on its own clock, which stands still while the console is paused or the page is unfocused.
  const clock = useRef({ offset: 0, stoppedAt: 0 as number | null });
  const now = (): number => {
    const c = clock.current;
    return (c.stoppedAt ?? performance.now()) - c.offset;
  };

  useEffect(() => {
    siteStore.set({ doomStatus: status });
  }, [status]);

  useEffect(
    () => () => {
      siteStore.set({ doomStatus: "ready" });
    },
    [],
  );

  useEffect(() => {
    if (!started || host.current !== null) return;
    let live = true;
    const ac = new AbortController();
    abortRef.current = ac;
    setLoadedBytes(0);
    setStatus("loading");

    const loader =
      loadAssets ??
      (async (signal: AbortSignal, onProgress: (bytes: number) => void) => {
        const [wasm, wad] = await Promise.all([
          fetch(wasmUrl, { signal }).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))),
          fetchVerifiedWad(WAD_URL, signal, onProgress),
        ]);
        return { wasm, wad };
      });

    loader(ac.signal, (bytes) => {
      if (live) setLoadedBytes(bytes);
    })
      .then(({ wasm, wad }) => {
        // Start at 0 and stopped: the clock runs once the game is ready and the page is focused.
        const t = performance.now();
        clock.current = { offset: t, stoppedAt: t };
        return createDoom({ wasm, wads: [wad], now });
      })
      .then(
        (h) => {
          if (!live) return;
          host.current = h;
          if (import.meta.env.DEV) (globalThis as { __doom?: DoomHost }).__doom = h;
          setStatus("ready");
        },
        () => {
          if (live) setStatus("failed");
        },
      );
    return () => {
      live = false;
      ac.abort();
      if (abortRef.current === ac) abortRef.current = null;
    };
  }, [started, attempt, loadAssets]);

  const running = status === "ready" && vp.focused && !vp.paused;
  useEffect(() => {
    const c = clock.current;
    if (!running) {
      if (c.stoppedAt === null) c.stoppedAt = performance.now();
      return;
    }
    if (c.stoppedAt !== null) {
      c.offset += performance.now() - c.stoppedAt;
      c.stoppedAt = null;
    }
    // Poll Doom's native 35Hz tic clock on animation frames, with a timer backup while DevTools holds focus.
    let raf = 0;
    const step = (): void => {
      if (host.current?.tick()) setFrame((f) => f + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const timer = setInterval(() => {
      if (host.current?.tick()) setFrame((f) => f + 1);
    }, TIC_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [running]);

  useKeyState((e) => {
    const h = host.current;
    const k = status === "ready" && h ? doomKeyFor(e.code, h.keys) : null;
    if (h === null || k === null) return;
    if (e.down) {
      h.keyDown(k);
      if (running && h.tick()) setFrame((f) => f + 1);
    } else h.keyUp(k);
  });

  useInput((e) => {
    if (status === "loading" && e.key === "escape") {
      e.stopPropagation();
      abortRef.current?.abort();
      return;
    }
    if (status === "failed" && e.key === "return") {
      e.stopPropagation();
      setAttempt((n) => n + 1);
      return;
    }
    if (status === "ready" && host.current && doomKeyFor(e.code, host.current.keys) !== null) {
      e.stopPropagation();
    }
  });

  const availCols = Math.max(20, vp.cols - 4);
  const availRows = Math.max(6, vp.rows - reserveRows - 1);
  // 4:3 picture geometry in cells (1 cell ≈ 1:2 width:height, so cols / (rows * 2) = 4 / 3 → cols = rows * 8 / 3).
  const fitCols = Math.min(availCols, Math.max(16, Math.round((availRows * 8) / 3)));
  const fitRows = Math.min(availRows, Math.max(6, Math.round((fitCols * 3) / 8)));
  const totalMb = (WAD_BYTES / 1_000_000).toFixed(1);
  const curMb = (Math.min(loadedBytes, WAD_BYTES) / 1_000_000).toFixed(1);

  return (
    <Box className="flex-col grow items-center">
      <Box width={availCols} height={availRows} alignItems="center" justifyContent="center">
        {status === "ready" && host.current !== null ? (
          <Pixels source={host.current.source as PixelSource} frame={frame} width={fitCols} height={fitRows} pixelAspect={5 / 6} />
        ) : (
          <Box width={fitCols} height={fitRows} bg="#000000" paddingX={2} alignItems="center" justifyContent="center">
            {status === "loading" ? (
              <Text color="subtle" align="center">{`Loading DOOM1.WAD… ${curMb} / ${totalMb} MB`}</Text>
            ) : status === "failed" ? (
              <Text color="danger" align="center">
                Couldn't download DOOM1.WAD. Press Enter to try again.
              </Text>
            ) : null}
          </Box>
        )}
      </Box>
      <Text color="subtle" wrap="nowrap">
        {DOOM_CREDIT}
      </Text>
    </Box>
  );
}
