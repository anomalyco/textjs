import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge, Box, KeyHint, Text, useInput, useTheme, useViewport } from "@textjs/react";
import { useFrameStats } from "../console-companion/useFrameStats";

type Dir = "up" | "down" | "left" | "right";
interface Point {
  x: number;
  y: number;
}

interface Game {
  w: number;
  h: number;
  snake: Point[];
  dir: Dir;
  queue: Dir[];
  food: Point;
  score: number;
  status: "ready" | "running" | "paused" | "over";
  ticks: number;
  moveEvery: number;
}

const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const HIGH_KEY = "textjs:snake:high";

function readHigh(): number {
  try {
    return Number(globalThis.localStorage?.getItem(HIGH_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeHigh(n: number): void {
  try {
    globalThis.localStorage?.setItem(HIGH_KEY, String(n));
  } catch {
    // storage unavailable (private mode)
  }
}

function placeFood(g: Pick<Game, "w" | "h" | "snake">): Point {
  const taken = new Set(g.snake.map((p) => p.y * g.w + p.x));
  const free = g.w * g.h - taken.size;
  if (free <= 0) return { x: -1, y: -1 };
  let idx = Math.floor(Math.random() * free);
  for (let i = 0; i < g.w * g.h; i++) {
    if (taken.has(i)) continue;
    if (idx-- === 0) return { x: i % g.w, y: Math.floor(i / g.w) };
  }
  return { x: 0, y: 0 };
}

export function newGame(w: number, h: number): Game {
  const cx = Math.floor(w / 3);
  const cy = Math.floor(h / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  return { w, h, snake, dir: "right", queue: [], food: placeFood({ w, h, snake }), score: 0, status: "ready", ticks: 0, moveEvery: 6 };
}

/** Advance one simulation step. Exported for tests. */
export function step(g: Game): void {
  const next = g.queue.shift();
  if (next && next !== OPPOSITE[g.dir]) g.dir = next;
  const head = g.snake[0] as Point;
  const n = { x: head.x + (g.dir === "left" ? -1 : g.dir === "right" ? 1 : 0), y: head.y + (g.dir === "up" ? -1 : g.dir === "down" ? 1 : 0) };
  const hitWall = n.x < 0 || n.y < 0 || n.x >= g.w || n.y >= g.h;
  const eating = n.x === g.food.x && n.y === g.food.y;
  const body = eating ? g.snake : g.snake.slice(0, -1);
  if (hitWall || body.some((p) => p.x === n.x && p.y === n.y)) {
    g.status = "over";
    return;
  }
  g.snake = [n, ...body];
  if (eating) {
    g.score += 10;
    g.moveEvery = Math.max(3, 6 - Math.floor(g.score / 60));
    g.food = placeFood(g);
  }
}

const KEYMAP: Record<string, Dir> = { up: "up", down: "down", left: "left", right: "right", w: "up", s: "down", a: "left", d: "right", k: "up", j: "down", h: "left", l: "right" };

export interface SnakeDemoProps {
  /** Rows reserved for surrounding chrome (header, tabs, footer). */
  reserveRows?: number;
  /** Start immediately instead of waiting for Space. */
  autoStart?: boolean;
  title?: string;
}

export function SnakeDemo({ reserveRows = 4, autoStart = false, title = "console snake" }: SnakeDemoProps): ReactNode {
  const theme = useTheme();
  const vp = useViewport();
  const stats = useFrameStats();
  const h = Math.max(6, Math.min(22, vp.rows - reserveRows - 2));
  const w = Math.max(10, Math.min(32, Math.floor((vp.cols - 30) / 2)));
  const game = useRef<Game>(newGame(w, h));
  const [, setFrame] = useState(0);
  const [high, setHigh] = useState(readHigh);

  useEffect(() => {
    if (game.current.w === w && game.current.h === h) return;
    game.current = newGame(w, h);
    setFrame((f) => f + 1);
  }, [w, h]);
  if (autoStart && game.current.status === "ready") game.current.status = "running";

  const running = game.current.status === "running";
  // Idle at zero CPU while the page is unfocused or console output is paused.
  const ticking = running && vp.focused && !vp.paused;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const g = game.current;
      if (g.status !== "running") return;
      g.ticks++;
      if (g.ticks % g.moveEvery === 0) {
        step(g);
        if ((g.status as Game["status"]) === "over" && g.score > readHigh()) {
          writeHigh(g.score);
          setHigh(g.score);
        }
      }
      setFrame((f) => f + 1);
    }, 16);
    return () => clearInterval(id);
  }, [ticking]);

  useInput((e) => {
    const g = game.current;
    const dir = e.ctrl || e.meta ? undefined : KEYMAP[e.key];
    if (dir) {
      e.stopPropagation();
      if (g.status === "ready" || g.status === "paused") g.status = "running";
      if (g.status === "running") {
        const last = g.queue[g.queue.length - 1] ?? g.dir;
        if (dir !== last && dir !== OPPOSITE[last] && g.queue.length < 3) g.queue.push(dir);
      }
      setFrame((f) => f + 1);
      return;
    }
    if (e.key === "space" || e.input === "p") {
      e.stopPropagation();
      if (g.status === "over") game.current = { ...newGame(w, h), status: "running" };
      else g.status = g.status === "running" ? "paused" : "running";
      setFrame((f) => f + 1);
    } else if (e.input === "r") {
      e.stopPropagation();
      game.current = newGame(w, h);
      setFrame((f) => f + 1);
    }
  });

  const g = game.current;
  const cells = new Uint8Array(g.w * g.h);
  g.snake.forEach((p, i) => {
    if (p.x >= 0 && p.y >= 0 && p.x < g.w && p.y < g.h) cells[p.y * g.w + p.x] = i === 0 ? 2 : 1;
  });
  if (g.food.x >= 0) cells[g.food.y * g.w + g.food.x] = 3;
  const bgFor = [theme.surface, theme.success, theme.accent, theme.danger];

  const rows: ReactNode[] = [];
  for (let y = 0; y < g.h; y++) {
    const segs: ReactNode[] = [];
    let x = 0;
    while (x < g.w) {
      const kind = cells[y * g.w + x] as number;
      let len = 1;
      while (x + len < g.w && cells[y * g.w + x + len] === kind) len++;
      const text = kind === 0 ? "· ".repeat(len) : kind === 3 ? "◆ ".repeat(len) : "  ".repeat(len);
      segs.push(
        <Text key={x} bg={kind === 3 ? theme.surface : bgFor[kind]} color={kind === 3 ? theme.danger : theme.border}>
          {text}
        </Text>,
      );
      x += len;
    }
    rows.push(
      <Text key={y} wrap="nowrap">
        {segs}
      </Text>,
    );
  }

  const statusBadge =
    g.status === "running" ? <Badge variant="success">PLAYING</Badge> : g.status === "paused" ? <Badge variant="warning">PAUSED</Badge> : g.status === "over" ? <Badge variant="danger">GAME OVER</Badge> : <Badge variant="accent">READY</Badge>;

  return (
    <Box className="flex-row grow gap-2 px-1">
      <Box className="flex-col shrink-0 border rounded" alignSelf="flex-start" borderColor={running ? theme.borderFocus : theme.border} title={` ${title} `} titleColor={theme.muted}>
        {rows}
      </Box>
      <Box className="flex-col grow gap-1 pt-1">
        <Box className="flex-row gap-1">{statusBadge}</Box>
        <Box className="flex-col">
          <Text color="muted">score</Text>
          <Text bold color="fg">{String(g.score)}</Text>
        </Box>
        <Box className="flex-col">
          <Text color="muted">high score</Text>
          <Text color="fg">{String(Math.max(high, g.score))}</Text>
        </Box>
        <Box className="flex-col">
          <Text color="muted">turbolog</Text>
          <Text color="accent">{`${stats.fps} fps · ${stats.totalMs.toFixed(2)}ms`}</Text>
          <Text color="subtle">{`${stats.spanCount} %c spans/frame`}</Text>
          <Text color="subtle">{`${stats.frameCount} console.log calls`}</Text>
          <Text color="subtle">{`tick ${String(g.ticks).padStart(5, "0")} ${"▰".repeat(g.ticks % g.moveEvery + 1).padEnd(g.moveEvery, "▱")}`}</Text>
        </Box>
        <Box className="grow" />
        <Box className="flex-col">
          <KeyHint keys="wasd/←↑→↓" label="steer" />
          <KeyHint keys="space" label={g.status === "over" ? "play again" : "start / pause"} />
          <KeyHint keys="r" label="reset" />
        </Box>
      </Box>
    </Box>
  );
}
