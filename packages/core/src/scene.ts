/**
 * Scene graph backed by Yoga, plus the culling painter that rasterizes it into
 * a `CellBuffer`.
 */

import { parseColor, type ColorInput, type PackedColor } from "./color";
import {
  ATTR_ALLOW_LINK,
  ATTR_BOLD,
  ATTR_DIM,
  ATTR_INVERSE,
  ATTR_ITALIC,
  ATTR_STRIKETHROUGH,
  ATTR_UNDERLINE,
  type CellBuffer,
  type DrawBoxOptions,
  type TitleAlign,
} from "./cell-buffer";
import {
  applyBorder,
  applyLayoutDefaults,
  applyLayoutProps,
  borderEdges,
  createYogaNode,
  DEFAULT_FLEX_SHRINK,
  Direction,
  Edge,
  hasPaddingProps,
  MeasureMode,
  resolveBorderStyle,
  type BorderProps,
  type BorderStyleValue,
  type LayoutProps,
  type YogaNode,
} from "./layout";
import { ELLIPSIS, layoutGraphemeLines, segmentGraphemes, type Grapheme, type TextLine, type WrapMode } from "./text-measure";

export type SceneNodeType = "box" | "text" | "raw-text";
export type TextAlign = "left" | "center" | "right";

export interface ComputedRect {
  x: number;
  y: number;
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}

export type CustomPaint = (buffer: CellBuffer, rect: Readonly<ComputedRect>, isFocused: boolean) => void;

export interface TextStyleProps {
  fg?: ColorInput;
  bg?: ColorInput;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
  allowLink?: boolean;
}

export interface SceneNodeProps extends LayoutProps, BorderProps, TextStyleProps {
  zIndex?: number;
  borderColor?: ColorInput;
  wrap?: WrapMode;
  textAlign?: TextAlign;
  title?: string;
  titleColor?: ColorInput;
  titleAlign?: TitleAlign;
  bottomTitle?: string;
  bottomTitleColor?: ColorInput;
  bottomTitleAlign?: TitleAlign;
  /** 0..1 — dims everything painted beneath this box (modal backdrop). */
  backdropDim?: number;
  backdropColor?: ColorInput;
  scrollX?: number;
  scrollY?: number;
  wireframeLabel?: string;
  customPaint?: CustomPaint;
}

interface ResolvedStyle {
  fg: PackedColor | null;
  bg: PackedColor | null;
  attrsOn: number;
  attrsOff: number;
  borderStyle: BorderStyleValue;
  borderColor: PackedColor | null;
  titleColor: PackedColor | null;
  bottomTitleColor: PackedColor | null;
  backdrop: PackedColor;
}

/** A styled slice of a text node's flattened content. Styles are relative to the text's inherited context. */
export interface TextRun {
  fg: PackedColor | null;
  bg: PackedColor | null;
  attrsOn: number;
  attrsOff: number;
}

export interface TextModel {
  graphemes: Grapheme[];
  /** Run index per grapheme. */
  runOf: Uint16Array;
  runs: TextRun[];
  /** Concatenated plain text. */
  text: string;
  /** Widest unwrapped line (`-1` until computed). */
  naturalWidth: number;
  naturalHeight: number;
}

const ATTR_PROPS: ReadonlyArray<readonly [keyof TextStyleProps, number]> = [
  ["bold", ATTR_BOLD],
  ["dim", ATTR_DIM],
  ["italic", ATTR_ITALIC],
  ["underline", ATTR_UNDERLINE],
  ["strikethrough", ATTR_STRIKETHROUGH],
  ["inverse", ATTR_INVERSE],
  ["allowLink", ATTR_ALLOW_LINK],
];

const STYLE_KEYS = new Set<keyof SceneNodeProps>([
  "fg",
  "bg",
  "bold",
  "dim",
  "italic",
  "underline",
  "strikethrough",
  "inverse",
  "allowLink",
  "border",
  "borderStyle",
  "borderColor",
  "titleColor",
  "bottomTitleColor",
  "backdropDim",
  "backdropColor",
]);

const BORDER_KEYS: ReadonlyArray<keyof BorderProps> = [
  "border",
  "borderStyle",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
];

function emptyRect(): ComputedRect {
  return { x: 0, y: 0, width: 0, height: 0, contentX: 0, contentY: 0, contentWidth: 0, contentHeight: 0, scrollWidth: 0, scrollHeight: 0 };
}

function resolveStyle(p: SceneNodeProps): ResolvedStyle {
  let on = 0;
  let off = 0;
  for (const [key, bit] of ATTR_PROPS) {
    const v = p[key];
    if (v === true) on |= bit;
    else if (v === false) off |= bit;
  }
  const dim = p.backdropDim ?? 0;
  let backdrop = 0;
  if (dim > 0) {
    const base = p.backdropColor !== undefined ? parseColor(p.backdropColor) : 0x000000ff;
    backdrop = ((base & 0xffffff00) | Math.round(Math.min(1, dim) * 255)) >>> 0;
  }
  return {
    fg: p.fg !== undefined ? parseColor(p.fg) : null,
    bg: p.bg !== undefined ? parseColor(p.bg) : null,
    attrsOn: on,
    attrsOff: off,
    borderStyle: resolveBorderStyle(p),
    borderColor: p.borderColor !== undefined ? parseColor(p.borderColor) : null,
    titleColor: p.titleColor !== undefined ? parseColor(p.titleColor) : null,
    bottomTitleColor: p.bottomTitleColor !== undefined ? parseColor(p.bottomTitleColor) : null,
    backdrop,
  };
}

let nextNodeId = 1;

export class SceneNode {
  readonly id = nextNodeId++;
  readonly type: SceneNodeType;
  props: SceneNodeProps;
  parent: SceneNode | null = null;
  readonly children: SceneNode[] = [];
  /** Content of `raw-text` nodes. */
  text: string;
  yoga: YogaNode | null = null;
  /** Absolute layout (pre-scroll). */
  readonly layout: ComputedRect = emptyRect();
  /** Screen rect from the last paint (scroll translation applied). */
  readonly screenRect: ComputedRect = emptyRect();
  /** Whether the node was painted (not culled / hidden) in the last frame. */
  painted = false;
  /** Free-form slot for host integrations (e.g. React fiber bookkeeping). */
  userData: unknown = undefined;

  private style: ResolvedStyle;
  private textModel: TextModel | null = null;
  private linesWidth = -1;
  private lines: TextLine[] | null = null;
  private paintOrderCache: SceneNode[] | null = null;
  private padded = false;
  private lastLayoutW = -1;
  private lastLayoutH = -1;
  private rel = { left: 0, top: 0, width: 0, height: 0, bt: 0, br: 0, bb: 0, bl: 0, pt: 0, pr: 0, pb: 0, pl: 0 };
  // Subtree bounds relative to this node's absolute position, used for culling.
  private bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };

  constructor(type: SceneNodeType, props: SceneNodeProps = {}, text = "") {
    this.type = type;
    this.props = props;
    this.text = text;
    this.style = resolveStyle(props);
    this.ensureYoga();
  }

  // ---------------------------------------------------------------------------
  // Yoga lifecycle
  // ---------------------------------------------------------------------------

  private get isTextLike(): boolean {
    return this.type !== "box";
  }

  /** Text and raw-text nodes nested in another text are inline spans without Yoga nodes. */
  get isInline(): boolean {
    return this.isTextLike && this.parent !== null && this.parent.isTextLike;
  }

  private ensureYoga(): void {
    if (this.yoga !== null) return;
    const node = createYogaNode();
    applyLayoutDefaults(node);
    applyLayoutProps(node, null, this.props);
    applyBorder(node, borderEdges(this.props));
    this.padded = hasPaddingProps(this.props);
    if (this.isTextLike) node.setMeasureFunc((w, wm, h, hm) => this.measure(w, wm, h, hm));
    this.yoga = node;
  }

  private dropYoga(): void {
    if (this.yoga === null) return;
    const parentYoga = this.yoga.getParent();
    if (parentYoga) parentYoga.removeChild(this.yoga);
    if (this.isTextLike) this.yoga.unsetMeasureFunc();
    this.yoga.free();
    this.yoga = null;
  }

  private yogaIndexOf(child: SceneNode): number {
    let idx = 0;
    for (const c of this.children) {
      if (c === child) return idx;
      if (c.yoga !== null) idx++;
    }
    return idx;
  }

  private attach(child: SceneNode): void {
    child.parent = this;
    if (this.isTextLike) {
      child.dropYoga();
      this.invalidateText(true);
    } else {
      child.ensureYoga();
      const y = child.yoga as YogaNode;
      const owner = y.getParent();
      if (owner) owner.removeChild(y);
      (this.yoga as YogaNode).insertChild(y, this.yogaIndexOf(child));
      child.syncShrink();
    }
    this.paintOrderCache = null;
  }

  /**
   * Yoga has no `min-height: auto`, so children of clipping containers
   * (`overflow: hidden | scroll`) default to `flexShrink: 0` and overflow
   * instead of collapsing; elsewhere the CSS default of `1` applies.
   */
  private syncShrink(): void {
    if (this.yoga === null || this.props.flexShrink !== undefined) return;
    const clip = this.parent !== null && (this.parent.props.overflow ?? "visible") !== "visible";
    this.yoga.setFlexShrink(clip ? 0 : DEFAULT_FLEX_SHRINK);
  }

  appendChild(child: SceneNode): void {
    if (child.parent) child.parent.removeChild(child);
    this.children.push(child);
    this.attach(child);
  }

  insertBefore(child: SceneNode, before: SceneNode | null): void {
    if (before === null) {
      this.appendChild(child);
      return;
    }
    if (child.parent) child.parent.removeChild(child);
    const idx = this.children.indexOf(before);
    if (idx < 0) this.children.push(child);
    else this.children.splice(idx, 0, child);
    this.attach(child);
  }

  removeChild(child: SceneNode): void {
    const idx = this.children.indexOf(child);
    if (idx < 0) return;
    this.children.splice(idx, 1);
    if (child.yoga !== null && this.yoga !== null) this.yoga.removeChild(child.yoga);
    child.parent = null;
    if (this.isTextLike) this.invalidateText(true);
    this.paintOrderCache = null;
  }

  /** Free Yoga memory for this subtree. The node must not be used afterwards. */
  destroy(): void {
    if (this.parent) this.parent.removeChild(this);
    for (const c of this.children.slice()) c.destroy();
    this.dropYoga();
  }

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  /** Apply new props, touching Yoga only for layout props that actually changed. */
  updateProps(next: SceneNodeProps): void {
    const prev = this.props;
    if (prev === next) return;
    this.props = next;
    let styleChanged = false;
    for (const key of STYLE_KEYS) {
      if (prev[key] !== next[key]) {
        styleChanged = true;
        break;
      }
    }
    if (styleChanged) this.style = resolveStyle(next);
    if (this.yoga !== null) {
      const changed = applyLayoutProps(this.yoga, prev, next);
      if (changed > 0) this.padded = hasPaddingProps(next);
      for (const k of BORDER_KEYS) {
        if (prev[k] !== next[k]) {
          applyBorder(this.yoga, borderEdges(next));
          break;
        }
      }
    }
    if (prev.flexShrink !== next.flexShrink) this.syncShrink();
    if (prev.overflow !== next.overflow) for (const c of this.children) c.syncShrink();
    if (prev.zIndex !== next.zIndex || prev.position !== next.position || prev.display !== next.display) {
      if (this.parent) this.parent.paintOrderCache = null;
    }
    if (this.isTextLike) {
      if (prev.wrap !== next.wrap) {
        this.lines = null;
        this.linesWidth = -1;
        this.yoga?.markDirty();
      }
      if (styleChanged && this.isInline) this.invalidateText(false);
      else if (styleChanged) this.textModel = null;
    }
  }

  /** Replace `raw-text` content. */
  setText(text: string): void {
    if (this.text === text) return;
    this.text = text;
    this.invalidateText(true);
  }

  /** The text node that owns layout for this inline subtree. */
  textOwner(): SceneNode {
    let n: SceneNode = this;
    while (n.parent !== null && n.parent.isTextLike) n = n.parent;
    return n;
  }

  private invalidateText(contentChanged: boolean): void {
    const owner = this.textOwner();
    owner.textModel = null;
    if (contentChanged) {
      owner.lines = null;
      owner.linesWidth = -1;
      if (owner.yoga !== null && owner.isTextLike) owner.yoga.markDirty();
    }
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  /** Flattened graphemes and inline style runs for a text owner. */
  getTextModel(): TextModel {
    if (this.textModel !== null) return this.textModel;
    const graphemes: Grapheme[] = [];
    const runIdx: number[] = [];
    const runs: TextRun[] = [];
    let text = "";
    const visit = (node: SceneNode, parent: TextRun | null): void => {
      if (node.props.display === "none") return;
      const s = node.style;
      const run: TextRun = parent
        ? {
            fg: s.fg ?? parent.fg,
            bg: s.bg ?? parent.bg,
            attrsOn: (parent.attrsOn & ~s.attrsOff) | s.attrsOn,
            attrsOff: (parent.attrsOff & ~s.attrsOn) | s.attrsOff,
          }
        : { fg: s.fg, bg: s.bg, attrsOn: s.attrsOn, attrsOff: s.attrsOff };
      if (node.type === "raw-text" || (node.text.length > 0 && node.children.length === 0)) {
        if (node.text.length > 0) {
          const ri = runs.length;
          runs.push(run);
          const before = graphemes.length;
          segmentGraphemes(node.text, graphemes);
          for (let i = before; i < graphemes.length; i++) runIdx.push(ri);
          text += node.text;
        }
      }
      for (const c of node.children) visit(c, run);
    };
    visit(this, null);
    this.textModel = { graphemes, runOf: Uint16Array.from(runIdx), runs, text, naturalWidth: -1, naturalHeight: 0 };
    return this.textModel;
  }

  /** Laid-out lines for a given content width (cached per width). */
  getLines(width: number): TextLine[] {
    const w = Math.max(0, Math.floor(width));
    if (this.lines !== null && this.linesWidth === w) return this.lines;
    const model = this.getTextModel();
    this.lines = layoutGraphemeLines(model.graphemes, w, this.props.wrap ?? "wrap");
    this.linesWidth = w;
    return this.lines;
  }

  private naturalSize(): { width: number; height: number } {
    const model = this.getTextModel();
    if (model.naturalWidth < 0) {
      const natural = layoutGraphemeLines(model.graphemes, Infinity, "nowrap");
      let w = 0;
      for (const l of natural) if (l.width > w) w = l.width;
      model.naturalWidth = w;
      model.naturalHeight = natural.length;
    }
    return { width: model.naturalWidth, height: model.naturalHeight };
  }

  private measure(width: number, widthMode: MeasureMode, _height: number, _heightMode: MeasureMode): { width: number; height: number } {
    const natural = this.naturalSize();
    if (widthMode === MeasureMode.Undefined || Number.isNaN(width)) return natural;
    const avail = Math.max(0, Math.floor(width));
    if (natural.width <= avail) {
      return { width: widthMode === MeasureMode.Exactly ? avail : natural.width, height: natural.height };
    }
    if ((this.props.wrap ?? "wrap") !== "wrap") return { width: avail, height: natural.height };
    const lines = this.getLines(avail);
    let maxLine = 0;
    for (const l of lines) if (l.width > maxLine) maxLine = l.width;
    return { width: widthMode === MeasureMode.Exactly ? avail : Math.min(avail, maxLine), height: lines.length };
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /** Run Yoga layout for this root and refresh absolute geometry of the whole tree. */
  calculateLayout(width: number, height: number, force = false): boolean {
    const y = this.yoga;
    if (y === null) return false;
    if (!force && !y.isDirty() && width === this.lastLayoutW && height === this.lastLayoutH) return false;
    y.calculateLayout(width, height, Direction.LTR);
    this.lastLayoutW = width;
    this.lastLayoutH = height;
    this.updateGeometry(0, 0);
    return true;
  }

  private updateGeometry(parentX: number, parentY: number): void {
    const y = this.yoga;
    const r = this.rel;
    if (y !== null && y.hasNewLayout()) {
      r.left = y.getComputedLeft();
      r.top = y.getComputedTop();
      r.width = y.getComputedWidth();
      r.height = y.getComputedHeight();
      const [bt, br, bb, bl] = borderEdges(this.props);
      r.bt = bt;
      r.br = br;
      r.bb = bb;
      r.bl = bl;
      if (this.padded) {
        r.pt = y.getComputedPadding(Edge.Top);
        r.pr = y.getComputedPadding(Edge.Right);
        r.pb = y.getComputedPadding(Edge.Bottom);
        r.pl = y.getComputedPadding(Edge.Left);
      } else r.pt = r.pr = r.pb = r.pl = 0;
      y.markLayoutSeen();
    }
    const L = this.layout;
    L.x = parentX + r.left;
    L.y = parentY + r.top;
    L.width = r.width;
    L.height = r.height;
    L.contentX = L.x + r.bl + r.pl;
    L.contentY = L.y + r.bt + r.pt;
    L.contentWidth = Math.max(0, r.width - r.bl - r.br - r.pl - r.pr);
    L.contentHeight = Math.max(0, r.height - r.bt - r.bb - r.pt - r.pb);
    const b = this.bounds;
    b.x0 = 0;
    b.y0 = 0;
    b.x1 = r.width;
    b.y1 = r.height;
    if (this.type === "box") {
      let maxX = L.contentX;
      let maxY = L.contentY;
      const clip = (this.props.overflow ?? "visible") !== "visible";
      for (const c of this.children) {
        if (c.yoga === null) continue;
        c.updateGeometry(L.x, L.y);
        if (c.props.display === "none") continue;
        const cl = c.layout;
        if (cl.x + cl.width > maxX) maxX = cl.x + cl.width;
        if (cl.y + cl.height > maxY) maxY = cl.y + cl.height;
        if (!clip && c.props.position !== "absolute") {
          const cb = c.bounds;
          const ox = cl.x - L.x;
          const oy = cl.y - L.y;
          if (ox + cb.x0 < b.x0) b.x0 = ox + cb.x0;
          if (oy + cb.y0 < b.y0) b.y0 = oy + cb.y0;
          if (ox + cb.x1 > b.x1) b.x1 = ox + cb.x1;
          if (oy + cb.y1 > b.y1) b.y1 = oy + cb.y1;
        } else if (!clip) {
          // Absolutely positioned descendants can escape anywhere; never cull through them.
          b.x0 = -1e9;
          b.y0 = -1e9;
          b.x1 = 1e9;
          b.y1 = 1e9;
        }
      }
      L.scrollWidth = Math.max(L.contentWidth, maxX - L.contentX + r.pr);
      L.scrollHeight = Math.max(L.contentHeight, maxY - L.contentY + r.pb);
    } else {
      const lines = this.getLines(L.contentWidth);
      let w = 0;
      for (const l of lines) if (l.width > w) w = l.width;
      L.scrollWidth = Math.max(L.contentWidth, w);
      L.scrollHeight = Math.max(L.contentHeight, lines.length);
    }
  }

  /** Children in paint order (stable by `zIndex`, positioned after in-flow). */
  paintOrder(): readonly SceneNode[] {
    if (this.paintOrderCache !== null) return this.paintOrderCache;
    let needsSort = false;
    for (const c of this.children) {
      if (c.props.zIndex !== undefined || c.props.position === "absolute") {
        needsSort = true;
        break;
      }
    }
    if (!needsSort) this.paintOrderCache = this.children;
    else {
      const rank = (n: SceneNode): number => (n.props.zIndex ?? 0) * 2 + (n.props.position === "absolute" ? 1 : 0);
      this.paintOrderCache = this.children
        .map((n, i) => ({ n, i, r: rank(n) }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map((e) => e.n);
    }
    return this.paintOrderCache;
  }

  /** Number of Yoga nodes in this subtree. */
  countYogaNodes(): number {
    let n = this.yoga !== null ? 1 : 0;
    for (const c of this.children) n += c.countYogaNodes();
    return n;
  }

  /** @internal resolved style access for the painter. */
  get resolved(): Readonly<ResolvedStyle> {
    return this.style;
  }

  /** @internal subtree bounds relative to `layout.x/y`. */
  get subtreeBounds(): Readonly<{ x0: number; y0: number; x1: number; y1: number }> {
    return this.bounds;
  }
}

/** Create a node. Requires `await initYoga()` to have resolved. */
export function createNode(type: SceneNodeType, props: SceneNodeProps = {}, text = ""): SceneNode {
  return new SceneNode(type, props, text);
}

export function createRawText(text: string): SceneNode {
  return new SceneNode("raw-text", {}, text);
}

/** Lay out a root node into a `cols × rows` viewport. */
export function computeLayout(root: SceneNode, cols: number, rows: number): void {
  root.calculateLayout(cols, rows);
}

// -----------------------------------------------------------------------------
// Painter
// -----------------------------------------------------------------------------

export interface PaintOptions {
  /** Clear the buffer before painting (default `true`). */
  clear?: boolean;
  /** Background used when clearing. */
  clearBg?: PackedColor;
  wireframe?: boolean;
  highlightedNode?: SceneNode | null;
  focusedNode?: SceneNode | null;
}

export interface PaintStats {
  painted: number;
  culled: number;
}

interface Deferred {
  node: SceneNode;
  ox: number;
  oy: number;
  fg: PackedColor;
  attrs: number;
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
  z: number;
  order: number;
}

const WIREFRAME_COLOR = 0x38bdf8ff;
const HIGHLIGHT_TINT = 0x3b82f659;
const HIGHLIGHT_LABEL_BG = 0x1e3a8aff;

class Painter {
  stats: PaintStats = { painted: 0, culled: 0 };
  private deferred: Deferred[] = [];
  private paintedNodes: SceneNode[] = [];
  private readonly box: DrawBoxOptions = { x: 0, y: 0, width: 0, height: 0 };

  constructor(
    private readonly buffer: CellBuffer,
    private readonly options: PaintOptions,
  ) {}

  run(root: SceneNode): PaintStats {
    const buf = this.buffer;
    buf.resetScissor();
    if (this.options.clear ?? true) buf.clear(this.options.clearBg ?? 0);
    this.paintNode(root, 0, 0, 0, 0);
    while (this.deferred.length > 0) {
      this.deferred.sort((a, b) => a.z - b.z || a.order - b.order);
      const d = this.deferred.shift() as Deferred;
      buf.resetScissor();
      buf.pushScissor(d.clipX, d.clipY, d.clipW, d.clipH);
      this.paintNode(d.node, d.ox, d.oy, d.fg, d.attrs);
    }
    buf.resetScissor();
    if (this.options.wireframe) this.paintWireframe();
    const hl = this.options.highlightedNode;
    if (hl && hl.painted) this.paintHighlight(hl);
    return this.stats;
  }

  private paintNode(node: SceneNode, ox: number, oy: number, inhFg: PackedColor, inhAttrs: number): void {
    node.painted = false;
    const p = node.props;
    if (p.display === "none") return;
    const buf = this.buffer;
    const L = node.layout;
    const x = L.x + ox;
    const y = L.y + oy;
    const sb = node.subtreeBounds;
    if (!buf.intersectsScissor(x + sb.x0, y + sb.y0, sb.x1 - sb.x0, sb.y1 - sb.y0)) {
      this.stats.culled++;
      return;
    }
    const s = node.resolved;
    const fg = s.fg ?? inhFg;
    const attrs = (inhAttrs & ~s.attrsOff) | s.attrsOn;
    const sr = node.screenRect;
    sr.x = x;
    sr.y = y;
    sr.width = L.width;
    sr.height = L.height;
    sr.contentX = L.contentX + ox;
    sr.contentY = L.contentY + oy;
    sr.contentWidth = L.contentWidth;
    sr.contentHeight = L.contentHeight;
    sr.scrollWidth = L.scrollWidth;
    sr.scrollHeight = L.scrollHeight;
    node.painted = true;
    this.stats.painted++;
    if (this.options.wireframe || this.options.highlightedNode) this.paintedNodes.push(node);

    if (node.type !== "box") {
      this.paintText(node, sr, fg, attrs);
      return;
    }

    if (s.backdrop !== 0) buf.dimRect(0, 0, buf.width, buf.height, s.backdrop);
    if (s.bg !== null && (s.bg & 255) !== 0) buf.fillRect(x, y, L.width, L.height, s.bg);
    if (s.borderStyle !== "none") {
      const bx = this.box;
      bx.x = x;
      bx.y = y;
      bx.width = L.width;
      bx.height = L.height;
      bx.style = s.borderStyle;
      bx.fg = s.borderColor ?? fg;
      bx.bg = 0;
      bx.attrs = 0;
      bx.top = p.borderTop !== false;
      bx.right = p.borderRight !== false;
      bx.bottom = p.borderBottom !== false;
      bx.left = p.borderLeft !== false;
      bx.title = p.title;
      bx.titleColor = s.titleColor ?? bx.fg;
      bx.titleAlign = p.titleAlign;
      bx.titleAttrs = ATTR_BOLD;
      bx.bottomTitle = p.bottomTitle;
      bx.bottomTitleColor = s.bottomTitleColor ?? bx.fg;
      bx.bottomTitleAlign = p.bottomTitleAlign;
      bx.bottomTitleAttrs = 0;
      buf.drawBox(bx);
    }
    if (p.customPaint) p.customPaint(buf, sr, this.options.focusedNode === node);

    const children = node.paintOrder();
    if (children.length === 0) return;
    const clip = (p.overflow ?? "visible") !== "visible";
    let cox = ox;
    let coy = oy;
    if (clip) {
      const bl = p.borderLeft === false || s.borderStyle === "none" ? 0 : 1;
      const bt = p.borderTop === false || s.borderStyle === "none" ? 0 : 1;
      const br = p.borderRight === false || s.borderStyle === "none" ? 0 : 1;
      const bb = p.borderBottom === false || s.borderStyle === "none" ? 0 : 1;
      buf.pushScissor(x + bl, y + bt, L.width - bl - br, L.height - bt - bb);
      const maxSX = Math.max(0, L.scrollWidth - L.contentWidth);
      const maxSY = Math.max(0, L.scrollHeight - L.contentHeight);
      cox -= Math.min(maxSX, Math.max(0, Math.floor(p.scrollX ?? 0)));
      coy -= Math.min(maxSY, Math.max(0, Math.floor(p.scrollY ?? 0)));
    }
    for (const c of children) {
      if (c.yoga === null) continue;
      const cz = c.props.zIndex ?? 0;
      if (cz > 0 && c.props.position === "absolute") {
        const sc = buf.getScissor();
        this.deferred.push({ node: c, ox: cox, oy: coy, fg, attrs, clipX: sc.x, clipY: sc.y, clipW: sc.width, clipH: sc.height, z: cz, order: this.deferred.length });
        continue;
      }
      this.paintNode(c, cox, coy, fg, attrs);
    }
    if (clip) buf.popScissor();
  }

  private paintText(node: SceneNode, sr: ComputedRect, inhFg: PackedColor, inhAttrs: number): void {
    const buf = this.buffer;
    const model = node.getTextModel();
    if (model.graphemes.length === 0) return;
    const lines = node.getLines(sr.contentWidth);
    const align = node.props.textAlign ?? "left";
    const cw = sr.contentWidth;
    const scissor = buf.getScissor();
    const firstRow = Math.max(0, scissor.y - sr.contentY);
    const lastRow = Math.min(lines.length, scissor.y + scissor.height - sr.contentY, sr.contentHeight);
    const gs = model.graphemes;
    const runOf = model.runOf;
    const runs = model.runs;
    for (let li = firstRow; li < lastRow; li++) {
      const line = lines[li] as TextLine;
      const row = sr.contentY + li;
      let col = sr.contentX;
      if (align === "center") col += Math.max(0, Math.floor((cw - line.width) / 2));
      else if (align === "right") col += Math.max(0, cw - line.width);
      col = this.drawRuns(gs, runOf, runs, line.start, line.cutStart, col, row, inhFg, inhAttrs);
      if (line.ellipsis) {
        const ref = line.cutStart > line.start ? line.cutStart - 1 : Math.min(line.cutEnd, line.end - 1);
        const run = runs[runOf[ref] ?? 0] as TextRun;
        buf.setCell(col, row, ELLIPSIS, run.fg ?? inhFg, run.bg ?? 0, (inhAttrs & ~run.attrsOff) | run.attrsOn);
        col++;
      }
      if (line.cutEnd < line.end) this.drawRuns(gs, runOf, runs, line.cutEnd, line.end, col, row, inhFg, inhAttrs);
    }
  }

  private drawRuns(
    gs: readonly Grapheme[],
    runOf: Uint16Array,
    runs: readonly TextRun[],
    from: number,
    to: number,
    col: number,
    row: number,
    inhFg: PackedColor,
    inhAttrs: number,
  ): number {
    let k = from;
    while (k < to) {
      const ri = runOf[k] as number;
      let e = k + 1;
      while (e < to && runOf[e] === ri) e++;
      const run = runs[ri] as TextRun;
      col += this.buffer.drawGraphemes(col, row, gs, k, e, run.fg ?? inhFg, run.bg ?? 0, (inhAttrs & ~run.attrsOff) | run.attrsOn);
      k = e;
    }
    return col;
  }

  private paintWireframe(): void {
    const buf = this.buffer;
    for (const n of this.paintedNodes) {
      if (n.type !== "box") continue;
      const r = n.screenRect;
      if (r.width <= 0 || r.height <= 0) continue;
      const bx = this.box;
      bx.x = r.x;
      bx.y = r.y;
      bx.width = r.width;
      bx.height = r.height;
      bx.style = "dashed";
      bx.fg = WIREFRAME_COLOR;
      bx.bg = 0;
      bx.attrs = 0;
      bx.top = bx.right = bx.bottom = bx.left = true;
      bx.title = undefined;
      bx.bottomTitle = undefined;
      buf.drawBox(bx);
      const label = n.props.wireframeLabel ?? `${n.type}#${n.id}`;
      buf.drawText(r.x + 1, r.y, label, WIREFRAME_COLOR, 0, 0, Math.max(0, r.width - 2));
    }
  }

  private paintHighlight(n: SceneNode): void {
    const buf = this.buffer;
    const r = n.screenRect;
    buf.dimRect(r.x, r.y, r.width, r.height, HIGHLIGHT_TINT);
    const label = ` ${n.props.wireframeLabel ?? n.type} ${r.width}×${r.height} `;
    const ly = r.y > 0 ? r.y - 1 : r.y + r.height < buf.height ? r.y + r.height : r.y;
    buf.drawText(Math.max(0, r.x), ly, label, 0xffffffff, HIGHLIGHT_LABEL_BG, ATTR_BOLD);
  }
}

/** Rasterize a laid-out scene into a buffer. */
export function paintScene(root: SceneNode, buffer: CellBuffer, options: PaintOptions = {}): PaintStats {
  return new Painter(buffer, options).run(root);
}
