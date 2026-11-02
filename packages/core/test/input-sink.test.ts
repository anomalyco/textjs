import { describe, expect, test } from "bun:test";
import { bindTextSink, InputEngine, normalizeKeyEvent, type KeyboardEventLike } from "../src/index";

/**
 * Event sequences recorded from real Google Chrome 156 on Linux with OS-level keystrokes
 * (xdotool on X11, wtype on Wayland). `value` is what the textarea held when the event fired.
 */
type Step =
  | { t: "keydown"; key: string; keyCode: number; isComposing: boolean }
  | { t: "compositionstart" }
  /** `value: null`: the browser fires `input` without writing to the field again. */
  | { t: "input"; value: string | null; isComposing: boolean }
  | { t: "compositionend"; value: string };

const kd = (key: string, keyCode: number, isComposing = false): Step => ({ t: "keydown", key, keyCode, isComposing });
const ime = (isComposing: boolean, ...values: string[]): Step[] => values.map((value) => ({ t: "input", value, isComposing }));
const start: Step = { t: "compositionstart" };
const end = (value: string): Step => ({ t: "compositionend", value });

const SEQUENCES: Record<string, { steps: Step[]; text: string[] }> = {
  // X11, IBus libpinyin (GTK IM module): "n i Space" commits 你. Every keydown is 229 "Process".
  "X11 IBus pinyin: ni + Space": {
    steps: [kd("Process", 229), start, ...ime(true, "年"), kd("Process", 229, true), ...ime(true, "你"), kd("Process", 229, true), ...ime(true, "你"), end("你")],
    text: ["你"],
  },
  // Enter commits the raw letters.
  "X11 IBus pinyin: hao + Enter": {
    steps: [kd("Process", 229), start, ...ime(true, "和"), kd("Process", 229, true), ...ime(true, "哈"), kd("Process", 229, true), ...ime(true, "号"), kd("Process", 229, true), ...ime(true, "hao"), end("hao")],
    text: ["hao"],
  },
  // Escape cancels: the composition empties and nothing is committed.
  "X11 IBus pinyin: ni + Escape": {
    steps: [kd("Process", 229), start, ...ime(true, "年"), kd("Process", 229, true), ...ime(true, "你"), kd("Process", 229, true), ...ime(true, ""), end("")],
    text: [],
  },
  "X11 Fcitx5 pinyin: ni + Backspace + Backspace": {
    steps: [kd("Process", 229), start, ...ime(true, "n"), ...ime(true, "ni"), kd("Process", 229, true), ...ime(true, "n"), kd("Process", 229, true), ...ime(true, ""), end("")],
    text: [],
  },
  // Wayland text-input-v3 (sway + Fcitx5, --enable-wayland-ime): no keydown at all while composing.
  "Wayland Fcitx5 pinyin: ni + Space": {
    steps: [start, ...ime(true, "n", "ni", "你"), end("你")],
    text: ["你"],
  },
  // Firefox's order (not captured on the VM): compositionend first, then a non-composing input. Delivered once.
  "compositionend before the final input": {
    steps: [start, ...ime(true, "n", "ni"), end("你"), { t: "input", value: null, isComposing: false }],
    text: ["你"],
  },
  // A dead key or autocorrect outside composition.
  "plain text input": {
    steps: [...ime(false, "é")],
    text: ["é"],
  },
};

class FakeSink {
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
  get listenerCount(): number {
    let n = 0;
    for (const s of this.handlers.values()) n += s.size;
    return n;
  }
}

function keyEvent(key: string, keyCode: number, isComposing: boolean): KeyboardEventLike & { prevented: boolean } {
  const e = { key, code: "", keyCode, isComposing, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, prevented: false, preventDefault() { e.prevented = true; } };
  return e;
}

/** Replay a sequence the way Chrome does: the textarea holds the composition text while it's live. */
function replay(steps: Step[], sink: FakeSink, onKeyDown: (e: KeyboardEventLike & { prevented: boolean }) => void): { midCompositionValues: string[]; prevented: number } {
  const midCompositionValues: string[] = [];
  let prevented = 0;
  for (const s of steps) {
    if (s.t === "keydown") {
      const e = keyEvent(s.key, s.keyCode, s.isComposing);
      onKeyDown(e);
      if (e.prevented) prevented++;
    } else if (s.t === "compositionstart") sink.dispatch("compositionstart");
    else if (s.t === "input") {
      // The browser writes the composition into the field; a sink that cleared it would break the IME.
      if (s.value !== null) sink.value = s.value;
      sink.dispatch("input", { isComposing: s.isComposing });
      if (s.isComposing) midCompositionValues.push(sink.value);
    } else {
      if (sink.value !== "" || s.value === "") sink.value = s.value;
      sink.dispatch("compositionend", { data: s.value });
    }
  }
  return { midCompositionValues, prevented };
}

describe("bindTextSink", () => {
  for (const [name, { steps, text }] of Object.entries(SEQUENCES)) {
    test(name, () => {
      const sink = new FakeSink();
      const got: string[] = [];
      const off = bindTextSink(sink as unknown as HTMLTextAreaElement, (t) => got.push(t));
      const { midCompositionValues } = replay(steps, sink, () => {});
      expect(got).toEqual(text);
      // The composition is never cleared out from under the IME.
      const composed = steps.filter((s): s is Extract<Step, { t: "input" }> => s.t === "input" && s.isComposing).map((s) => s.value as string);
      expect(midCompositionValues).toEqual(composed);
      expect(sink.value).toBe("");
      off();
      expect(sink.listenerCount).toBe(0);
    });
  }

  test("an engine sink emits each commit once and no keys from the IME keystrokes", () => {
    for (const [name, { steps, text }] of Object.entries(SEQUENCES)) {
      const engine = new InputEngine({ document: null });
      const sink = new FakeSink();
      const keys: string[] = [];
      const inputs: string[] = [];
      engine.on("key", (e) => {
        keys.push(e.key);
        inputs.push(e.input);
      });
      const off = engine.bindTextSink(sink as unknown as HTMLTextAreaElement);
      const { prevented } = replay(steps, sink, (e) => engine.handleKeyDown(e));
      expect({ name, inputs }).toEqual({ name, inputs: text });
      expect({ name, keys }).toEqual({ name, keys: text.map((t) => t.toLowerCase()) });
      // IME keystrokes keep their defaults, or the IME never sees them.
      expect({ name, prevented }).toEqual({ name, prevented: 0 });
      off();
    }
  });

  test("normalizeKeyEvent filters every IME keystroke in the captured sequences", () => {
    for (const { steps } of Object.values(SEQUENCES)) {
      for (const s of steps) if (s.t === "keydown") expect(normalizeKeyEvent(keyEvent(s.key, s.keyCode, s.isComposing))).toBeNull();
    }
  });
});
