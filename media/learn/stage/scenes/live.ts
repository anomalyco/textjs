import { spotlight, type Camera, type SceneFactory } from "../common";
import { clamp, easeInOut, easeOut, h, mix, place, ramp, rise, svg } from "../motion";
import type { Box, CaptureStream } from "../types";

/**
 * Real footage: the app page with DevTools docked below it, in a floating browser window. The page and DevTools
 * were filmed separately (lib/capture.ts) and are composited here, frame-accurately, under a camera that can push
 * in on the console.
 *
 * props: {
 *   url: string,                        // shown in the address bar
 *   open?: cue,                         // DevTools slides up here (needs a `before` still)
 *   shots?: [{ at, target: "window" | "devtools" | "page" | <box>, zoom?, pad?, inside? }],  // inside: stay within the window
 *   spots?: [{ at, until, target: <box> }],
 *   keys?: [{ at, label }],             // keycaps on screen when a key is pressed
 *   clicks?: [{ at, target: <box> }],   // a cursor glides to the target and clicks
 *   badges?: [{ at, until, text }],
 * }
 */
export const live: SceneFactory = (data, cue) => {
  const p = data.props;
  const cap = data.capture;
  const root = h("div", "scene");
  if (!cap) {
    // Not filmed (--no-film): a placeholder so the rest of the chapter can be previewed.
    const ph = place(h("div", "mono", root, `live: ${data.id} (not filmed)`), 320, 77, 1280, 926);
    Object.assign(ph.style, { border: "1px dashed #333", display: "flex", alignItems: "center", justifyContent: "center", color: "#707070", fontSize: "24px" });
    return { root, update() {} };
  }
  const overlay = h("div", "");
  Object.assign(overlay.style, { position: "absolute", inset: "0" });

  const width = cap.site.css.w;
  const pageH = cap.site.css.h;
  const dtH = cap.dt.css.h;
  const barH = 46;
  const winH = barH + pageH + dtH;
  const x0 = Math.round((1920 - width) / 2);
  const y0 = Math.round((1080 - winH) / 2);

  const win = place(h("div", "window", root), x0, y0, width, winH);
  win.style.background = "#000";
  const bar = place(h("div", "", win), 0, 0, width, barH);
  Object.assign(bar.style, { background: "#111", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 18px" });
  const dots = h("div", "dots", bar);
  for (let i = 0; i < 3; i++) h("i", "", dots);
  const addr = h("div", "mono", bar, p.url ?? "");
  Object.assign(addr.style, { position: "absolute", left: "50%", transform: "translateX(-50%)", minWidth: "420px", height: "28px", lineHeight: "28px", borderRadius: "8px", background: "#1a1a1a", color: "#a1a1a1", fontSize: "14px", textAlign: "center", padding: "0 16px" });

  const pageBox = place(h("div", "", win), 0, barH, width, pageH);
  pageBox.style.overflow = "hidden";
  const pageImg = place(h("img", "", pageBox), 0, 0, width, pageH);
  const beforeImg = cap.before ? place(h("img", "", win), 0, barH, width, pageH + dtH) : null;
  if (beforeImg && cap.before) beforeImg.src = cap.before;

  const dtBox = place(h("div", "", win), 0, barH + pageH, width, dtH);
  dtBox.style.overflow = "hidden";
  const dtImg = place(h("img", "", dtBox), 0, 0, width, dtH);
  const dtTop = place(h("div", "", win), 0, barH + pageH, width, 1);
  dtTop.style.background = "rgba(255,255,255,0.12)";

  const spot = spotlight(root);

  // Cursor.
  const cursor = svg("svg", { width: 30, height: 30, viewBox: "0 0 26 26" }, root);
  Object.assign((cursor as unknown as HTMLElement).style, { position: "absolute", left: "0", top: "0", zIndex: "30", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" });
  svg("path", { d: "M5 2.5 L5 20.5 L9.8 16.2 L13.1 23.4 L16.1 22 L12.9 15 L19.5 15 Z", fill: "#fff", stroke: "#000", "stroke-width": 1.4, "stroke-linejoin": "round" }, cursor);
  const ring = h("div", "", root);
  Object.assign(ring.style, { position: "absolute", width: "44px", height: "44px", margin: "-22px 0 0 -22px", borderRadius: "50%", border: "2px solid rgba(255,255,255,.85)", zIndex: "29" });

  // Keycaps on screen.
  // One keycap per key; consecutive presses of the same key press the same cap.
  const keyMap = new Map<string, { el: HTMLElement; ats: number[] }>();
  for (const k of (p.keys ?? []) as Array<{ at: string; label: string }>) {
    let entry = keyMap.get(k.label);
    if (!entry) {
      const el = h("div", "key sm", overlay, k.label);
      Object.assign(el.style, { position: "absolute", right: "96px", bottom: "92px", fontFamily: "var(--sans)" });
      entry = { el, ats: [] };
      keyMap.set(k.label, entry);
    }
    entry.ats.push(cue(k.at));
  }
  const keys = [...keyMap.values()];
  const badges = ((p.badges ?? []) as Array<{ at: string; until: string; text: string }>).map((b) => {
    const el = h("div", "pill", overlay);
    h("span", "dot", el);
    el.append(document.createTextNode(b.text));
    // Centred in the strip above the window, clear of its edges and the HUD marks.
    Object.assign(el.style, { position: "absolute", left: "50%", top: "18px", fontSize: "18px", color: "#ededed" });
    return { el, at: cue(b.at), until: cue(b.until) };
  });

  const toStage = (b: Box & { in: "site" | "dt" }): Box => ({ x: x0 + b.x, y: y0 + barH + (b.in === "dt" ? pageH : 0) + b.y, w: b.w, h: b.h });
  const box = (name: string): Box | null => {
    if (name === "window") return { x: x0, y: y0, w: width, h: winH };
    if (name === "devtools") return { x: x0, y: y0 + barH + pageH, w: width, h: dtH };
    if (name === "page") return { x: x0, y: y0 + barH, w: width, h: pageH };
    const b = cap.boxes[name];
    return b ? toStage(b) : null;
  };

  type Shot = { at: number; cam: Camera };
  const shotCam = (s: { target: string; zoom?: number; pad?: number; inside?: boolean }): Camera => {
    const b = box(s.target);
    if (!b) return { x: 960, y: 540, zoom: 1 };
    if (s.target === "window") return { x: b.x + b.w / 2, y: b.y + b.h / 2, zoom: s.zoom ?? 1 };
    const pad = s.pad ?? 1.0;
    const zoom = s.zoom ?? Math.min((1920 * 0.8) / (b.w * pad), (1080 * 0.66) / (b.h * pad), 2.6);
    const cam = { x: b.x + b.w / 2, y: b.y + b.h / 2, zoom };
    // `inside`: keep the view within the browser window (for targets near its edge).
    if (s.inside) {
      const hw = 960 / zoom;
      const hh = 540 / zoom;
      cam.x = clamp(cam.x, x0 + hw, x0 + width - hw);
      cam.y = clamp(cam.y, y0 + hh, y0 + winH - hh);
    }
    return cam;
  };
  const shots: Shot[] = [{ at: -10, cam: shotCam({ target: "window" }) }, ...((p.shots ?? []) as Array<{ at: string; target: string; zoom?: number; pad?: number }>).map((s) => ({ at: cue(s.at), cam: shotCam(s) }))];
  const SHOT = 1.4;

  const spots = ((p.spots ?? []) as Array<{ at: string; until: string; target: string; pad?: number }>).map((s) => ({ at: cue(s.at), until: cue(s.until), b: box(s.target), pad: s.pad ?? 8 }));
  const clicks = ((p.clicks ?? []) as Array<{ at: string; target: string }>).map((c) => ({ at: cue(c.at), b: box(c.target) }));
  const openAt = p.open !== undefined && beforeImg ? cue(p.open) : null;

  const frameAt = (s: CaptureStream, t: number): string => {
    let lo = 0;
    let hi = s.frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s.frames[mid]!.t <= t) lo = mid;
      else hi = mid - 1;
    }
    return s.frames[lo]!.src;
  };
  const setSrc = (img: HTMLImageElement, src: string): Promise<void> | null => {
    if (img.getAttribute("src") === src) return null;
    img.setAttribute("src", src);
    return img.decode().catch(() => {});
  };

  return {
    root,
    overlay,
    camera(t) {
      let cur = shots[0]!.cam;
      for (let i = 1; i < shots.length; i++) {
        const s = shots[i]!;
        if (t < s.at) break;
        const k = ramp(t, s.at, SHOT, easeInOut);
        cur = { x: mix(cur.x, s.cam.x, k), y: mix(cur.y, s.cam.y, k), zoom: Math.exp(mix(Math.log(cur.zoom), Math.log(s.cam.zoom), k)) };
      }
      return cur;
    },
    async update(t) {
      rise(win, t, -0.3, { dy: 50, blur: 0, dur: 1.2 });
      const waits = [setSrc(pageImg, frameAt(cap.site, t)), setSrc(dtImg, frameAt(cap.dt, t))];

      if (openAt !== null && beforeImg) {
        const k = ramp(t, openAt, 0.75, easeOut);
        dtBox.style.transform = `translate3d(0, ${((1 - k) * dtH).toFixed(2)}px, 0)`;
        dtTop.style.transform = dtBox.style.transform;
        const swap = ramp(t, openAt + 0.25, 0.35, easeInOut);
        beforeImg.style.opacity = String(1 - swap);
        pageImg.style.opacity = String(swap);
      }

      // Spotlight.
      let lit: Box | null = null;
      let litK = 0;
      for (const s of spots) {
        const k = Math.min(ramp(t, s.at, 0.5, easeInOut), 1 - ramp(t, s.until - 0.45, 0.45, easeInOut));
        if (k > litK && s.b) {
          litK = k;
          lit = { x: s.b.x - s.pad, y: s.b.y - s.pad, w: s.b.w + s.pad * 2, h: s.b.h + s.pad * 2 };
        }
      }
      spot(lit, litK);

      // Cursor and clicks.
      let cx = -100;
      let cy = -100;
      let co = 0;
      let ringK = -1;
      for (const c of clicks) {
        if (!c.b) continue;
        const tx = c.b.x + c.b.w / 2;
        const ty = c.b.y + c.b.h / 2;
        if (t < c.at - 1.6 || t > c.at + 1.6) continue;
        const k = ramp(t, c.at - 1.25, 1.05, easeInOut);
        cx = mix(tx + 260, tx, k);
        cy = mix(ty + 200, ty, k);
        co = Math.min(ramp(t, c.at - 1.5, 0.3), 1 - ramp(t, c.at + 1.0, 0.4));
        if (t >= c.at && t < c.at + 0.6) ringK = (t - c.at) / 0.6;
      }
      (cursor as unknown as HTMLElement).style.transform = `translate3d(${(cx - 5).toFixed(2)}px, ${(cy - 3).toFixed(2)}px, 0)`;
      (cursor as unknown as HTMLElement).style.opacity = String(co);
      if (ringK >= 0) {
        ring.style.display = "block";
        ring.style.left = `${cx}px`;
        ring.style.top = `${cy}px`;
        ring.style.transform = `scale(${mix(0.4, 1.5, easeOut(ringK)).toFixed(3)})`;
        ring.style.opacity = String(1 - ringK);
      } else ring.style.display = "none";

      for (const k of keys) {
        let vis = 0;
        let press = 0;
        for (const at of k.ats) {
          vis = Math.max(vis, Math.min(ramp(t, at - 0.35, 0.3), 1 - ramp(t, at + 1.1, 0.4)));
          press = Math.max(press, t >= at && t < at + 0.16 ? 1 : t >= at + 0.16 && t < at + 0.36 ? 1 - (t - at - 0.16) / 0.2 : 0);
        }
        k.el.style.opacity = String(clamp(vis));
        k.el.style.transform = `translate3d(0, ${(4 * press + (1 - vis) * 12).toFixed(2)}px, 0)`;
        k.el.style.boxShadow = press > 0.3 ? "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(50,145,255,0.6), 0 2px 0 #0a0a0a, 0 0 28px rgba(50,145,255,0.35)" : "";
      }
      for (const b of badges) {
        const vis = Math.min(ramp(t, b.at, 0.4), 1 - ramp(t, b.until - 0.4, 0.4));
        b.el.style.opacity = String(vis);
        b.el.style.transform = `translate3d(-50%, ${((1 - vis) * -10).toFixed(2)}px, 0)`;
      }
      await Promise.all(waits);
    },
  };
};
