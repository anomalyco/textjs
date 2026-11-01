import { frameLines, typed, type SceneFactory } from "../common";
import { easeOut, h, place, ramp, rise } from "../motion";

type Out = string | { text: string; color?: string; bold?: boolean };

/**
 * A terminal window; commands type themselves at cues, their real output follows.
 * props: { title, cwd?, steps: [{ at, cmd, output?: Out[] }] }
 */
export const terminal: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines = frameLines(root);
  const win = place(h("div", "window", root), 300, 150, 1320, 780);
  const bar = h("div", "bar", win);
  const dots = h("div", "dots", bar);
  for (let i = 0; i < 3; i++) h("i", "", dots);
  h("div", "title", bar, p.title ?? "Terminal");

  const body = place(h("div", "", win), 0, 52, 1320, 728);
  body.style.overflow = "hidden";
  const scroller = place(h("div", "mono", body), 40, 30, 1240);
  const size = 22;
  const lh = Math.round(size * 1.62);
  Object.assign(scroller.style, { fontSize: `${size}px`, lineHeight: `${lh}px`, whiteSpace: "pre" });
  const maxLines = Math.floor((728 - 60) / lh);

  type Line = { el: HTMLElement; at: number; cmd?: { text: string; span: HTMLElement; at: number; typing: number; cursor: HTMLElement; until: number } };
  const all: Line[] = [];
  const steps = p.steps as Array<{ at: string; cmd: string; output?: Out[]; cps?: number }>;
  steps.forEach((s, si) => {
    const at = cue(s.at);
    const typing = Math.max(0.6, s.cmd.length / (s.cps ?? 34));
    const done = at + typing;
    const row = h("div", "", scroller);
    const prompt = h("span", "", row, "$ ");
    prompt.style.color = "#707070";
    const span = h("span", "", row);
    span.style.color = "#ededed";
    const cursor = h("span", "", row, " ");
    Object.assign(cursor.style, { background: "#ededed", display: "inline-block", width: `${size * 0.6}px`, height: `${size * 1.15}px`, verticalAlign: "-4px", marginLeft: "1px" });
    const next = steps[si + 1] ? cue(steps[si + 1]!.at) : Infinity;
    all.push({ el: row, at: at - 0.25, cmd: { text: s.cmd, span, at, typing, cursor, until: (s.output?.length ? done + 0.3 : next) } });
    (s.output ?? []).forEach((o, i) => {
      const row = h("div", "", scroller);
      const o2 = typeof o === "string" ? { text: o } : o;
      row.textContent = o2.text || " ";
      row.style.color = o2.color ?? "#a1a1a1";
      if (o2.bold) row.style.fontWeight = "600";
      all.push({ el: row, at: done + 0.35 + i * 0.045 });
    });
  });

  return {
    root,
    update(t) {
      lines(t);
      rise(win, t, -0.2, { dy: 40, blur: 0, dur: 1.1 });
      let scroll = 0;
      all.forEach((l, i) => {
        const on = t >= l.at;
        l.el.style.visibility = on ? "visible" : "hidden";
        const over = Math.max(0, i + 1 - maxLines) - Math.max(0, i - maxLines);
        scroll += over * lh * ramp(t, l.at, 0.35, easeOut);
        if (l.cmd) {
          l.cmd.span.textContent = typed(l.cmd.text, t, l.cmd.at, l.cmd.text.length / l.cmd.typing);
          const blink = t > l.cmd.at + l.cmd.typing ? Math.floor((t - l.cmd.at) * 1.6) % 2 === 0 : true;
          l.cmd.cursor.style.opacity = t >= l.at && t < l.cmd.until && blink ? "1" : "0";
        }
      });
      scroller.style.transform = `translate3d(0, ${(-scroll).toFixed(2)}px, 0)`;
    },
  };
};
