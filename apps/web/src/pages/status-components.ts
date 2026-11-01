export type Tone = "ok" | "info";

export interface Component {
  name: string;
  status: string;
  tone: Tone;
  detail: string;
}

export const COMPONENTS: readonly Component[] = [
  { name: "console.log", status: "Operational", tone: "ok", detail: "One call per dirty frame. Zero per idle frame." },
  { name: "console.clear", status: "Rarely used", tone: "info", detail: "First frame, after invalidate(), at idle once 100 frames are stacked, and at 300." },
  { name: "Yoga", status: "Operational", tone: "ok", detail: "WebAssembly flexbox layout, pointScaleFactor 1." },
  { name: "Turbolog encoder", status: "Operational", tone: "ok", detail: "Row-hash gate and run-length %c encoding." },
  { name: "DevTools Throttler", status: "Respected", tone: "info", detail: "50ms viewport throttle. Frames are paced at least 66ms apart." },
];

/** The first commit. Days before it have no data, because there was no Text.js. */
export const LAUNCH = "2026-10-31";
