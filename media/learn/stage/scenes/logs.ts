import { frameLines, type SceneFactory } from "../common";
import { clamp, easeInOut, easeOut, h, maskWords, mix, place, ramp, revealWords, rise } from "../motion";

/**
 * console.log calls over time: a playhead runs along a track; each key press drops one frame (one call), and the
 * idle stretch logs nothing. A counter keeps score.
 *
 * props: { eyebrow, headline, events: [{ at, label }], idle: { at, label }, statement?: { at, text } , counterLabel }
 */
export const logs: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines = frameLines(root);
  const eyebrow = place(h("div", "eyebrow", root, p.eyebrow), 302, 186);
  const headline = place(h("div", "headline", root), 298, 226, 940);
  headline.style.fontSize = "72px";
  const hw = maskWords(headline, p.headline);

  const counterWrap = place(h("div", "", root), 1300, 180, 380);
  counterWrap.style.textAlign = "right";
  const count = h("div", "", counterWrap, "0");
  Object.assign(count.style, { fontSize: "120px", fontWeight: "650", letterSpacing: "-0.05em", color: "#fff", lineHeight: "1", fontVariantNumeric: "tabular-nums" });
  const clabel = h("div", "mono", counterWrap, p.counterLabel ?? "console.log calls");
  Object.assign(clabel.style, { fontSize: "20px", color: "#707070", marginTop: "12px" });

  const trackY = 690;
  const x0 = 300;
  const x1 = 1620;
  const track = place(h("div", "", root), x0, trackY, x1 - x0, 1);
  track.style.background = "rgba(255,255,255,0.22)";
  track.style.transformOrigin = "0 50%";
  const head = place(h("div", "", root), x0, trackY - 150, 1, 170);
  head.style.background = "linear-gradient(to top, rgba(255,255,255,.6), transparent)";
  const headDot = place(h("div", "", root), x0 - 5, trackY - 5, 10, 10);
  Object.assign(headDot.style, { borderRadius: "50%", background: "#fff", boxShadow: "0 0 14px rgba(255,255,255,.6)" });

  const events = (p.events as Array<{ at: string; label: string }>).map((e) => ({ at: cue(e.at), label: e.label }));
  const t0 = Math.min(...events.map((e) => e.at)) - 1.0;
  const idleAt = cue(p.idle.at);
  const tEnd = data.duration - 0.6;
  // Playhead: brisk through the key presses, then on to the end at the same pace (so idle reads as long).
  const xAt = (t: number): number => mix(x0, x1, clamp((t - t0) / (tEnd - t0)));

  const bars = events.map((e) => {
    const x = xAt(e.at);
    const bar = place(h("div", "", root), x - 2, trackY - 160, 4, 160);
    Object.assign(bar.style, { background: "linear-gradient(to top, var(--accent), rgba(50,145,255,0.15))", transformOrigin: "50% 100%", borderRadius: "2px" });
    const cap = h("div", "key sm", root, e.label);
    place(cap, x, trackY + 30);
    Object.assign(cap.style, { minWidth: "72px", height: "54px", fontSize: "19px", padding: "0 14px", fontFamily: "var(--sans)", transform: "translateX(-50%)", left: `${x}px` });
    const tag = place(h("div", "mono", root, "1 frame"), x - 60, trackY - 200, 120);
    Object.assign(tag.style, { textAlign: "center", fontSize: "17px", color: "#a1a1a1" });
    return { ...e, bar, cap, tag };
  });
  const idleX = xAt(idleAt);
  const idle = place(h("div", "", root), idleX, trackY - 70, x1 - idleX, 40);
  Object.assign(idle.style, { display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: "20px", color: "#707070", borderTop: "1px dashed rgba(255,255,255,0.18)" });
  idle.textContent = p.idle.label;
  idle.style.paddingTop = "40px";

  const st = p.statement as { at: string; text: string } | undefined;
  const statement = st ? place(h("div", "headline", root), 300, 860, 1320) : null;
  if (statement) {
    statement.style.fontSize = "44px";
    statement.style.color = "#fff";
  }
  const sw = statement && st ? maskWords(statement, st.text) : [];

  return {
    root,
    update(t) {
      lines(t);
      rise(eyebrow, t, 0.1, { dy: 12, blur: 0 });
      revealWords(hw, t, 0.2);
      rise(counterWrap, t, 0.5, { dy: 16 });
      track.style.transform = `scaleX(${ramp(t, 0.4, 1.2, easeInOut).toFixed(4)})`;
      const hx = xAt(t);
      const show = ramp(t, t0 - 0.4, 0.4);
      head.style.left = `${hx.toFixed(2)}px`;
      headDot.style.left = `${(hx - 5).toFixed(2)}px`;
      head.style.opacity = String(show * 0.7);
      headDot.style.opacity = String(show);
      let n = 0;
      for (const b of bars) {
        const k = ramp(t, b.at, 0.55, easeOut);
        if (t >= b.at) n++;
        b.bar.style.transform = `scaleY(${k.toFixed(4)})`;
        b.bar.style.opacity = String(k);
        b.cap.style.opacity = String(ramp(t, b.at - 0.25, 0.3));
        b.cap.style.transform = `translate3d(-50%, ${t >= b.at && t < b.at + 0.18 ? 4 : 0}px, 0)`;
        b.tag.style.opacity = String(ramp(t, b.at + 0.2, 0.4));
      }
      count.textContent = String(n);
      idle.style.opacity = String(ramp(t, idleAt, 0.8));
      if (st) revealWords(sw, t, cue(st.at), { stagger: 0.05 });
    },
  };
};
