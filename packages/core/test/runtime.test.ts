import { beforeAll, describe, expect, jest, test } from "bun:test";
import {
  ConsoleRenderer,
  initYoga,
  InputEngine,
  isPassthroughShortcut,
  type InputEvent,
  type KeyboardEventLike,
  type RendererScheduler,
  type TextConsoleApi,
} from "../src/index";
import { box, FakeConsole, text } from "./fixtures";

beforeAll(async () => {
  await initYoga();
});

function key(k: string, mods: Partial<KeyboardEventLike> = {}): KeyboardEventLike & { prevented: boolean } {
  const e = {
    key: k,
    code: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    prevented: false,
    preventDefault() {
      e.prevented = true;
    },
    ...mods,
  };
  return e;
}

describe("InputEngine", () => {
  test("browser and DevTools shortcuts pass through untouched", () => {
    const engine = new InputEngine({ document: null });
    const events: InputEvent[] = [];
    engine.onAny((e) => events.push(e));
    const shortcuts = [
      key("j", { metaKey: true, altKey: true }),
      key("i", { metaKey: true, altKey: true }),
      key("c", { metaKey: true, altKey: true }),
      key("F12"),
      key("r", { metaKey: true }),
      key("R", { metaKey: true, shiftKey: true }),
      key("l", { metaKey: true }),
      key("t", { metaKey: true }),
      key("w", { metaKey: true }),
      key("J", { ctrlKey: true, shiftKey: true }),
    ];
    for (const e of shortcuts) {
      expect(isPassthroughShortcut(e)).toBe(true);
      expect(engine.handleKeyDown(e)).toBe(false);
      expect(e.prevented).toBe(false);
    }
    expect(events.length).toBe(0);
  });

  test("TUI navigation keys are prevented and normalized", () => {
    const engine = new InputEngine({ document: null });
    const names: string[] = [];
    engine.on("key", (e) => names.push(e.key));
    const cases: Array<[string, string]> = [
      ["ArrowUp", "up"],
      ["ArrowDown", "down"],
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      [" ", "space"],
      ["Tab", "tab"],
      ["Backspace", "backspace"],
      ["Escape", "escape"],
      ["/", "/"],
      ["PageUp", "pageup"],
      ["PageDown", "pagedown"],
      ["Home", "home"],
      ["End", "end"],
      ["Enter", "return"],
    ];
    for (const [k] of cases) {
      const e = key(k);
      expect(engine.handleKeyDown(e)).toBe(true);
      expect(e.prevented).toBe(true);
    }
    expect(names).toEqual(cases.map(([, n]) => n));
  });

  test("printable keys carry input; clipboard shortcuts keep defaults", () => {
    const engine = new InputEngine({ document: null });
    const got: Array<{ key: string; input: string; meta: boolean; ctrl: boolean }> = [];
    engine.on("key", (e) => got.push({ key: e.key, input: e.input, meta: e.meta, ctrl: e.ctrl }));
    const a = key("A", { shiftKey: true });
    engine.handleKeyDown(a);
    expect(a.prevented).toBe(true);
    const paste = key("v", { metaKey: true });
    engine.handleKeyDown(paste);
    expect(paste.prevented).toBe(false);
    const ctrlK = key("k", { ctrlKey: true });
    engine.handleKeyDown(ctrlK);
    expect(ctrlK.prevented).toBe(true);
    expect(got).toEqual([
      { key: "a", input: "A", meta: false, ctrl: false },
      { key: "v", input: "", meta: true, ctrl: false },
      { key: "k", input: "", meta: false, ctrl: true },
    ]);
  });

  test("IME composition and modifier-only keys are ignored", () => {
    const engine = new InputEngine({ document: null });
    let count = 0;
    engine.on("key", () => count++);
    engine.handleKeyDown(key("Shift"));
    engine.handleKeyDown(key("a", { isComposing: true }));
    engine.handleKeyDown(key("Process", { keyCode: 229 }));
    expect(count).toBe(0);
    engine.handleTextInput("你好");
    expect(count).toBe(1);
  });

  test("paste, wheel and focus events", () => {
    const engine = new InputEngine({ document: null });
    const events: InputEvent[] = [];
    engine.onAny((e) => events.push(e));
    engine.handlePaste("a\r\nb");
    engine.handleWheel({ deltaX: 0, deltaY: 48, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
    engine.setFocused(false);
    engine.setFocused(false);
    expect(events).toEqual([
      { type: "paste", text: "a\nb" },
      { type: "wheel", deltaX: 0, deltaY: 48, rows: 3, cols: 0, ctrl: false, meta: false, shift: false, alt: false },
      { type: "focus", focused: false },
    ]);
  });
});

class ManualScheduler implements RendererScheduler {
  queue: Array<() => void> = [];
  request(cb: () => void): unknown {
    this.queue.push(cb);
    return this.queue.length;
  }
  cancel(): void {
    this.queue = [];
  }
  flush(): void {
    const q = this.queue;
    this.queue = [];
    for (const cb of q) cb();
  }
}

describe("ConsoleRenderer", () => {
  test("coalesces requests and only logs dirty frames", () => {
    const con = new FakeConsole();
    const scheduler = new ManualScheduler();
    const label = text({ fg: "#22c55e" }, "count: 0");
    const root = box({ flexDirection: "column", padding: 1, border: "rounded", title: "▼ Text.js" }, label);
    const r = new ConsoleRenderer({ root, console: con, scheduler, viewport: { width: 40, height: 8 }, input: false, registerGlobal: false });
    r.requestRender();
    r.requestRender();
    r.requestRender();
    expect(scheduler.queue.length).toBe(1);
    scheduler.flush();
    expect(con.logs.length).toBe(1);
    expect(con.clears).toBe(1);

    r.requestRender();
    scheduler.flush();
    expect(con.logs.length).toBe(1);
    expect(r.stats().skippedFrames).toBe(1);

    (label.children[0] ?? label).setText("count: 1");
    r.requestRender();
    scheduler.flush();
    expect(con.logs.length).toBe(2);
    const s = r.stats();
    expect(s.dirtyRows).toBe(1);
    expect(s.frameCount).toBe(2);
    expect(s.cols).toBe(40);
    expect(s.rows).toBe(8);
    expect(s.yogaNodes).toBe(2);
    expect(r.copyText()).toContain("count: 1");
    r.dispose();
  });

  test("pause / resume and resize", () => {
    const con = new FakeConsole();
    const scheduler = new ManualScheduler();
    const r = new ConsoleRenderer({ root: box({}, text({}, "hi")), console: con, scheduler, viewport: { width: 20, height: 4 }, input: false, registerGlobal: false });
    r.renderNow();
    r.pause();
    r.requestRender(true);
    expect(scheduler.queue.length).toBe(0);
    expect(r.stats().paused).toBe(true);
    r.resume();
    scheduler.flush();
    expect(con.logs.length).toBe(2);
    r.resize(30, 6);
    scheduler.flush();
    expect(r.buffer.width).toBe(30);
    expect(con.logs.length).toBe(3);
    r.dispose();
  });

  test("forwards curtain to the driver for an injected console", () => {
    const frame = (curtain?: boolean): string => {
      const con = new FakeConsole();
      const r = new ConsoleRenderer({ root: box({}, text({}, "hi")), console: con, curtain, scheduler: new ManualScheduler(), viewport: { width: 20, height: 4 }, input: false, registerGlobal: false });
      r.renderNow();
      r.dispose();
      return con.last.format;
    };
    expect(frame(true).startsWith("%c\u200b%c\n")).toBe(true);
    expect(frame().startsWith("%c\u200b%c\n")).toBe(false);
    expect(frame(true).slice("%c\u200b%c\n".length)).toBe(frame());
  });

  test("registers the window.text REPL helper", () => {
    const con = new FakeConsole();
    const r = new ConsoleRenderer({ root: box({}, text({}, "repl")), console: con, scheduler: new ManualScheduler(), viewport: { width: 20, height: 3 }, input: false, registerGlobal: true });
    const api = (globalThis as { text?: TextConsoleApi }).text;
    expect(api).toBeDefined();
    expect(api?.renderer).toBe(r);
    api?.resize(24, 5);
    expect(api?.stats()).toMatchObject({ cols: 24, rows: 5 });
    r.renderNow();
    expect(api?.copyText()).toBe("repl");
    expect(typeof api?.help).toBe("function");
    r.dispose();
    expect((globalThis as { text?: TextConsoleApi }).text).toBeUndefined();
  });

  test("disposing a secondary renderer never deletes window.text owned by another", () => {
    const g = globalThis as { text?: TextConsoleApi };
    const main = new ConsoleRenderer({ root: box({}, text({}, "main")), console: new FakeConsole(), scheduler: new ManualScheduler(), viewport: { width: 20, height: 3 }, input: false, registerGlobal: true });
    const preview = new ConsoleRenderer({ root: box({}, text({}, "preview")), console: new FakeConsole(), scheduler: new ManualScheduler(), viewport: { width: 20, height: 3 }, input: false, registerGlobal: true });
    expect(g.text?.renderer).toBe(preview);
    const sandbox = new ConsoleRenderer({ root: box({}, text({}, "sandbox")), console: new FakeConsole(), scheduler: new ManualScheduler(), viewport: { width: 20, height: 3 }, input: false, registerGlobal: false });
    expect(g.text?.renderer).toBe(preview);
    sandbox.dispose();
    main.dispose();
    expect(g.text?.renderer).toBe(preview);
    preview.dispose();
    expect(g.text).toBeUndefined();
  });
});

describe("InputEngine capture gate", () => {
  test("a disabled engine never calls preventDefault() or emits", () => {
    let enabled = false;
    const engine = new InputEngine({ document: null, shouldCapture: () => enabled });
    const events: InputEvent[] = [];
    engine.onAny((e) => events.push(e));
    for (const k of ["Tab", " ", "PageDown", "ArrowDown", "a"]) {
      const e = key(k);
      expect(engine.handleKeyDown(e)).toBe(false);
      expect(e.prevented).toBe(false);
    }
    engine.handlePaste("hello");
    engine.handleTextInput("你");
    expect(engine.enabled).toBe(false);
    expect(events.length).toBe(0);
    enabled = true;
    const tab = key("Tab");
    expect(engine.handleKeyDown(tab)).toBe(true);
    expect(tab.prevented).toBe(true);
    expect(events.length).toBe(1);
  });
});

describe("zero-jump input", () => {
  function fakeDocument() {
    const focusCalls: unknown[] = [];
    const attrs: Record<string, string> = {};
    const sink = {
      value: "",
      style: { cssText: "" },
      attrs,
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      addEventListener() {},
      removeEventListener() {},
      remove() {},
      focus(opts?: unknown) {
        focusCalls.push(opts);
      },
    };
    const doc = {
      defaultView: null,
      body: { appendChild() {} },
      documentElement: null,
      createElement: () => sink,
      addEventListener() {},
      removeEventListener() {},
      hasFocus: () => true,
    };
    return { doc: doc as unknown as Document, sink, focusCalls };
  }

  test("the sink is centered, focused with preventScroll and never receives printable text", () => {
    const { doc, sink, focusCalls } = fakeDocument();
    const engine = new InputEngine({ document: doc }).attach();
    expect(sink.style.cssText).toContain("position:fixed;top:50%;left:50%;");
    engine.focus();
    expect(focusCalls.length).toBe(2);
    expect(focusCalls.every((o) => (o as { preventScroll?: boolean }).preventScroll === true)).toBe(true);
    sink.value = "x";
    const e = key("é");
    engine.handleKeyDown(e);
    expect(e.prevented).toBe(true);
    expect(sink.value).toBe("");
    // IME composition and clipboard shortcuts still reach the textarea natively.
    const ime = key("a", { isComposing: true });
    engine.handleKeyDown(ime);
    expect(ime.prevented).toBe(false);
    const paste = key("v", { metaKey: true });
    engine.handleKeyDown(paste);
    expect(paste.prevented).toBe(false);
    engine.detach();
  });

  test("the sink has a name, so Chrome's Issues panel doesn't flag it, and stays out of autofill", () => {
    const { doc, sink } = fakeDocument();
    const engine = new InputEngine({ document: doc }).attach();
    expect(sink.attrs.name).toBe("textjs-input");
    expect(sink.attrs.id).toBeUndefined();
    expect(sink.attrs).toMatchObject({ autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", "data-1p-ignore": "", "data-lpignore": "true", "data-bwignore": "", "data-form-type": "other" });
    engine.detach();
  });

  test("flushInputFrame renders synchronously, then coalesces key repeat at 120fps", () => {
    // Fake timers freeze performance.now(), so "within 8ms" is exact rather than racing a busy runner.
    jest.useFakeTimers();
    try {
      const con = new FakeConsole();
      const scheduler = new ManualScheduler();
      const label = text({}, "a");
      const root = box({ flexDirection: "column" }, label);
      const r = new ConsoleRenderer({ root, console: con, scheduler, viewport: { width: 20, height: 2 }, input: false, registerGlobal: false });
      r.requestRender();
      const frame = r.flushInputFrame();
      expect(frame?.skipped).toBe(false);
      expect(con.logs.length).toBe(1);
      // Synchronous: the frame is logged before flushInputFrame returns, with nothing scheduled.
      expect(scheduler.queue.length).toBe(0);
      const raw = label.children[0] ?? label;
      // A second flush within 8ms defers to the next animation frame.
      jest.advanceTimersByTime(7);
      raw.setText("ab");
      expect(r.flushInputFrame()).toBeNull();
      expect(con.logs.length).toBe(1);
      expect(scheduler.queue.length).toBe(1);
      scheduler.flush();
      expect(con.logs.length).toBe(2);
      // Once 8ms have passed since the last synchronous flush, input renders synchronously again.
      jest.advanceTimersByTime(1);
      raw.setText("abc");
      expect(r.flushInputFrame()?.skipped).toBe(false);
      expect(con.logs.length).toBe(3);
      expect(scheduler.queue.length).toBe(0);
      r.dispose();
    } finally {
      jest.useRealTimers();
    }
  });

  test("minFrameInterval paces emitted frames and coalesces updates in between", () => {
    jest.useFakeTimers();
    try {
      const con = new FakeConsole();
      const scheduler = new ManualScheduler();
      const label = text({}, "a");
      const root = box({ flexDirection: "column" }, label);
      const r = new ConsoleRenderer({
        root,
        console: con,
        scheduler,
        minFrameInterval: 40,
        viewport: { width: 20, height: 2 },
        input: false,
        registerGlobal: false,
      });
      r.renderNow();
      expect(con.logs.length).toBe(1);
      const raw = label.children[0] ?? label;
      raw.setText("ab");
      r.requestRender();
      raw.setText("abc");
      expect(r.flushInputFrame()).toBeNull();
      r.requestRender();
      // Within the interval nothing goes through the animation-frame scheduler.
      expect(scheduler.queue.length).toBe(0);
      expect(con.logs.length).toBe(1);
      jest.advanceTimersByTime(39);
      expect(con.logs.length).toBe(1);
      // At the interval boundary the coalesced update goes out as one frame with the latest text.
      jest.advanceTimersByTime(1);
      expect(con.logs.length).toBe(2);
      expect(String(con.last.format)).toContain("abc");
      expect(scheduler.queue.length).toBe(0);
      r.dispose();
    } finally {
      jest.useRealTimers();
    }
  });
});
