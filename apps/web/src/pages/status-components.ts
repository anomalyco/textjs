export type Tone = "ok" | "info";

export interface Component {
  name: string;
  status: string;
  tone: Tone;
  detail: string;
}

export const COMPONENTS: readonly Component[] = [
  { name: "console.log", status: "Operational", tone: "ok", detail: "One call per changed frame, none when idle." },
  { name: "console.clear", status: "Rarely used", tone: "info", detail: "First frame, after invalidate(), at idle once 100 frames are stacked, and at 300." },
  { name: "Yoga", status: "Operational", tone: "ok", detail: "WebAssembly flexbox layout, pointScaleFactor 1." },
  { name: "Turbolog encoder", status: "Operational", tone: "ok", detail: "Row-hash gate and run-length %c encoding." },
  { name: "DevTools Throttler", status: "Respected", tone: "info", detail: "50ms viewport throttle. Frames are paced at least 66ms apart." },
  { name: "textjs.org", status: "Operational", tone: "ok", detail: "Docs, Learn, Playground, blog and store." },
];

/** The first npm release of `@textjs/core`. Days before it have no data. */
export const LAUNCH = "2025-01-30";
