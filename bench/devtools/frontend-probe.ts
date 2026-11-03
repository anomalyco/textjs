import type { Page } from "playwright-core";
import type { MetricSummary } from "./client";

export interface RafSample {
  epochMs: number;
  state: "valid" | "empty-dom" | "cleared-only" | "incomplete";
  frameId: number | null;
  emitEpochMs: number | null;
}

export interface FrontendProbeRawResult {
  totalPaints: number;
  validPaints: number;
  blankPaints: number;
  emptyDomPaints: number;
  clearedOnlyPaints: number;
  incompletePaints: number;
  distinctFramesPainted: number;
  paintedFrameIds: number[];
  samples: RafSample[];
  rafIntervalsMs: number[];
  rafJankOver34Ms: number;
  rafJankOver50Ms: number;
  longTaskCount: number;
  longTaskTotalMs: number;
  longTaskMaxMs: number;
  mountedWrappersEnd: number;
  mountedWrappersMax: number;
  mountedWrappersMean: number;
  domSpansPerFrame: number;
  emptySpansPerFrame: number;
  stylePropsPerFrame: number;
  consoleScrollHeightEnd: number;
  consoleViewportRect: { x: number; y: number; width: number; height: number };
}

export interface ScreencastCapture {
  data: string;
  epochMs: number;
}

export interface ScreencastAnalysis {
  framesCaptured: number;
  blankFrames: number;
  renderedFrames: number;
  distinctVisualFrames: number;
  visualFps: number;
  blankFramePct: number;
  timeWeightedBlankPct: number;
}

export function summarizeNumbers(values: number[]): MetricSummary {
  if (values.length === 0) return { mean: 0, p50: 0, p95: 0, max: 0 };
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    mean: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

export async function waitForWarmupFrameInDevTools(dtPage: Page, timeoutMs = 5000): Promise<void> {
  await dtPage.waitForFunction(
    () => {
      function deepQuery(root: Document | ShadowRoot | Element, sel: string): Element | null {
        const direct = root.querySelector(sel);
        if (direct) return direct;
        const all = root.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const sr = all[i]!.shadowRoot;
          if (sr) {
            const found = deepQuery(sr, sel);
            if (found) return found;
          }
        }
        return null;
      }
      const group = deepQuery(document, ".console-group-messages");
      if (!group) return false;
      return (group.textContent || "").includes("FRAME:000000");
    },
    { timeout: timeoutMs },
  );
}

export async function runFrontendProbe(
  dtPage: Page,
  options: { durationMs: number; expectedRows: number },
): Promise<FrontendProbeRawResult> {
  return dtPage.evaluate(
    ({ durationMs, expectedRows }) => {
      function deepQuery(root: Document | ShadowRoot | Element, sel: string): Element | null {
        const direct = root.querySelector(sel);
        if (direct) return direct;
        const all = root.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const sr = all[i]!.shadowRoot;
          if (sr) {
            const found = deepQuery(sr, sel);
            if (found) return found;
          }
        }
        return null;
      }

      function deepQueryAll(root: Document | ShadowRoot | Element, sel: string, out: Element[] = []): Element[] {
        const direct = root.querySelectorAll(sel);
        for (let i = 0; i < direct.length; i++) out.push(direct[i]!);
        const all = root.querySelectorAll("*");
        for (let i = 0; i < all.length; i++) {
          const sr = all[i]!.shadowRoot;
          if (sr) deepQueryAll(sr, sel, out);
        }
        return out;
      }

      const longTaskDurations: number[] = [];
      let obs: PerformanceObserver | null = null;
      try {
        obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskDurations.push(entry.duration);
          }
        });
        obs.observe({ entryTypes: ["longtask"] });
      } catch {
        // Ignore if unsupported
      }

      let viewportEl = deepQuery(document, "#console-messages") as HTMLElement | null;
      let groupEl = deepQuery(document, ".console-group-messages") as HTMLElement | null;

      let totalPaints = 0;
      let validPaints = 0;
      let blankPaints = 0;
      let emptyDomPaints = 0;
      let clearedOnlyPaints = 0;
      let incompletePaints = 0;
      const seenFrames = new Set<number>();
      const samples: Array<{
        epochMs: number;
        state: "valid" | "empty-dom" | "cleared-only" | "incomplete";
        frameId: number | null;
        emitEpochMs: number | null;
      }> = [];
      const rafIntervalsMs: number[] = [];
      let rafJankOver34Ms = 0;
      let rafJankOver50Ms = 0;
      let mountedWrappersMax = 0;
      let mountedWrappersSum = 0;

      const frameRe = /FRAME:(\d+)/;
      const tsRe = /T:(\d+(?:\.\d+)?)/;

      return new Promise<FrontendProbeRawResult>((resolve) => {
        const startNow = performance.now();
        let prevNow = startNow;

        const onRaf = (): void => {
          const now = performance.now();
          const sampleEpochMs = performance.timeOrigin + now;
          if (totalPaints > 0) {
            const dt = now - prevNow;
            rafIntervalsMs.push(dt);
            if (dt > 34) rafJankOver34Ms++;
            if (dt > 50) rafJankOver50Ms++;
          }
          prevNow = now;
          totalPaints++;

          if (!viewportEl || !viewportEl.isConnected) {
            viewportEl = deepQuery(document, "#console-messages") as HTMLElement | null;
          }
          if (!groupEl || !groupEl.isConnected) {
            groupEl = deepQuery(document, ".console-group-messages") as HTMLElement | null;
          }

          if (!viewportEl || !groupEl) {
            blankPaints++;
            emptyDomPaints++;
            samples.push({ epochMs: sampleEpochMs, state: "empty-dom", frameId: null, emitEpochMs: null });
          } else {
            const vpRect = viewportEl.getBoundingClientRect();
            const wrappers = groupEl.querySelectorAll(".console-message-wrapper");
            const wrapperList: ArrayLike<Element> =
              wrappers.length > 0 ? wrappers : deepQueryAll(groupEl, ".console-message-wrapper");
            if (wrapperList.length > mountedWrappersMax) mountedWrappersMax = wrapperList.length;
            mountedWrappersSum += wrapperList.length;

            let foundState: "valid" | "empty-dom" | "cleared-only" | "incomplete" | null = null;
            let foundFrameId: number | null = null;
            let foundEmitEpoch: number | null = null;
            let sawVisibleCleared = false;
            let visibleWrapperCount = 0;

            for (let i = wrapperList.length - 1; i >= 0; i--) {
              const w = wrapperList[i] as HTMLElement;
              const r = w.getBoundingClientRect();
              if (r.bottom <= vpRect.top + 2) {
                // Wrappers are in vertical order; all earlier ones are above the viewport
                break;
              }
              if (r.top >= vpRect.bottom - 2) {
                continue;
              }
              visibleWrapperCount++;
              const txtEl = (w.querySelector(".console-message-text") ||
                deepQuery(w, ".console-message-text")) as HTMLElement | null;
              if (!txtEl) continue;

              // The first row (not just the first span: a leading curtain span may be empty).
              const firstSpanText = (txtEl.textContent || "").slice(0, 200);
              const m = frameRe.exec(firstSpanText);
              if (m) {
                foundFrameId = Number.parseInt(m[1]!, 10);
                const tm = tsRe.exec(firstSpanText);
                foundEmitEpoch = tm ? Number.parseFloat(tm[1]!) : null;

                let lineBreaks = txtEl.getElementsByTagName("br").length;
                const childNodes = txtEl.childNodes;
                for (let ci = 0; ci < childNodes.length; ci++) {
                  const cn = childNodes[ci]!;
                  if (cn.nodeType === 3) {
                    const nv = cn.nodeValue || "";
                    for (let ni = 0; ni < nv.length; ni++) if (nv.charCodeAt(ni) === 10) lineBreaks++;
                  }
                }
                const visibleHeight = Math.min(r.bottom, vpRect.bottom) - Math.max(r.top, vpRect.top);
                const fullHeight = r.height >= (expectedRows - 1) * 13;
                if ((lineBreaks + 1 >= expectedRows || fullHeight) && visibleHeight >= 150) {
                  foundState = "valid";
                } else {
                  foundState = "incomplete";
                }
                break;
              } else if ((txtEl.textContent || "").includes("Console was cleared")) {
                sawVisibleCleared = true;
              }
            }

            if (foundState === "valid") {
              validPaints++;
              if (foundFrameId !== null && foundFrameId > 0) {
                seenFrames.add(foundFrameId);
              }
              samples.push({
                epochMs: sampleEpochMs,
                state: "valid",
                frameId: foundFrameId,
                emitEpochMs: foundEmitEpoch,
              });
            } else if (foundState === "incomplete") {
              blankPaints++;
              incompletePaints++;
              samples.push({
                epochMs: sampleEpochMs,
                state: "incomplete",
                frameId: foundFrameId,
                emitEpochMs: foundEmitEpoch,
              });
            } else if (sawVisibleCleared || visibleWrapperCount > 0) {
              blankPaints++;
              clearedOnlyPaints++;
              samples.push({
                epochMs: sampleEpochMs,
                state: "cleared-only",
                frameId: null,
                emitEpochMs: null,
              });
            } else {
              blankPaints++;
              emptyDomPaints++;
              samples.push({
                epochMs: sampleEpochMs,
                state: "empty-dom",
                frameId: null,
                emitEpochMs: null,
              });
            }
          }

          if (now - startNow < durationMs) {
            requestAnimationFrame(onRaf);
          } else {
            obs?.disconnect();
            const wrapperNodes = groupEl ? groupEl.querySelectorAll(".console-message-wrapper") : null;
            const endWrappers = wrapperNodes ? wrapperNodes.length : 0;
            let domSpansPerFrame = 0;
            let emptySpansPerFrame = 0;
            let stylePropsPerFrame = 0;
            if (wrapperNodes && wrapperNodes.length > 0) {
              const lastWrapper = wrapperNodes[wrapperNodes.length - 1] as HTMLElement;
              const txt = (lastWrapper.querySelector(".console-message-text") ||
                deepQuery(lastWrapper, ".console-message-text")) as HTMLElement | null;
              if (txt) {
                const spans = txt.querySelectorAll("span");
                domSpansPerFrame = spans.length;
                for (let si = 0; si < spans.length; si++) {
                  const sp = spans[si] as HTMLElement;
                  if (sp.textContent === "") emptySpansPerFrame++;
                  stylePropsPerFrame += sp.style.length;
                }
              }
            }
            const endScrollHeight = viewportEl ? viewportEl.scrollHeight : 0;
            const vpRect = viewportEl
              ? viewportEl.getBoundingClientRect()
              : { x: 0, y: 27, width: 1000, height: 546 };
            const longTaskTotalMs = longTaskDurations.reduce((a, b) => a + b, 0);
            const longTaskMaxMs = longTaskDurations.length > 0 ? Math.max(...longTaskDurations) : 0;
            resolve({
              totalPaints,
              validPaints,
              blankPaints,
              emptyDomPaints,
              clearedOnlyPaints,
              incompletePaints,
              distinctFramesPainted: seenFrames.size,
              paintedFrameIds: Array.from(seenFrames).sort((a, b) => a - b),
              samples,
              rafIntervalsMs,
              rafJankOver34Ms,
              rafJankOver50Ms,
              longTaskCount: longTaskDurations.length,
              longTaskTotalMs,
              longTaskMaxMs,
              mountedWrappersEnd: endWrappers,
              mountedWrappersMax,
              mountedWrappersMean: totalPaints > 0 ? mountedWrappersSum / totalPaints : 0,
              domSpansPerFrame,
              emptySpansPerFrame,
              stylePropsPerFrame,
              consoleScrollHeightEnd: endScrollHeight,
              consoleViewportRect: {
                x: Math.round(vpRect.x),
                y: Math.round(vpRect.y),
                width: Math.round(vpRect.width),
                height: Math.round(vpRect.height),
              },
            });
          }
        };

        requestAnimationFrame(onRaf);
      });
    },
    options,
  );
}

export async function analyzeScreencastFrames(
  helperPage: Page,
  frames: ScreencastCapture[],
  consoleViewportRect: { x: number; y: number; width: number; height: number },
  startEpochMs: number,
  endEpochMs: number,
): Promise<ScreencastAnalysis> {
  if (frames.length === 0) {
    return {
      framesCaptured: 0,
      blankFrames: 0,
      renderedFrames: 0,
      distinctVisualFrames: 0,
      visualFps: 0,
      blankFramePct: 0,
      timeWeightedBlankPct: 0,
    };
  }

  return helperPage.evaluate(
    async ({ frames, vpRect, startEpochMs, endEpochMs }) => {
      const states: Array<{ epochMs: number; isBlank: boolean }> = [];
      let blankFrames = 0;
      let renderedFrames = 0;
      let distinctVisualFrames = 0;
      let prevSig = "";

      // Sample 4 horizontal scanlines inside the console messages area (avoiding the top 25px where "Console was cleared" sits)
      const yOffsets = [0.22, 0.4, 0.58, 0.75];

      for (const f of frames) {
        const bin = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bin], { type: "image/jpeg" }));
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);

        const scaleX = bmp.width / Math.max(1, vpRect.width + vpRect.x);
        const scaleY = bmp.height / Math.max(1, vpRect.height + vpRect.y + 27);
        const x0 = Math.max(10, Math.floor((vpRect.x + 40) * scaleX));
        const sampleW = Math.max(50, Math.min(bmp.width - x0 - 10, Math.floor(550 * scaleX)));

        let dashboardPixels = 0;
        let totalSampled = 0;
        let sig = "";
        for (const frac of yOffsets) {
          const y = Math.min(
            bmp.height - 1,
            Math.max(0, Math.floor((vpRect.y + vpRect.height * frac) * scaleY)),
          );
          const data = ctx.getImageData(x0, y, sampleW, 1).data;
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            totalSampled++;
            // Dashboard cells have dark background (#09090b, #18181b, #27272a) or vibrant text;
            // bare DevTools console background is light (~255, 255, 255)
            if (r < 90 && g < 90 && b < 90) {
              dashboardPixels++;
            }
            if ((totalSampled & 3) === 1) {
              sig += `${r >> 3},${g >> 3},${b >> 3};`;
            }
          }
        }
        bmp.close();

        const isBlank = totalSampled === 0 || dashboardPixels / totalSampled < 0.25;
        if (isBlank) blankFrames++;
        else {
          renderedFrames++;
          if (sig !== prevSig && f.epochMs >= startEpochMs && f.epochMs <= endEpochMs) {
            distinctVisualFrames++;
            prevSig = sig;
          }
        }
        states.push({ epochMs: f.epochMs, isBlank });
      }

      // Compute time-weighted blank duration across [startEpochMs, endEpochMs]
      let blankTimeMs = 0;
      let totalTimeMs = 0;
      for (let i = 0; i < states.length; i++) {
        const cur = states[i]!;
        const t0 = Math.max(startEpochMs, cur.epochMs);
        const t1 = i + 1 < states.length ? Math.min(endEpochMs, states[i + 1]!.epochMs) : endEpochMs;
        const dt = Math.max(0, t1 - t0);
        totalTimeMs += dt;
        if (cur.isBlank) blankTimeMs += dt;
      }

      const total = frames.length;
      const durSec = Math.max(0.001, (endEpochMs - startEpochMs) / 1000);
      return {
        framesCaptured: total,
        blankFrames,
        renderedFrames,
        distinctVisualFrames,
        visualFps: distinctVisualFrames / durSec,
        blankFramePct: total > 0 ? (blankFrames / total) * 100 : 0,
        timeWeightedBlankPct: totalTimeMs > 0 ? (blankTimeMs / totalTimeMs) * 100 : 0,
      };
    },
    { frames, vpRect: consoleViewportRect, startEpochMs, endEpochMs },
  );
}
