import { describe, expect, test } from "bun:test";
import { startDevtoolsPage, type DevtoolsApi } from "../src/devtools-page";
import { PANEL_VISIBILITY_EVENT } from "../src/protocol";
import { EXTENSION_ID, FakeRuntime } from "./fakes";

const WORKER = { id: EXTENSION_ID, url: `chrome-extension://${EXTENSION_ID}/background.js` };

function setup(tabId = 7, answer: unknown = { kind: "detected", tabId: 7, roots: false }) {
  const runtime = new FakeRuntime();
  const sent: unknown[] = [];
  runtime.sendMessage = (m: unknown) => {
    sent.push(m);
    return Promise.resolve(answer);
  };
  const created: Array<{ shown: Set<(w: unknown) => void>; hidden: Set<() => void> }> = [];
  const devtools: DevtoolsApi = {
    inspectedWindow: { tabId },
    panels: {
      create(_title, _icon, page, cb) {
        expect(page).toBe("panel.html");
        const panel = { onShown: { listeners: new Set<(w: unknown) => void>() }, onHidden: { listeners: new Set<() => void>() } };
        created.push({ shown: panel.onShown.listeners, hidden: panel.onHidden.listeners });
        cb?.({
          onShown: { addListener: (l) => panel.onShown.listeners.add(l as (w: unknown) => void), removeListener: () => undefined },
          onHidden: { addListener: (l) => panel.onHidden.listeners.add(l), removeListener: () => undefined },
        });
      },
    },
  };
  const page = startDevtoolsPage(devtools, runtime);
  const broadcast = (msg: unknown, sender: chrome.runtime.MessageSender = WORKER) => runtime.message(msg, sender);
  return { runtime, sent, created, page, broadcast };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("DevTools page", () => {
  test("asks the worker once and creates the panel when the tab already has roots", async () => {
    const { sent, created } = setup(7, { kind: "detected", tabId: 7, roots: true });
    expect(sent).toEqual([{ kind: "detect", tabId: 7 }]);
    await flush();
    expect(created).toHaveLength(1);
  });

  test("creates the panel later when the worker broadcasts that this tab gained roots", async () => {
    const { created, broadcast, page } = setup();
    await flush();
    expect(created).toHaveLength(0);
    broadcast({ kind: "detected", tabId: 8, roots: true });
    broadcast({ kind: "detected", tabId: 7, roots: false });
    expect(created).toHaveLength(0);
    broadcast({ kind: "detected", tabId: 7, roots: true });
    broadcast({ kind: "detected", tabId: 7, roots: true });
    expect(created).toHaveLength(1);
    expect(page.created).toBe(true);
  });

  test("ignores broadcasts from content scripts and other extensions", async () => {
    const { created, broadcast } = setup();
    await flush();
    broadcast({ kind: "detected", tabId: 7, roots: true }, { id: EXTENSION_ID, tab: { id: 7 }, url: "https://evil.test/" });
    broadcast({ kind: "detected", tabId: 7, roots: true }, { id: "someotherextensionidxxxxxxxxxxxx" });
    expect(created).toHaveLength(0);
  });

  test("forwards panel shown/hidden to the panel window", async () => {
    const { created } = setup(7, { kind: "detected", tabId: 7, roots: true });
    await flush();
    const events: unknown[] = [];
    const win = new EventTarget() as EventTarget & { CustomEvent: typeof CustomEvent };
    win.CustomEvent = CustomEvent;
    win.addEventListener(PANEL_VISIBILITY_EVENT, (e) => events.push((e as CustomEvent).detail));
    for (const l of created[0]!.hidden) l();
    for (const l of created[0]!.shown) l(win);
    for (const l of created[0]!.hidden) l();
    for (const l of created[0]!.shown) l(win);
    expect(events).toEqual([true, false, true]);
  });

  test("does nothing without a valid inspected tab", () => {
    const { sent } = setup(0);
    expect(sent).toEqual([]);
  });
});
