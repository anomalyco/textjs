/** Messages between the extension host and the preview webview. */

import type { InputMessage, WireFrame } from "@textjs/next/frame-protocol";

export type PreviewMode = "live" | "headless" | "idle";
export type ServerState = "stopped" | "starting" | "running";
export type ModePreference = "auto" | "live" | "headless";

export interface PreviewState {
  mode: PreviewMode;
  preference: ModePreference;
  server: { state: ServerState; url: string | null; clients: number };
  /** File being previewed, relative to the project root. */
  target: { label: string; kind: "route" | "component" } | null;
  /** Current app pathname (route previews and live mode). */
  path: string | null;
  error: { message: string; stack?: string; file?: string } | null;
  follow: boolean;
  fontSize: number;
  mac: boolean;
  /** Status line under the frame. */
  hint: string | null;
  /** Whether the app has page focus (live: the browser tab). */
  focused: boolean;
  /** `true` while the headless runner is starting. */
  loading: boolean;
  /** Workspace Trust is not granted: nothing runs. */
  restricted: boolean;
}

export type HostToWebview =
  | { type: "state"; state: PreviewState }
  | { type: "frame"; frame: WireFrame }
  | { type: "clearFrame" };

export type WebviewCommand = "reload" | "openBrowser" | "startServer" | "copyText" | "toggleFollow" | "openFile" | "openSettings" | "manageTrust";

export type WebviewToHost =
  | { type: "ready" }
  | { type: "input"; msg: InputMessage }
  | { type: "focus"; focused: boolean }
  | { type: "viewport"; cols: number; rows: number }
  | { type: "command"; command: WebviewCommand }
  | { type: "setMode"; preference: ModePreference }
  | { type: "copied"; text: string }
  | { type: "openLink"; url: string };
