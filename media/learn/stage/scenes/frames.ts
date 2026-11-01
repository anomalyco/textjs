import { frameLines, tui, TUI_BG, type SceneFactory } from "../common";
import { clamp, h, maskWords, place, ramp, revealWords, rise } from "../motion";
import type { TuiFrame } from "../types";

/**
 * Real Text.js frames in a console panel, swapped at cues: a layout reflowing as the console narrows, a card
 * repainting in another theme, focus moving with Tab. The panel hugs the current frame, so a narrower frame
 * narrows the panel, cell by cell, as a resized console does.
 *
 * props: {
 *   eyebrow?, headline?,
 *   size?: number,                                   // cell font size (default 20)
 *   steps: [{ at, frame: TuiFrame, caption?: string }], // the first step shows from the start
 *   keys?: [{ at, label }],                          // keycaps on screen when a key is pressed
 * }
 */
export const frames: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines = frameLines(root);
  const eyebrow = p.eyebrow ? place(h("div", "eyebrow", root, p.eyebrow), 302, 186) : null;
  const headline = p.headline ? place(h("div", "headline", root), 298, 226, 1320) : null;
  if (headline) headline.style.fontSize = "64px";
  const hw = headline ? maskWords(headline, p.headline) : [];

  const size = (p.size as number | undefined) ?? 20;
  const wrap = place(h("div", "", root), 0, headline ? 380 : 200, 1920);
  Object.assign(wrap.style, { display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" });

  // A docked DevTools console: tab strip, then the frame.
  const panel = h("div", "window", wrap);
  Object.assign(panel.style, { position: "relative", background: "#282828" });
  const bar = h("div", "", panel);
  Object.assign(bar.style, { display: "flex", alignItems: "center", gap: "22px", height: "42px", padding: "0 18px", fontSize: "15px", color: "#9aa0a6", background: "#1f1f1f", borderBottom: "1px solid #3c3c3c" });
  for (const name of ["Elements", "Console", "Sources"]) {
    const tab = h("span", "", bar, name);
    if (name === "Console") Object.assign(tab.style, { color: "#e8eaed", boxShadow: "inset 0 -2px 0 #7cacf8", padding: "11px 0" });
  }
  const body = h("div", "", panel);
  Object.assign(body.style, { padding: "18px 22px 22px" });

  const steps = (p.steps as Array<{ at: string | number; frame: TuiFrame; caption?: string }>).map((s, i) => {
    const el = tui(s.frame, size);
    el.style.background = s.frame.rows[0]?.[0]?.bg ?? TUI_BG;
    // JetBrains Mono (the VM's stand-in for Menlo) draws box lines the full row height, so borders join up.
    el.style.fontFamily = '"JetBrains Mono", "SF Mono", Menlo, var(--mono)';
    el.style.display = "none";
    body.append(el);
    return { at: i === 0 ? -Infinity : cue(s.at), el, caption: s.caption };
  });

  const caption = h("div", "mono", wrap);
  Object.assign(caption.style, { fontSize: "24px", color: "#a1a1a1", height: "32px", whiteSpace: "pre" });

  const overlay = h("div", "");
  Object.assign(overlay.style, { position: "absolute", inset: "0" });
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

  return {
    root,
    overlay,
    update(t) {
      lines(t);
      if (eyebrow) rise(eyebrow, t, 0.1, { dy: 12, blur: 0 });
      revealWords(hw, t, 0.2);
      rise(panel, t, 0.5, { dy: 30, blur: 0, dur: 1.0 });
      let cur = 0;
      steps.forEach((s, i) => {
        if (t >= s.at) cur = i;
      });
      steps.forEach((s, i) => (s.el.style.display = i === cur ? "block" : "none"));
      // A new caption fades in; a repeated one stays put.
      const text = steps[cur]!.caption ?? "";
      let since = steps[cur]!.at;
      for (let i = cur; i > 0 && (steps[i - 1]!.caption ?? "") === text; i--) since = steps[i - 1]!.at;
      caption.textContent = text;
      const ck = Math.min(ramp(t, 0.9, 0.6), Number.isFinite(since) ? ramp(t, since, 0.3) : 1);
      caption.style.opacity = String(ck);

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
    },
  };
};
