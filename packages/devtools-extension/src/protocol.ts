/**
 * Messages between the four extension contexts:
 *
 *   page (MAIN world)  ⇄ window.postMessage ⇄  content script
 *   content script     ⇄ runtime port       ⇄  service worker
 *   service worker     ⇄ runtime port       ⇄  DevTools panel
 *
 * The service worker only routes by tab. Requests and events are opaque to it.
 */

import type {
  DevToolsFrameRecord,
  DevToolsFrameSnapshot,
  DevToolsRootInfo,
  DevToolsTreeNode,
  DevToolsTreeSnapshot,
} from "@textjs/react/devtools-hook";

export type { DevToolsFrameRecord, DevToolsFrameSnapshot, DevToolsRootInfo, DevToolsTreeNode, DevToolsTreeSnapshot };

export const PAGE_SOURCE = "textjs-devtools-page";
export const CONTENT_SOURCE = "textjs-devtools-content";
export const CONTENT_PORT = "textjs-content";
export const PANEL_PORT = "textjs-panel";

export interface RequestMap {
  roots: { args: []; result: DevToolsRootInfo[] };
  tree: { args: []; result: DevToolsTreeSnapshot };
  frame: { args: []; result: DevToolsFrameSnapshot };
  highlight: { args: [sceneId: number | null]; result: boolean };
  setWireframe: { args: [enabled: boolean]; result: DevToolsRootInfo };
  pause: { args: []; result: DevToolsRootInfo };
  resume: { args: []; result: DevToolsRootInfo };
  resize: { args: [cols: number, rows: number]; result: DevToolsRootInfo };
  fit: { args: []; result: DevToolsRootInfo };
  copyText: { args: []; result: string };
}

export type Method = keyof RequestMap;

export interface RequestMessage {
  kind: "request";
  id: number;
  method: Method;
  root: number | null;
  args: unknown[];
}

export interface ResponseMessage {
  kind: "response";
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type PageEvent =
  | { kind: "event"; event: "roots"; roots: DevToolsRootInfo[] }
  | { kind: "event"; event: "root-changed"; root: DevToolsRootInfo }
  | { kind: "event"; event: "root-removed"; root: number }
  | { kind: "event"; event: "frames"; records: DevToolsFrameRecord[]; committed: boolean };

/** Lifecycle control from the service worker to the page. */
export type ControlMessage = { kind: "attach" } | { kind: "detach" };

/** The page announces it has (or no longer has) console roots. */
export type HelloMessage = { kind: "hello"; roots: number; protocol: number };

export type PageToPanel = ResponseMessage | PageEvent;
export type PanelToPage = RequestMessage;

/** Service worker → panel status. */
export type StatusMessage = { kind: "status"; page: "connected" | "disconnected" };

/** Panel → service worker. */
export type PanelInit = { kind: "init"; tabId: number } | { kind: "ping" };

export type PageWire = (HelloMessage | PageToPanel) & { source: typeof PAGE_SOURCE };
export type ContentWire = (ControlMessage | PanelToPage) & { source: typeof CONTENT_SOURCE };
