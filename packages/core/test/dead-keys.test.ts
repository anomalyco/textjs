import { describe, expect, test } from "bun:test";
import { InputEngine, type KeyboardEventLike } from "../src/index";

/**
 * Dead-key sequences recorded on GitHub's windows-2025 runner (Chrome and Edge, US-International layout,
 * keys sent with SendInput) by scripts/windows/browser-check.mjs. Windows fires no composition events for
 * dead keys: a `Dead` keydown, then an ordinary keydown, then the text the browser inserts into the
 * focused field. `insert` steps happen only when the keydown before them kept its default.
 */
type Step = { t: "keydown"; key: string; keyCode: number } | { t: "insert"; data: string };

const kd = (key: string, keyCode: number): Step => ({ t: "keydown", key, keyCode });
const ins = (...data: string[]): Step[] => data.map((d) => ({ t: "insert", data: d }));

class FakeSink {
  readonly tagName = "TEXTAREA";
  value = "";
  private readonly handlers = new Map<string, Set<(e: Event) => void>>();
  addEventListener(type: string, fn: (e: Event) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)?.add(fn);
  }
  removeEventListener(type: string, fn: (e: Event) => void): void {
    this.handlers.get(type)?.delete(fn);
  }
  dispatch(type: string, init: object = {}): void {
    for (const fn of this.handlers.get(type) ?? []) fn({ type, ...init } as unknown as Event);
  }
}

function keyEvent(key: string, keyCode: number, target: unknown): KeyboardEventLike & { prevented: boolean } {
  const e = {
    key,
    code: "",
    keyCode,
    target: target as EventTarget,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    prevented: false,
    preventDefault() {
      e.prevented = true;
    },
  };
  return e;
}

/** Replay on an engine with a bound sink. Returns emitted key events and keydowns that were prevented. */
function replay(steps: Step[], target: "sink" | "body" = "sink") {
  const engine = new InputEngine({ document: null });
  const sink = new FakeSink();
  engine.bindTextSink(sink as unknown as HTMLTextAreaElement);
  const keys: Array<{ key: string; input: string }> = [];
  engine.on("key", (e) => keys.push({ key: e.key, input: e.input }));
  const prevented: string[] = [];
  let lastPrevented = false;
  for (const s of steps) {
    if (s.t === "keydown") {
      const e = keyEvent(s.key, s.keyCode, target === "sink" ? sink : { tagName: "BODY" });
      engine.handleKeyDown(e);
      lastPrevented = e.prevented;
      if (e.prevented) prevented.push(s.key);
    } else {
      // The browser never inserts text for a prevented keydown.
      expect(lastPrevented).toBe(false);
      sink.value += s.data;
      sink.dispatch("input", { isComposing: false });
    }
  }
  return { keys, prevented, sinkValue: sink.value };
}

describe("Windows dead keys (US-International)", () => {
  test("' then t inserts both characters, delivered as text once", () => {
    const r = replay([kd("Dead", 222), kd("t", 84), ...ins("'", "t")]);
    expect(r.keys).toEqual([
      { key: "'", input: "'" },
      { key: "t", input: "t" },
    ]);
    expect(r.prevented).toEqual([]);
    expect(r.sinkValue).toBe("");
  });

  test("' then e inserts é, delivered as text, never as the key e", () => {
    // With a text field focused, the keydown already reports the composed key.
    const r = replay([kd("Dead", 222), kd("é", 69), ...ins("é")]);
    expect(r.keys).toEqual([{ key: "é", input: "é" }]);
    expect(r.prevented).toEqual([]);
  });

  test("' then a inserts á", () => {
    const r = replay([kd("Dead", 222), kd("á", 65), ...ins("á")]);
    expect(r.keys).toEqual([{ key: "á", input: "á" }]);
    expect(r.prevented).toEqual([]);
  });

  test("' then Space inserts the accent", () => {
    const r = replay([kd("Dead", 222), kd("'", 32), ...ins("'")]);
    expect(r.keys).toEqual([{ key: "'", input: "'" }]);
    expect(r.prevented).toEqual([]);
  });

  test("' twice inserts two accents, and the next key is ordinary again", () => {
    const r = replay([kd("Dead", 222), kd("Dead", 222), ...ins("'", "'"), kd("a", 65)]);
    expect(r.keys).toEqual([
      { key: "'", input: "'" },
      { key: "'", input: "'" },
      { key: "a", input: "a" },
    ]);
    expect(r.prevented).toEqual(["a"]);
  });

  test("' then ↓ passes the arrow to the app and inserts nothing", () => {
    const r = replay([kd("Dead", 222), kd("ArrowDown", 40), kd("e", 69)]);
    expect(r.keys).toEqual([
      { key: "down", input: "" },
      { key: "e", input: "e" },
    ]);
    expect(r.prevented).toEqual(["ArrowDown", "e"]);
  });

  test("' then Esc: Windows inserts the pending accent before the Esc keydown, which reaches the app", () => {
    const r = replay([kd("Dead", 222), ...ins("'", "'"), kd("Escape", 27), kd("e", 69)]);
    expect(r.keys).toEqual([
      { key: "'", input: "'" },
      { key: "'", input: "'" },
      { key: "escape", input: "" },
      { key: "e", input: "e" },
    ]);
    expect(r.prevented).toEqual(["Escape", "e"]);
  });

  test("with <body> focused the keydown carries é and the app takes it as a key", () => {
    const r = replay([kd("Dead", 222), kd("é", 69)], "body");
    expect(r.keys).toEqual([{ key: "é", input: "é" }]);
    expect(r.prevented).toEqual(["é"]);
  });
});

describe("Linux dead keys without an IME (X11, us intl)", () => {
  // Recorded on Chrome 156 with xdotool: the same shape as Windows, and the completing key may be 229 "Process".
  test("dead_acute then e inserts é", () => {
    const r = replay([kd("Dead", 222), kd("e", 69), ...ins("é")]);
    expect(r.keys).toEqual([{ key: "é", input: "é" }]);
    expect(r.prevented).toEqual([]);
  });

  test("dead_acute then t inserts ´t as one text", () => {
    const r = replay([kd("Dead", 222), kd("Process", 229), ...ins("´t")]);
    expect(r.keys).toEqual([{ key: "´t", input: "´t" }]);
    expect(r.prevented).toEqual([]);
  });
});

describe("composition dead keys (macOS, Linux with IBus)", () => {
  test("Option+E then E composes é once", () => {
    const engine = new InputEngine({ document: null });
    const sink = new FakeSink();
    engine.bindTextSink(sink as unknown as HTMLTextAreaElement);
    const got: string[] = [];
    engine.on("key", (e) => got.push(e.input));
    const down = (key: string, isComposing: boolean) => {
      const e = { ...keyEvent(key, 229, sink), isComposing };
      engine.handleKeyDown(e);
      expect(e.prevented).toBe(false);
    };
    down("Dead", false);
    sink.dispatch("compositionstart");
    sink.value = "´";
    sink.dispatch("input", { isComposing: true });
    down("é", true);
    sink.value = "é";
    sink.dispatch("input", { isComposing: true });
    sink.dispatch("compositionend");
    expect(got).toEqual(["é"]);
  });
});

test("ordinary keys still emit and prevent their default", () => {
  const r = replay([kd("a", 65), kd("ArrowUp", 38)]);
  expect(r.keys).toEqual([
    { key: "a", input: "a" },
    { key: "up", input: "" },
  ]);
  expect(r.prevented).toEqual(["a", "ArrowUp"]);
});
