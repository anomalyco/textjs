/**
 * Course progress, persisted in `localStorage` and shared by the page and the
 * console companion (both renderers subscribe with `useSyncExternalStore`).
 * The server snapshot is always empty, so prerendered pages hydrate cleanly
 * and pick up the visitor's progress right after.
 */

import { useSyncExternalStore } from "react";
import { CHAPTERS } from "./course";

export const PROGRESS_KEY = "textjs:learn";

export interface Progress {
  /** Completed chapter slugs. */
  done: readonly string[];
  /** Last chapter opened (for "Resume"). */
  last: string | null;
  /** Name printed on the certificate. */
  name: string;
  /** When the last remaining chapter was completed (ISO 8601). */
  completedAt: string | null;
}

export const EMPTY_PROGRESS: Progress = { done: [], last: null, name: "", completedAt: null };

type Listener = () => void;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const v = JSON.parse(raw) as Partial<Progress>;
    return {
      done: Array.isArray(v.done) ? [...new Set(v.done.filter((s): s is string => typeof s === "string"))] : [],
      last: typeof v.last === "string" ? v.last : null,
      name: typeof v.name === "string" ? v.name.slice(0, 48) : "",
      completedAt: typeof v.completedAt === "string" ? v.completedAt : null,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export class ProgressStore {
  private state: Progress | null = null;
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", this.onStorage);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", this.onStorage);
    };
  };

  readonly getSnapshot = (): Progress => {
    if (this.state === null) this.state = parseProgress(storage()?.getItem(PROGRESS_KEY) ?? null);
    return this.state;
  };

  readonly getServerSnapshot = (): Progress => EMPTY_PROGRESS;

  /** Another tab changed progress. */
  private readonly onStorage = (e: StorageEvent): void => {
    if (e.key !== PROGRESS_KEY && e.key !== null) return;
    this.state = null;
    this.emit();
  };

  private emit(): void {
    for (const l of this.listeners) l();
  }

  private update(patch: Partial<Progress>): void {
    const next = { ...this.getSnapshot(), ...patch };
    this.state = next;
    try {
      storage()?.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      // Private mode or full storage: progress lasts for this visit.
    }
    this.emit();
  }

  complete(slug: string, now: Date = new Date()): void {
    const s = this.getSnapshot();
    if (s.done.includes(slug)) return;
    const done = [...s.done, slug];
    const finished = CHAPTERS.every((c) => done.includes(c.slug));
    this.update({ done, completedAt: finished ? (s.completedAt ?? now.toISOString()) : s.completedAt });
  }

  visit(slug: string): void {
    if (this.getSnapshot().last !== slug) this.update({ last: slug });
  }

  setName(name: string): void {
    this.update({ name: name.slice(0, 48) });
  }

  reset(): void {
    this.update(EMPTY_PROGRESS);
  }

  /** Forget the cached snapshot (tests). */
  reload(): void {
    this.state = null;
    this.emit();
  }
}

export const progressStore = new ProgressStore();

/** Whether every chapter is done. */
export function isCourseComplete(p: Progress): boolean {
  return CHAPTERS.every((c) => p.done.includes(c.slug));
}

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, progressStore.getServerSnapshot);
}
