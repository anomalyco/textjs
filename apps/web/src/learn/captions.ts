/**
 * Whether chapter videos show captions. Off by default in English and on in other languages; the choice is kept in
 * `localStorage` so it carries across chapters. The server snapshot is the default, so prerendered pages hydrate
 * cleanly.
 */

import { useSyncExternalStore } from "react";
import { LOCALE, SOURCE_LOCALE } from "../i18n/locales";

/** Captions start on for readers of a translated page. */
const DEFAULT_ON = LOCALE !== SOURCE_LOCALE;

export const CAPTIONS_KEY = "textjs:learn-captions";

type Listener = () => void;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseCaptions(raw: string | null, fallback = DEFAULT_ON): boolean {
  return raw === null ? fallback : raw === "on";
}

export interface TrackState {
  mode: TextTrackMode;
  language: string;
}

/**
 * The modes for a video's caption tracks, with at most one showing. Off hides every showing track. On keeps the
 * showing track, or shows the one in `preferred` (the language last picked), or the first (the page's language).
 * Tracks never shown stay disabled, so their files aren't fetched.
 */
export function trackModes(tracks: readonly TrackState[], on: boolean, preferred: string | null): TextTrackMode[] {
  if (!on) return tracks.map((t) => (t.mode === "showing" ? "hidden" : t.mode));
  let keep = tracks.findIndex((t) => t.mode === "showing");
  if (keep < 0) keep = Math.max(0, tracks.findIndex((t) => t.language === preferred));
  return tracks.map((t, i) => (i === keep ? "showing" : t.mode === "showing" ? "hidden" : t.mode));
}

/**
 * After a change from the native captions menu: the language now showing. When two show (the menu turned one on
 * without turning the other off), the one that isn't `previous` is the new pick.
 */
export function pickedLanguage(tracks: readonly TrackState[], previous: string | null): string | null {
  const showing = tracks.filter((t) => t.mode === "showing");
  if (showing.length === 0) return null;
  return (showing.find((t) => t.language !== previous) ?? showing[0])!.language;
}

export class CaptionsStore {
  private state: boolean | null = null;
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", this.onStorage);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", this.onStorage);
    };
  };

  readonly getSnapshot = (): boolean => {
    if (this.state === null) this.state = parseCaptions(storage()?.getItem(CAPTIONS_KEY) ?? null);
    return this.state;
  };

  readonly getServerSnapshot = (): boolean => DEFAULT_ON;

  private readonly onStorage = (e: StorageEvent): void => {
    if (e.key !== CAPTIONS_KEY && e.key !== null) return;
    this.state = null;
    this.emit();
  };

  private emit(): void {
    for (const l of this.listeners) l();
  }

  set(on: boolean): void {
    if (this.getSnapshot() === on) return;
    this.state = on;
    try {
      storage()?.setItem(CAPTIONS_KEY, on ? "on" : "off");
    } catch {
      // Private mode or full storage: the choice lasts for this visit.
    }
    this.emit();
  }

  /** Forget the cached snapshot (tests). */
  reload(): void {
    this.state = null;
    this.emit();
  }
}

export const captionsStore = new CaptionsStore();

export function useCaptions(): boolean {
  return useSyncExternalStore(captionsStore.subscribe, captionsStore.getSnapshot, captionsStore.getServerSnapshot);
}
