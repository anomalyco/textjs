import { describe, expect, test } from "bun:test";
import { CONTENT_PORT, PANEL_PORT } from "../src/protocol";
import { startRouter, sanitizeRequest } from "../src/router";
import { EXTENSION_ID, FakeRuntime, type FakePort } from "./fakes";

const PANEL_URL = `chrome-extension://${EXTENSION_ID}/panel.html`;

function setup() {
  const runtime = new FakeRuntime();
  const router = startRouter(runtime);
  const content = (tabId: number, over: Partial<chrome.runtime.MessageSender> = {}): FakePort =>
    runtime.connect(CONTENT_PORT, { id: EXTENSION_ID, tab: { id: tabId, url: "https://app.test/" }, frameId: 0, url: "https://app.test/", ...over });
  const panel = (sender: Partial<chrome.runtime.MessageSender> = {}): FakePort => runtime.connect(PANEL_PORT, { id: EXTENSION_ID, url: PANEL_URL, ...sender });
  return { runtime, router, content, panel };
}

const request = (over: Record<string, unknown> = {}): any => ({ kind: "request", id: 1, method: "tree", root: 1, args: [], ...over });

describe("service worker router", () => {
  test("pairs a content port and its panel and routes both ways", () => {
    const { router, content, panel } = setup();
    const page = content(7);
    const p = panel();
    p.postMessage({ kind: "init", tabId: 7 });
    expect(router.panels()).toEqual([7]);
    expect(page.received).toContainEqual({ kind: "attach" });
    expect(p.received).toContainEqual({ kind: "status", page: "connected" });

    p.postMessage(request());
    expect(page.received.at(-1)).toEqual(request());
    page.postMessage({ kind: "response", id: 1, ok: true, result: 42 });
    expect(p.received.at(-1)).toEqual({ kind: "response", id: 1, ok: true, result: 42 });

    p.disconnect();
    expect(router.panels()).toEqual([]);
    expect(page.received.at(-1)).toEqual({ kind: "detach" });
  });

  test("rejects panel ports that are not this extension's panel page", () => {
    const { router, content, panel } = setup();
    const page = content(7);
    const impostors = [
      panel({ id: "someotherextensionidxxxxxxxxxxxx" }),
      panel({ url: `chrome-extension://${EXTENSION_ID}/devtools.html` }),
      panel({ url: "https://evil.test/panel.html" }),
      panel({ url: `chrome-extension://${EXTENSION_ID}/panel.html.evil` }),
      panel({ url: undefined }),
      panel({ id: undefined }),
    ];
    for (const p of impostors) {
      expect(p.connected).toBe(false);
      expect(() => p.postMessage({ kind: "init", tabId: 7 })).toThrow();
    }
    expect(router.panels()).toEqual([]);
    expect(page.received).not.toContainEqual({ kind: "attach" });
  });

  test("an impostor cannot evict the real panel or read its tab", () => {
    const { router, content, panel } = setup();
    content(7);
    const real = panel();
    real.postMessage({ kind: "init", tabId: 7 });
    const fake = panel({ url: "https://evil.test/" });
    expect(fake.connected).toBe(false);
    expect(real.connected).toBe(true);
    expect(router.panels()).toEqual([7]);
  });

  test("accepts the panel URL with a query string (panel opened as a tab in tests)", () => {
    const { router, panel } = setup();
    const p = panel({ url: `${PANEL_URL}?tabId=3`, tab: { id: 9, url: `${PANEL_URL}?tabId=3` } });
    p.postMessage({ kind: "init", tabId: 3 });
    expect(router.panels()).toEqual([3]);
  });

  test("validates init: positive integer tab id, object payload, once per port", () => {
    const { router, content, panel } = setup();
    const page = content(7);
    for (const bad of [null, 5, "init", [], { kind: "init" }, { kind: "init", tabId: 0 }, { kind: "init", tabId: Number.NaN }, { kind: "init", tabId: -1 }, { kind: "init", tabId: 1.5 }, { kind: "init", tabId: "7" }]) {
      const p = panel();
      try {
        p.postMessage(bad);
      } catch {
        // already disconnected
      }
      expect(router.panels()).toEqual([]);
    }
    const p = panel();
    p.postMessage({ kind: "init", tabId: 7 });
    expect(router.panels()).toEqual([7]);
    p.postMessage({ kind: "init", tabId: 8 });
    expect(p.connected).toBe(false);
    expect(router.panels()).toEqual([]);
    expect(page.received.at(-1)).toEqual({ kind: "detach" });
  });

  test("ignores requests before init and drops malformed ones", () => {
    const { content, panel } = setup();
    const page = content(7);
    const p = panel();
    p.postMessage(request());
    expect(page.received).toHaveLength(0);
    p.postMessage({ kind: "init", tabId: 7 });
    const before = page.received.length;
    for (const bad of [
      request({ method: "eval" }),
      request({ method: "__proto__" }),
      request({ id: "1" }),
      request({ root: "1" }),
      request({ args: "x" }),
      request({ args: [{ evil: true }] }),
      request({ args: [1, 2, 3, 4, 5] }),
      { kind: "attach" },
      { kind: "ping" },
    ]) {
      p.postMessage(bad);
    }
    expect(page.received).toHaveLength(before);
    p.postMessage({ ...request({ method: "resize", args: [80, 24] }), extra: "dropped" });
    expect(page.received.at(-1)).toEqual(request({ method: "resize", args: [80, 24] }));
  });

  test("a new panel for the same tab replaces the old one", () => {
    const { router, content, panel } = setup();
    content(7);
    const a = panel();
    a.postMessage({ kind: "init", tabId: 7 });
    const b = panel();
    b.postMessage({ kind: "init", tabId: 7 });
    expect(a.connected).toBe(false);
    expect(b.connected).toBe(true);
    expect(router.panels()).toEqual([7]);
  });

  test("rejects content ports from subframes, other extensions or without a tab", () => {
    const { router, content, runtime } = setup();
    expect(content(7, { frameId: 2 }).connected).toBe(false);
    expect(content(7, { id: "someotherextensionidxxxxxxxxxxxx" }).connected).toBe(false);
    expect(runtime.connect(CONTENT_PORT, { id: EXTENSION_ID, frameId: 0 }).connected).toBe(false);
    expect(router.pages()).toEqual([]);
  });

  test("content ports cannot spoof worker status or control messages", () => {
    const { content, panel } = setup();
    const page = content(7);
    const p = panel();
    p.postMessage({ kind: "init", tabId: 7 });
    const before = p.received.length;
    page.postMessage({ kind: "status", page: "disconnected" });
    page.postMessage({ kind: "init", tabId: 9 });
    page.postMessage(null);
    expect(p.received).toHaveLength(before);
    page.postMessage({ kind: "event", event: "roots", roots: [] });
    expect(p.received.at(-1)).toEqual({ kind: "event", event: "roots", roots: [] });
  });

  test("reports page disconnects to the panel and closes unknown port names", () => {
    const { runtime, content, panel } = setup();
    const page = content(7);
    const p = panel();
    p.postMessage({ kind: "init", tabId: 7 });
    page.disconnect();
    expect(p.received.at(-1)).toEqual({ kind: "status", page: "disconnected" });
    expect(runtime.connect("other", { id: EXTENSION_ID }).connected).toBe(false);
  });

  test("sanitizeRequest keeps only known fields", () => {
    expect(sanitizeRequest(request({ method: "highlight", args: [null] }))).toEqual(request({ method: "highlight", args: [null] }));
    expect(sanitizeRequest(request({ root: null, method: "roots" }))).toEqual(request({ root: null, method: "roots" }));
    expect(sanitizeRequest(request({ args: [Number.POSITIVE_INFINITY] }))).toBeNull();
  });
});

describe("service worker: DevTools detection", () => {
  const DEVTOOLS_URL = `chrome-extension://${EXTENSION_ID}/devtools.html`;

  test("answers DevTools pages' detect queries", () => {
    const { runtime, content } = setup();
    expect(runtime.message({ kind: "detect", tabId: 7 }, { id: EXTENSION_ID, url: DEVTOOLS_URL })).toEqual({ kind: "detected", tabId: 7, roots: false });
    content(7);
    expect(runtime.message({ kind: "detect", tabId: 7 }, { id: EXTENSION_ID, url: DEVTOOLS_URL })).toEqual({ kind: "detected", tabId: 7, roots: true });
  });

  test("ignores detect queries from content scripts, other extensions or with bad tab ids", () => {
    const { runtime, content } = setup();
    content(7);
    const q = { kind: "detect", tabId: 7 };
    expect(runtime.message(q, { id: EXTENSION_ID, url: "https://app.test/", tab: { id: 7 } })).toBeUndefined();
    expect(runtime.message(q, { id: "someotherextensionidxxxxxxxxxxxx", url: DEVTOOLS_URL })).toBeUndefined();
    expect(runtime.message(q, { id: EXTENSION_ID, url: PANEL_URL })).toBeUndefined();
    expect(runtime.message({ kind: "detect", tabId: 0 }, { id: EXTENSION_ID, url: DEVTOOLS_URL })).toBeUndefined();
  });

  test("broadcasts when a tab's content script connects (roots mounted late are detected)", () => {
    const { runtime, content } = setup();
    expect(runtime.broadcasts).toEqual([]);
    content(7);
    expect(runtime.broadcasts).toEqual([{ kind: "detected", tabId: 7, roots: true }]);
  });
});
