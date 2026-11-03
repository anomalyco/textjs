/** The browser window each cut films, in CSS pixels, and the device scale it's captured at. */
export interface Layout {
  /** Where DevTools sits relative to the page (the page's window metrics say so; Text.js sizes the frame from them). */
  dock: "side" | "bottom";
  page: { w: number; h: number };
  dt: { w: number; h: number };
  /** Device scale factor for the whole browser, so screencast frames come at full resolution. */
  dpr: number;
  /** Whether the page itself appears in the cut. */
  filmPage: boolean;
}

export const LAYOUTS: Record<"a" | "b" | "c", Layout> = {
  // 16:9: the whole window, DevTools docked on the right, so the picture is as large as the window allows.
  a: { dock: "side", page: { w: 560, h: 680 }, dt: { w: 719, h: 680 }, dpr: 2, filmPage: true },
  // 1:1: DevTools alone, square.
  b: { dock: "side", page: { w: 560, h: 640 }, dt: { w: 720, h: 640 }, dpr: 3, filmPage: false },
  // 9:16: a narrow window, DevTools docked below a short strip of the page.
  c: { dock: "bottom", page: { w: 600, h: 170 }, dt: { w: 600, h: 620 }, dpr: 3, filmPage: true },
};

/** What capture.ts films, in seconds of Doom's clock (0 = the first tic, on the title screen; DEMO1 starts at 4.86). */
export const CLIP = { from: 3.35, to: 29.0 };

/**
 * The edit prepare.ts cuts from a capture, found from the engine's log so a fresh capture lands on the same beats:
 * DEMO1's sound from its first call (a zombie's sight sound, 6.2 s) over `titleHold` seconds of the title screen, then
 * the picture cuts into the demo in sync, and ends `afterKill` seconds after the last death sound before
 * `lastKillBefore` (an imp, shotgunned at 27.96 s).
 * `posterAt` is the poster's moment (an imp's fireballs coming down the corridor).
 */
export const EDIT = { titleHold: 0.8, lastKillBefore: 28.5, afterKill: 0.7, posterAt: 11.45 };
