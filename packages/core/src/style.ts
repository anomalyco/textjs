import { DOMElement, setStyle, TextNode } from "./dom"
import { classNameToStyle } from "./tailwind"
import cn from "classnames"
import {
  Align as YogaAlign,
  BoxSizing,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Node,
  Overflow,
  PositionType as YogaPositionType,
  Wrap,
} from "yoga-layout"

export type Align =
  | "auto"
  | "center"
  | "stretch"
  | "baseline"
  | "flex-start"
  | "flex-end"
  | "space-around"
  | "space-between"
  | "space-evenly"

export type PositionType = "relative" | "absolute" | "static"
export type Position = "auto" | Parameters<Node["setPosition"]>[1]

export interface BaseStyle extends Record<string, any> {
  border?: Parameters<Node["setBorder"]>[1]
  borderTop?: Parameters<Node["setBorder"]>[1]
  borderRight?: Parameters<Node["setBorder"]>[1]
  borderBottom?: Parameters<Node["setBorder"]>[1]
  borderLeft?: Parameters<Node["setBorder"]>[1]
}

export type LayoutStyle = BaseStyle & {
  display?: "flex" | "contents" | "none"
  position?: Position | PositionType
  boxSizing?: "border-box" | "content-box"
  top?: Position
  right?: Position
  bottom?: Position
  left?: Position
  overflow?: "visible" | "hidden" | "scroll"
  width?: Parameters<Node["setWidth"]>[0]
  maxWidth?: Parameters<Node["setMaxWidth"]>[0]
  height?: Parameters<Node["setHeight"]>[0]
  maxHeight?: Parameters<Node["setMaxHeight"]>[0]
  padding?: Parameters<Node["setPadding"]>[1]
  paddingTop?: Parameters<Node["setPadding"]>[1]
  paddingRight?: Parameters<Node["setPadding"]>[1]
  paddingBottom?: Parameters<Node["setPadding"]>[1]
  paddingLeft?: Parameters<Node["setPadding"]>[1]
  margin?: Parameters<Node["setPadding"]>[1]
  marginTop?: Parameters<Node["setMargin"]>[1]
  marginRight?: Parameters<Node["setMargin"]>[1]
  marginBottom?: Parameters<Node["setMargin"]>[1]
  marginLeft?: Parameters<Node["setMargin"]>[1]
  // flex?: Parameters<Node["setFlex"]>[0]
  flexBasis?: Parameters<Node["setFlexBasis"]>[0]
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse"
  flexGrow?: Parameters<Node["setFlexGrow"]>[0]
  flexShrink?: Parameters<Node["setFlexGrow"]>[0]
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse"
  justifyContent?:
    | "center"
    | "flex-start"
    | "flex-end"
    | "space-around"
    | "space-between"
    | "space-evenly"
  alignContent?: Align
  alignItems?: Align
  alignSelf?: Align
  gap?: number
  gapX?: number
  gapY?: number
}

export type CssStyle = BaseStyle & {
  // Background properties
  background?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundPosition?: string
  backgroundRepeat?: string
  backgroundSize?: string

  // Border properties
  borderColor?: string
  borderStyle?: "css" | "ansi-single" | "ansi-double" | "ansi-rounded"

  // Box properties
  boxDecorationBreak?: "slice" | "clone"
  boxShadow?: string

  // Basic properties
  color?: string
  cursor?: string

  // Font properties
  font?: string
  fontFamily?: string
  fontSize?: string
  fontStyle?: string
  fontWeight?: string | number

  // Text properties
  letterSpacing?: string | number
  lineHeight?: string | number
  outline?: string
  outlineColor?: string
  outlineStyle?: string
  outlineWidth?: string

  // textAlign?: 'left' | 'right' | 'center' | 'justify'
  textDecoration?: string
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase"
  textOverflow?: string

  // Spacing properties
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line"
  wordSpacing?: string
  wordBreak?: "normal" | "break-all" | "keep-all" | "break-word"

  // Writing mode
  writingMode?: "horizontal-tb" | "vertical-rl" | "vertical-lr"
}

export const styleKeys: Record<keyof CssStyle, true> = {
  background: true,
  backgroundColor: true,
  backgroundImage: true,
  backgroundPosition: true,
  backgroundRepeat: true,
  backgroundSize: true,
  border: true,
  borderTop: true,
  borderRight: true,
  borderBottom: true,
  borderLeft: true,
  borderColor: true,
  borderStyle: true,
  boxDecorationBreak: true,
  boxShadow: true,
  color: true,
  cursor: true,
  font: true,
  fontFamily: true,
  fontSize: true,
  fontStyle: true,
  fontWeight: true,
  letterSpacing: true,
  lineHeight: true,
  outline: true,
  outlineColor: true,
  outlineStyle: true,
  outlineWidth: true,
  // textAlign: true,
  textDecoration: true,
  textTransform: true,
  textOverflow: true,
  whiteSpace: true,
  wordSpacing: true,
  wordBreak: true,
  writingMode: true,
}

export type CssStyleKey = keyof CssStyle
export const inheritableStyleKeys: CssStyleKey[] = [
  "background",
  "backgroundColor",
  "borderColor",
  // "borderTop",
  // "borderRight",
  // "borderBottom",
  // "borderLeft",
  // "border",
  "color",
  "cursor",
  "font",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  // "textAlign",
  // "textIndent",
  // "textJustify",
  // "textShadow",
  "textDecoration",
  "textTransform",
  // "visibility",
  "wordSpacing",
]

export type Style = CssStyle &
  LayoutStyle & {
    textWrap?:
      | "wrap"
      | "nowrap"
      | "truncate-start"
      | "truncate-middle"
      | "truncate-end"
  }

export function getInheritedStyles(style: Style) {
  return Object.entries(style).reduce((acc, [key, value]) => {
    if (inheritableStyleKeys.includes(key as CssStyleKey)) {
      acc[key] = value
    }
    return acc
  }, {} as Style)
}

export const reconcileStyle = (node: DOMElement | TextNode): void => {
  const style =
    "attributes" in node ? (node.attributes?.style?.valueOf() as Style) : {}
  const className = "attributes" in node ? node.attributes?.className : ""
  const twStyle = className ? classNameToStyle(cn(className)) : {}
  setStyle(node, { ...twStyle, ...style })
  if (node.yogaNode) applyStyles(node.yogaNode, node.style)
}

export const styleToString = (style: CssStyle): string => {
  return Object.entries(style)
    .filter(([key]) => styleKeys[key as keyof CssStyle])
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
      return `${cssKey}: ${value}`
    })
    .join("; ")
}

export function applyStyles(node: Node, style: Style): Node {
  node.setBoxSizing(BoxSizing.ContentBox) // TODO: eh?

  if (style.borderStyle && style.borderStyle !== "css") {
    if (style.border) node.setBorder(Edge.All, style.border)
    else if (style.borderTop) node.setBorder(Edge.Top, style.borderTop)
    else if (style.borderRight) node.setBorder(Edge.Right, style.borderRight)
    else if (style.borderBottom) node.setBorder(Edge.Bottom, style.borderBottom)
    else if (style.borderLeft) node.setBorder(Edge.Left, style.borderLeft)
  }

  if (style.display === "flex") {
    node.setDisplay(Display.Flex)
    node.setFlexDirection(FlexDirection.Row) // default to row
  } else {
    // node.setDisplay(Display.Flex)
    node.setFlexDirection(FlexDirection.Column)
  }
  if (style.display === "contents") node.setDisplay(Display.Contents)
  if (style.display === "none") node.setDisplay(Display.None)

  // if (style.flex) node.setFlex(style.flex)
  if (style.flexBasis) node.setFlexBasis(style.flexBasis)
  if (style.flexDirection === "row") node.setFlexDirection(FlexDirection.Row)
  if (style.flexDirection === "column")
    node.setFlexDirection(FlexDirection.Column)
  if (style.flexDirection === "row-reverse")
    node.setFlexDirection(FlexDirection.RowReverse)
  if (style.flexDirection === "column-reverse")
    node.setFlexDirection(FlexDirection.ColumnReverse)
  if (style.flexGrow) node.setFlexGrow(style.flexGrow)
  if (style.flexShrink) node.setFlexShrink(style.flexShrink)
  if (style.flexWrap === "wrap") node.setFlexWrap(Wrap.Wrap)
  if (style.flexWrap === "nowrap") node.setFlexWrap(Wrap.NoWrap)
  if (style.flexWrap === "wrap-reverse") node.setFlexWrap(Wrap.WrapReverse)

  if (style.width !== undefined) node.setWidth(style.width)
  if (style.height !== undefined) node.setHeight(style.height)
  if (style.maxWidth !== undefined) node.setMaxWidth(style.maxWidth)
  if (style.maxHeight !== undefined) node.setMaxHeight(style.maxHeight)

  if (style.padding !== undefined) {
    node.setPadding(Edge.Top, style.padding)
    node.setPadding(Edge.Right, doubleSize(style.padding))
    node.setPadding(Edge.Bottom, style.padding)
    node.setPadding(Edge.Left, doubleSize(style.padding))
  }
  if (style.paddingTop !== undefined)
    node.setPadding(Edge.Top, style.paddingTop)
  if (style.paddingRight !== undefined)
    node.setPadding(Edge.Right, doubleSize(style.paddingRight))
  if (style.paddingBottom !== undefined)
    node.setPadding(Edge.Bottom, style.paddingBottom)
  if (style.paddingLeft !== undefined)
    node.setPadding(Edge.Left, doubleSize(style.paddingLeft))

  if (style.margin !== undefined) {
    node.setMargin(Edge.Top, style.margin)
    node.setMargin(Edge.Right, doubleSize(style.margin))
    node.setMargin(Edge.Bottom, style.margin)
    node.setMargin(Edge.Left, doubleSize(style.margin))
  }
  if (style.marginTop !== undefined) node.setMargin(Edge.Top, style.marginTop)
  if (style.marginRight !== undefined) {
    if (style.marginRight === "auto") node.setMarginAuto(Edge.Right)
    else node.setMargin(Edge.Right, doubleSize(style.marginRight))
  }
  if (style.marginBottom !== undefined)
    node.setMargin(Edge.Bottom, style.marginBottom)
  if (style.marginLeft !== undefined) {
    if (style.marginLeft === "auto") node.setMarginAuto(Edge.Left)
    else node.setMargin(Edge.Left, doubleSize(style.marginLeft))
  }

  if (style.justifyContent === "center") node.setJustifyContent(Justify.Center)
  if (style.justifyContent === "flex-start")
    node.setJustifyContent(Justify.FlexStart)
  if (style.justifyContent === "flex-end")
    node.setJustifyContent(Justify.FlexEnd)
  if (style.justifyContent === "space-between")
    node.setJustifyContent(Justify.SpaceBetween)
  if (style.justifyContent === "space-around")
    node.setJustifyContent(Justify.SpaceAround)
  if (style.justifyContent === "space-evenly")
    node.setJustifyContent(Justify.SpaceEvenly)

  if (style.alignContent === "auto") node.setAlignContent(YogaAlign.Auto)
  if (style.alignContent === "center") node.setAlignContent(YogaAlign.Center)
  if (style.alignContent === "stretch") node.setAlignContent(YogaAlign.Stretch)
  if (style.alignContent === "baseline")
    node.setAlignContent(YogaAlign.Baseline)
  if (style.alignContent === "flex-start")
    node.setAlignContent(YogaAlign.FlexStart)
  if (style.alignContent === "flex-end") node.setAlignContent(YogaAlign.FlexEnd)
  if (style.alignContent === "space-around")
    node.setAlignContent(YogaAlign.SpaceAround)
  if (style.alignContent === "space-between")
    node.setAlignContent(YogaAlign.SpaceBetween)

  if (style.alignItems === "auto") node.setAlignItems(YogaAlign.Auto)
  if (style.alignItems === "center") node.setAlignItems(YogaAlign.Center)
  if (style.alignItems === "stretch") node.setAlignItems(YogaAlign.Stretch)
  if (style.alignItems === "baseline") node.setAlignItems(YogaAlign.Baseline)
  if (style.alignItems === "flex-start") node.setAlignItems(YogaAlign.FlexStart)
  if (style.alignItems === "flex-end") node.setAlignItems(YogaAlign.FlexEnd)
  if (style.alignItems === "space-around")
    node.setAlignItems(YogaAlign.SpaceAround)
  if (style.alignItems === "space-between")
    node.setAlignItems(YogaAlign.SpaceBetween)
  if (style.alignItems === "space-evenly")
    node.setAlignItems(YogaAlign.SpaceEvenly)

  if (style.alignSelf === "auto") node.setAlignSelf(YogaAlign.Auto)
  if (style.alignSelf === "center") node.setAlignSelf(YogaAlign.Center)
  if (style.alignSelf === "stretch") node.setAlignSelf(YogaAlign.Stretch)
  if (style.alignSelf === "baseline") node.setAlignSelf(YogaAlign.Baseline)
  if (style.alignSelf === "flex-start") node.setAlignSelf(YogaAlign.FlexStart)
  if (style.alignSelf === "flex-end") node.setAlignSelf(YogaAlign.FlexEnd)
  if (style.alignSelf === "space-around")
    node.setAlignSelf(YogaAlign.SpaceAround)
  if (style.alignSelf === "space-between")
    node.setAlignSelf(YogaAlign.SpaceBetween)
  if (style.alignSelf === "space-evenly")
    node.setAlignSelf(YogaAlign.SpaceEvenly)

  if (style.position === "auto") node.setPositionAuto(Edge.All)
  else if (style.position === "relative")
    node.setPositionType(YogaPositionType.Relative)
  else if (style.position === "absolute")
    node.setPositionType(YogaPositionType.Absolute)
  else if (style.position === "static")
    node.setPositionType(YogaPositionType.Static)
  else if (style.position) node.setPosition(Edge.All, style.position)

  if (style.top === "auto") node.setPositionAuto(Edge.Top)
  else if (style.top) node.setPosition(Edge.Top, style.top)
  if (style.right === "auto") node.setPositionAuto(Edge.Right)
  else if (style.right) node.setPosition(Edge.Right, doubleSize(style.right))
  if (style.bottom === "auto") node.setPositionAuto(Edge.Bottom)
  else if (style.bottom) node.setPosition(Edge.Bottom, style.bottom)
  if (style.left === "auto") node.setPositionAuto(Edge.Left)
  else if (style.left) node.setPosition(Edge.Left, doubleSize(style.left))

  if (style.overflow === "visible") node.setOverflow(Overflow.Visible)
  if (style.overflow === "hidden") node.setOverflow(Overflow.Hidden)
  if (style.overflow === "scroll") node.setOverflow(Overflow.Scroll)

  if (style.boxSizing === "content-box") node.setBoxSizing(BoxSizing.ContentBox)
  if (style.boxSizing === "border-box") node.setBoxSizing(BoxSizing.BorderBox)

  if (style.gap) {
    node.setGap(Gutter.Column, doubleSize(style.gap))
    node.setGap(Gutter.Row, style.gap)
  }
  if (style.gapX) node.setGap(Gutter.Column, doubleSize(style.gapX))
  if (style.gapY) node.setGap(Gutter.Row, style.gapY)

  return node
}

const doubleSize = (value: number | `${number}%`) =>
  parseSize(value, (v) => (v === 1 ? v : v * 2))

function parseSize(
  value: number | `${number}%`,
  modifier?: (v: number) => number,
): number | `${number}%` {
  const parsed =
    typeof value === "string" ? Number.parseInt(value.slice(0, -1)) : value
  const unit = typeof value === "string" ? value.slice(-1) : ""
  const modified = modifier ? modifier(parsed) : parsed
  return typeof value === "string"
    ? (`${modified}${unit}` as `${number}%`)
    : modified
}
