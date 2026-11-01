import { useRef } from "react";
import { useInput, type KeyEvent, type ThemeName } from "@textjs/react";
import { siteStore } from "./store";

type TeamModule = typeof import("./team");

/** 32-bit FNV-1a. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Every Playground route counts as `/playground`; trailing slashes don't count. */
export function gatePath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p.startsWith("/playground/") ? "/playground" : p;
}

// fnv1a(`${gatePath}:${word}`) in base 36, one per name in ./team (test/team-eggs.test.tsx checks they match).
// The names themselves live only in that lazy chunk.
export const GATES = new Set(
  "117h35l 1vehuzu x90ajr 9dwfpn qz0l2d be7u6q 17t1737 1kmo0ze kkqyhv 10ndas1 w7zlzt 5lhwx0 ghgb1r 1qobslk 4ef2dp 1t9qnp 1gbcczh fvb4x0 43kqau xsmxwa 174tch8 nh8edj 1hxh35i qzr0qv bje0ap 1bcv80x 5ahvi2 1d4qs1f 1tsjt28 1kjg44g n13fut k06600 nshff4 ey3hys 8107o3 1oef8b2 18z6kcb eon31f"
    .split(" ")
    .map((h) => parseInt(h, 36)),
);

/** Gaps longer than this between letters start a new word. */
export const GATE_GAP_MS = 1500;
const MAX_WORD = 12;
/** Vim keys that a focused Select or List takes for navigation, not text. */
const NAV_LETTERS = "jk";

interface Typed {
  ch: string;
  at: number;
  /** The letter reached handlers below focused text editors (nothing consumed it as text). */
  free: boolean;
  theme: ThemeName;
  docSlug: string;
}

let loaded: TeamModule | null = null;

/** The team module, once a gate opened it. */
export function teamModule(): TeamModule | null {
  return loaded;
}

function letterOf(e: KeyEvent): string | null {
  if (e.ctrl || e.meta || e.alt) return null;
  return /^[a-z]$/i.test(e.input) ? e.input.toLowerCase() : null;
}

/** The shortest typed word, ending with the latest letter, that opens a gate on this page. */
export function matchGate(path: string, typed: readonly Pick<Typed, "ch" | "free">[]): { word: string; start: number } | null {
  for (let n = 3; n <= typed.length; n++) {
    const start = typed.length - n;
    const tail = typed.slice(start);
    // Text fields take every letter; a navigation list only takes j and k.
    if (!tail.some((t) => t.free) || tail.some((t) => !t.free && !NAV_LETTERS.includes(t.ch))) continue;
    const word = tail.map((t) => t.ch).join("");
    if (GATES.has(fnv1a(`${path}:${word}`))) return { word, start };
  }
  return null;
}

async function open(path: string, word: string, before: Typed): Promise<void> {
  const mod = (loaded ??= await import("./team"));
  const id = await mod.prepare(path, word);
  const s = siteStore.getSnapshot();
  if (id === null || gatePath(s.pathname) !== path || s.teamEgg !== null) return;
  // Undo what the letters did on their way in (`t` cycles the theme, j/k move the docs list).
  siteStore.set({ teamEgg: id, theme: before.theme, docSlug: before.docSlug });
}

/**
 * Listens for a teammate's name typed into the console. It never stops a key, so every
 * existing shortcut still runs, and it ignores letters a focused text field consumed.
 */
export function useTeamGate(enabled: boolean): void {
  const typed = useRef<Typed[]>([]);
  useInput(
    (e) => {
      const ch = letterOf(e);
      const list = typed.current;
      if (ch === null || !siteStore.getSnapshot().consoleInput) {
        list.length = 0;
        return;
      }
      const now = Date.now();
      const prev = list[list.length - 1];
      if (prev && now - prev.at > GATE_GAP_MS) list.length = 0;
      const s = siteStore.getSnapshot();
      list.push({ ch, at: now, free: false, theme: s.theme, docSlug: s.docSlug });
      if (list.length > MAX_WORD) list.shift();
      // After every handler has seen this key.
      queueMicrotask(() => {
        const path = gatePath(siteStore.getSnapshot().pathname);
        const hit = matchGate(path, list);
        if (!hit) return;
        const before = list[hit.start] as Typed;
        list.length = 0;
        void open(path, hit.word, before);
      });
    },
    { isActive: enabled, priority: 100 },
  );
  // Focused editors handle keys at priority 10 and stop every letter they insert.
  useInput(
    (e) => {
      const last = typed.current[typed.current.length - 1];
      if (last && letterOf(e) === last.ch) last.free = true;
    },
    { isActive: enabled, priority: 9.5 },
  );
}
