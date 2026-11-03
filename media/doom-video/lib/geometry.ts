/** Where each capture region of a cut lands on its canvas, and the crop of the DevTools capture (CSS pixels). */
export interface Composition {
  canvas: { w: number; h: number };
  /** CSS px → output px. */
  scale: number;
  /** Top-left of the window (or the bare DevTools panel) on the canvas, in output px. */
  x: number;
  y: number;
  /** Height of the drawn browser bar in CSS px (0: no bar, DevTools alone). */
  bar: number;
  /** DevTools region shown, CSS px from its top-left. */
  dtCrop: { w: number; h: number };
  /** Picture region inside the DevTools capture (CSS px), for sync analysis. */
  picture: { x: number; y: number; w: number; h: number };
  /** A strip inside the Text.js frame's black box that turns DevTools grey when the console repaints empty. */
  boxEdge: { x: number; y: number; w: number; h: number };
  title: { y: number; size: number };
  url: { size: number };
}

export const COMPOSITIONS: Record<"a" | "b" | "c", Composition> = {
  // 1280×716 CSS window (36 bar + 680), title above.
  a: {
    canvas: { w: 1920, h: 1080 },
    scale: 1.3,
    x: Math.round((1920 - 1280 * 1.3) / 2),
    y: 116,
    bar: 36,
    dtCrop: { w: 719, h: 680 },
    picture: { x: 50, y: 132, w: 614, h: 460 },
    boxEdge: { x: 30, y: 150, w: 15, h: 300 },
    title: { y: 60, size: 46 },
    url: { size: 76 },
  },
  // DevTools alone (720×640 CSS: tabs, console toolbar, the frame and the prompt), title above.
  b: {
    canvas: { w: 1080, h: 1080 },
    scale: 1.375,
    x: Math.round((1080 - 720 * 1.375) / 2),
    y: 150,
    bar: 0,
    dtCrop: { w: 720, h: 640 },
    picture: { x: 50, y: 106, w: 613, h: 459 },
    boxEdge: { x: 30, y: 150, w: 15, h: 300 },
    title: { y: 82, size: 44 },
    url: { size: 68 },
  },
  // 600×826 CSS window (36 bar + 170 page + 620 DevTools), title above.
  c: {
    canvas: { w: 1080, h: 1920 },
    scale: 1.7,
    x: 30,
    y: 330,
    bar: 36,
    dtCrop: { w: 600, h: 620 },
    picture: { x: 47, y: 141, w: 504, h: 376 },
    boxEdge: { x: 30, y: 170, w: 13, h: 300 },
    title: { y: 220, size: 58 },
    url: { size: 80 },
  },
};

export const TITLE = "Doom in the DevTools console";
export const URL_TEXT = "textjs.org/doom";
/** Seconds: the fade to black after the footage, and the URL card that follows. */
export const FADE = 0.5;
export const END_CARD = 3.5;
