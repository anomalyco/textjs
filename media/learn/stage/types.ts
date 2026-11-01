/** Shared between the renderer (Bun) and the stage (browser). */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TuiSpan {
  text: string;
  fg: string | null;
  bg: string | null;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/** A console frame from a real Text.js render (`@textjs/react/testing`). */
export interface TuiFrame {
  width: number;
  height: number;
  rows: TuiSpan[][];
}

export interface CaptureStream {
  /** CSS viewport of the captured page. */
  css: { w: number; h: number };
  dpr: number;
  /** Screencast frames, `t` in seconds of scene time. */
  frames: Array<{ t: number; src: string }>;
}

/** A live scene's footage of the real site and the real DevTools frontend. */
export interface CaptureData {
  site: CaptureStream;
  dt: CaptureStream;
  /** Named targets measured during capture, in each page's CSS pixels. */
  boxes: Record<string, Box & { in: "site" | "dt" }>;
  /** A still of the page before DevTools opened (window height = page + DevTools). */
  before?: string;
}

export interface Token {
  kind: string;
  text: string;
}

export interface SceneData {
  id: string;
  kind: string;
  /** Seconds on the video timeline. */
  start: number;
  duration: number;
  /** World position of the scene's 1920×1080 frame. */
  x: number;
  y: number;
  /** Narration audio start, in scene time. */
  voice: number;
  /** Cue name → scene time (seconds). Also `start`, `voice`, `end`. */
  cues: Record<string, number>;
  props: Record<string, any>;
  capture?: CaptureData;
}

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface Timeline {
  slug: string;
  fps: number;
  duration: number;
  /** Camera travel between scenes, seconds. */
  transition: number;
  chapter: { number: number; title: string; total: number };
  subtitles: boolean;
  captions: Caption[];
  scenes: SceneData[];
}
