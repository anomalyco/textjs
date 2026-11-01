/**
 * The stage: every scene of a chapter laid out on one large canvas, filmed by a camera that travels between them.
 * `window.stage.seek(t)` draws the exact frame at time `t` (seconds); the renderer screenshots it. Nothing here
 * depends on wall-clock time.
 */
import { cueResolver, mark, type Camera, type Scene, type SceneFactory } from "./common";
import { clamp, easeInOut, h, mix, ramp } from "./motion";
import { course } from "./scenes/course";
import { editor } from "./scenes/editor";
import { live } from "./scenes/live";
import { logs } from "./scenes/logs";
import { pipeline } from "./scenes/pipeline";
import { quiz } from "./scenes/quiz";
import { terminal } from "./scenes/terminal";
import { title } from "./scenes/title";
import type { SceneData, Timeline } from "./types";

const SCENES: Record<string, SceneFactory> = { title, course, pipeline, terminal, editor, live, logs, quiz };

declare global {
  interface Window {
    stage: { ready: Promise<void>; duration: number; seek(t: number): Promise<void> };
  }
}

const GRID = 120;

async function boot(): Promise<void> {
  const tl = (await (await fetch("/timeline.json")).json()) as Timeline;
  const stageEl = h("div", "", document.body);
  stageEl.id = "stage";
  const grid = h("div", "", stageEl);
  grid.id = "grid";
  const world = h("div", "", stageEl);
  world.id = "world";
  const vignette = h("div", "", stageEl);
  vignette.id = "vignette";
  const overlays = h("div", "", stageEl);
  Object.assign(overlays.style, { position: "absolute", inset: "0" });
  const hud = h("div", "", stageEl);
  hud.id = "hud";
  const left = h("div", "hud-mark left", hud);
  left.append(mark(16, "#a1a1a1"), document.createTextNode("Learn Text.js"));
  h("div", "hud-mark right", hud, `${String(tl.chapter.number).padStart(2, "0")}  ${tl.chapter.title}`);
  const shade = h("div", "", stageEl);
  shade.id = "subs-shade";
  const subs = h("div", "", stageEl);
  subs.id = "subs";
  const fadeEl = h("div", "", stageEl);
  fadeEl.id = "fade";

  const built: Array<{ data: SceneData; scene: Scene }> = tl.scenes.map((data) => {
    const factory = SCENES[data.kind];
    if (!factory) throw new Error(`Unknown scene kind "${data.kind}" (${data.id})`);
    const scene = factory(data, cueResolver(data));
    scene.root.style.left = `${data.x}px`;
    scene.root.style.top = `${data.y}px`;
    scene.root.dataset.scene = data.id;
    world.append(scene.root);
    if (scene.overlay) overlays.append(scene.overlay);
    return { data, scene };
  });

  await document.fonts.ready;
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));

  const P = tl.transition;
  const camOf = (i: number, t: number): Camera => {
    const { data, scene } = built[i]!;
    const local = clamp(t - data.start, 0, data.duration);
    const c = scene.camera?.(local) ?? { x: 960, y: 540, zoom: 1 };
    return { x: data.x + c.x, y: data.y + c.y, zoom: c.zoom };
  };
  const indexAt = (t: number): number => {
    let i = 0;
    while (i < built.length - 1 && t >= built[i + 1]!.data.start) i++;
    return i;
  };
  const camera = (t: number): Camera => {
    const i = indexAt(t);
    // The nearest boundary within half a transition: travel from one scene's camera to the next.
    for (const j of [i, i + 1]) {
      if (j <= 0 || j >= built.length) continue;
      const b = built[j]!.data.start;
      if (Math.abs(t - b) < P / 2) {
        const k = easeInOut((t - (b - P / 2)) / P);
        const a = camOf(j - 1, t);
        const c = camOf(j, t);
        const dist = Math.hypot(c.x - a.x, c.y - a.y);
        // A slight pull-back while travelling, so long moves read as a glide across the canvas.
        const lift = 1 - Math.min(0.14, dist / 20000) * Math.sin(Math.PI * k);
        return { x: mix(a.x, c.x, k), y: mix(a.y, c.y, k), zoom: Math.exp(mix(Math.log(a.zoom), Math.log(c.zoom), k)) * lift };
      }
    }
    return camOf(i, t);
  };

  const seek = async (t: number): Promise<void> => {
    const cam = camera(t);
    const z = cam.zoom;
    const tx = 960 - cam.x * z;
    const ty = 540 - cam.y * z;
    world.style.transform = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${z.toFixed(5)})`;
    const s = GRID * z;
    const mod = (v: number): number => ((v % s) + s) % s;
    grid.style.backgroundImage = `linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)`;
    grid.style.backgroundSize = `${s.toFixed(3)}px ${s.toFixed(3)}px`;
    grid.style.backgroundPosition = `${mod(tx).toFixed(3)}px ${mod(ty).toFixed(3)}px`;

    const waits: Array<void | Promise<void>> = [];
    let bare = 0;
    for (const [i, { data, scene }] of built.entries()) {
      const local = t - data.start;
      const on = local > -P * 1.5 && local < data.duration + P * 1.5;
      scene.root.style.display = on ? "block" : "none";
      if (scene.overlay) {
        const k = Math.min(ramp(local, -0.2, 0.4), 1 - ramp(local, data.duration - 0.4, 0.4));
        scene.overlay.style.display = k > 0 ? "block" : "none";
        scene.overlay.style.opacity = String(k);
      }
      if (on) waits.push(scene.update(local));
      if (scene.bare && i === indexAt(t)) {
        const toEdge = Math.min(local + P / 2, data.duration + P / 2 - local);
        bare = Math.max(bare, clamp(toEdge / (P / 2)));
      }
    }
    // Marks step aside when the camera leans in.
    hud.style.opacity = String((1 - bare) * (1 - clamp((z - 1.01) / 0.06)));

    if (tl.subtitles) {
      const c = tl.captions.find((x) => t >= x.start && t < x.end);
      const text = c?.text ?? "";
      if (subs.textContent !== text) subs.textContent = text;
      const k = c ? Math.min(ramp(t, c.start, 0.18), 1 - ramp(t, c.end - 0.15, 0.15)) : 0;
      subs.style.opacity = String(k);
      shade.style.opacity = String(Math.max(0, ...tl.captions.map((x) => Math.min(ramp(t, x.start - 0.3, 0.3), 1 - ramp(t, x.end, 0.4)))) * 0.9);
    } else {
      subs.style.display = "none";
      shade.style.display = "none";
    }
    fadeEl.style.opacity = String(Math.max(1 - ramp(t, 0, 0.8, easeInOut), ramp(t, tl.duration - 1.4, 1.2, easeInOut)));
    await Promise.all(waits);
  };

  window.stage = { ready: Promise.resolve(), duration: tl.duration, seek };
  document.documentElement.dataset.ready = "1";
}

boot().catch((e) => {
  document.documentElement.dataset.error = String(e?.stack ?? e);
  console.error(e);
});
