/**
 * Yoga WASM loader and incremental layout-prop application.
 */

import { loadPlatformYoga } from "#yoga-loader";
import type { Config as YogaConfig, MeasureFunction, Node as YogaNode, Yoga } from "yoga-layout/load";
import { txError } from "./errors";
import { Align, Direction, Display, Edge, FlexDirection, Gutter, Justify, MeasureMode, Overflow, PositionType, Wrap } from "./yoga-enums";
import type { YogaWasmSource } from "./yoga-wasm";

export type { Yoga, YogaConfig, YogaNode, MeasureFunction, YogaWasmSource };
export { MeasureMode, Direction, Edge };

let yoga: Yoga | null = null;
let yogaConfig: YogaConfig | null = null;
let yogaPromise: Promise<Yoga> | null = null;

export interface InitYogaOptions {
  /**
   * Where Yoga's WebAssembly comes from. By default Yoga loads from the
   * base64 copy inside `yoga-layout`; Cloudflare Workers import
   * `@textjs/core/yoga.wasm` as a module, and builds that set the
   * `@textjs/client` resolve condition (`text dev`, `text build`) fetch it
   * as an asset. Only the first call loads Yoga; later options are ignored.
   */
  wasm?: YogaWasmSource;
}

/** Load the Yoga WASM module once (works in browsers, Node, Bun and Workers). */
export function initYoga(options?: InitYogaOptions): Promise<Yoga> {
  if (yoga !== null) return Promise.resolve(yoga);
  if (yogaPromise === null) {
    let loading: Promise<Yoga>;
    try {
      loading = loadPlatformYoga(options?.wasm);
    } catch (error) {
      loading = Promise.reject(error);
    }
    const p = loading.then((instance) => {
      const config = instance.Config.create();
      config.setPointScaleFactor(1);
      config.setUseWebDefaults(false);
      yogaConfig = config;
      yoga = instance;
      return instance;
    });
    yogaPromise = p;
    p.catch(() => {
      if (yogaPromise === p) yogaPromise = null;
    });
  }
  return yogaPromise;
}

export function isYogaReady(): boolean {
  return yoga !== null;
}

/** Synchronous access to the loaded Yoga instance. Throws until `initYoga()` resolves. */
export function getYoga(): Yoga {
  if (yoga === null) throw txError("TX001");
  return yoga;
}

export function getYogaConfig(): YogaConfig {
  getYoga();
  return yogaConfig as YogaConfig;
}

export function createYogaNode(): YogaNode {
  return getYoga().Node.create(getYogaConfig());
}

// -----------------------------------------------------------------------------
// Layout props
// -----------------------------------------------------------------------------

export type Percent = `${number}%`;
export type Dimension = number | "auto" | Percent;
export type Length = number | Percent;
export type MarginValue = number | "auto" | Percent;

export type FlexDirectionValue = "row" | "column" | "row-reverse" | "column-reverse";
export type JustifyValue = "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
export type AlignValue = "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
export type FlexWrapValue = "nowrap" | "wrap" | "wrap-reverse";
export type PositionValue = "relative" | "absolute";
export type OverflowValue = "visible" | "hidden" | "scroll";
export type DisplayValue = "flex" | "none";

export interface LayoutProps {
  width?: Dimension;
  height?: Dimension;
  minWidth?: Length;
  minHeight?: Length;
  maxWidth?: Length;
  maxHeight?: Length;
  flexDirection?: FlexDirectionValue;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: Dimension;
  flexWrap?: FlexWrapValue;
  justifyContent?: JustifyValue;
  alignItems?: AlignValue;
  alignSelf?: AlignValue;
  alignContent?: AlignValue | "space-between" | "space-around";
  padding?: Length;
  paddingX?: Length;
  paddingY?: Length;
  paddingTop?: Length;
  paddingRight?: Length;
  paddingBottom?: Length;
  paddingLeft?: Length;
  margin?: MarginValue;
  marginX?: MarginValue;
  marginY?: MarginValue;
  marginTop?: MarginValue;
  marginRight?: MarginValue;
  marginBottom?: MarginValue;
  marginLeft?: MarginValue;
  gap?: Length;
  rowGap?: Length;
  columnGap?: Length;
  position?: PositionValue;
  top?: Length;
  right?: Length;
  bottom?: Length;
  left?: Length;
  overflow?: OverflowValue;
  display?: DisplayValue;
}

export type BorderStyleValue = "single" | "rounded" | "double" | "heavy" | "dashed" | "ascii" | "none";

export interface BorderProps {
  /** `true` draws a single border; a style name selects that style. */
  border?: boolean | BorderStyleValue;
  borderStyle?: BorderStyleValue;
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
}

export type LayoutPropKey = keyof LayoutProps;

const FLEX_DIRECTION: Record<FlexDirectionValue, FlexDirection> = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
  "row-reverse": FlexDirection.RowReverse,
  "column-reverse": FlexDirection.ColumnReverse,
};

const JUSTIFY: Record<JustifyValue, Justify> = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
};

const ALIGN: Record<AlignValue | "space-between" | "space-around", Align> = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
  "space-between": Align.SpaceBetween,
  "space-around": Align.SpaceAround,
};

const WRAP: Record<FlexWrapValue, Wrap> = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
};

const OVERFLOW: Record<OverflowValue, Overflow> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
};

/** Defaults follow CSS / Ink: `flexDirection: row`, `flexShrink: 1`. */
export const DEFAULT_FLEX_DIRECTION: FlexDirectionValue = "row";
export const DEFAULT_FLEX_SHRINK = 1;

type Applier = (node: YogaNode, value: unknown) => void;

function num<T>(v: unknown): T | undefined {
  return v === undefined || v === null ? undefined : (v as T);
}

function edge(e: Edge, kind: "padding" | "margin" | "position"): Applier {
  if (kind === "padding") return (n, v) => n.setPadding(e, num<Length>(v));
  if (kind === "margin") return (n, v) => n.setMargin(e, num<MarginValue>(v));
  return (n, v) => n.setPosition(e, num<Length>(v));
}

const APPLIERS: Record<LayoutPropKey, Applier> = {
  width: (n, v) => n.setWidth(num<Dimension>(v)),
  height: (n, v) => n.setHeight(num<Dimension>(v)),
  minWidth: (n, v) => n.setMinWidth(num<Length>(v)),
  minHeight: (n, v) => n.setMinHeight(num<Length>(v)),
  maxWidth: (n, v) => n.setMaxWidth(num<Length>(v)),
  maxHeight: (n, v) => n.setMaxHeight(num<Length>(v)),
  flexDirection: (n, v) => n.setFlexDirection(FLEX_DIRECTION[(v as FlexDirectionValue) ?? DEFAULT_FLEX_DIRECTION] ?? FlexDirection.Row),
  flexGrow: (n, v) => n.setFlexGrow(num<number>(v) ?? 0),
  flexShrink: (n, v) => n.setFlexShrink(num<number>(v) ?? DEFAULT_FLEX_SHRINK),
  flexBasis: (n, v) => n.setFlexBasis(num<Dimension>(v) ?? "auto"),
  flexWrap: (n, v) => n.setFlexWrap(WRAP[(v as FlexWrapValue) ?? "nowrap"] ?? Wrap.NoWrap),
  justifyContent: (n, v) => n.setJustifyContent(JUSTIFY[(v as JustifyValue) ?? "flex-start"] ?? Justify.FlexStart),
  alignItems: (n, v) => n.setAlignItems(ALIGN[(v as AlignValue) ?? "stretch"] ?? Align.Stretch),
  alignSelf: (n, v) => n.setAlignSelf(ALIGN[(v as AlignValue) ?? "auto"] ?? Align.Auto),
  alignContent: (n, v) => n.setAlignContent(ALIGN[(v as AlignValue) ?? "flex-start"] ?? Align.FlexStart),
  padding: edge(Edge.All, "padding"),
  paddingX: edge(Edge.Horizontal, "padding"),
  paddingY: edge(Edge.Vertical, "padding"),
  paddingTop: edge(Edge.Top, "padding"),
  paddingRight: edge(Edge.Right, "padding"),
  paddingBottom: edge(Edge.Bottom, "padding"),
  paddingLeft: edge(Edge.Left, "padding"),
  margin: edge(Edge.All, "margin"),
  marginX: edge(Edge.Horizontal, "margin"),
  marginY: edge(Edge.Vertical, "margin"),
  marginTop: edge(Edge.Top, "margin"),
  marginRight: edge(Edge.Right, "margin"),
  marginBottom: edge(Edge.Bottom, "margin"),
  marginLeft: edge(Edge.Left, "margin"),
  gap: (n, v) => void n.setGap(Gutter.All, num<Length>(v)),
  rowGap: (n, v) => void n.setGap(Gutter.Row, num<Length>(v)),
  columnGap: (n, v) => void n.setGap(Gutter.Column, num<Length>(v)),
  position: (n, v) => n.setPositionType(v === "absolute" ? PositionType.Absolute : PositionType.Relative),
  top: edge(Edge.Top, "position"),
  right: edge(Edge.Right, "position"),
  bottom: edge(Edge.Bottom, "position"),
  left: edge(Edge.Left, "position"),
  overflow: (n, v) => n.setOverflow(OVERFLOW[(v as OverflowValue) ?? "visible"] ?? Overflow.Visible),
  display: (n, v) => n.setDisplay(v === "none" ? Display.None : Display.Flex),
};

export const LAYOUT_PROP_KEYS: readonly LayoutPropKey[] = Object.freeze(Object.keys(APPLIERS) as LayoutPropKey[]);

const APPLIERS_BY_KEY: Record<string, Applier | undefined> = Object.assign(Object.create(null) as Record<string, Applier | undefined>, APPLIERS);

/** Apply a single layout prop by key if `key` is a known layout prop. */
export function applyLayoutProp(node: YogaNode, key: string, value: unknown): boolean {
  const applier = APPLIERS_BY_KEY[key];
  if (applier === undefined) return false;
  applier(node, value);
  return true;
}

/** Initialize a fresh Yoga node with Text.js defaults. */
export function applyLayoutDefaults(node: YogaNode): void {
  node.setFlexDirection(FlexDirection.Row);
  node.setFlexShrink(DEFAULT_FLEX_SHRINK);
}

/**
 * Apply only the layout props that differ between `prev` and `next`.
 * Returns the number of Yoga setters invoked (0 means Yoga was not dirtied).
 */
export function applyLayoutProps(node: YogaNode, prev: LayoutProps | null, next: LayoutProps): number {
  const nRec = next as Record<string, unknown>;
  if (prev === null) {
    let changed = 0;
    for (const key in nRec) {
      const value = nRec[key];
      if (value === undefined) continue;
      const applier = APPLIERS_BY_KEY[key];
      if (applier === undefined) continue;
      applier(node, value);
      changed++;
    }
    return changed;
  }
  if (prev === next) return 0;
  const pRec = prev as Record<string, unknown>;
  let changed = 0;
  for (const key in nRec) {
    const value = nRec[key];
    if (value === undefined || pRec[key] === value) continue;
    const applier = APPLIERS_BY_KEY[key];
    if (applier === undefined) continue;
    applier(node, value);
    changed++;
  }
  for (const key in pRec) {
    if (pRec[key] === undefined || nRec[key] !== undefined) continue;
    const applier = APPLIERS_BY_KEY[key];
    if (applier === undefined) continue;
    applier(node, undefined);
    changed++;
  }
  return changed;
}

export function hasPaddingProps(props: LayoutProps): boolean {
  return (
    props.padding !== undefined ||
    props.paddingX !== undefined ||
    props.paddingY !== undefined ||
    props.paddingTop !== undefined ||
    props.paddingRight !== undefined ||
    props.paddingBottom !== undefined ||
    props.paddingLeft !== undefined
  );
}

/** Border widths `[top, right, bottom, left]` (each 0 or 1) implied by border props. */
export function borderEdges(props: BorderProps): [number, number, number, number] {
  const style = resolveBorderStyle(props);
  if (style === "none") return [0, 0, 0, 0];
  return [
    props.borderTop === false ? 0 : 1,
    props.borderRight === false ? 0 : 1,
    props.borderBottom === false ? 0 : 1,
    props.borderLeft === false ? 0 : 1,
  ];
}

export function resolveBorderStyle(props: BorderProps): BorderStyleValue {
  const b = props.border;
  if (b === false) return "none";
  if (typeof b === "string") return b;
  if (props.borderStyle !== undefined) return props.borderStyle;
  return b === true ? "single" : "none";
}

export function applyBorder(node: YogaNode, edges: readonly [number, number, number, number]): void {
  node.setBorder(Edge.Top, edges[0]);
  node.setBorder(Edge.Right, edges[1]);
  node.setBorder(Edge.Bottom, edges[2]);
  node.setBorder(Edge.Left, edges[3]);
}
