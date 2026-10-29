/**
 * Shape checks for data that crosses from the inspected page. The page is
 * untrusted, so the panel validates every event and response before rendering.
 */

import type { DevToolsFrameRecord, DevToolsFrameSnapshot, DevToolsRootInfo, DevToolsTreeSnapshot, Method, PageEvent, RequestMap, StatusMessage } from "../protocol";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isStr = (v: unknown): v is string => typeof v === "string";
const isRect = (v: unknown): boolean => isObj(v) && isNum(v.x) && isNum(v.y) && isNum(v.width) && isNum(v.height);
const all = (o: Obj, keys: readonly string[], test: (v: unknown) => boolean): boolean => keys.every((k) => test(o[k]));

const MAX_GRID_CELLS = 400 * 400;
const NODE_KINDS = new Set(["component", "host", "text", "provider", "suspense", "portal"]);
const SCENE_TYPES = new Set(["box", "text", "raw-text"]);

export function isRootInfo(v: unknown): v is DevToolsRootInfo {
  return (
    isObj(v) &&
    isInt(v.id) &&
    isStr(v.name) &&
    all(v, ["cols", "rows", "fps", "frameCount", "skippedFrames", "yogaNodes"], isNum) &&
    all(v, ["paused", "wireframe", "responsive"], isBool) &&
    (v.highlighted === null || isInt(v.highlighted))
  );
}

const RECORD_NUMBERS = ["root", "t", "frame", "commits", "reactMs", "layoutMs", "paintMs", "encodeMs", "totalMs", "dirtyRows", "spanCount", "cols", "rows", "interval"] as const;

export function isFrameRecord(v: unknown): v is DevToolsFrameRecord {
  return isObj(v) && isBool(v.skipped) && all(v, RECORD_NUMBERS, isNum);
}

function isSceneInfo(v: unknown): boolean {
  return (
    isObj(v) &&
    isInt(v.id) &&
    SCENE_TYPES.has(v.type as string) &&
    (v.label === null || isStr(v.label)) &&
    isRect(v.layout) &&
    isRect(v.content) &&
    isRect(v.screen) &&
    isBool(v.painted) &&
    (v.text === undefined || isStr(v.text)) &&
    (v.inline === undefined || isBool(v.inline)) &&
    (v.owner === undefined || isInt(v.owner))
  );
}

const isStringRecord = (v: unknown): boolean => isObj(v) && Object.values(v).every(isStr);

export function isTreeSnapshot(v: unknown): v is DevToolsTreeSnapshot {
  if (!isObj(v) || !isInt(v.root) || !isStr(v.name) || !Array.isArray(v.nodes)) return false;
  return v.nodes.every(
    (n: unknown) =>
      isObj(n) &&
      isInt(n.id) &&
      (n.parent === null || isInt(n.parent)) &&
      isInt(n.depth) &&
      (n.depth as number) >= 0 &&
      NODE_KINDS.has(n.kind as string) &&
      isStr(n.name) &&
      (n.key === null || isStr(n.key)) &&
      isStringRecord(n.props) &&
      Array.isArray(n.hooks) &&
      n.hooks.every((h: unknown) => isObj(h) && isStr(h.kind) && isStr(h.value)) &&
      (n.state === null || isStr(n.state)) &&
      (n.scene === null || isSceneInfo(n.scene)),
  );
}

export function isFrameSnapshot(v: unknown): v is DevToolsFrameSnapshot {
  if (!isObj(v) || !isInt(v.root) || !isInt(v.cols) || !isInt(v.rows) || !isNum(v.frame)) return false;
  const n = (v.cols as number) * (v.rows as number);
  if ((v.cols as number) < 0 || (v.rows as number) < 0 || n > MAX_GRID_CELLS) return false;
  const cells = (a: unknown, test: (x: unknown) => boolean): boolean => Array.isArray(a) && a.length === n && a.every(test);
  if (!cells(v.chars, isStr) || !cells(v.fg, isNum) || !cells(v.bg, isNum) || !cells(v.attrs, isNum) || !cells(v.owner, isInt)) return false;
  if (!isObj(v.owners)) return false;
  return Object.values(v.owners).every(
    (o) =>
      isObj(o) &&
      isInt(o.scene) &&
      isStr(o.label) &&
      SCENE_TYPES.has(o.type as string) &&
      isRect(o.rect) &&
      (o.fiber === null || isInt(o.fiber)) &&
      Array.isArray(o.components) &&
      o.components.every(isStr),
  );
}

const RESULTS: { [M in Method]: (v: unknown) => boolean } = {
  roots: (v) => Array.isArray(v) && v.every(isRootInfo),
  tree: isTreeSnapshot,
  frame: isFrameSnapshot,
  highlight: isBool,
  setWireframe: isRootInfo,
  pause: isRootInfo,
  resume: isRootInfo,
  resize: isRootInfo,
  fit: isRootInfo,
  copyText: isStr,
};

export function isResult<M extends Method>(method: M, v: unknown): v is RequestMap[M]["result"] {
  return RESULTS[method](v);
}

/** A page event or worker status rebuilt from valid fields, or `null`. Invalid frame records are dropped. */
export function sanitizeMessage(raw: unknown): PageEvent | StatusMessage | null {
  if (!isObj(raw)) return null;
  if (raw.kind === "status") return raw.page === "connected" || raw.page === "disconnected" ? { kind: "status", page: raw.page } : null;
  if (raw.kind !== "event") return null;
  switch (raw.event) {
    case "roots":
      return Array.isArray(raw.roots) ? { kind: "event", event: "roots", roots: raw.roots.filter(isRootInfo) } : null;
    case "root-changed":
      return isRootInfo(raw.root) ? { kind: "event", event: "root-changed", root: raw.root } : null;
    case "frames":
      return Array.isArray(raw.records) ? { kind: "event", event: "frames", records: raw.records.filter(isFrameRecord) } : null;
    default:
      return null;
  }
}
