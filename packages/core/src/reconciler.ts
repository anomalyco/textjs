import ReactReconciler, { HostConfig } from "react-reconciler"
import { DefaultEventPriority } from "react-reconciler/constants"
import { Style, reconcileStyle } from "./style"
import {
  DOMElement,
  DOMNodeAttribute,
  ElementNames,
  TextNode,
  appendChildNode,
  createNode,
  createTextNode,
  insertBeforeNode,
  removeChildNode,
  setAttribute,
  setTextNodeValue,
} from "./dom"
import { Display, Node } from "yoga-layout"

type Props = Record<string, unknown> & {
  style?: Style
  className?: string
  // children?: React.ReactNode;
}

type HostContext = {
  isInsideText: boolean
}

type UpdatePayload = {
  props: Props | undefined
}

type Config = HostConfig<
  ElementNames,
  Props,
  DOMElement,
  DOMElement,
  TextNode,
  DOMElement,
  unknown,
  unknown,
  HostContext,
  UpdatePayload,
  unknown,
  unknown,
  unknown
>

const cleanupYogaNode = (node?: Node): void => {
  node?.unsetMeasureFunc()
  node?.freeRecursive()
}

const hostConfig: Config = {
  getRootHostContext: () => ({
    isInsideText: false,
  }),
  prepareForCommit: () => null,
  preparePortalMount: () => null,
  clearContainer: () => false,
  resetAfterCommit(rootNode) {
    if (typeof rootNode.onComputeLayout === "function") {
      rootNode.onComputeLayout()
    }
    if (typeof rootNode.onRender === "function") {
      rootNode.onRender()
    }
  },
  getChildHostContext(parentHostContext, type) {
    const previousIsInsideText = parentHostContext.isInsideText
    const isInsideText = type === "span"
    if (previousIsInsideText === isInsideText) {
      return parentHostContext
    }
    return { isInsideText }
  },
  shouldSetTextContent: () => false,
  createInstance(type, newProps, _root, hostContext) {
    if (hostContext.isInsideText && type === "div") {
      throw new Error(`<div> can’t be nested inside <span>`)
    }

    const node = createNode(type)
    for (const [key, value] of Object.entries(newProps)) {
      if (key === "children") continue
      setAttribute(node, key, value as DOMNodeAttribute)
    }

    reconcileStyle(node)
    return node
  },
  createTextInstance(text, _root, hostContext) {
    if (!hostContext.isInsideText) {
      throw new Error(`Text string "${text}" must be rendered inside <span>`)
    }

    const node = createTextNode(text)
    reconcileStyle(node)
    return node
  },
  resetTextContent() {},
  hideTextInstance(node) {
    setTextNodeValue(node, "")
  },
  unhideTextInstance(node, text) {
    setTextNodeValue(node, text)
  },
  getPublicInstance: (instance) => instance,
  hideInstance(node) {
    node.yogaNode?.setDisplay(Display.None)
  },
  unhideInstance(node) {
    node.yogaNode?.setDisplay(Display.Flex)
  },
  appendInitialChild: appendChildNode,
  appendChild: appendChildNode,
  insertBefore: insertBeforeNode,
  finalizeInitialChildren: () => false,
  isPrimaryRenderer: false,
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  detachDeletedInstance() {},
  getInstanceFromNode: () => null,
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,
  appendChildToContainer: appendChildNode,
  insertInContainerBefore: insertBeforeNode,
  removeChildFromContainer(node, removeNode) {
    removeChildNode(node, removeNode)
    cleanupYogaNode(removeNode.yogaNode)
  },
  prepareUpdate(_node, _type, _oldProps, newProps, _rootNode) {
    return { props: newProps }
  },
  commitUpdate(node, { props }) {
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        setAttribute(node, key, value as DOMNodeAttribute)
      }
    }
    reconcileStyle(node)
  },
  commitTextUpdate(node, _oldText, newText) {
    setTextNodeValue(node, newText)
    reconcileStyle(node)
  },
  removeChild(node, removeNode) {
    removeChildNode(node, removeNode)
    cleanupYogaNode(removeNode.yogaNode)
  },
  // @ts-expect-error
  resolveUpdatePriority: () => DefaultEventPriority,
  setCurrentUpdatePriority: () => DefaultEventPriority,
  getCurrentUpdatePriority: () => DefaultEventPriority,
  getCurrentEventPriority: () => DefaultEventPriority,
  maySuspendCommit: () => false,
}

export const reconciler = ReactReconciler(hostConfig)
