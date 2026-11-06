import { describe, expect, test } from "bun:test";
import { createHostInput } from "../src/embed/host-input";

type Listener = (e: never) => void;

class Target {
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  removeEventListener(type: string, fn: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((l) => l !== fn));
  }
  emit(type: string, e: object): void {
    for (const l of [...(this.listeners.get(type) ?? [])]) l(e as never);
  }
}

/** Just enough of an element for `closest`: it matches the listed selectors exactly. */
class El {
  constructor(readonly selectors: string[] = []) {}
  matches(selector: string): boolean {
    return selector.split(",").some((s) => this.selectors.includes(s.trim()));
  }
  closest(selector: string): El | null {
    return this.matches(selector) ? this : null;
  }
  hasAttribute(): boolean {
    return false;
  }
}

/** A page whose focus a test controls, like a window docked next to DevTools. */
function fakePage(focused: boolean) {
  const sink = Object.assign(new Target(), {
    value: "",
    style: { setProperty() {} },
    setAttribute() {},
    remove() {},
    focus() {},
  });
  const win = Object.assign(new Target(), {
    navigator: { platform: "MacIntel", userAgent: "" },
    getSelection: () => ({ isCollapsed: true }),
  });
  const page = { focused, now: 1000 };
  const doc = Object.assign(new Target(), {
    defaultView: win,
    body: { appendChild() {} },
    activeElement: new El() as El | null,
    createElement: () => sink,
    hasFocus: () => page.focused,
  });
  const press = (target: El, after = 1000) => {
    page.now += after;
    doc.emit("mousedown", { target, button: 0, ctrlKey: false, timeStamp: page.now });
    doc.emit("click", { target, detail: 1 });
  };
  const focus = () => {
    page.focused = true;
    win.emit("focus", { timeStamp: page.now });
  };
  return { page, press, focus, document: doc as unknown as Document };
}

const empty = new El();
const link = new El(["a[href]"]);

describe("createHostInput: coming back from DevTools", () => {
  test("a click that brings focus back to the page engages; a later click on an already focused page doesn't", () => {
    const page = fakePage(false);
    const input = createHostInput({ document: page.document });
    page.focus();
    page.press(empty, 5);
    expect(input.engaged).toBe(true);
    page.press(link);
    expect(input.engaged).toBe(false);
    page.press(empty);
    expect(input.engaged).toBe(false);
    input.dispose();
  });

  test("a visitor who came back while the app loaded engages with their next click", () => {
    // DevTools had focus at the intent; the visitor clicked back into the page before the app's input started.
    const before = fakePage(true);
    const missed = createHostInput({ document: before.document });
    before.press(empty);
    expect(missed.engaged).toBe(false);
    missed.dispose();

    const page = fakePage(true);
    const input = createHostInput({ document: page.document, away: true });
    expect(input.engaged).toBe(false);
    page.press(empty);
    expect(input.engaged).toBe(true);
    input.dispose();
  });

  test("only the next click counts: a link hands keys to the page, and later clicks need focus to come back again", () => {
    const page = fakePage(true);
    const input = createHostInput({ document: page.document, away: true });
    page.press(link);
    expect(input.engaged).toBe(false);
    page.press(empty);
    expect(input.engaged).toBe(false);
    input.dispose();
  });

  test("a page that never lost focus (no DevTools, a side panel that looks docked) keeps its keys", () => {
    const page = fakePage(true);
    const input = createHostInput({ document: page.document, away: false });
    page.press(empty);
    expect(input.engaged).toBe(false);
    input.dispose();
  });
});
