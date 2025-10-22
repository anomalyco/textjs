/**
 * Shared state between the react-dom website and the live console companion.
 * Both renderers subscribe with `useSyncExternalStore`, so navigating the site
 * re-renders the console app and console keystrokes can drive the page.
 */

import type { ThemeName } from "@textjs/react";
import { safeDecode } from "../url";

export type CompanionTab = "home" | "playground" | "opencode" | "docs" | "snake";

export const COMPANION_TABS: ReadonlyArray<{ id: CompanionTab; label: string; shortcut: string }> = [
  { id: "home", label: "Home", shortcut: "1" },
  { id: "playground", label: "Playground", shortcut: "2" },
  { id: "opencode", label: "OpenCode", shortcut: "3" },
  { id: "docs", label: "Docs", shortcut: "4" },
  { id: "snake", label: "Snake", shortcut: "5" },
];

export type PresetId = "counter" | "dashboard" | "form" | "streaming" | "snake";

export const PRESETS: ReadonlyArray<{ id: PresetId; label: string; description: string }> = [
  { id: "counter", label: "Counter & State", description: "useState and useInput" },
  { id: "dashboard", label: "Server Dashboard", description: "Live metrics and deploys" },
  { id: "form", label: "Form & Inputs", description: "Inputs, selects and tabs" },
  { id: "streaming", label: "Streaming Markdown & Diff", description: "Token-by-token Markdown" },
  { id: "snake", label: "Console Snake", description: "A 60fps game loop" },
];

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
  /** Title typed in the Playground "app title" field. */
  playgroundTitle: string;
}

type Listener = () => void;

/** Unknown routes (404s) map to Home so tabs like Snake never keep running off-route. */
function tabForPath(pathname: string): CompanionTab {
  if (pathname.startsWith("/docs")) return "docs";
  if (pathname.startsWith("/playground")) return "playground";
  if (pathname.startsWith("/opencode")) return "opencode";
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
  preset: "counter",
  theme: "geistDark",
  docSlug: "",
  consoleInput: false,
  opencode: { mode: "sandbox" },
  playgroundTitle: "my-text-app",
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
    const slug = docSlugForPath(pathname);
    if (slug !== null) patch.docSlug = slug;
    this.set(patch);
  }

  cycleTheme(): ThemeName {
    const i = THEME_ORDER.indexOf(this.state.theme);
    const next = THEME_ORDER[(i + 1) % THEME_ORDER.length] as ThemeName;
    this.set({ theme: next });
    return next;
  }

  cyclePreset(dir: 1 | -1): void {
    const i = PRESETS.findIndex((p) => p.id === this.state.preset);
    const next = PRESETS[(i + dir + PRESETS.length) % PRESETS.length];
    if (next) this.set({ preset: next.id });
  }
}

export const siteStore = new SiteStore();

export { tabForPath, docSlugForPath };
