import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Pixels, Text, useInput, useKeyState, useViewport, type PixelSource } from "@textjs/react";
import wasmUrl from "./engine/out/doom.wasm?url";
import { createDoom, type DoomHost, type DoomKeys } from "./host";

// id's shareware DOOM1.WAD v1.9, unmodified (see fetch-wad.ts). Served from /public beside its README and licence.
const WAD_URL = "/doom/DOOM1.WAD";
const TIC_MS = 1000 / 35;

/** Physical key → Doom key. Letters and digits not listed here go through as themselves (menus, weapons, y/n). */
const BINDINGS: Record<string, keyof DoomKeys> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyA: "strafeLeft",
  KeyD: "strafeRight",
  Comma: "strafeLeft",
  Period: "strafeRight",
  ControlLeft: "fire",
  ControlRight: "fire",
  KeyF: "fire",
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

export function DoomDemo({ reserveRows = 4 }: { reserveRows?: number }): ReactNode {
  const vp = useViewport();
  const host = useRef<DoomHost | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [frame, setFrame] = useState(0);
  // Doom runs on its own clock, which stands still while the console is paused or the page is unfocused.
  const clock = useRef({ offset: 0, stoppedAt: 0 as number | null });
  const now = (): number => {
    const c = clock.current;
    return (c.stoppedAt ?? performance.now()) - c.offset;
  };

  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(wasmUrl).then((r) => r.arrayBuffer()),
      fetch(WAD_URL).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))),
    ])
      .then(([wasm, wad]) => {
        clock.current = { offset: performance.now(), stoppedAt: null };
        return createDoom({ wasm, wads: [new Uint8Array(wad)], now });
      })
      .then(
        (h) => {
          if (!live) return;
          host.current = h;
          if (import.meta.env.DEV) (globalThis as { __doom?: DoomHost }).__doom = h;
          setStatus("ready");
        },
        () => live && setStatus("failed"),
      );
    return () => {
      live = false;
    };
  }, []);

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
    const k = h ? doomKeyFor(e.code, h.keys) : null;
    if (h === null || k === null) return;
    if (e.down) {
      h.keyDown(k);
      if (running && h.tick()) setFrame((f) => f + 1);
    } else h.keyUp(k);
  });
  // Keep bound keys away from the site's own shortcuts.
  useInput((e) => {
    if (status === "ready" && host.current && doomKeyFor(e.code, host.current.keys) !== null) e.stopPropagation();
  });

  const cols = Math.max(20, vp.cols - 4);
  const rows = Math.max(8, vp.rows - reserveRows - 3);
  if (status !== "ready" || host.current === null) {
    return (
      <Box className="flex-col grow items-center justify-center">
        <Text color={status === "failed" ? "danger" : "subtle"}>{status === "failed" ? "Couldn't load DOOM" : "Loading DOOM…"}</Text>
      </Box>
    );
  }
  const source: PixelSource = host.current.source;
  return (
    <Box className="flex-col grow items-center">
      <Pixels source={source} frame={frame} width={cols} height={rows} pixelAspect={5 / 6} />
      <Text color="subtle">DOOM shareware © id Software</Text>
    </Box>
  );
}
