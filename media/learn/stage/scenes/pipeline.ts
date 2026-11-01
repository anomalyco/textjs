import { frameLines, tui, type SceneFactory } from "../common";
import { clamp, drawOn, easeInOut, h, maskWords, mix, place, ramp, revealWords, rise, svg } from "../motion";
import type { Token, TuiFrame } from "../types";

type Content =
  | { type: "code"; lines: Token[][]; size?: number }
  | { type: "frame"; frame: TuiFrame; size?: number; grid?: boolean }
  | { type: "console"; frame: TuiFrame; size?: number };

/**
 * A left-to-right flow of nodes on one line, with dots travelling between them.
 * props: { eyebrow?, nodes: [{ title, sub, at, content }], statement?: { text, at, muted? } }
 */
export const pipeline: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines = frameLines(root, { x: 120, y: 120, w: 1680, h: 840 });
  const nodes = p.nodes as Array<{ title: string; sub: string; at: string; content: Content }>;
  const n = nodes.length;
  const nodeW = 340;
  const nodeH = 400;
  const gap = (1680 - n * nodeW) / (n - 1);
  const x0 = 120;
  const y0 = 230;
  const cy = y0 + nodeH / 2;

  const eyebrow = p.eyebrow ? place(h("div", "eyebrow", root, p.eyebrow), 122, 160) : null;

  // The bus: one line through every node, drawn on node by node; dots flow along what is drawn.
  const bus = svg("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080" }, root);
  Object.assign(bus.style, { position: "absolute", left: "0", top: "0", overflow: "visible" });
  const segs = nodes.slice(1).map((_, i) => {
    const xa = x0 + i * (nodeW + gap) + nodeW;
    const xb = xa + gap;
    const line = svg("path", { d: `M ${xa} ${cy} L ${xb} ${cy}`, stroke: "rgba(255,255,255,0.28)", "stroke-width": 1.5, fill: "none" }, bus);
    const dots = Array.from({ length: 3 }, () => svg("circle", { r: 4, fill: "#3291ff" }, bus));
    const head = svg("path", { d: `M ${xb - 9} ${cy - 6} L ${xb - 1} ${cy} L ${xb - 9} ${cy + 6}`, stroke: "rgba(255,255,255,0.5)", "stroke-width": 1.5, fill: "none" }, bus);
    return { xa, xb, line, dots, head };
  });

  const cards = nodes.map((node, i) => {
    const x = x0 + i * (nodeW + gap);
    const card = place(h("div", "", root), x, y0, nodeW, nodeH);
    Object.assign(card.style, {
      borderRadius: "16px",
      background: "#0a0a0a",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 30px 80px rgba(0,0,0,0.6)",
      overflow: "hidden",
    });
    const head = h("div", "", card);
    Object.assign(head.style, { padding: "26px 28px 0" });
    const idx = h("div", "mono", head, String(i + 1).padStart(2, "0"));
    Object.assign(idx.style, { fontSize: "16px", color: "#4d4d4d", marginBottom: "14px" });
    const tl = h("div", "", head, node.title);
    Object.assign(tl.style, { fontSize: "32px", fontWeight: "600", letterSpacing: "-0.03em", color: "#fff" });
    const sub = h("div", "", head, node.sub);
    Object.assign(sub.style, { fontSize: "19px", color: "#a1a1a1", marginTop: "6px", letterSpacing: "-0.01em" });
    const body = h("div", "", card);
    Object.assign(body.style, { position: "absolute", left: "0", right: "0", bottom: "0", height: "210px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", background: "#070707" });
    let reveal: ((k: number) => void) | null = null;
    const c = node.content;
    if (c.type === "code") {
      const code = h("div", "mono", body);
      Object.assign(code.style, { fontSize: `${c.size ?? 17}px`, lineHeight: "1.7", whiteSpace: "pre", padding: "0 22px", width: "100%" });
      for (const ln of c.lines) {
        const row = h("div", "", code);
        for (const tk of ln) h("span", tk.kind === "plain" ? "" : `tk-${tk.kind}`, row, tk.text);
        if (!ln.length) row.textContent = " ";
      }
    } else if (c.type === "frame") {
      const f = tui(c.frame, c.size ?? 17);
      f.style.background = "transparent";
      const wrap = h("div", "", body);
      wrap.style.position = "relative";
      wrap.append(f);
      if (c.grid) {
        const g = h("div", "", wrap);
        const cw = (c.size ?? 17) * 0.6021;
        const rh = (c.size ?? 17) * 1.17;
        Object.assign(g.style, {
          position: "absolute",
          inset: "0",
          backgroundImage: `linear-gradient(to right, rgba(50,145,255,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(50,145,255,.16) 1px, transparent 1px)`,
          backgroundSize: `${cw}px ${rh}px`,
        });
      }
      // Cells fill in, column by column.
      reveal = (k) => {
        wrap.style.clipPath = `inset(0 ${(100 - k * 100).toFixed(2)}% 0 0)`;
      };
    } else if (c.type === "console") {
      Object.assign(body.style, { flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", background: "#282828" });
      const bar = h("div", "", body);
      Object.assign(bar.style, { height: "34px", display: "flex", alignItems: "center", gap: "18px", padding: "0 14px", fontSize: "14px", color: "#9aa0a6", background: "#1f1f1f", borderBottom: "1px solid #3c3c3c" });
      for (const name of ["Elements", "Console", "Sources"]) {
        const tab = h("span", "", bar, name);
        if (name === "Console") Object.assign(tab.style, { color: "#e8eaed", boxShadow: "inset 0 -2px 0 #7cacf8", padding: "8px 0" });
      }
      const f = tui(c.frame, c.size ?? 15);
      Object.assign(f.style, { margin: "auto" });
      body.append(f);
    }
    return { card, body, at: cue(node.at), reveal };
  });

  const st = p.statement as { text: string; at: string } | undefined;
  const statement = st ? place(h("div", "headline", root), 300, 770, 1320) : null;
  if (statement) {
    statement.style.fontSize = "60px";
    statement.style.textAlign = "center";
  }
  const stWords = statement && st ? maskWords(statement, st.text) : [];

  const loop = 1.6;
  return {
    root,
    camera(t) {
      return { x: 960, y: 540, zoom: mix(0.985, 1.025, easeInOut(clamp(t / Math.max(1, data.duration)))) };
    },
    update(t) {
      lines(t);
      if (eyebrow) rise(eyebrow, t, 0.1, { dy: 12, blur: 0 });
      cards.forEach((c, i) => {
        // All four cards settle in as outlines first; each lights up when the narration reaches it.
        const enter = rise(c.card, t, 0.25 + i * 0.12, { dy: 30, blur: 8, dur: 1.0 });
        const lit = ramp(t, c.at, 0.7, easeInOut);
        c.card.style.opacity = String(enter * mix(0.28, 1, lit));
        c.body.style.opacity = String(lit);
        c.reveal?.(ramp(t, c.at + 0.35, 1.4, easeInOut));
        const s = segs[i - 1];
        if (s) {
          const k = ramp(t, c.at - 0.3, 0.7, easeInOut);
          drawOn(s.line, k);
          s.head.style.opacity = String(k);
          s.dots.forEach((d, j) => {
            const phase = ((t - c.at) / loop + j / s.dots.length) % 1;
            const on = t > c.at + 0.2 ? 1 : 0;
            const x = mix(s.xa, s.xb, phase);
            d.setAttribute("cx", x.toFixed(2));
            d.setAttribute("cy", String(cy));
            d.style.opacity = String(on * Math.sin(Math.PI * clamp(phase)) * 0.95);
          });
        }
      });
      if (st) revealWords(stWords, t, cue(st.at), { stagger: 0.06 });
    },
  };
};
