import type { ComponentType } from "react";
import type { CompanionTab, PresetId } from "./store";

export interface LoadedCompanionTabs {
  home?: ComponentType;
  docs?: ComponentType;
  playground?: ComponentType<{ preset: PresetId; reserveRows?: number }>;
  opencode?: ComponentType;
  learn?: ComponentType;
  terminal?: ComponentType;
  blog?: ComponentType<{ slug: string }>;
  example?: ComponentType<{ id: string }>;
}

const loaded: LoadedCompanionTabs = {};
const inflight = new Map<keyof LoadedCompanionTabs, Promise<void>>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export function subscribeCompanionTabs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLoadedCompanionTabs(): LoadedCompanionTabs {
  return loaded;
}

export function isCompanionTabLoaded(key: keyof LoadedCompanionTabs): boolean {
  return loaded[key] !== undefined;
}

export function preloadCompanionTab(key: CompanionTab | "example"): Promise<void> {
  if (loaded[key] !== undefined) return Promise.resolve();
  const existing = inflight.get(key);
  if (existing) return existing;
  let p: Promise<void>;
  switch (key) {
    case "home":
      p = import("./tabs/HomeTab").then((m) => {
        loaded.home = m.HomeTab;
      });
      break;
    case "docs":
      p = import("./tabs/DocsTab").then((m) => {
        loaded.docs = m.DocsTab;
      });
      break;
    case "playground":
      p = import("../demos/presets").then((m) => {
        loaded.playground = m.PresetView;
      });
      break;
    case "opencode":
      p = import("../demos/opencode/OpenCodeLite").then((m) => {
        loaded.opencode = m.OpenCodeLite;
      });
      break;
    case "learn":
      p = import("../learn/apps/LearnConsole").then((m) => {
        loaded.learn = m.LearnConsole;
      });
      break;
    case "terminal":
      p = import("../demos/terminal").then((m) => {
        loaded.terminal = m.TerminalConsole;
      });
      break;
    case "blog":
      p = import("./tabs/BlogTab").then((m) => {
        loaded.blog = m.BlogTab;
      });
      break;
    case "example":
      p = import("./tabs/ExampleTab").then((m) => {
        loaded.example = m.ExampleTab;
      });
      break;
  }
  const tracked = p.then(() => {
    inflight.delete(key);
    notify();
  });
  inflight.set(key, tracked);
  return tracked;
}

export async function preloadAllCompanionTabs(): Promise<void> {
  await Promise.all(
    (["home", "docs", "playground", "opencode", "learn", "terminal", "blog", "example"] as const).map((k) =>
      preloadCompanionTab(k),
    ),
  );
}
