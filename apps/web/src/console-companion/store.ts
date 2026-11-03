import { msg } from "../i18n/t";
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

export type PresetId = "dashboard" | "streaming" | "snake" | "doom";

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
  { id: "dashboard", label: "Dashboard", description: msg("Live metrics"), action: "press ← →", hints: [{ keys: "← →", label: "switch region" }] },
  { id: "streaming", label: "Streaming", description: msg("Streaming Markdown and diffs"), action: "press r", hints: [{ keys: "r", label: "stream again" }] },
  { id: "snake", label: "Snake", description: msg("A game loop"), action: "press an arrow key", hints: [{ keys: "← ↑ → ↓", label: "steer" }, { keys: "Space", label: "pause" }] },
  { id: "doom", label: "Doom", description: msg("The shareware episode"), action: "press Enter", hints: [{ keys: "← ↑ → ↓", label: "move" }, { keys: "F", label: "fire" }, { keys: "Space", label: "open" }] },
];

const DEFAULT_PRESET = (PRESETS[0] as Preset).id;

/** Demos with a top-level URL, like /opencode and /coffee. */
const OWN_PATHS: Partial<Record<PresetId, string>> = { doom: "/doom" };

export function presetPath(id: PresetId): string {
  return OWN_PATHS[id] ?? (id === DEFAULT_PRESET ? "/playground" : `/playground/${id}`);
}

/** `/playground` → the first demo, `/playground/snake` → Snake, `/doom` → Doom, anything else → `null`. */
export function presetForPath(pathname: string): PresetId | null {
  return PRESETS.find((p) => presetPath(p.id) === pathname)?.id ?? null;
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
  { id: "opencode", label: "OpenCode", description: msg("OpenCode Lite, a client for the OpenCode coding agent"), href: "/opencode" },
  { id: "coffee", label: "Coffee", description: msg("The terminal.shop storefront"), href: "/coffee" },
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

/** Which part of the console Docs view has the keyboard: the page list, the page itself or the search field. */
export type DocsPane = "list" | "content" | "search";

/** Keys while reading a page in the Docs view. */
export const DOCS_READING_HINTS: readonly Hint[] = [
  { keys: "↑ ↓", label: "scroll" },
  { keys: "Space", label: "page" },
  { keys: "←", label: "back" },
  { keys: "/", label: "search" },
];

export type DoomStatus = "idle" | "loading" | "failed" | "ready";

export const DOOM_LOADING_HINTS: { action: string; hints: readonly Hint[] } = {
  action: "press Esc to cancel",
  hints: [{ keys: "Esc", label: "cancel" }],
};

export const DOOM_ERROR_HINTS: { action: string; hints: readonly Hint[] } = {
  action: "press Enter to try again",
  hints: [{ keys: "Enter", label: "try again" }],
};

export function hintsFor(tab: CompanionTab, preset: PresetId, doomStatus: DoomStatus = "ready"): { action: string; hints: readonly Hint[] } {
  if (tab === "playground") {
    if (preset === "doom") {
      if (doomStatus === "loading") return DOOM_LOADING_HINTS;
      if (doomStatus === "failed") return DOOM_ERROR_HINTS;
    }
    return PRESETS.find((p) => p.id === preset) ?? (PRESETS[0] as Preset);
  }
  return PAGE_HINTS[tab];
}

/** Routes whose page is one big focus pad: console input stays engaged while moving between them. */
export function isPadRoute(pathname: string): boolean {
  return pathname.startsWith("/playground") || presetForPath(pathname) !== null || pathname.startsWith("/opencode") || pathname === "/coffee";
}

export const THEME_ORDER: readonly ThemeName[] = ["geistDark", "opencodeDark", "tokyoNight", "amberCrt", "geistLight"];

export type OpenCodeConnection =
  | { mode: "sandbox" }
  | { mode: "connecting"; url: string }
  | { mode: "pair"; url: string; message?: string; wrong?: boolean }
  | { mode: "live"; url: string; version?: string; protocol?: "v1" | "v2"; bridge?: boolean; token?: string }
  | { mode: "error"; url: string; message: string };

export interface SiteState {
  pathname: string;
  tab: CompanionTab;
  preset: PresetId;
  /** Theme of the live console companion. */
  theme: ThemeName;
  /** Docs slug selected inside the console Docs tab ("" = introduction). */
  docSlug: string;
  /** Focused part of the console Docs view. */
  docsPane: DocsPane;
  /** Whether keystrokes outside form fields are routed into the console app. */
  consoleInput: boolean;
  opencode: OpenCodeConnection;
  /** Live example (preview id) running in the console instead of the Docs or Home view, or `null`. */
  example: string | null;
  /** `/exit` in OpenCode paused and cleared the console; engaging the pad again restarts it. */
  opencodeExited: boolean;
  /** Yoga layout wireframe in the companion (F2, `text.wireframe()` and the mirror's inspect button). */
  wireframe: boolean;
  /** A teammate's console view (console-companion/team), shown in DevTools only, or `null`. */
  teamEgg: string | null;
  /** Current state of the Doom preset, so the hint row swaps to the single action while loading or on error. */
  doomStatus: DoomStatus;
}

type Listener = () => void;

/** Unknown routes (404s) map to Home so demos like Snake never keep running off-route. */
function tabForPath(pathname: string): CompanionTab {
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/playground") || presetForPath(pathname)) return "playground";
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
  docsPane: "list",
  consoleInput: false,
  opencode: { mode: "sandbox" },
  example: null,
  opencodeExited: false,
  wireframe: false,
  teamEgg: null,
  doomStatus: "ready",
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
    else patch.docsPane = "list";
    // A docs example belongs to its page.
    if (pathname !== this.state.pathname) {
      patch.example = null;
      patch.teamEgg = null;
    }
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
