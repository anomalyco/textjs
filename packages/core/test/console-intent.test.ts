import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { CHROME_STORAGE_KEY } from "../src/index";
import { canPrefetchConsole, CONSOLE_INTENT_KEY, onConsoleIntent, type ConsoleIntentEvent, type ConsoleIntentOptions, type ConsoleIntentReason } from "../src/experimental";
import { isDevToolsShortcut } from "../src/console-intent";

type Listener = { fn: (e: unknown) => void; capture: boolean };

class Target {
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: (e: unknown) => void, options: boolean | AddEventListenerOptions = false): void {
    const capture = typeof options === "object" ? options.capture === true : options;
    const l = this.listeners.get(type) ?? [];
    l.push({ fn, capture });
    this.listeners.set(type, l);
  }
  removeEventListener(type: string, fn: (e: unknown) => void, capture = false): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((l) => l.fn !== fn || l.capture !== capture));
  }
  emit(type: string, e: unknown = {}): void {
    for (const l of [...(this.listeners.get(type) ?? [])]) l.fn(e);
  }
  get count(): number {
    let n = 0;
    for (const l of this.listeners.values()) n += l.length;
    return n;
  }
}

class Memory {
  data = new Map<string, string>();
  reads = 0;
  getItem(k: string): string | null {
    this.reads++;
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

/** Just enough of an element for `closest` and `matches` with `[attr]` and tag selectors. */
class El {
  constructor(
    readonly tag: string,
    readonly attrs: string[] = [],
    readonly parent: El | null = null,
  ) {}
  matches(selector: string): boolean {
    return selector.split(",").some((s) => {
      const sel = s.trim();
      return sel.startsWith("[") ? this.attrs.includes(sel.slice(1, -1)) : sel === this.tag;
    });
  }
  closest(selector: string): El | null {
    for (let el: El | null = this; el; el = el.parent) if (el.matches(selector)) return el;
    return null;
  }
}

interface FakeOptions {
  inner?: [number, number];
  outer?: [number, number];
  coarse?: boolean;
  fine?: boolean;
  platform?: string;
  connection?: { saveData?: boolean; effectiveType?: string };
  readyState?: string;
}

function fakeWindow(o: FakeOptions = {}) {
  const doc = Object.assign(new Target(), { readyState: o.readyState ?? "complete" });
  const idle: Array<() => void> = [];
  const win = Object.assign(new Target(), {
    innerWidth: o.inner?.[0] ?? 1440,
    innerHeight: o.inner?.[1] ?? 812,
    outerWidth: o.outer?.[0] ?? 1440,
    outerHeight: o.outer?.[1] ?? 900,
    devicePixelRatio: 2,
    matchMedia: (q: string) => ({ matches: q === "(hover: none) and (pointer: coarse)" ? (o.coarse ?? false) : q === "(pointer: fine)" ? (o.fine ?? !o.coarse) : false }),
    navigator: { platform: o.platform ?? "MacIntel", userAgent: "", connection: o.connection },
    localStorage: new Memory(),
    sessionStorage: new Memory(),
    document: doc,
    requestIdleCallback: (cb: () => void) => idle.push(cb),
    cancelIdleCallback: (id: number) => {
      idle[id - 1] = () => undefined;
    },
  });
  const runIdle = (): void => {
    for (const cb of idle.splice(0)) cb();
  };
  return { win, doc, runIdle };
}

function watch(win: object, options: Omit<ConsoleIntentOptions, "window"> = {}) {
  const reasons: ConsoleIntentReason[] = [];
  const handle = onConsoleIntent((e) => reasons.push(e.reason), { ...options, window: win as never });
  return { reasons, handle };
}

const press = (target: El, o: { button?: number; ctrlKey?: boolean } = {}) => ({ target, button: o.button ?? 0, ctrlKey: o.ctrlKey ?? false });

describe("onConsoleIntent: dock", () => {
  test("DevTools docked at the bottom or side on attach fires dock, once", () => {
    for (const inner of [
      [1440, 400],
      [800, 812],
    ] as Array<[number, number]>) {
      const { win } = fakeWindow({ inner });
      const { reasons, handle } = watch(win);
      expect(reasons).toEqual(["dock"]);
      expect(handle.triggered).toBe(true);
      expect(win.count).toBe(0);
      handle.trigger("manual");
      expect(reasons).toEqual(["dock"]);
    }
  });

  test("undocked doesn't fire, learns the browser chrome, and a resize to docked fires at once", () => {
    const { win } = fakeWindow({ inner: [1440, 848], outer: [1440, 900] });
    const { reasons, handle } = watch(win);
    expect(reasons).toEqual([]);
    expect(win.localStorage.getItem(CHROME_STORAGE_KEY)).toBe("52");
    // A 120px bottom panel only reads as a dock with Safari's slim 52px toolbar learned.
    win.innerHeight = 848 - 160;
    win.emit("resize");
    expect(reasons).toEqual(["dock"]);
    expect(handle.triggered).toBe(true);
    expect(win.count).toBe(0);
  });

  test("touch screens attach nothing and read no storage; only trigger() fires", () => {
    const { win, doc } = fakeWindow({ coarse: true, inner: [390, 364], outer: [390, 664] });
    win.sessionStorage.setItem("textjs:console-intent", "1");
    const { reasons, handle } = watch(win, { prefetch: () => undefined, idlePrefetch: true });
    expect(win.count + doc.count).toBe(0);
    expect(win.sessionStorage.reads + win.localStorage.reads).toBe(0);
    // The soft keyboard shrinks the page like a docked panel; VoiceOver double-taps click with detail 0.
    win.emit("resize");
    win.emit("keydown", key({ key: "F12", code: "F12" }));
    doc.emit("click", { target: new El("button", ["data-textjs-engage"]), detail: 0 });
    doc.emit("textjs:engage", {});
    expect(reasons).toEqual([]);
    handle.trigger();
    expect(reasons).toEqual(["manual"]);
  });

  test("a docked reload reports dock, not session", () => {
    const { win } = fakeWindow({ inner: [1440, 400] });
    win.sessionStorage.setItem("textjs:console-intent", "1");
    expect(watch(win).reasons).toEqual(["dock"]);
  });

  test("a page restored from the back/forward cache checks again", () => {
    const docked = fakeWindow();
    const a = watch(docked.win);
    docked.win.innerHeight = 400;
    docked.win.emit("pageshow", { persisted: false });
    expect(a.reasons).toEqual([]);
    docked.win.emit("pageshow", { persisted: true });
    expect(a.reasons).toEqual(["dock"]);

    const remembered = fakeWindow();
    const b = watch(remembered.win);
    remembered.win.sessionStorage.setItem("textjs:console-intent", "1");
    remembered.win.emit("pageshow", { persisted: true });
    expect(b.reasons).toEqual(["session"]);
  });
});

const key = (o: Partial<KeyboardEvent>) => {
  const e = { key: "", code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, prevented: false, ...o, preventDefault: () => (e.prevented = true) };
  return e;
};

describe("onConsoleIntent: shortcut", () => {
  test("F12 and ⌘⌥J/I/C/K on macOS fire shortcut, without preventing the default", () => {
    const presses = [
      key({ key: "F12", code: "F12" }),
      key({ key: "∆", code: "KeyJ", metaKey: true, altKey: true }),
      key({ key: "ˆ", code: "KeyI", metaKey: true, altKey: true }),
      key({ key: "ç", code: "KeyC", metaKey: true, altKey: true }),
      key({ key: "˚", code: "KeyK", metaKey: true, altKey: true }),
    ];
    for (const e of presses) {
      const { win } = fakeWindow();
      const { reasons } = watch(win);
      win.emit("keydown", e);
      expect(reasons).toEqual(["shortcut"]);
      expect(e.prevented).toBe(false);
      expect(win.sessionStorage.getItem("textjs:console-intent")).toBe("1");
    }
  });

  test("Ctrl+Shift+J/I/C/K fire elsewhere, matched by character on other layouts", () => {
    for (const e of [
      key({ key: "J", code: "KeyJ", ctrlKey: true, shiftKey: true }),
      key({ key: "I", code: "KeyI", ctrlKey: true, shiftKey: true }),
      key({ key: "C", code: "KeyC", ctrlKey: true, shiftKey: true }),
      key({ key: "K", code: "KeyK", ctrlKey: true, shiftKey: true }),
      // Dvorak: the J character sits on the physical C key.
      key({ key: "J", code: "KeyC", ctrlKey: true, shiftKey: true }),
      key({ key: "J", code: "KeyX", ctrlKey: true, shiftKey: true }),
    ]) {
      const { win } = fakeWindow({ platform: "Win32" });
      const { reasons } = watch(win);
      win.emit("keydown", e);
      expect(reasons).toEqual(["shortcut"]);
    }
  });

  test("other keys and the other platform's shortcut don't fire", () => {
    const mac = [
      key({ key: "j", code: "KeyJ" }),
      key({ key: "j", code: "KeyJ", metaKey: true }),
      key({ key: "J", code: "KeyJ", ctrlKey: true, shiftKey: true }),
      key({ key: "∆", code: "KeyJ", metaKey: true, altKey: true, ctrlKey: true }),
      key({ key: "π", code: "KeyP", metaKey: true, altKey: true }),
      key({ key: "F12", code: "F12", metaKey: true }),
      key({ key: "F12", code: "F12", shiftKey: true }),
      key({ key: "∆", code: "KeyJ", metaKey: true, altKey: true, shiftKey: true }),
    ];
    for (const e of mac) expect(isDevToolsShortcut(e, true)).toBe(false);
    const other = [key({ key: "∆", code: "KeyJ", metaKey: true, altKey: true }), key({ key: "J", code: "KeyJ", ctrlKey: true, shiftKey: true, altKey: true }), key({ key: "j", code: "KeyJ", ctrlKey: true })];
    for (const e of other) expect(isDevToolsShortcut(e, false)).toBe(false);
    const { win } = fakeWindow();
    const { reasons } = watch(win);
    for (const e of mac) win.emit("keydown", e);
    expect(reasons).toEqual([]);
  });
});

describe("onConsoleIntent: away", () => {
  const intent = (focused: boolean, o: FakeOptions = {}) => {
    const { win, doc } = fakeWindow(o);
    Object.assign(doc, { hasFocus: () => focused });
    const events: ConsoleIntentEvent[] = [];
    const handle = onConsoleIntent((e) => events.push(e), { window: win as never });
    return { win, events, handle };
  };

  test("DevTools has focus when it docks: away", () => {
    expect(intent(false, { inner: [1440, 400] }).events[0]?.away()).toBe(true);
  });

  test("a DevTools shortcut on the focused page: away, since DevTools takes focus as it opens", () => {
    const { win, events } = intent(true);
    win.emit("keydown", key({ key: "F12", code: "F12" }));
    expect(events[0]?.away()).toBe(true);
  });

  test("docked while the page has focus: away once it loses focus", () => {
    const { win, events } = intent(true, { inner: [1440, 400] });
    expect(events[0]?.away()).toBe(false);
    win.emit("blur");
    expect(events[0]?.away()).toBe(true);
  });
});

describe("onConsoleIntent: session", () => {
  test("dock, shortcut and engage are remembered for the tab; session replays them", () => {
    const first = fakeWindow({ inner: [1440, 400] });
    watch(first.win);
    expect(first.win.sessionStorage.getItem("textjs:console-intent")).toBe("1");

    const reload = fakeWindow();
    reload.win.sessionStorage = first.win.sessionStorage;
    expect(watch(reload.win).reasons).toEqual(["session"]);

    const engaged = fakeWindow();
    watch(engaged.win);
    engaged.doc.emit("mousedown", press(new El("div", ["data-textjs-engage"])));
    expect(engaged.win.sessionStorage.getItem("textjs:console-intent")).toBe("1");
  });

  test("the key is exported", () => {
    expect(CONSOLE_INTENT_KEY).toBe("textjs:console-intent");
  });

  test("manual triggers and persist: false remember nothing", () => {
    const a = fakeWindow();
    watch(a.win).handle.trigger();
    expect(a.win.sessionStorage.getItem("textjs:console-intent")).toBeNull();
    const b = fakeWindow({ inner: [1440, 400] });
    watch(b.win, { persist: false });
    expect(b.win.sessionStorage.getItem("textjs:console-intent")).toBeNull();
  });
});

describe("onConsoleIntent: engage", () => {
  const page = () => {
    const body = new El("body");
    const pad = new El("div", ["data-textjs-focus-pad"], body);
    const padText = new El("span", [], pad);
    const select = new El("select", [], pad);
    const padButton = new El("button", ["data-textjs-engage"], pad);
    const engage = new El("div", ["data-textjs-engage"], body);
    const inspect = new El("button", [], engage);
    const other = new El("p", [], body);
    return { pad, padText, select, padButton, engage, inspect, other };
  };

  test("a primary press on a surface fires engage", () => {
    const p = page();
    for (const target of [p.pad, p.padText, p.engage, p.padButton, new El("text-console")]) {
      const { win, doc } = fakeWindow();
      const { reasons } = watch(win);
      doc.emit("mousedown", press(target));
      expect(reasons).toEqual(["engage"]);
    }
  });

  test("right clicks, ⌃-click on macOS, presses elsewhere and a surface's own controls are ignored", () => {
    const p = page();
    const { win, doc } = fakeWindow();
    const { reasons } = watch(win);
    doc.emit("mousedown", press(p.pad, { button: 2 }));
    doc.emit("mousedown", press(p.pad, { ctrlKey: true }));
    doc.emit("mousedown", press(p.other));
    doc.emit("mousedown", press(p.select));
    doc.emit("mousedown", press(p.inspect));
    expect(reasons).toEqual([]);
    // ⌃-click is a right click only on macOS.
    const windows = fakeWindow({ platform: "Win32" });
    const w = watch(windows.win);
    windows.doc.emit("mousedown", press(p.pad, { ctrlKey: true }));
    expect(w.reasons).toEqual(["engage"]);
  });

  test("a keyboard click (Enter or Space) fires engage; pointer clicks don't count twice", () => {
    const p = page();
    const { win, doc } = fakeWindow();
    const { reasons } = watch(win);
    doc.emit("click", { target: p.engage, detail: 1 });
    expect(reasons).toEqual([]);
    doc.emit("click", { target: p.engage, detail: 0 });
    expect(reasons).toEqual(["engage"]);
  });

  test("a textjs:engage event (a size picked before boot) fires engage", () => {
    const { win, doc } = fakeWindow();
    const { reasons } = watch(win);
    doc.emit("textjs:engage", { target: new El("span") });
    expect(reasons).toEqual(["engage"]);
  });

  test("engageSelector: false adds no listeners", () => {
    const off = fakeWindow();
    watch(off.win, { engageSelector: false });
    expect(off.doc.count).toBe(0);
  });

  test("dispose removes every listener", () => {
    const { win, doc } = fakeWindow({ readyState: "loading" });
    const { handle, reasons } = watch(win, { prefetch: () => undefined, idlePrefetch: true });
    expect(win.count + doc.count).toBeGreaterThan(0);
    handle.dispose();
    expect(win.count + doc.count).toBe(0);
    handle.trigger();
    expect(reasons).toEqual([]);
  });
});

describe("onConsoleIntent: prefetch", () => {
  test("hovering or focusing a surface warms once; idle warms after load when asked", () => {
    const p = new El("div", ["data-textjs-engage"]);
    const { win, doc, runIdle } = fakeWindow({ readyState: "loading" });
    let warmed = 0;
    watch(win, { prefetch: () => warmed++, idlePrefetch: true });
    doc.emit("pointerover", { target: new El("p") });
    expect(warmed).toBe(0);
    doc.emit("pointerover", { target: p });
    doc.emit("focusin", { target: p });
    expect(warmed).toBe(1);

    const idle = fakeWindow({ readyState: "loading" });
    let idleWarmed = 0;
    watch(idle.win, { prefetch: () => idleWarmed++, idlePrefetch: true });
    idle.runIdle();
    expect(idleWarmed).toBe(0);
    idle.win.emit("load");
    idle.runIdle();
    expect(idleWarmed).toBe(1);
    runIdle();
  });

  test("never warms where canPrefetchConsole says no, or without idlePrefetch", () => {
    for (const o of [{ coarse: true }, { connection: { saveData: true } }, { connection: { effectiveType: "3g" } }] as FakeOptions[]) {
      const { win, doc, runIdle } = fakeWindow(o);
      let warmed = 0;
      watch(win, { prefetch: () => warmed++, idlePrefetch: true });
      doc.emit("pointerover", { target: new El("div", ["data-textjs-engage"]) });
      runIdle();
      expect(warmed).toBe(0);
    }
    const { win, runIdle } = fakeWindow();
    let warmed = 0;
    watch(win, { prefetch: () => warmed++ });
    runIdle();
    expect(warmed).toBe(0);
  });

  test("canPrefetchConsole: desktop on 4g or an unknown connection only", () => {
    const can = (o: FakeOptions) => canPrefetchConsole(fakeWindow(o).win as never);
    expect(can({})).toBe(true);
    expect(can({ connection: { effectiveType: "4g" } })).toBe(true);
    expect(can({ coarse: true })).toBe(false);
    expect(can({ fine: false })).toBe(false);
    expect(can({ connection: { saveData: true, effectiveType: "4g" } })).toBe(false);
    for (const effectiveType of ["3g", "2g", "slow-2g"]) expect(can({ connection: { effectiveType } })).toBe(false);
    expect(canPrefetchConsole()).toBe(false);
  });
});

test("onConsoleIntent bundles without Yoga, the cell buffer or the renderer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "textjs-intent-"));
  try {
    const entry = join(dir, "entry.ts");
    const experimental = fileURLToPath(new URL("../src/experimental.ts", import.meta.url));
    writeFileSync(entry, `import { canPrefetchConsole, onConsoleIntent } from ${JSON.stringify(experimental)};\nonConsoleIntent((e) => console.log(e.reason), { prefetch: () => canPrefetchConsole() });\n`);
    const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
    expect(result.success).toBe(true);
    const code = (await result.outputs[0]?.text()) ?? "";
    for (const s of ["loadYoga", "CellBuffer", "ConsoleRenderer", "Intl.Segmenter"]) expect(code).not.toContain(s);
    expect(code).toContain("textjs:console-intent");
    expect(gzipSync(code).length).toBeLessThan(2200);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
