import { msg } from "../i18n/t";

export type Tone = "ok" | "info";

export interface Component {
  name: string;
  status: string;
  tone: Tone;
  detail: string;
}

export const COMPONENTS: readonly Component[] = [
  { name: "console.log", status: msg("Operational"), tone: "ok", detail: msg("One call per changed frame, none when idle.") },
  { name: "console.clear", status: msg("Rarely used"), tone: "info", detail: msg("First frame, after invalidate(), at idle once 100 frames are stacked, and at 300.") },
  { name: "Yoga", status: msg("Operational"), tone: "ok", detail: msg("WebAssembly flexbox layout, pointScaleFactor 1.") },
  { name: "Turbolog encoder", status: msg("Operational"), tone: "ok", detail: msg("Row-hash gate and run-length %c encoding.") },
  { name: "DevTools Throttler", status: msg("Respected"), tone: "info", detail: msg("50ms viewport throttle. Frames are paced at least 66ms apart.") },
  { name: "textjs.org", status: msg("Operational"), tone: "ok", detail: msg("Docs, Learn, Playground, blog and store.") },
];

/** The first npm release of `@textjs/core`. Days before it have no data. */
export const LAUNCH = "2025-01-30";
