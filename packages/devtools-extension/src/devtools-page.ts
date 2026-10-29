/**
 * DevTools page: adds the "Text.js" panel once the inspected tab has a console
 * root (like React DevTools, the panel stays out of the way elsewhere), and
 * tells the panel when DevTools shows or hides it.
 *
 * Detection needs no `inspectedWindow.eval` and no polling: the page asks the
 * service worker once, and the worker broadcasts when a tab's content script
 * connects (it only does so once the page reports a root, so roots mounted
 * late by an SPA are picked up too).
 */

import { isTabId, PANEL_VISIBILITY_EVENT, type DetectQuery } from "./protocol";

export interface DevtoolsApi {
  panels: { create(title: string, iconPath: string, pagePath: string, callback?: (panel: chrome.devtools.panels.ExtensionPanel) => void): void };
  inspectedWindow: { tabId: number };
}

export interface DevtoolsRuntime {
  readonly id: string;
  sendMessage(message: unknown): Promise<unknown>;
  readonly onMessage: chrome.runtime.Event<(message: unknown, sender: chrome.runtime.MessageSender) => boolean | void>;
}

export interface PanelWindow {
  dispatchEvent(event: Event): boolean;
  CustomEvent: typeof CustomEvent;
}

export function startDevtoolsPage(devtools: DevtoolsApi, runtime: DevtoolsRuntime): { readonly created: boolean } {
  const tabId = devtools.inspectedWindow.tabId;
  let created = false;

  const create = (): void => {
    if (created) return;
    created = true;
    runtime.onMessage.removeListener(onMessage);
    devtools.panels.create("Text.js", "icons/icon-32.png", "panel.html", (panel) => {
      let win: PanelWindow | null = null;
      const notify = (visible: boolean): void => {
        if (!win) return;
        try {
          win.dispatchEvent(new win.CustomEvent(PANEL_VISIBILITY_EVENT, { detail: visible }));
        } catch {
          // Panel window went away.
        }
      };
      panel.onShown.addListener((w) => {
        win = w as unknown as PanelWindow;
        notify(true);
      });
      panel.onHidden.addListener(() => notify(false));
    });
  };

  const isDetected = (msg: unknown): boolean => {
    if (typeof msg !== "object" || msg === null) return false;
    const m = msg as Record<string, unknown>;
    return m.kind === "detected" && m.tabId === tabId && m.roots === true;
  };

  // Broadcasts come from the service worker only: same extension, not a content script (no `tab`).
  const onMessage = (msg: unknown, sender: chrome.runtime.MessageSender): void => {
    if (sender.id !== runtime.id || sender.tab !== undefined) return;
    if (isDetected(msg)) create();
  };

  if (isTabId(tabId)) {
    runtime.onMessage.addListener(onMessage);
    const query: DetectQuery = { kind: "detect", tabId };
    runtime.sendMessage(query).then(
      (reply) => {
        if (isDetected(reply)) create();
      },
      () => undefined,
    );
  }

  return {
    get created() {
      return created;
    },
  };
}
