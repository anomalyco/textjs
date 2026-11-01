import { frameLines, tui, type Camera, type SceneFactory } from "../common";
import { clamp, easeIn, easeInOut, easeOut, h, mix, place, ramp, rise } from "../motion";
import type { Token, TuiFrame } from "../types";

interface Line {
  kind: "add" | "del" | "ctx";
  tokens: Token[];
  /** Diff hunk index (add/del lines only). */
  hunk?: number;
}

/**
 * Code in an editor frame. `write` mode reveals a file line by line; `diff` mode starts from the old file and
 * applies each hunk at its cue (removed lines flush red and fold away, added lines open in green). Highlights
 * sweep across lines at cues while the rest of the file dims; the camera can lean in on them.
 *
 * props: {
 *   file, language, mode: "write" | "diff", lines: Line[],
 *   appear?: cue,                                   // write: when the code types in
 *   hunks?: cue[],                                  // diff: one cue per hunk
 *   settle?: cue,                                   // diff: tints fade back to plain code
 *   highlights?: [{ at, until?, lines: [from, to], focus? }],
 *   preview?: { at, frame: TuiFrame, size?, refresh?: cue, label? },
 * }
 */
export const editor: SceneFactory = (data, cue) => {
  const p = data.props;
  const root = h("div", "scene");
  const lines0 = frameLines(root);
  const lines = p.lines as Line[];
  const hasPreview = !!p.preview;
  const edW = hasPreview ? 1080 : 1520;
  const edH = 860;
  const edY = 110;
  const edX = hasPreview ? 420 : 200;
  const edX2 = hasPreview ? 130 : 200;

  const win = place(h("div", "window", root), edX, edY, edW, edH);
  const tabs = h("div", "tabs", win);
  const tab = h("div", "tab on", tabs);
  h("span", "", tab, p.file);
  if (p.mode === "diff") {
    const add = lines.filter((l) => l.kind === "add").length;
    const del = lines.filter((l) => l.kind === "del").length;
    const stat = h("span", "", tab);
    stat.style.fontSize = "16px";
    h("span", "stat-add", stat, `+${add}`);
    stat.append(" ");
    h("span", "stat-del", stat, `-${del}`);
  }
  const lang = h("div", "mono", tabs, p.language ?? "");
  Object.assign(lang.style, { marginLeft: "auto", alignSelf: "center", padding: "0 24px", fontSize: "15px", color: "#4d4d4d" });

  const bodyH = edH - 52 - 56;
  const maxLh = 44;
  const lh = Math.floor(Math.min(maxLh, bodyH / lines.length));
  const size = Math.round(Math.min(25, lh / 1.66));
  const gutter = 70;
  const code = place(h("div", "code", win), 0, 52 + 28, edW, bodyH);
  Object.assign(code.style, { fontSize: `${size}px`, lineHeight: `${lh}px` });

  const rows = lines.map((l, i) => {
    const el = place(h("div", "ln", code), 0, i * lh, edW, lh);
    el.style.overflow = "hidden";
    const no = place(h("div", "no", el), 0, 0, gutter - 18);
    const mark = place(h("div", "", el), gutter - 4, 0, 20);
    mark.style.color = l.kind === "add" ? "var(--green-2)" : l.kind === "del" ? "var(--red)" : "transparent";
    mark.textContent = l.kind === "add" ? "+" : l.kind === "del" ? "-" : " ";
    const txt = place(h("div", "", el), gutter + 22, 0);
    for (const tk of l.tokens) h("span", tk.kind === "plain" ? "" : `tk-${tk.kind}`, txt, tk.text);
    return { el, no, mark, txt, line: l };
  });

  // The file's previous contents, shown until the new code replaces them.
  let before: HTMLElement | null = null;
  if (p.replaces) {
    const old = p.replaces as Line[];
    const blh = Math.floor(Math.min(maxLh, bodyH / Math.min(old.length, 40)));
    before = place(h("div", "code", win), 0, 52 + 28, edW, bodyH);
    Object.assign(before.style, { fontSize: `${Math.round(Math.min(25, blh / 1.66))}px`, lineHeight: `${blh}px`, overflow: "hidden" });
    old.forEach((l, i) => {
      const el = place(h("div", "ln", before!), 0, i * blh, edW, blh);
      const no = place(h("div", "no", el, String(i + 1)), 0, 0, gutter - 18);
      void no;
      const txt = place(h("div", "", el), gutter + 22, 0);
      for (const tk of l.tokens) h("span", tk.kind === "plain" ? "" : `tk-${tk.kind}`, txt, tk.text);
    });
  }

  const hunks = ((p.hunks ?? []) as string[]).map((c) => cue(c));
  const settle = p.settle ? cue(p.settle) : Infinity;
  const appear = cue(p.appear, 0.3);

  type HL = { at: number; until: number; from: number; to: number; focus: boolean; band: HTMLElement };
  const hls: HL[] = ((p.highlights ?? []) as Array<{ at: string; until?: string; lines: [number, number]; focus?: boolean }>).map((x, i, all) => {
    const band = h("div", "hl", code);
    band.style.zIndex = "-1";
    const next = all[i + 1];
    return { at: cue(x.at), until: x.until ? cue(x.until) : next ? cue(next.at) : data.duration + 5, from: x.lines[0], to: x.lines[1], focus: x.focus ?? false, band };
  });
  code.style.zIndex = "0";
  code.style.isolation = "isolate";

  // Preview: the frame this code renders, from a real Text.js render.
  let preview: { panel: HTMLElement; frame: HTMLElement; at: number; refresh: number; badge: HTMLElement } | null = null;
  if (p.preview) {
    const pv = p.preview as { at: string; frame: TuiFrame; size?: number; refresh?: string; label?: string };
    const panel = place(h("div", "window", root), 1270, 230, 520, 560);
    panel.style.background = "#282828";
    const bar = place(h("div", "", panel), 0, 0, 520, 44);
    Object.assign(bar.style, { display: "flex", alignItems: "center", gap: "22px", padding: "0 18px", fontSize: "15px", color: "#9aa0a6", background: "#1f1f1f", borderBottom: "1px solid #3c3c3c" });
    for (const name of ["Elements", "Console", "Sources"]) {
      const t = h("span", "", bar, name);
      if (name === "Console") Object.assign(t.style, { color: "#e8eaed", boxShadow: "inset 0 -2px 0 #7cacf8", padding: "12px 0" });
    }
    const frame = tui(pv.frame, pv.size ?? 22);
    const holder = place(h("div", "", panel), 0, 44, 520, 516);
    Object.assign(holder.style, { display: "flex", alignItems: "center", justifyContent: "center" });
    holder.append(frame);
    const badge = h("div", "pill", root);
    h("span", "dot", badge);
    badge.append(document.createTextNode(pv.label ?? "Fast Refresh"));
    place(badge, 1270, 820);
    preview = { panel, frame, at: cue(pv.at), refresh: pv.refresh ? cue(pv.refresh) : cue(pv.at) + 0.6, badge };
  }

  // Layout per frame: line heights fold and open as hunks apply.
  const heights = (t: number): number[] =>
    rows.map((r) => {
      const l = r.line;
      if (p.mode !== "diff" || l.kind === "ctx" || l.hunk === undefined) return lh;
      const at = hunks[l.hunk] ?? Infinity;
      if (l.kind === "del") return lh * (1 - ramp(t, at + 0.55, 0.6, easeInOut));
      return lh * ramp(t, at + 0.55, 0.6, easeInOut);
    });

  const focusCam = (t: number): Camera => {
    let cam: Camera = { x: 960, y: 540, zoom: 1 };
    const hs = heights(t);
    const tops: number[] = [];
    hs.reduce((y, v, i) => ((tops[i] = y), y + v), 0);
    for (const x of hls) {
      if (!x.focus) continue;
      const k = Math.min(ramp(t, x.at - 0.2, 1.2, easeInOut), 1 - ramp(t, x.until - 0.6, 1.2, easeInOut));
      if (k <= 0) continue;
      const y = edY + 52 + 28 + (tops[x.from]! + tops[x.to]! + hs[x.to]!) / 2;
      const target = { x: 960, y: mix(540, y, 0.45), zoom: 1.07 };
      cam = { x: mix(cam.x, target.x, k), y: mix(cam.y, target.y, k), zoom: mix(cam.zoom, target.zoom, k) };
    }
    return cam;
  };

  return {
    root,
    camera: focusCam,
    update(t) {
      lines0(t);
      rise(win, t, -0.3, { dy: 40, blur: 0, dur: 1.1 });
      if (preview) {
        const k = ramp(t, preview.at - 0.2, 1.1, easeInOut);
        win.style.left = `${mix(edX, edX2, k).toFixed(2)}px`;
        const pk = ramp(t, preview.at + 0.1, 1.0, easeOut);
        preview.panel.style.opacity = String(pk);
        preview.panel.style.transform = `translate3d(${((1 - pk) * 80).toFixed(2)}px, 0, 0)`;
        const flash = t >= preview.refresh ? 1 - ramp(t, preview.refresh, 0.5) : 1;
        preview.frame.style.opacity = t < preview.refresh ? "0" : "1";
        preview.frame.style.filter = t >= preview.refresh && flash > 0.02 ? `brightness(${(1 + 0.6 * flash).toFixed(3)})` : "";
        const bk = Math.min(ramp(t, preview.refresh, 0.4), 1 - ramp(t, preview.refresh + 2.6, 0.5, easeIn));
        preview.badge.style.opacity = String(bk);
        preview.badge.style.transform = `translate3d(0, ${((1 - bk) * 10).toFixed(2)}px, 0)`;
      }

      if (before) {
        const k = ramp(t, appear - 0.5, 0.5, easeInOut);
        before.style.opacity = String(0.85 * (1 - k));
        before.style.transform = `translate3d(0, ${(-k * 24).toFixed(2)}px, 0)`;
        before.style.display = k >= 1 ? "none" : "block";
      }
      const hs = heights(t);
      let y = 0;
      let n = 0;
      let lit = 0;
      for (const x of hls) lit = Math.max(lit, Math.min(ramp(t, x.at, 0.5), 1 - ramp(t, x.until - 0.35, 0.35, easeIn)));
      rows.forEach((r, i) => {
        const l = r.line;
        r.el.style.top = `${y.toFixed(2)}px`;
        r.el.style.height = `${hs[i]!.toFixed(2)}px`;
        const visible = hs[i]! > 0.5;
        r.el.style.display = visible ? "block" : "none";
        y += hs[i]!;
        // Removed lines keep their number until their hunk folds them away.
        const inFile = visible && (l.kind !== "del" || l.hunk === undefined || t < (hunks[l.hunk] ?? Infinity) + 0.55);
        if (inFile) n++;
        r.no.textContent = inFile ? String(n) : "";

        // Write mode: lines appear one after another.
        let o = 1;
        if (p.mode !== "diff") {
          const k = ramp(t, appear + i * 0.07, 0.55);
          o = k;
          r.txt.style.transform = `translate3d(${((1 - k) * 14).toFixed(2)}px, 0, 0)`;
        }
        // Diff tints.
        let bg = "transparent";
        let bar = "";
        if (p.mode === "diff" && l.hunk !== undefined) {
          const at = hunks[l.hunk] ?? Infinity;
          const tint = ramp(t, at, 0.4) * (1 - ramp(t, settle, 0.8));
          if (l.kind === "del") {
            bg = `rgba(229,72,77,${(0.14 * tint).toFixed(3)})`;
            bar = `inset 3px 0 0 rgba(229,72,77,${tint.toFixed(3)})`;
            r.txt.style.opacity = String(1 - 0.35 * tint);
          } else {
            bg = `rgba(69,165,87,${(0.13 * tint).toFixed(3)})`;
            bar = `inset 3px 0 0 rgba(69,165,87,${tint.toFixed(3)})`;
          }
          r.mark.style.opacity = String(tint);
        } else if (p.mode === "diff") r.mark.style.opacity = "0";
        r.el.style.background = bg;
        r.el.style.boxShadow = bar;
        // Focus: dim lines outside the active highlight.
        let inside = 0;
        for (const x of hls) if (i >= x.from && i <= x.to) inside = Math.max(inside, Math.min(ramp(t, x.at, 0.5), 1 - ramp(t, x.until - 0.35, 0.35, easeIn)));
        r.el.style.opacity = String(o * mix(1, 0.38, clamp(lit - inside)));
      });
      // Highlight bands.
      const tops: number[] = [];
      hs.reduce((acc, v, i) => ((tops[i] = acc), acc + v), 0);
      for (const x of hls) {
        const k = Math.min(ramp(t, x.at, 0.55, easeOut), 1 - ramp(t, x.until - 0.35, 0.35, easeIn));
        x.band.style.display = k > 0.001 ? "block" : "none";
        x.band.style.top = `${tops[x.from]!.toFixed(2)}px`;
        x.band.style.height = `${(tops[x.to]! + hs[x.to]! - tops[x.from]!).toFixed(2)}px`;
        x.band.style.transform = `scaleX(${ramp(t, x.at, 0.55, easeOut).toFixed(4)})`;
        x.band.style.opacity = String(Math.min(1, 1 - ramp(t, x.until - 0.35, 0.35, easeIn)));
      }
    },
  };
};
