import { describe, expect, test } from "bun:test";
import { InputEngine, type KeyboardEventLike, type KeyStateEvent } from "../src/index";

const ev = (key: string, code: string, extra: Partial<KeyboardEventLike> = {}): KeyboardEventLike => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault() {},
  ...extra,
});

function engine(): { input: InputEngine; log: string[] } {
  const input = new InputEngine({ document: null });
  const log: string[] = [];
  input.on("keystate", (e: KeyStateEvent) => log.push(`${e.code}${e.down ? "↓" : "↑"}`));
  return { input, log };
}

describe("keystate", () => {
  test("press and release, with auto-repeat reported once", () => {
    const { input, log } = engine();
    input.handleKeyDown(ev("ArrowUp", "ArrowUp"));
    input.handleKeyDown(ev("ArrowUp", "ArrowUp", { repeat: true }));
    expect(input.isDown("ArrowUp")).toBe(true);
    input.handleKeyUp(ev("ArrowUp", "ArrowUp"));
    expect(input.isDown("ArrowUp")).toBe(false);
    expect(log).toEqual(["ArrowUp↓", "ArrowUp↑"]);
  });

  test("modifiers alone are held keys, though they emit no key event", () => {
    const { input, log } = engine();
    const keys: string[] = [];
    input.on("key", (e) => keys.push(e.key));
    input.handleKeyDown(ev("Control", "ControlLeft", { ctrlKey: true }));
    input.handleKeyDown(ev("w", "KeyW", { ctrlKey: true }));
    expect([...input.pressed].sort()).toEqual(["ControlLeft", "KeyW"]);
    expect(keys).toEqual(["w"]);
    expect(log).toEqual(["ControlLeft↓", "KeyW↓"]);
  });

  test("losing focus releases everything, so nothing sticks", () => {
    const { input, log } = engine();
    input.handleKeyDown(ev("a", "KeyA"));
    input.handleKeyDown(ev("Shift", "ShiftLeft", { shiftKey: true }));
    input.setFocused(false);
    expect(input.pressed.size).toBe(0);
    expect(log).toEqual(["KeyA↓", "ShiftLeft↓", "KeyA↑", "ShiftLeft↑"]);
  });

  test("releasing ⌘ ends keys whose keyup macOS swallowed", () => {
    const { input } = engine();
    input.handleKeyDown(ev("Meta", "MetaLeft", { metaKey: true }));
    input.handleKeyDown(ev("x", "KeyX", { metaKey: true }));
    input.handleKeyUp(ev("Meta", "MetaLeft"));
    expect(input.pressed.size).toBe(0);
  });

  test("browser shortcuts and IME composition keydowns aren't tracked, while composition keyups still release", () => {
    const { input, log } = engine();
    const anyEvents: string[] = [];
    input.onAny((e) => anyEvents.push(e.type));
    const pRef = input.pressed;
    input.handleKeyDown(ev("F12", "F12"));
    input.handleKeyDown(ev("Process", "KeyN", { isComposing: true, keyCode: 229 }));
    expect(input.pressed.size).toBe(0);

    // Key pressed normally, then released while IME is composing -> must still release cleanly
    input.handleKeyDown(ev("a", "KeyA"));
    expect(input.isDown("KeyA")).toBe(true);
    expect(input.pressed).toBe(pRef); // persistent Set reused without allocating
    input.handleKeyUp(ev("Process", "KeyA", { isComposing: true, keyCode: 229 }));
    expect(input.isDown("KeyA")).toBe(false);
    expect(input.pressed.size).toBe(0);
    expect(input.pressed).toBe(pRef);
    expect(log).toEqual(["KeyA↓", "KeyA↑"]);
    // KeyStateEvent is not part of InputEvent / onAny
    expect(anyEvents).toEqual(["key"]);
  });

  test("a closed gate tracks nothing, but a release still lands", () => {
    let open = true;
    const input = new InputEngine({ document: null, shouldCapture: () => open });
    input.handleKeyDown(ev("ArrowLeft", "ArrowLeft"));
    open = false;
    input.handleKeyDown(ev("ArrowRight", "ArrowRight"));
    input.handleKeyUp(ev("ArrowLeft", "ArrowLeft"));
    expect(input.pressed.size).toBe(0);
  });
});
