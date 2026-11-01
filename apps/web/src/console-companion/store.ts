/**
 * Shared state between the react-dom website and the live console companion.
 * Both renderers subscribe with `useSyncExternalStore`, so navigating the site
 * re-renders the console app and console keystrokes can drive the page.
 */

import type { ThemeName } from "@textjs/react";
import { safeDecode } from "../url";

/** The console app shows exactly one view: the one for the current page. */
export type CompanionTab = "home" | "playground" | "opencode" | "docs" | "learn" | "terminal" | "blog";

/** A key worth pressing: `{ keys: "↑ ↓", label: "count" }` (space-separated keycaps). */
export interface Hint {
  keys: string;
  label: string;
}

export type PresetId = "dashboard" | "streaming" | "snake";

export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  /** Sentence fragment for "Then click here and …". */
  action: string;
  hints: readonly Hint[];
}

/** The demos that run in the Playground's own view. The first one opens at /playground. */
export const PRESETS: readonly Preset[] = [
  { id: "dashboard", label: "Dashboard", description: "Live metrics", action: "press ← →", hints: [{ keys: "← →", label: "switch region" }] },
  { id: "streaming", label: "Streaming", description: "Streaming Markdown and diffs", action: "press r", hints: [{ keys: "r", label: "stream again" }] },
  { id: "snake", label: "Snake", description: "A game loop", action: "press an arrow key", hints: [{ keys: "← ↑ → ↓", label: "steer" }, { keys: "Space", label: "pause" }] },
];

const DEFAULT_PRESET = (PRESETS[0] as Preset).id;

export function presetPath(id: PresetId): string {
  return id === DEFAULT_PRESET ? "/playground" : `/playground/${id}`;
}

/** `/playground` → the first demo, `/playground/snake` → Snake, anything else → `null`. */
export function presetForPath(pathname: string): PresetId | null {
  if (pathname === "/playground") return DEFAULT_PRESET;
  const m = /^\/playground\/([^/]+)$/.exec(pathname);
  const id = m ? PRESETS.find((p) => p.id === m[1] && p.id !== DEFAULT_PRESET)?.id : undefined;
  return id ?? null;
}

/** Every option in the Playground picker: its own demos, then the two full apps with their own routes. */
export type DemoId = PresetId | "opencode" | "coffee";

export interface PickerDemo {
  id: DemoId;
  label: string;
  description: string;
  href: string;
}

export const DEMOS: readonly PickerDemo[] = [
  ...PRESETS.map((p) => ({ id: p.id, label: p.label, description: p.description, href: presetPath(p.id) })),
  { id: "opencode", label: "OpenCode", description: "OpenCode Lite, a client for the OpenCode coding agent", href: "/opencode" },
  { id: "coffee", label: "Coffee", description: "The terminal.shop storefront", href: "/coffee" },
];

/** Keys for the non-playground views. */
export const PAGE_HINTS: Record<Exclude<CompanionTab, "playground">, { action: string; hints: readonly Hint[] }> = {
  home: { action: "press ↑ ↓", hints: [{ keys: "↑ ↓", label: "count" }, { keys: "t", label: "theme" }] },
  opencode: { action: "type a prompt", hints: [{ keys: "Enter", label: "send" }, { keys: "Shift Tab", label: "agents" }, { keys: "Ctrl P", label: "commands" }] },
  docs: { action: "press ↑ ↓", hints: [{ keys: "↑ ↓", label: "browse" }, { keys: "Enter", label: "read" }, { keys: "/", label: "search" }] },
  // Each /learn page brings its own keys (learn/course.ts); the course view uses these.
  learn: { action: "press ↓", hints: [{ keys: "↑ ↓", label: "chapters" }, { keys: "Enter", label: "open" }] },
  terminal: { action: "press ↑ ↓ to browse", hints: [{ keys: "↑ ↓", label: "products" }, { keys: "+ −", label: "qty" }, { keys: "c", label: "cart" }] },
  blog: { action: "press ↓", hints: [{ keys: "↑ ↓", label: "scroll" }] },
};

export function hintsFor(tab: CompanionTab, preset: PresetId): { action: string; hints: readonly Hint[] } {
  if (tab === "playground") return PRESETS.find((p) => p.id === preset) ?? (PRESETS[0] as Preset);
  return PAGE_HINTS[tab];
}

/** Routes whose page is one big focus pad: console input stays engaged while moving between them. */
export function isPadRoute(pathname: string): boolean {
  return pathname.startsWith("/playground") || pathname.startsWith("/opencode") || pathname === "/coffee";
}

export const THEME_ORDER: readonly ThemeName[] = ["geistDark", "opencodeDark", "tokyoNight", "amberCrt", "geistLight"];

export type OpenCodeConnection =
  | { mode: "sandbox" }
  | { mode: "connecting"; url: string }
  | { mode: "live"; url: string; version?: string; protocol?: "v1" | "v2"; bridge?: boolean }
  | { mode: "error"; url: string; message: string };

export interface SiteState {
  pathname: string;
  tab: CompanionTab;
  preset: PresetId;
  /** Theme of the live console companion. */
  theme: ThemeName;
  /** Docs slug selected inside the console Docs tab ("" = introduction). */
  docSlug: string;
  /** Whether keystrokes outside form fields are routed into the console app. */
  consoleInput: boolean;
  opencode: OpenCodeConnection;
  /** Live example (preview id) running in the console instead of the Docs or Home view, or `null`. */
  example: string | null;
  /** `/exit` in OpenCode paused and cleared the console; engaging the pad again restarts it. */
  opencodeExited: boolean;
  /** Yoga layout wireframe in the companion (F2, `text.wireframe()` and the mirror's inspect button). */
  wireframe: boolean;
}

type Listener = () => void;

/** Unknown routes (404s) map to Home so demos like Snake never keep running off-route. */
function tabForPath(pathname: string): CompanionTab {
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/playground")) return "playground";
  if (pathname.startsWith("/opencode")) return "opencode";
  // terminal.shop's storefront, at /coffee.
  if (pathname === "/coffee") return "terminal";
  if (pathname === "/learn" || pathname.startsWith("/learn/")) return "learn";
  if (/^\/blog\/[^/]+\/?$/.test(pathname)) return "blog";
  return "home";
}

function docSlugForPath(pathname: string): string | null {
  if (pathname === "/docs" || pathname === "/docs/") return "";
  const m = /^\/docs\/([^/]+)/.exec(pathname);
  return m ? safeDecode(m[1] as string) : null;
}

const DEFAULT_STATE: SiteState = {
  pathname: "/",
  tab: "home",
  preset: DEFAULT_PRESET,
  theme: "geistDark",
  docSlug: "",
  consoleInput: false,
  opencode: { mode: "sandbox" },
  example: null,
  opencodeExited: false,
  wireframe: false,
};

export class SiteStore {
  private state: SiteState;
  private readonly listeners = new Set<Listener>();

  constructor(initial: Partial<SiteState> = {}) {
    this.state = { ...DEFAULT_STATE, ...initial };
  }

  /** Restore the defaults (tests). */
  reset(): void {
    this.set(DEFAULT_STATE);
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SiteState => this.state;

  set(patch: Partial<SiteState>): void {
    let changed = false;
    for (const k in patch) {
      const key = k as keyof SiteState;
      if (patch[key] !== this.state[key]) changed = true;
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  /** Called by the website router on every navigation. */
  syncRoute(pathname: string): void {
    const patch: Partial<SiteState> = { pathname, tab: tabForPath(pathname) };
    // Regular pages get their arrow keys and scrolling back.
    if (!isPadRoute(pathname)) patch.consoleInput = false;
    const preset = presetForPath(pathname);
    if (preset) patch.preset = preset;
    const slug = docSlugForPath(pathname);
    if (slug !== null) patch.docSlug = slug;
    // A docs example belongs to its page.
    if (pathname !== this.state.pathname) patch.example = null;
    this.set(patch);
  }

  /** Run an example in the console and route keystrokes to it. */
  activateExample(id: string): void {
    this.set({ example: id, consoleInput: true });
  }

  /** Back to the page's view (only if `id`, when given, is still the active example). */
  exitExample(id?: string): void {
    if (this.state.example === null || (id !== undefined && this.state.example !== id)) return;
    this.set({ example: null, consoleInput: false });
  }

  cycleTheme(): ThemeName {
    const i = THEME_ORDER.indexOf(this.state.theme);
    const next = THEME_ORDER[(i + 1) % THEME_ORDER.length] as ThemeName;
    this.set({ theme: next });
    return next;
  }
}

export const siteStore = new SiteStore();

export { tabForPath, docSlugForPath };
