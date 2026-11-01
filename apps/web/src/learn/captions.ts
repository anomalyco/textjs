/**
 * Whether chapter videos show captions. Off by default; the choice is kept in `localStorage` so it carries across
 * chapters. The server snapshot is always off, so prerendered pages hydrate cleanly.
 */

import { useSyncExternalStore } from "react";

export const CAPTIONS_KEY = "textjs:learn-captions";

type Listener = () => void;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseCaptions(raw: string | null): boolean {
  return raw === "on";
}

/**
 * The text track mode to apply for `on`, or `null` to leave the track alone. Turning captions off hides a showing
 * track; a track that was never shown stays disabled, so its file isn't fetched.
 */
export function captionsMode(on: boolean, current: TextTrackMode): TextTrackMode | null {
  if (on) return current === "showing" ? null : "showing";
  return current === "showing" ? "hidden" : null;
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

  readonly getServerSnapshot = (): boolean => false;

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
