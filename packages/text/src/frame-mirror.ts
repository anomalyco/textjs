/**
 * Browser half of the dev frame mirror: while an editor is watching
 * (`textjs:mirror { active: true }`), encode each emitted frame as a row delta
 * and send it over the Vite HMR socket; apply forwarded input. Idle otherwise.
 */

import { extractStyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "@textjs/react";
import { FrameEncoder, MAX_TITLE, HMR_FRAME_EVENT, HMR_HELLO_EVENT, HMR_INPUT_EVENT, HMR_MIRROR_EVENT, parseInputMessage, type FrameMeta, type InputMessage } from "./frame-protocol";
import type { RouterHistory } from "./history";

export interface MirrorHotContext {
  on(event: string, callback: (payload: any) => void): void;
  off?(event: string, callback: (payload: any) => void): void;
  send(event: string, data?: unknown): void;
}

function sourceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Apply a forwarded input message to a root. */
export function applyInputMessage(root: ConsoleRoot, msg: InputMessage, history?: RouterHistory): void {
  switch (msg.type) {
    case "key":
      root.input.handleKeyDown({ ...msg, preventDefault() {} });
      break;
    case "paste":
      root.input.handlePaste(msg.text);
      break;
    case "wheel":
      root.input.handleWheel({ ...msg, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
      break;
    case "navigate":
      history?.push(msg.href);
      break;
  }
}

export function connectFrameMirror(root: ConsoleRoot, hot: MirrorHotContext, history?: RouterHistory): () => void {
  const source = sourceId();
  const encoder = new FrameEncoder();
  let unsubscribe: (() => void) | null = null;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;

  const meta = (): FrameMeta => ({
    path: history?.getLocation().pathname,
    title: typeof document !== "undefined" ? document.title.slice(0, MAX_TITLE) : undefined,
    focused: root.renderer.focused,
  });
  const send = (): void => {
    const msg = encoder.encode(extractStyledFrame(root.renderer.buffer), { source, meta: meta() });
    if (msg) hot.send(HMR_FRAME_EVENT, msg);
  };
  // Background tabs get no animation frames, so the renderer defers work; flush directly instead.
  const isHidden = (): boolean => typeof document !== "undefined" && document.visibilityState === "hidden";
  const flushIfHidden = (): void => {
    if (isHidden()) root.flushSyncRender();
  };

  const start = (): void => {
    if (unsubscribe) return;
    encoder.reset();
    unsubscribe = root.onFrame((f) => {
      if (!f.skipped) send();
    });
    send();
    hiddenTimer = setInterval(flushIfHidden, 100);
  };
  const stop = (): void => {
    unsubscribe?.();
    unsubscribe = null;
    if (hiddenTimer !== null) clearInterval(hiddenTimer);
    hiddenTimer = null;
  };

  const onMirror = (payload: { active?: boolean }): void => (payload?.active ? start() : stop());
  const onInput = (payload: unknown): void => {
    const msg = parseInputMessage(payload);
    if (!msg) return;
    applyInputMessage(root, msg, history);
    setTimeout(flushIfHidden, 0);
  };
  const hello = (): void => {
    const buf = root.renderer.buffer;
    hot.send(HMR_HELLO_EVENT, { source, grid: { width: buf.width, height: buf.height }, path: history?.getLocation().pathname });
  };
  // Keep the server's status (editor status bars) current without streaming frames.
  let helloTimer: ReturnType<typeof setTimeout> | null = null;
  const helloSoon = (): void => {
    if (helloTimer !== null) clearTimeout(helloTimer);
    helloTimer = setTimeout(() => {
      helloTimer = null;
      hello();
    }, 250);
  };
  const unlisten = history?.listen(() => {
    if (unsubscribe) setTimeout(send, 0);
    else helloSoon();
  });
  const unlistenViewport = root.renderer.viewport.subscribe(() => {
    if (!unsubscribe) helloSoon();
  });

  hot.on(HMR_MIRROR_EVENT, onMirror);
  hot.on(HMR_INPUT_EVENT, onInput);
  hot.on("vite:ws:connect", hello);
  hello();

  return () => {
    stop();
    unlisten?.();
    unlistenViewport();
    if (helloTimer !== null) clearTimeout(helloTimer);
    hot.off?.(HMR_MIRROR_EVENT, onMirror);
    hot.off?.(HMR_INPUT_EVENT, onInput);
    hot.off?.("vite:ws:connect", hello);
  };
}
