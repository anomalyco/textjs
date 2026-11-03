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
  CHAR_SPACE,
  type CellBuffer,
  type DrawBoxOptions,
  type TitleAlign,
} from "./cell-buffer";
import {
  applyBorder,
  applyLayoutDefaults,
  applyLayoutProp,
  applyLayoutProps,
  borderEdges,
  createYogaNode,
  DEFAULT_FLEX_SHRINK,
  Direction,
  Edge,
  hasPaddingProps,
  LAYOUT_PROP_KEYS,
  MeasureMode,
  resolveBorderStyle,
  type BorderProps,
  type BorderStyleValue,
  type LayoutProps,
  type YogaNode,
} from "./layout";
import { ELLIPSIS, layoutGraphemeLines, segmentGraphemes, type Grapheme, type TextLine, type WrapMode } from "./text-measure";
import { drawLogicalText, graphemesNeedBidi, resolveGraphemeBidi, visualizeLine, type GraphemeBidi, type TextDirection, type VisualLine } from "./bidi";

export type SceneNodeType = "box" | "text" | "raw-text";
/** `"start"`/`"end"` follow each paragraph's direction; unset text aligns to `"start"`. */
export type TextAlign = "left" | "center" | "right" | "start" | "end";

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
  /**
   * Base direction of text paragraphs (default `"auto"`: each paragraph takes
   * the direction of its first strong character). On a nested text span,
   * isolates the span like HTML `dir` (`"auto"` = FSI, `"ltr"` = LRI, `"rtl"` = RLI).
   */
  dir?: TextDirection;
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
  /** Whether painting goes through the bidi path (`dir: "rtl"` or any RTL/AN character or bidi control). */
  needsBidi: boolean;
}

const ISOLATE_GRAPHEMES: Readonly<Record<TextDirection, Grapheme>> = Object.freeze({
  auto: Object.freeze({ grapheme: "\u2068", width: 0, codePoint: 0x2068, isMulti: false }),
  ltr: Object.freeze({ grapheme: "\u2066", width: 0, codePoint: 0x2066, isMulti: false }),
  rtl: Object.freeze({ grapheme: "\u2067", width: 0, codePoint: 0x2067, isMulti: false }),
});
const PDI_GRAPHEME: Grapheme = Object.freeze({ grapheme: "\u2069", width: 0, codePoint: 0x2069, isMulti: false });
const ELLIPSIS_GRAPHEME: Grapheme = Object.freeze({ grapheme: ELLIPSIS, width: 1, codePoint: 0x2026, isMulti: false });

const ZERO_RUN_CACHE: Array<Uint16Array | undefined> = [];
function getZeroRunOf(length: number): Uint16Array {
  if (length <= 1024) {
    let arr = ZERO_RUN_CACHE[length];
    if (arr === undefined) {
      arr = new Uint16Array(length);
      ZERO_RUN_CACHE[length] = arr;
    }
    return arr;
  }
  return new Uint16Array(length);
}

/**
 * Grapheme whose style (and bidi level) a truncation ellipsis takes: the last
 * visible one before the cut, else the first after it. Zero-width isolate
 * controls belong to no style run, so they are skipped.
 */
function ellipsisRef(gs: readonly Grapheme[], line: TextLine): number {
  for (let i = line.cutStart - 1; i >= line.start; i--) if ((gs[i] as Grapheme).width > 0) return i;
  for (let i = line.cutEnd; i < line.end; i++) if ((gs[i] as Grapheme).width > 0) return i;
  return line.cutStart > line.start ? line.cutStart - 1 : Math.min(line.cutEnd, line.end - 1);
}

const FLAG_LAYOUT = 1 << 0;
const FLAG_STYLE = 1 << 1;
const FLAG_BORDER = 1 << 2;

const PROP_FLAGS: Record<string, number | undefined> = Object.create(null) as Record<string, number | undefined>;
for (const k of LAYOUT_PROP_KEYS) PROP_FLAGS[k] = (PROP_FLAGS[k] ?? 0) | FLAG_LAYOUT;
for (const k of [
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
]) {
  PROP_FLAGS[k] = (PROP_FLAGS[k] ?? 0) | FLAG_STYLE;
}
for (const k of ["border", "borderStyle", "borderTop", "borderRight", "borderBottom", "borderLeft"]) {
  PROP_FLAGS[k] = (PROP_FLAGS[k] ?? 0) | FLAG_BORDER;
}

const EMPTY_PROPS: SceneNodeProps = Object.freeze({});

function emptyRect(): ComputedRect {
  return { x: 0, y: 0, width: 0, height: 0, contentX: 0, contentY: 0, contentWidth: 0, contentHeight: 0, scrollWidth: 0, scrollHeight: 0 };
}

function resolveStyle(p: SceneNodeProps): ResolvedStyle {
  if (p === EMPTY_PROPS) return DEFAULT_RESOLVED_STYLE;
  let on = 0;
  let off = 0;
  if (p.bold === true) on |= ATTR_BOLD;
  else if (p.bold === false) off |= ATTR_BOLD;
  if (p.dim === true) on |= ATTR_DIM;
  else if (p.dim === false) off |= ATTR_DIM;
  if (p.italic === true) on |= ATTR_ITALIC;
  else if (p.italic === false) off |= ATTR_ITALIC;
  if (p.underline === true) on |= ATTR_UNDERLINE;
  else if (p.underline === false) off |= ATTR_UNDERLINE;
  if (p.strikethrough === true) on |= ATTR_STRIKETHROUGH;
  else if (p.strikethrough === false) off |= ATTR_STRIKETHROUGH;
  if (p.inverse === true) on |= ATTR_INVERSE;
  else if (p.inverse === false) off |= ATTR_INVERSE;
  if (p.allowLink === true) on |= ATTR_ALLOW_LINK;
  else if (p.allowLink === false) off |= ATTR_ALLOW_LINK;
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

const DEFAULT_RESOLVED_STYLE: ResolvedStyle = Object.freeze({
  fg: null,
  bg: null,
  attrsOn: 0,
  attrsOff: 0,
  borderStyle: "none",
  borderColor: null,
  titleColor: null,
  bottomTitleColor: null,
  backdrop: 0,
});

let nextNodeId = 1;

/** Text leaves resized in place by the row fast path, whose Yoga measurement is out of date (see `calculateLayout`). */
const yogaStale = new Set<SceneNode>();

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
  private bidi: GraphemeBidi | null = null;
  private visualLines: Array<VisualLine | undefined> | null = null;
  private visualFor: TextLine[] | null = null;
  private paintOrderCache: SceneNode[] | null = null;
  private padded = false;
  private destroyed = false;
  private relValid = false;
  private geometryDirty = true;
  private mCache: number[] | null = null;
  private mOverflow = false;
  private pendingTextNodes: Set<SceneNode> | null = null;
  private lastLayoutW = -1;
  private lastLayoutH = -1;
  /** @internal */ _sceneDirty = true;
  /** @internal */ _fullDamage = true;
  /** @internal */ _damageLo = 0;
  /** @internal */ _damageHi = 0;
  private rel = { left: 0, top: 0, width: 0, height: 0, bt: 0, br: 0, bb: 0, bl: 0, pt: 0, pr: 0, pb: 0, pl: 0 };
  // Subtree bounds relative to this node's absolute position, used for culling.
  private bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };

  constructor(type: SceneNodeType, props: SceneNodeProps = EMPTY_PROPS, text = "") {
    this.type = type;
    this.props = props;
    this.text = text;
    this.style = resolveStyle(props);
    if (type === "box") this.ensureYoga();
  }

  // ---------------------------------------------------------------------------
  // Yoga lifecycle
  // ---------------------------------------------------------------------------

  private get isTextLike(): boolean {
    return this.type !== "box";
  }

  /** `true` once `destroy()` has run; the node must not be used afterwards. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Text and raw-text nodes nested in another text are inline spans without Yoga nodes. */
  get isInline(): boolean {
    return this.isTextLike && this.parent !== null && this.parent.isTextLike;
  }

  private rootAncestor(): SceneNode {
    let cur: SceneNode = this;
    while (cur.parent !== null) cur = cur.parent;
    return cur;
  }

  private markFullDamage(): void {
    const root = this.rootAncestor();
    root._sceneDirty = true;
    root._fullDamage = true;
  }

  private damageSelf(): void {
    const target = this.isInline ? this.textOwner() : this;
    const root = target.rootAncestor();
    root._sceneDirty = true;
    if (root._fullDamage) return;
    const sr = target.screenRect;
    if (!target.painted || sr.height <= 0) {
      root._fullDamage = true;
      return;
    }
    const y0 = Math.max(0, sr.y);
    const y1 = sr.y + sr.height;
    if (y1 <= y0) return;
    if (y1 > 64) {
      root._fullDamage = true;
      return;
    }
    for (let y = y0; y < y1; y++) {
      if (y < 32) root._damageLo |= 1 << y;
      else root._damageHi |= 1 << (y - 32);
    }
  }

  private markGeometryDirty(): void {
    let cur: SceneNode | null = this;
    while (cur !== null && !cur.geometryDirty) {
      cur.geometryDirty = true;
      cur = cur.parent;
    }
  }

  private clearMeasureCache(): void {
    if (this.mCache !== null) this.mCache.length = 0;
    this.mOverflow = false;
  }

  private markTextYogaDirty(): void {
    this.clearMeasureCache();
    this.yoga?.markDirty();
    this.markGeometryDirty();
  }

  /** The node's size changed in place; Yoga still caches the old measurement until its next layout. */
  private markYogaStale(): void {
    yogaStale.add(this);
  }

  private ensureYoga(): void {
    if (this.yoga !== null || this.destroyed) return;
    const node = createYogaNode();
    applyLayoutDefaults(node);
    applyLayoutProps(node, null, this.props);
    applyBorder(node, borderEdges(this.props));
    this.padded = hasPaddingProps(this.props);
    if (this.isTextLike) node.setMeasureFunc((w, wm, h, hm) => this.measureFromYoga(w, wm, h, hm));
    this.yoga = node;
    this.relValid = false;
    this.geometryDirty = true;
  }

  private dropYoga(): void {
    if (this.yoga === null) return;
    const parentYoga = this.yoga.getParent();
    if (parentYoga) parentYoga.removeChild(this.yoga);
    if (this.isTextLike) this.yoga.unsetMeasureFunc();
    this.yoga.free();
    this.yoga = null;
    this.relValid = false;
    this.clearMeasureCache();
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
    child.relValid = false;
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
      child.markGeometryDirty();
      this.markGeometryDirty();
      const root = this.rootAncestor();
      root._sceneDirty = true;
      root._fullDamage = true;
      if (child.pendingTextNodes !== null && child.pendingTextNodes.size > 0) {
        if (root !== child) {
          let dst = root.pendingTextNodes;
          if (dst === null) {
            dst = new Set();
            root.pendingTextNodes = dst;
          }
          for (const n of child.pendingTextNodes) dst.add(n);
          child.pendingTextNodes.clear();
        }
      }
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
    child.relValid = false;
    child.clearMeasureCache();
    if (this.isTextLike) this.invalidateText(true);
    else {
      this.markGeometryDirty();
      this.markFullDamage();
    }
    this.paintOrderCache = null;
  }

  /** Free Yoga memory for this subtree. The node must not be used afterwards. */
  destroy(): void {
    this.destroyed = true;
    yogaStale.delete(this);
    this.painted = false;
    if (this.pendingTextNodes !== null) this.pendingTextNodes.clear();
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
    const pRec = prev as Record<string, unknown>;
    const nRec = next as Record<string, unknown>;
    const y = this.yoga;
    let diffFlags = 0;
    let anyChanged = false;
    let layoutChanged = 0;

    for (const k in nRec) {
      const nv = nRec[k];
      if (nv === undefined || pRec[k] === nv) continue;
      anyChanged = true;
      const f = PROP_FLAGS[k] ?? 0;
      diffFlags |= f;
      if (y !== null && (f & FLAG_LAYOUT) !== 0) {
        applyLayoutProp(y, k, nv);
        layoutChanged++;
      }
    }
    for (const k in pRec) {
      if (pRec[k] === undefined || nRec[k] !== undefined) continue;
      anyChanged = true;
      const f = PROP_FLAGS[k] ?? 0;
      diffFlags |= f;
      if (y !== null && (f & FLAG_LAYOUT) !== 0) {
        applyLayoutProp(y, k, undefined);
        layoutChanged++;
      }
    }

    this.props = next;
    if (!anyChanged) return;

    const styleChanged = (diffFlags & FLAG_STYLE) !== 0;
    if (styleChanged) this.style = resolveStyle(next);
    let needsFullDamage =
      layoutChanged > 0 ||
      (diffFlags & FLAG_BORDER) !== 0 ||
      prev.flexShrink !== next.flexShrink ||
      prev.overflow !== next.overflow ||
      prev.zIndex !== next.zIndex ||
      prev.position !== next.position ||
      prev.display !== next.display ||
      prev.scrollX !== next.scrollX ||
      prev.scrollY !== next.scrollY ||
      prev.backdropDim !== next.backdropDim ||
      prev.backdropColor !== next.backdropColor;
    if (y !== null) {
      if (layoutChanged > 0) this.padded = hasPaddingProps(next);
      if ((diffFlags & FLAG_BORDER) !== 0) applyBorder(y, borderEdges(next));
      if (layoutChanged > 0 || (diffFlags & FLAG_BORDER) !== 0) {
        this.clearMeasureCache();
        this.markGeometryDirty();
      }
    }
    if (prev.flexShrink !== next.flexShrink) {
      this.syncShrink();
      this.clearMeasureCache();
      this.markGeometryDirty();
    }
    if (prev.overflow !== next.overflow) {
      for (const c of this.children) {
        c.syncShrink();
        c.clearMeasureCache();
        c.geometryDirty = true;
      }
      this.markGeometryDirty();
    }
    if (prev.zIndex !== next.zIndex || prev.position !== next.position || prev.display !== next.display) {
      if (this.parent) this.parent.paintOrderCache = null;
      this.markGeometryDirty();
    }
    if (this.isTextLike) {
      if (prev.wrap !== next.wrap) {
        this.lines = null;
        this.linesWidth = -1;
        this.markTextYogaDirty();
        needsFullDamage = true;
      }
      if (styleChanged && this.isInline) this.invalidateText(false);
      else if (styleChanged) this.textModel = null;
      if (prev.dir !== next.dir) {
        // Inline `dir` adds isolate controls to the owner's graphemes; an owner's `dir` only changes levels.
        if (this.isInline) this.invalidateText(true);
        else this.textModel = null;
      }
    }
    if (needsFullDamage) this.markFullDamage();
    else this.damageSelf();
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
    owner.damageSelf();
    owner.textModel = null;
    if (contentChanged) {
      owner.lines = null;
      owner.linesWidth = -1;
      if (owner.yoga !== null && owner.isTextLike) {
        if (!owner.relValid || owner.mOverflow || owner.yoga.isDirty()) {
          owner.markTextYogaDirty();
          owner.markFullDamage();
        } else {
          const root = owner.rootAncestor();
          let set = root.pendingTextNodes;
          if (set === null) {
            set = new Set();
            root.pendingTextNodes = set;
          }
          set.add(owner);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Text
  // ---------------------------------------------------------------------------

  /** Flattened graphemes and inline style runs for a text owner. */
  getTextModel(): TextModel {
    if (this.textModel !== null) return this.textModel;
    // Fast path: the common <Text>string</Text> leaf (single raw-text child, no inline spans or isolates).
    if (this.props.display !== "none" && this.children.length === 1) {
      const c0 = this.children[0] as SceneNode;
      if (c0.type === "raw-text" && c0.props === EMPTY_PROPS && c0.text.length > 0) {
        const s = this.style;
        const graphemes = segmentGraphemes(c0.text);
        let naturalWidth = 0;
        let curLineWidth = 0;
        let naturalHeight = 1;
        let maybeBidi = false;
        for (let i = 0; i < graphemes.length; i++) {
          const g = graphemes[i] as Grapheme;
          if (g.codePoint === 0x0a) {
            if (curLineWidth > naturalWidth) naturalWidth = curLineWidth;
            curLineWidth = 0;
            naturalHeight++;
          } else {
            curLineWidth += g.width;
            if (g.codePoint >= 0x0590 || g.isMulti) maybeBidi = true;
          }
        }
        if (curLineWidth > naturalWidth) naturalWidth = curLineWidth;
        const needsBidi = this.props.dir === "rtl" || (maybeBidi && graphemesNeedBidi(graphemes));
        this.bidi = null;
        this.visualLines = null;
        this.textModel = {
          graphemes,
          runOf: getZeroRunOf(graphemes.length),
          runs: [{ fg: s.fg, bg: s.bg, attrsOn: s.attrsOn, attrsOff: s.attrsOff }],
          text: c0.text,
          naturalWidth,
          naturalHeight,
          needsBidi,
        };
        return this.textModel;
      }
    }
    const graphemes: Grapheme[] = [];
    const runs: TextRun[] = [];
    const runBounds: number[] = [];
    let text = "";
    let naturalWidth = 0;
    let curLineWidth = 0;
    let naturalHeight = 1;
    let maybeBidi = false;
    // Isolate initiators of the enclosing `dir` spans: a newline ends every isolate (it is a
    // paragraph separator), so they are closed before it and reopened after.
    const isolates: Grapheme[] = [];
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
      const isolate = node !== this ? node.props.dir : undefined;
      if (isolate !== undefined) {
        graphemes.push(ISOLATE_GRAPHEMES[isolate]);
        isolates.push(ISOLATE_GRAPHEMES[isolate]);
        // LTR and auto isolates only matter around right-to-left text, which the scan below finds.
        if (isolate === "rtl") maybeBidi = true;
      }
      if (node.type === "raw-text" || (node.text.length > 0 && node.children.length === 0)) {
        if (node.text.length > 0) {
          const ri = runs.length;
          runs.push(run);
          const before = graphemes.length;
          if (isolates.length > 0 && node.text.includes("\n")) {
            for (const g of segmentGraphemes(node.text)) {
              if (g.codePoint !== 0x0a) {
                graphemes.push(g);
                continue;
              }
              for (let k = 0; k < isolates.length; k++) graphemes.push(PDI_GRAPHEME);
              graphemes.push(g);
              for (const o of isolates) graphemes.push(o);
            }
          } else segmentGraphemes(node.text, graphemes);
          const after = graphemes.length;
          if (ri > 0 && after > before) runBounds.push(ri, before, after);
          for (let i = before; i < after; i++) {
            const g = graphemes[i] as Grapheme;
            if (g.codePoint === 0x0a) {
              if (curLineWidth > naturalWidth) naturalWidth = curLineWidth;
              curLineWidth = 0;
              naturalHeight++;
            } else {
              curLineWidth += g.width;
              if (g.codePoint >= 0x0590 || g.isMulti) maybeBidi = true;
            }
          }
          text += node.text;
        }
      }
      for (const c of node.children) visit(c, run);
      if (isolate !== undefined) {
        graphemes.push(PDI_GRAPHEME);
        isolates.pop();
      }
    };
    visit(this, null);
    if (curLineWidth > naturalWidth) naturalWidth = curLineWidth;
    let runOf: Uint16Array;
    if (runBounds.length === 0) {
      runOf = getZeroRunOf(graphemes.length);
    } else {
      runOf = new Uint16Array(graphemes.length);
      for (let b = 0; b < runBounds.length; b += 3) {
        runOf.fill(runBounds[b] as number, runBounds[b + 1] as number, runBounds[b + 2] as number);
      }
    }
    const needsBidi = this.props.dir === "rtl" || (maybeBidi && graphemesNeedBidi(graphemes));
    this.bidi = null;
    this.visualLines = null;
    this.textModel = { graphemes, runOf, runs, text, naturalWidth, naturalHeight, needsBidi };
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

  /**
   * @internal Line `li` of `lines` in visual order (bidi path only). Lines are
   * wrapped in logical order first; each is then reordered on its own (L1–L4).
   */
  getVisualLine(lines: TextLine[], li: number): VisualLine {
    const model = this.getTextModel();
    if (this.visualFor !== lines || this.visualLines === null) {
      this.visualFor = lines;
      this.visualLines = new Array<VisualLine | undefined>(lines.length);
    }
    const cached = this.visualLines[li];
    if (cached !== undefined) return cached;
    if (this.bidi === null) this.bidi = resolveGraphemeBidi(model.graphemes, this.props.dir);
    const line = lines[li] as TextLine;
    const items: number[] = [];
    for (let i = line.start; i < line.cutStart; i++) items.push(i);
    if (line.ellipsis) items.push(-1);
    for (let i = line.cutEnd; i < line.end; i++) items.push(i);
    const ref = ellipsisRef(model.graphemes, line);
    const vl = visualizeLine(model.graphemes, this.bidi, items, ELLIPSIS_GRAPHEME, ref);
    this.visualLines[li] = vl;
    return vl;
  }

  private computeMeasure(width: number, widthMode: MeasureMode): { width: number; height: number } {
    const model = this.getTextModel();
    const natW = model.naturalWidth;
    const natH = model.naturalHeight;
    if (widthMode === MeasureMode.Undefined || Number.isNaN(width)) return { width: natW, height: natH };
    const avail = Math.max(0, Math.floor(width));
    if (natW <= avail) {
      return { width: widthMode === MeasureMode.Exactly ? avail : natW, height: natH };
    }
    if ((this.props.wrap ?? "wrap") !== "wrap") return { width: avail, height: natH };
    const lines = this.getLines(avail);
    let maxLine = 0;
    for (const l of lines) if (l.width > maxLine) maxLine = l.width;
    return { width: widthMode === MeasureMode.Exactly ? avail : Math.min(avail, maxLine), height: lines.length };
  }

  private measureFromYoga(width: number, widthMode: MeasureMode, _height: number, _heightMode: MeasureMode): { width: number; height: number } {
    const res = this.computeMeasure(width, widthMode);
    let mc = this.mCache;
    if (mc === null) {
      mc = [];
      this.mCache = mc;
    }
    const nw = widthMode === MeasureMode.Undefined || Number.isNaN(width) ? -1 : Math.max(0, Math.floor(width));
    let found = false;
    for (let i = 0; i < mc.length; i += 4) {
      if (mc[i] === nw && mc[i + 1] === widthMode) {
        mc[i + 2] = res.width;
        mc[i + 3] = res.height;
        found = true;
        break;
      }
    }
    if (!found) {
      if (mc.length < 32) mc.push(nw, widthMode, res.width, res.height);
      else this.mOverflow = true;
    }
    return res;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /**
   * Whether a width change of this row's last text leaf (from `prevWidth` to `mWidth` measured cells) can be applied in
   * place, without running Yoga. Only when nothing else in the row depends on the free space: no sibling grows, and the
   * row had room to spare before and after (so no item was shrunk). Yoga's own measure cache for the node is then stale;
   * {@link markYogaStale} re-measures it the next time Yoga runs.
   */
  private canFastUpdateRowTextLeaf(prevWidth: number, mWidth: number, mHeight: number): boolean {
    const parent = this.parent;
    if (parent === null || parent.type !== "box" || !parent.relValid) return false;
    if (this.padded || this.resolved.borderStyle !== "none") return false;
    const p = this.props;
    if (
      p.width !== undefined ||
      p.minWidth !== undefined ||
      p.maxWidth !== undefined ||
      p.flexBasis !== undefined ||
      p.position === "absolute" ||
      p.margin !== undefined ||
      p.marginX !== undefined ||
      p.marginLeft !== undefined ||
      p.marginRight !== undefined
    ) {
      return false;
    }
    const pp = parent.props;
    if ((pp.flexDirection ?? "row") !== "row" || (pp.flexWrap ?? "nowrap") !== "nowrap") return false;
    if ((pp.justifyContent ?? "flex-start") !== "flex-start") return false;
    // Must be the last child in the row so changing width never shifts a following sibling.
    const siblings = parent.children;
    if (siblings[siblings.length - 1] !== this) return false;
    // Parent's own width and height must be top-down constrained (not shrink-wrapping this child).
    let cur: SceneNode | null = parent;
    while (cur !== null && cur.parent !== null) {
      const cp = cur.props;
      const gp = cur.parent.props;
      const gDir = gp.flexDirection ?? "row";
      const fixedW =
        cp.width !== undefined && cp.width !== "auto"
          ? true
          : gDir === "column"
            ? (gp.alignItems ?? "stretch") === "stretch" && (cp.alignSelf === undefined || cp.alignSelf === "auto" || cp.alignSelf === "stretch")
            : gDir === "row" && (cp.flexGrow ?? 0) > 0 && cp.flexBasis === 0;
      if (!fixedW) return false;
      cur = cur.parent;
    }
    // A growing sibling (a <Spacer>, say) takes whatever this leaf gives up, so the leaf would move.
    for (let i = 0; i < siblings.length - 1; i++) {
      if (((siblings[i] as SceneNode).props.flexGrow ?? 0) > 0) return false;
    }
    const PL = parent.layout;
    const L = this.layout;
    const usedBefore = L.x - PL.contentX;
    const availAfter = PL.contentWidth - usedBefore;
    if (mWidth > availAfter) return false;
    // With no spare room before, Yoga may have shrunk siblings to fit, and they would widen again.
    if (prevWidth >= availAfter) return false;
    const grow = p.flexGrow ?? 0;
    const align = p.alignSelf === undefined || p.alignSelf === "auto" ? (pp.alignItems ?? "stretch") : p.alignSelf;
    if (align !== "stretch" && mHeight !== this.rel.height) return false;
    const newW = grow > 0 ? availAfter : mWidth;
    this.rel.width = newW;
    L.width = newW;
    L.contentWidth = newW;
    this.bounds.x1 = newW;
    const lines = this.getLines(newW);
    let maxW = 0;
    for (const l of lines) if (l.width > maxW) maxW = l.width;
    L.scrollWidth = Math.max(newW, maxW);
    L.scrollHeight = Math.max(L.contentHeight, lines.length);
    return true;
  }

  /** Run Yoga layout for this root and refresh absolute geometry of the whole tree. */
  calculateLayout(width: number, height: number, force = false): boolean {
    if (this.yoga === null) this.ensureYoga();
    const y = this.yoga;
    if (y === null) return false;
    if (this.pendingTextNodes !== null && this.pendingTextNodes.size > 0) {
      const rootAlreadyDirty = force || y.isDirty() || width !== this.lastLayoutW || height !== this.lastLayoutH;
      for (const owner of this.pendingTextNodes) {
        if (owner.destroyed || owner.yoga === null || owner.rootAncestor() !== this) continue;
        if (rootAlreadyDirty || !owner.relValid || owner.mOverflow || owner.yoga.isDirty()) {
          owner.markTextYogaDirty();
          continue;
        }
        const mc = owner.mCache;
        let sizeChanged = false;
        let fastHandled = false;
        if (mc !== null && mc.length > 0) {
          if (
            (mc.length === 4 && (mc[1] === MeasureMode.AtMost || mc[1] === MeasureMode.Undefined)) ||
            (mc.length === 8 && mc[1] === MeasureMode.Undefined && mc[5] === MeasureMode.AtMost)
          ) {
            const lastIdx = mc.length - 4;
            const nw = mc[lastIdx] as number;
            const wm = mc[lastIdx + 1] as MeasureMode;
            const m = owner.computeMeasure(nw < 0 ? NaN : nw, wm);
            if (m.height === mc[lastIdx + 3] && (mc.length === 4 || m.height === mc[3])) {
              const widthUnchanged = m.width === mc[lastIdx + 2] && (mc.length === 4 || m.width === mc[2]);
              if (widthUnchanged) {
                // Identical width & height.
              } else if (owner.canFastUpdateRowTextLeaf(mc[lastIdx + 2] as number, m.width, m.height)) {
                mc[lastIdx + 2] = m.width;
                owner.markYogaStale();
                if (mc.length === 8) mc[2] = owner.computeMeasure(NaN, MeasureMode.Undefined).width;
                fastHandled = true;
              } else {
                sizeChanged = true;
              }
            } else {
              sizeChanged = true;
            }
          } else {
            for (let i = 0; i < mc.length; i += 4) {
              const nw = mc[i] as number;
              const wm = mc[i + 1] as MeasureMode;
              const m = owner.computeMeasure(nw < 0 ? NaN : nw, wm);
              if (m.width !== mc[i + 2] || m.height !== mc[i + 3]) {
                sizeChanged = true;
                break;
              }
            }
          }
        }
        if (sizeChanged) {
          owner.markTextYogaDirty();
        } else if (!fastHandled) {
          const L = owner.layout;
          const lines = owner.getLines(L.contentWidth);
          let maxW = 0;
          for (const l of lines) if (l.width > maxW) maxW = l.width;
          L.scrollWidth = Math.max(L.contentWidth, maxW);
          L.scrollHeight = Math.max(L.contentHeight, lines.length);
        }
      }
      this.pendingTextNodes.clear();
    }
    if (!force && !y.isDirty() && width === this.lastLayoutW && height === this.lastLayoutH) return false;
    if (yogaStale.size > 0) {
      for (const n of yogaStale) {
        if (n.destroyed || n.yoga === null) yogaStale.delete(n);
        else if (n.rootAncestor() === this) {
          yogaStale.delete(n);
          n.markTextYogaDirty();
        }
      }
    }
    y.calculateLayout(width, height, Direction.LTR);
    this.lastLayoutW = width;
    this.lastLayoutH = height;
    this._sceneDirty = true;
    this._fullDamage = true;
    this.updateGeometry(0, 0);
    return true;
  }

  private updateGeometry(parentX: number, parentY: number): void {
    const y = this.yoga;
    const r = this.rel;
    const hasNew = y !== null && y.hasNewLayout();
    const L = this.layout;
    if (!hasNew && !this.geometryDirty && this.relValid && parentX + r.left === L.x && parentY + r.top === L.y) {
      return;
    }
    this.geometryDirty = false;
    this.relValid = true;
    if (hasNew && y !== null) {
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
export function createNode(type: SceneNodeType, props: SceneNodeProps = EMPTY_PROPS, text = ""): SceneNode {
  return new SceneNode(type, props, text);
}

export function createRawText(text: string): SceneNode {
  return new SceneNode("raw-text", EMPTY_PROPS, text);
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
  sClipX: number;
  sClipY: number;
  sClipX1: number;
  sClipY1: number;
  z: number;
  order: number;
}

const WIREFRAME_COLOR = 0x38bdf8ff;
const HIGHLIGHT_TINT = 0x3b82f659;
const HIGHLIGHT_LABEL_BG = 0x1e3a8aff;
const EMPTY_OPTIONS: PaintOptions = Object.freeze({});

class Painter {
  stats: PaintStats = { painted: 0, culled: 0 };
  sawBackdrop = false;
  private buffer!: CellBuffer;
  private options: PaintOptions = EMPTY_OPTIONS;
  private bandMode = false;
  private deferred: Deferred[] = [];
  private paintedNodes: SceneNode[] = [];
  private readonly box: DrawBoxOptions = { x: 0, y: 0, width: 0, height: 0 };

  runFull(root: SceneNode, buffer: CellBuffer, options: PaintOptions): PaintStats {
    this.buffer = buffer;
    this.options = options;
    this.bandMode = false;
    this.stats.painted = 0;
    this.stats.culled = 0;
    this.sawBackdrop = false;
    this.deferred.length = 0;
    this.paintedNodes.length = 0;

    buffer.resetScissor();
    if (options.clear ?? true) buffer.clear(options.clearBg ?? 0);
    this.paintNode(root, 0, 0, 0, 0);
    this.flushDeferred();
    buffer.resetScissor();
    if (options.wireframe) this.paintWireframe();
    const hl = options.highlightedNode;
    if (hl && hl.painted) this.paintHighlight(hl);
    this.paintedNodes.length = 0;
    return this.stats;
  }

  runBands(root: SceneNode, buffer: CellBuffer, options: PaintOptions, lo: number, hi: number): PaintStats {
    this.buffer = buffer;
    this.options = options;
    this.bandMode = true;
    this.stats.painted = 0;
    this.stats.culled = 0;
    this.sawBackdrop = false;
    this.deferred.length = 0;
    this.paintedNodes.length = 0;

    const clearBg = options.clearBg ?? 0;
    const W = buffer.width;
    const H = Math.min(buffer.height, 64);
    let y = 0;
    while (y < H) {
      const bit = y < 32 ? lo & (1 << y) : hi & (1 << (y - 32));
      if (bit === 0) {
        y++;
        continue;
      }
      let yEnd = y + 1;
      while (yEnd < H) {
        const nextBit = yEnd < 32 ? lo & (1 << yEnd) : hi & (1 << (yEnd - 32));
        if (nextBit === 0) break;
        yEnd++;
      }
      buffer.resetScissor();
      buffer._pushBandScissor(y, yEnd - y);
      buffer.fillRect(0, y, W, yEnd - y, clearBg, CHAR_SPACE, 0, 0);
      this.paintNode(root, 0, 0, 0, 0);
      this.flushDeferred();
      y = yEnd;
    }
    buffer.resetScissor();
    return this.stats;
  }

  private flushDeferred(): void {
    const buf = this.buffer;
    while (this.deferred.length > 0) {
      this.deferred.sort((a, b) => a.z - b.z || a.order - b.order);
      const d = this.deferred.shift() as Deferred;
      buf.resetScissor();
      buf._clipX0 = d.clipX;
      buf._clipY0 = d.clipY;
      buf._clipX1 = d.clipX + d.clipW;
      buf._clipY1 = d.clipY + d.clipH;
      buf._sClipX0 = d.sClipX;
      buf._sClipY0 = d.sClipY;
      buf._sClipX1 = d.sClipX1;
      buf._sClipY1 = d.sClipY1;
      this.paintNode(d.node, d.ox, d.oy, d.fg, d.attrs);
    }
  }

  private paintNode(node: SceneNode, ox: number, oy: number, inhFg: PackedColor, inhAttrs: number): void {
    const p = node.props;
    if (p.display === "none") {
      node.painted = false;
      return;
    }
    const buf = this.buffer;
    const L = node.layout;
    const x = L.x + ox;
    const y = L.y + oy;
    const sb = node.subtreeBounds;
    if (!buf.intersectsScissor(x + sb.x0, y + sb.y0, sb.x1 - sb.x0, sb.y1 - sb.y0)) {
      if (!this.bandMode) node.painted = false;
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

    if (s.backdrop !== 0) {
      this.sawBackdrop = true;
      buf.dimRect(0, 0, buf.width, buf.height, s.backdrop);
    }
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
      bx.drawTitleText = drawLogicalText;
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
        this.deferred.push({
          node: c,
          ox: cox,
          oy: coy,
          fg,
          attrs,
          clipX: sc.x,
          clipY: sc.y,
          clipW: sc.width,
          clipH: sc.height,
          sClipX: buf._sClipX0,
          sClipY: buf._sClipY0,
          sClipX1: buf._sClipX1,
          sClipY1: buf._sClipY1,
          z: cz,
          order: this.deferred.length,
        });
        continue;
      }
      this.paintNode(c, cox, coy, fg, attrs);
    }
    if (clip) buf.popScissor();
  }

  private paintText(node: SceneNode, sr: ComputedRect, inhFg: PackedColor, inhAttrs: number): void {
    const buf = this.buffer;
    const model = node.getTextModel();
    // Empty isolated spans leave only zero-width isolate controls and no run to style.
    if (model.graphemes.length === 0 || model.runs.length === 0) return;
    const lines = node.getLines(sr.contentWidth);
    const align = node.props.textAlign ?? "start";
    const cw = sr.contentWidth;
    const scissor = buf.getScissor();
    const firstRow = Math.max(0, scissor.y - sr.contentY);
    const lastRow = Math.min(lines.length, scissor.y + scissor.height - sr.contentY, sr.contentHeight);
    const gs = model.graphemes;
    const runOf = model.runOf;
    const runs = model.runs;
    if (model.needsBidi) {
      this.paintVisualLines(node, lines, firstRow, lastRow, sr, align, inhFg, inhAttrs);
      return;
    }
    for (let li = firstRow; li < lastRow; li++) {
      const line = lines[li] as TextLine;
      const row = sr.contentY + li;
      let col = sr.contentX;
      if (align === "center") col += Math.max(0, Math.floor((cw - line.width) / 2));
      else if (align === "right" || align === "end") col += Math.max(0, cw - line.width);
      col = this.drawRuns(gs, runOf, runs, line.start, line.cutStart, col, row, inhFg, inhAttrs);
      if (line.ellipsis) {
        const run = runs[runOf[ellipsisRef(gs, line)] ?? 0] as TextRun;
        buf.setCell(col, row, ELLIPSIS, run.fg ?? inhFg, run.bg ?? 0, (inhAttrs & ~run.attrsOff) | run.attrsOn);
        col++;
      }
      if (line.cutEnd < line.end) this.drawRuns(gs, runOf, runs, line.cutEnd, line.end, col, row, inhFg, inhAttrs);
    }
  }

  /** Bidi path: each line reordered into visual order; `start`/`end` alignment follows the paragraph direction. */
  private paintVisualLines(
    node: SceneNode,
    lines: TextLine[],
    firstRow: number,
    lastRow: number,
    sr: ComputedRect,
    align: TextAlign,
    inhFg: PackedColor,
    inhAttrs: number,
  ): void {
    const model = node.getTextModel();
    const runOf = model.runOf;
    const runs = model.runs;
    const cw = sr.contentWidth;
    for (let li = firstRow; li < lastRow; li++) {
      const line = lines[li] as TextLine;
      const vl = node.getVisualLine(lines, li);
      const rtl = (vl.paragraphLevel & 1) === 1;
      const a = align === "start" ? (rtl ? "right" : "left") : align === "end" ? (rtl ? "left" : "right") : align;
      const row = sr.contentY + li;
      let col = sr.contentX;
      if (a === "center") col += Math.max(0, Math.floor((cw - line.width) / 2));
      else if (a === "right") col += Math.max(0, cw - line.width);
      const vgs = vl.graphemes;
      const src = vl.source;
      const ellipsisRun = line.ellipsis ? (runOf[ellipsisRef(model.graphemes, line)] ?? 0) : 0;
      let k = 0;
      while (k < vgs.length) {
        // Isolate controls are zero-width and outside every run: never let them split or style a batch.
        if ((vgs[k] as Grapheme).width === 0) {
          k++;
          continue;
        }
        const s0 = src[k] as number;
        const ri = s0 >= 0 ? (runOf[s0] as number) : ellipsisRun;
        let e = k + 1;
        while (e < vgs.length) {
          if ((vgs[e] as Grapheme).width === 0) {
            e++;
            continue;
          }
          const se = src[e] as number;
          if ((se >= 0 ? (runOf[se] as number) : ellipsisRun) !== ri) break;
          e++;
        }
        const run = runs[ri] as TextRun;
        col += this.buffer.drawGraphemes(col, row, vgs, k, e, run.fg ?? inhFg, run.bg ?? 0, (inhAttrs & ~run.attrsOff) | run.attrsOn);
        k = e;
      }
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

const sharedPainter = new Painter();
let sharedPainterBusy = false;

/** Rasterize a laid-out scene into a buffer. */
export function paintScene(root: SceneNode, buffer: CellBuffer, options: PaintOptions = EMPTY_OPTIONS): PaintStats {
  const clear = options.clear ?? true;
  const clearBg = options.clearBg ?? 0;
  const wireframe = options.wireframe ?? false;
  const hlId = options.highlightedNode?.id ?? 0;
  const focId = options.focusedNode?.id ?? 0;

  const canIncremental =
    clear &&
    !wireframe &&
    !buffer._paintedWireframe &&
    hlId === 0 &&
    buffer._paintedHighlightedId === 0 &&
    focId === buffer._paintedFocusedId &&
    clearBg === buffer._paintedClearBg &&
    buffer._paintedSceneId === root.id &&
    buffer._writeVersion === buffer._paintedWriteVersion &&
    !buffer._paintedHadBackdrop &&
    !root._fullDamage &&
    buffer.height <= 64 &&
    buffer.graphemePool.length <= 1024;

  if (canIncremental && !root._sceneDirty) {
    return { painted: 0, culled: 0 };
  }

  let painter: Painter;
  const useShared = !sharedPainterBusy;
  if (useShared) {
    sharedPainterBusy = true;
    painter = sharedPainter;
  } else {
    painter = new Painter();
  }

  try {
    let stats: PaintStats;
    let hadBackdrop: boolean;
    if (canIncremental) {
      stats = painter.runBands(root, buffer, options, root._damageLo, root._damageHi);
      hadBackdrop = painter.sawBackdrop;
    } else {
      stats = painter.runFull(root, buffer, options);
      hadBackdrop = painter.sawBackdrop;
    }
    if (clear) {
      root._sceneDirty = false;
      root._fullDamage = false;
      root._damageLo = 0;
      root._damageHi = 0;
      buffer._paintedSceneId = root.id;
      buffer._paintedWriteVersion = buffer._writeVersion;
      buffer._paintedClearBg = clearBg;
      buffer._paintedWireframe = wireframe;
      buffer._paintedHighlightedId = hlId;
      buffer._paintedFocusedId = focId;
      buffer._paintedHadBackdrop = hadBackdrop;
    } else {
      buffer._paintedSceneId = 0;
    }
    return stats;
  } finally {
    if (useShared) sharedPainterBusy = false;
  }
}
