import { frameLines, type SceneFactory } from "../common";
import { h, maskWords, mix, place, ramp, revealWords, rise } from "../motion";

/**
 * The course at a glance: a headline on the left, the ten chapters on the right.
 * props: { eyebrow, headline, body, pill?, chapters: [{ n, title, minutes }], current, cues: { headline?, list, pill?, focus? } }
 */
export const course: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines = frameLines(root);

  const eyebrow = place(h("div", "eyebrow", root, p.eyebrow), 302, 232);
  const headline = place(h("div", "headline", root), 298, 276, 660);
  headline.style.fontSize = "96px";
  const words = maskWords(headline, p.headline);
  const body = place(h("div", "body", root, p.body), 300, 520, 600);
  body.style.fontSize = "32px";
  const pill = p.pill ? place(h("div", "pill", root), 300, 744) : null;
  if (pill) {
    h("span", "dot", pill);
    pill.append(document.createTextNode(p.pill));
  }

  const list = place(h("div", "", root), 1000, 150, 620, 780);
  Object.assign(list.style, { border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", overflow: "hidden", background: "rgba(10,10,10,0.6)" });
  const rowH = 78;
  const rows = (p.chapters as Array<{ n: number; title: string; minutes: number }>).map((c, i) => {
    const row = place(h("div", "", list), 0, i * rowH, 620, rowH);
    Object.assign(row.style, { display: "flex", alignItems: "center", gap: "20px", padding: "0 28px", borderTop: i ? "1px solid rgba(255,255,255,0.08)" : "none" });
    const num = h("div", "mono", row, String(c.n).padStart(2, "0"));
    Object.assign(num.style, { width: "40px", height: "40px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", color: "#707070", flexShrink: "0" });
    const t = h("div", "", row, c.title);
    Object.assign(t.style, { fontSize: "25px", fontWeight: "500", letterSpacing: "-0.015em", color: "#ededed", flex: "1" });
    const m = h("div", "mono", row, `${c.minutes} min`);
    Object.assign(m.style, { fontSize: "17px", color: "#707070" });
    return { row, num, n: c.n };
  });

  const c = p.cues ?? {};
  return {
    root,
    update(t) {
      lines(t);
      const at = cue(c.headline, 0.2);
      rise(eyebrow, t, at, { dy: 12, blur: 0 });
      revealWords(words, t, at + 0.1, { stagger: 0.08 });
      rise(body, t, at + 0.6);
      if (pill) rise(pill, t, cue(c.pill, at + 1.2), { dy: 14 });
      const listAt = cue(c.list, at + 0.4);
      rise(list, t, listAt - 0.15, { dy: 20, blur: 0, dur: 1.0 });
      const focus = c.focus ? ramp(t, cue(c.focus), 0.8) : 0;
      for (const [i, r] of rows.entries()) {
        const k = ramp(t, listAt + i * 0.07, 0.8);
        const on = r.n === p.current;
        r.row.style.opacity = String(k * (on ? 1 : mix(1, 0.32, focus)));
        r.row.style.transform = `translate3d(${((1 - k) * 18).toFixed(2)}px,0,0)`;
        if (on) {
          r.row.style.background = `rgba(50,145,255,${(0.1 * focus).toFixed(3)})`;
          r.num.style.borderColor = focus > 0.5 ? "var(--accent)" : "rgba(255,255,255,0.16)";
          r.num.style.color = focus > 0.5 ? "#ededed" : "#707070";
        }
      }
    },
  };
};
