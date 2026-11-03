import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { CAPTIONS_KEY, CaptionsStore, parseCaptions, pickedLanguage, trackModes, type TrackState } from "../src/learn/captions";
import { escClosesMiniPlayer, miniPlayer, MINI_PLAYER_IDLE, type MiniPlayerEvent, type MiniPlayerState } from "../src/learn/miniPlayer";

const run = (...events: MiniPlayerEvent[]): MiniPlayerState => events.reduce(miniPlayer, MINI_PLAYER_IDLE);
const out: MiniPlayerEvent = { type: "slot", inView: false };
const back: MiniPlayerEvent = { type: "slot", inView: true };

describe("mini player", () => {
  test("floats only while playing with the slot out of view", () => {
    expect(run(out).floating).toBe(false);
    expect(run({ type: "play" }).floating).toBe(false);
    expect(run({ type: "play" }, out).floating).toBe(true);
    // Playing after scrolling away (e.g. a media key) floats too.
    expect(run(out, { type: "play" }).floating).toBe(true);
  });

  test("docks when the slot is back in view", () => {
    expect(run({ type: "play" }, out, back).floating).toBe(false);
    expect(run({ type: "play" }, out, back, out).floating).toBe(true);
  });

  test("stays up while paused, so it can be resumed, but a paused video doesn't float", () => {
    const paused = run({ type: "play" }, out, { type: "pause" });
    expect(paused.floating).toBe(true);
    expect(paused.playing).toBe(false);
    expect(run({ type: "play" }, out, { type: "pause" }, back, out).floating).toBe(false);
    expect(run({ type: "play" }, { type: "pause" }, out).floating).toBe(false);
  });

  test("close and ended dock it until the next play", () => {
    expect(run({ type: "play" }, out, { type: "close" }).floating).toBe(false);
    expect(run({ type: "play" }, out, { type: "close" }, { type: "pause" }, out).floating).toBe(false);
    expect(run({ type: "play" }, out, { type: "close" }, { type: "pause" }, { type: "play" }).floating).toBe(true);
    expect(run({ type: "play" }, out, { type: "ended" }).floating).toBe(false);
  });

  test("native Picture-in-Picture takes over, and the mini player returns after it", () => {
    expect(run({ type: "play" }, out, { type: "pip", active: true }).floating).toBe(false);
    expect(run({ type: "play" }, { type: "pip", active: true }, out).floating).toBe(false);
    expect(run({ type: "play" }, out, { type: "pip", active: true }, { type: "pip", active: false }).floating).toBe(true);
    expect(run({ type: "play" }, out, { type: "pip", active: true }, back, { type: "pip", active: false }).floating).toBe(false);
  });

  test("Esc closes it unless the console app or another surface owns the key", () => {
    expect(escClosesMiniPlayer({ inPlayer: true, routedToConsole: false, inOtherKeyOwner: false })).toBe(true);
    expect(escClosesMiniPlayer({ inPlayer: false, routedToConsole: false, inOtherKeyOwner: false })).toBe(true);
    expect(escClosesMiniPlayer({ inPlayer: false, routedToConsole: true, inOtherKeyOwner: false })).toBe(false);
    expect(escClosesMiniPlayer({ inPlayer: false, routedToConsole: false, inOtherKeyOwner: true })).toBe(false);
  });
});

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const g = globalThis as { localStorage?: Storage };
const original = g.localStorage;
const mem = new MemoryStorage();
g.localStorage = mem as unknown as Storage;
afterAll(() => {
  g.localStorage = original;
});

describe("captions", () => {
  beforeEach(() => mem.map.clear());

  test("are off by default and only 'on' turns them on", () => {
    expect(parseCaptions(null)).toBe(false);
    expect(parseCaptions("off")).toBe(false);
    expect(parseCaptions("yes")).toBe(false);
    expect(parseCaptions("on")).toBe(true);
    expect(new CaptionsStore().getSnapshot()).toBe(false);
    expect(new CaptionsStore().getServerSnapshot()).toBe(false);
  });

  test("the choice is remembered across chapters and reloads", () => {
    const store = new CaptionsStore();
    let emits = 0;
    const off = store.subscribe(() => emits++);
    store.set(true);
    store.set(true);
    expect(emits).toBe(1);
    expect(mem.getItem(CAPTIONS_KEY)).toBe("on");
    expect(new CaptionsStore().getSnapshot()).toBe(true);
    store.set(false);
    expect(mem.getItem(CAPTIONS_KEY)).toBe("off");
    expect(new CaptionsStore().getSnapshot()).toBe(false);
    off();
  });

  test("one caption track shows at a time, and off hides it", () => {
    const tracks = (...modes: TextTrackMode[]): TrackState[] => modes.map((mode, i) => ({ mode, language: ["ja", "en"][i]! }));
    // On: the page's language first, or the language picked last; never two at once.
    expect(trackModes(tracks("disabled", "disabled"), true, null)).toEqual(["showing", "disabled"]);
    expect(trackModes(tracks("hidden", "hidden"), true, "en")).toEqual(["hidden", "showing"]);
    expect(trackModes(tracks("showing", "showing"), true, null)).toEqual(["showing", "hidden"]);
    expect(trackModes(tracks("hidden", "showing"), true, "ja")).toEqual(["hidden", "showing"]);
    // Off hides whatever shows; a track that was never shown stays disabled, so its .vtt isn't fetched for nothing.
    expect(trackModes(tracks("showing", "disabled"), false, null)).toEqual(["hidden", "disabled"]);
    expect(trackModes(tracks("hidden", "showing"), false, null)).toEqual(["hidden", "hidden"]);
    // The native menu: picking English while Japanese shows makes English the pick.
    expect(pickedLanguage(tracks("showing", "showing"), "ja")).toBe("en");
    expect(pickedLanguage(tracks("hidden", "showing"), "ja")).toBe("en");
    expect(pickedLanguage(tracks("hidden", "hidden"), "ja")).toBeNull();
  });
});
