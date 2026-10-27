import { createContext, useContext } from "react";
import { txError, type ConsoleRenderer, type InputEngine, type SceneNode } from "@textjs/core";
import type { ConsoleContainer } from "./reconciler";
import type { FocusManager } from "./focus";
import type { InputManager } from "./input-manager";
import type { StatsStore, ViewportStore } from "./stores";

/** A focus / input scope. Trapping scopes (open modals) confine Tab order and `useInput`. */
export interface Scope {
  readonly id: number;
  readonly parent: Scope | null;
  readonly trap: boolean;
}

export const ROOT_SCOPE: Scope = Object.freeze({ id: 0, parent: null, trap: false });

let nextScopeId = 1;

export function createScope(parent: Scope, trap: boolean): Scope {
  return Object.freeze({ id: nextScopeId++, parent, trap });
}

export const ScopeContext = createContext<Scope>(ROOT_SCOPE);
ScopeContext.displayName = "TextScopeContext";

/** Everything hooks need from the mounted console root. */
export interface RootRuntime {
  readonly renderer: ConsoleRenderer;
  readonly engine: InputEngine;
  readonly container: ConsoleContainer;
  readonly rootNode: SceneNode;
  readonly input: InputManager;
  readonly focus: FocusManager;
  readonly viewport: ViewportStore;
  readonly stats: StatsStore;
  exit(error?: unknown): void;
}

export const RuntimeContext = createContext<RootRuntime | null>(null);
RuntimeContext.displayName = "TextRuntimeContext";

export function useRuntime(): RootRuntime {
  const rt = useContext(RuntimeContext);
  if (rt === null) {
    throw txError("TX002");
  }
  return rt;
}
