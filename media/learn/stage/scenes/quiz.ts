import { frameLines, type SceneFactory } from "../common";
import { easeInOut, h, maskWords, mix, place, ramp, revealWords, rise } from "../motion";

/**
 * One quiz question from the chapter: question, options, then the answer lights up and the explanation follows.
 * props: { eyebrow, question, options: string[], answer: number, explanation, cues: { options?, answer, explain? } }
 */
export const quiz: SceneFactory = (data, cue) => {
  const p = data.props;
  const c = p.cues ?? {};
  const root = h("div", "scene");
  const lines = frameLines(root);
  const eyebrow = place(h("div", "eyebrow", root, p.eyebrow), 302, 196);
  const q = place(h("div", "headline", root), 298, 240, 1320);
  q.style.fontSize = "68px";
  const qw = maskWords(q, p.question);

  const opts = (p.options as string[]).map((text, i) => {
    const row = place(h("div", "", root), 300, 430 + i * 106, 1320, 88);
    Object.assign(row.style, { display: "flex", alignItems: "center", gap: "24px", padding: "0 28px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(10,10,10,0.7)" });
    const letter = h("div", "mono", row, "ABC"[i]);
    Object.assign(letter.style, { width: "40px", height: "40px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#a1a1a1", flexShrink: "0" });
    const label = h("div", "", row, text);
    Object.assign(label.style, { fontSize: "32px", letterSpacing: "-0.02em", color: "#ededed", flex: "1" });
    const check = h("div", "", row);
    check.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3291ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
    return { row, letter, check, correct: i === p.answer };
  });
  const explain = place(h("div", "body", root, p.explanation), 300, 430 + opts.length * 106 + 34, 1320);
  explain.style.fontSize = "32px";

  return {
    root,
    update(t) {
      lines(t);
      rise(eyebrow, t, 0.1, { dy: 12, blur: 0 });
      revealWords(qw, t, 0.2, { stagger: 0.05 });
      const oa = cue(c.options, 1.0);
      const ans = cue(c.answer);
      const k = ramp(t, ans, 0.6, easeInOut);
      opts.forEach((o, i) => {
        rise(o.row, t, oa + i * 0.12, { dy: 18, blur: 0, dur: 0.8 });
        if (o.correct) {
          o.row.style.borderColor = `rgba(50,145,255,${mix(0.12, 0.9, k).toFixed(3)})`;
          o.row.style.background = `rgba(50,145,255,${(0.09 * k).toFixed(3)})`;
          o.letter.style.borderColor = k > 0.5 ? "rgba(50,145,255,.8)" : "";
          o.letter.style.color = k > 0.5 ? "#fff" : "#a1a1a1";
          o.check.style.opacity = String(k);
          o.check.style.transform = `scale(${mix(0.6, 1, k).toFixed(3)})`;
        } else {
          o.check.style.opacity = "0";
          o.row.style.opacity = String(Math.min(Number(o.row.style.opacity || 1), mix(1, 0.35, k)));
        }
      });
      rise(explain, t, cue(c.explain, ans + 0.8));
    },
  };
};
