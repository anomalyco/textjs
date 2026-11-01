/** IPC between the extension host and the headless preview runner. */

import type { InputMessage, WireFrame } from "@textjs/app/frame-protocol";

export type RunnerTarget = { kind: "route"; path: string } | { kind: "component"; file: string };

export type HostToRunner =
  | { type: "init"; root: string; target: RunnerTarget; cols: number; rows: number; devUrl?: string }
  | { type: "target"; target: RunnerTarget }
  | { type: "resize"; cols: number; rows: number }
  | { type: "input"; msg: InputMessage }
  | { type: "reload" }
  | { type: "focus"; focused: boolean }
  | { type: "dispose" };

export type RunnerToHost =
  | { type: "ready"; version: string }
  | { type: "frame"; frame: WireFrame }
  | { type: "error"; message: string; stack?: string; file?: string }
  | { type: "clearError" };
