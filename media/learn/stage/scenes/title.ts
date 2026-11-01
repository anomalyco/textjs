import { frameLines, mark, type SceneFactory } from "../common";
import { h, maskWords, place, ramp, revealWords, rise } from "../motion";

/**
 * Title moments on the canvas: `cover` (chapter opener), `section` (a part of the chapter) and `outro` (up next).
 * props: { variant, eyebrow?, title, body?, chapter: { number, total }, url?, size? }
 * `size` overrides the title's font size (px) for titles too long for one line at the default.
 */
export const title: SceneFactory = (data, cue) => {
  const p = data.props;
  const variant: "cover" | "section" | "outro" = p.variant ?? "section";
  const root = h("div", "scene");
  const lines = frameLines(root);
  const at = cue(p.at, 0.25);

  let brand: HTMLElement | null = null;
  let counter: HTMLElement | null = null;
  if (variant !== "section") {
    brand = place(h("div", "", root), 300, 176);
    Object.assign(brand.style, { display: "flex", alignItems: "center", gap: "14px", fontSize: "28px", fontWeight: "600", letterSpacing: "-0.02em", color: "#ededed" });
    brand.append(mark(22, "#fff"), document.createTextNode("Learn Text.js"));
    counter = place(h("div", "eyebrow", root, `Chapter ${String(p.chapter.number).padStart(2, "0")} / ${String(p.chapter.total).padStart(2, "0")}`), 0, 180);
    Object.assign(counter.style, { left: "auto", right: `${1920 - 1620}px` });
  }

  const big: number = p.size ?? (variant === "cover" ? 184 : 150);
  const eyebrow = p.eyebrow ? place(h("div", "eyebrow", root, p.eyebrow), 302, variant === "cover" ? 372 : 404) : null;
  const titleEl = place(h("div", "display", root), 292, variant === "cover" ? 418 : 450, 1400);
  titleEl.style.fontSize = `${big}px`;
  const words = maskWords(titleEl, p.title);
  const body = p.body ? place(h("div", "body", root, p.body), 300, (variant === "cover" ? 418 : 450) + big * 1.12 + 26, 1180) : null;

  // Chapter ticks: the course at a glance.
  const ticks: Array<{ bar: HTMLElement; label: HTMLElement }> = [];
  if (variant !== "section") {
    const total = p.chapter.total as number;
    const x0 = 300;
    const span = 1320;
    const gap = 12;
    const w = (span - gap * (total - 1)) / total;
    for (let i = 0; i < total; i++) {
      const n = i + 1;
      const bar = place(h("div", "", root), x0 + i * (w + gap), 862, w, 3);
      const current = variant === "cover" ? n === p.chapter.number : n === p.chapter.number + 1;
      const done = variant === "outro" ? n <= p.chapter.number : false;
      bar.style.background = current ? "var(--accent)" : done ? "#ededed" : "rgba(255,255,255,0.14)";
      bar.style.transformOrigin = "0 50%";
      if (current) bar.style.boxShadow = "0 0 16px rgba(50,145,255,.55)";
      const label = place(h("div", "mono", root, String(n).padStart(2, "0")), x0 + i * (w + gap), 878);
      Object.assign(label.style, { fontSize: "16px", color: current ? "#ededed" : "#4d4d4d" });
      ticks.push({ bar, label });
    }
  }

  const url = p.url ? place(h("div", "mono", root, `${p.url}  →`), 300, 780) : null;
  if (url) Object.assign(url.style, { fontSize: "24px", color: "#a1a1a1" });

  return {
    root,
    bare: variant !== "section",
    update(t) {
      lines(t);
      if (brand) rise(brand, t, at, { dy: 12 });
      if (counter) rise(counter, t, at + 0.1, { dy: 12 });
      if (eyebrow) rise(eyebrow, t, at + 0.05, { dy: 14, blur: 0 });
      revealWords(words, t, at + 0.15, { stagger: 0.07, dur: 1.1 });
      if (body) rise(body, t, at + 0.75);
      if (url) rise(url, t, at + 1.0);
      ticks.forEach(({ bar, label }, i) => {
        const k = ramp(t, at + 0.6 + i * 0.05, 0.9);
        bar.style.transform = `scaleX(${k.toFixed(4)})`;
        label.style.opacity = String(ramp(t, at + 0.8 + i * 0.05, 0.6));
      });
    },
  };
};
