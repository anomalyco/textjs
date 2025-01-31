import Yoga, { type Node as YogaNode } from "yoga-layout"
import { measureText, wrapText } from "./text"
import { type Style } from "./style"
import cn from "classnames"

type TextjsNode = {
  parentNode: DOMElement | undefined
  yogaNode?: YogaNode
  style: Style
}

export type TextName = "#text"
export type ElementNames = "div" | "span"
export type NodeNames = ElementNames | TextName

export type DOMElement = {
  nodeName: ElementNames
  attributes: { className?: string | cn.Argument } & Record<
    string,
    DOMNodeAttribute
  >
  childNodes: DOMNode[]
  onComputeLayout?: () => void
  onRender?: () => void
  onImmediateRender?: () => void
  _version?: number
} & TextjsNode

export type TextNode = {
  nodeName: TextName
  nodeValue: string
  _version?: number
} & TextjsNode

export type DOMNode<T = { nodeName: NodeNames }> = T extends {
  nodeName: infer U
}
  ? U extends "#text"
    ? TextNode
    : DOMElement
  : never

export type DOMNodeAttribute = boolean | string | number | Style

export const createNode = (nodeName: ElementNames): DOMElement => {
  const config = Yoga.Config.create()
  config.setPointScaleFactor(1)
  config.setUseWebDefaults(true)

  const node: DOMElement = {
    nodeName,
    style: {},
    attributes: {},
    childNodes: [],
    parentNode: undefined,
    yogaNode: Yoga.Node.create(config),
    _version: 0,
  }

  if (nodeName === "span") {
    node.yogaNode?.setMeasureFunc(measureTextNode.bind(null, node))
  }

  return node
}

export const appendChildNode = (
  node: DOMElement,
  childNode: DOMElement,
): void => {
  if (childNode.parentNode) {
    removeChildNode(childNode.parentNode, childNode)
  }

  childNode.parentNode = node
  node.childNodes.push(childNode)

  if (childNode.yogaNode) {
    node.yogaNode?.insertChild(
      childNode.yogaNode,
      node.yogaNode.getChildCount(),
    )
  }

  if (node.nodeName === "span") {
    markNodeAsDirty(node)
  }

  bumpVersion(node)
}

export const insertBeforeNode = (
  node: DOMElement,
  newChildNode: DOMNode,
  beforeChildNode: DOMNode,
): void => {
  if (newChildNode.parentNode) {
    removeChildNode(newChildNode.parentNode, newChildNode)
  }

  newChildNode.parentNode = node

  const index = node.childNodes.indexOf(beforeChildNode)
  if (index >= 0) {
    node.childNodes.splice(index, 0, newChildNode)
    if (newChildNode.yogaNode) {
      node.yogaNode?.insertChild(newChildNode.yogaNode, index)
    }

    return
  }

  node.childNodes.push(newChildNode)

  if (newChildNode.yogaNode) {
    node.yogaNode?.insertChild(
      newChildNode.yogaNode,
      node.yogaNode.getChildCount(),
    )
  }

  if (node.nodeName === "span") {
    markNodeAsDirty(node)
  }

  bumpVersion(node)
}

export const removeChildNode = (
  node: DOMElement,
  removeNode: DOMNode,
): void => {
  if (removeNode.yogaNode) {
    removeNode.parentNode?.yogaNode?.removeChild(removeNode.yogaNode)
  }

  removeNode.parentNode = undefined

  const index = node.childNodes.indexOf(removeNode)
  if (index >= 0) {
    node.childNodes.splice(index, 1)
  }

  if (node.nodeName === "span") {
    markNodeAsDirty(node)
  }

  bumpVersion(node)
}

export const setAttribute = (
  node: DOMElement,
  key: string,
  value: DOMNodeAttribute,
): void => {
  node.attributes[key] = value
  bumpVersion(node)
}

export const setStyle = (node: DOMNode, style: Style): void => {
  node.style = { ...style } // Create new style object reference
  bumpVersion(node)
}

export const createTextNode = (text: string): TextNode => {
  const node: TextNode = {
    nodeName: "#text",
    nodeValue: text,
    yogaNode: undefined,
    parentNode: undefined,
    style: {},
    _version: 0,
  }

  setTextNodeValue(node, text)
  return node
}

const measureTextNode = function (
  node: DOMNode,
  width: number,
): { width: number; height: number } {
  const text =
    node.nodeName === "#text" ? node.nodeValue : squashTextNodes(node)
  const dimensions = measureText(text)

  if (dimensions.width <= width) {
    return dimensions
  }

  if (dimensions.width >= 1 && width > 0 && width < 1) {
    return dimensions
  }

  const textWrap = node.style?.textWrap ?? "wrap"
  const wrappedText = wrapText(text, { width, textWrap })
  return measureText(wrappedText)
}

export const squashTextNodes = (node: DOMElement): string => {
  let text = ""

  for (const childNode of node.childNodes) {
    if (childNode === undefined) continue

    let nodeText = ""
    if (childNode.nodeName === "#text") {
      nodeText = childNode.nodeValue
    } else if (childNode.nodeName === "span") {
      nodeText = squashTextNodes(childNode)
    }

    text += nodeText
  }

  return text
}

const findClosestYogaNode = (node?: DOMNode): YogaNode | undefined => {
  if (!node?.parentNode) return undefined
  return node.yogaNode ?? findClosestYogaNode(node.parentNode)
}

const markNodeAsDirty = (node?: DOMNode): void => {
  const yogaNode = findClosestYogaNode(node)
  yogaNode?.markDirty()
}

export const setTextNodeValue = (node: TextNode, text: string): void => {
  if (typeof text !== "string") {
    text = String(text)
  }

  node.nodeValue = text
  markNodeAsDirty(node)
  bumpVersion(node)
}

const bumpVersion = (node: DOMNode) => {
  node._version = (node._version || 0) + 1
  if (node.parentNode) {
    bumpVersion(node.parentNode)
  }
}
