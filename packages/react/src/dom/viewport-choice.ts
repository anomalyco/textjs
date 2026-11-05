import type { ConsoleRoot } from "../root";

/** `"fit"` follows the docked DevTools console; a size pins the grid. */
export type ViewportChoice = "fit" | { cols: number; rows: number };

export const VIEWPORT_CHOICE_KEY = "textjs:viewport";
export const VIEWPORT_PRESETS: ReadonlyArray<{ cols: number; rows: number }> = [
  { cols: 80, rows: 24 },
  { cols: 120, rows: 36 },
  { cols: 160, rows: 48 },
];

const MIN = { cols: 20, rows: 6 };
const MAX = { cols: 400, rows: 150 };

export function formatViewportChoice(choice: ViewportChoice): string {
  return choice === "fit" ? "fit" : `${choice.cols}x${choice.rows}`;
}

/** Parse `"fit"` or `"120x36"` (`×` also accepted); `null` when invalid. */
export function parseViewportChoice(value: string | null | undefined): ViewportChoice | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "fit" || v === "auto") return "fit";
  const m = /^(\d{1,3})\s*[x×]\s*(\d{1,3})$/.exec(v);
  if (!m) return null;
  const cols = Number(m[1]);
  const rows = Number(m[2]);
  if (cols < MIN.cols || rows < MIN.rows || cols > MAX.cols || rows > MAX.rows) return null;
  return { cols, rows };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadViewportChoice(key: string = VIEWPORT_CHOICE_KEY): ViewportChoice | null {
  try {
    return parseViewportChoice(storage()?.getItem(key));
  } catch {
    return null;
  }
}

export function saveViewportChoice(choice: ViewportChoice, key: string = VIEWPORT_CHOICE_KEY): void {
  try {
    storage()?.setItem(key, formatViewportChoice(choice));
  } catch {
    // Storage may be blocked.
  }
}

export function applyViewportChoice(root: ConsoleRoot, choice: ViewportChoice): void {
  if (root.unmounted) return;
  if (choice === "fit") root.renderer.viewport.setResponsive(true);
  else root.renderer.resize(choice.cols, choice.rows);
  root.viewport.refresh();
}
