import { type FiberRoot } from "react-reconciler"
import { Direction } from "yoga-layout"
import { reconciler } from "./reconciler"
import { renderer } from "./renderer"
import * as dom from "./dom.js"
import { logger } from "./logging"
import App from "./components/app"
import { createKeyboardManager, KeyboardManager } from "./keyboard"

const noop = () => {}

export type Options = {
  debug?: boolean
}

export class Textjs {
  private readonly options: Options
  private readonly keyboardManager: KeyboardManager
  private readonly container: FiberRoot
  private readonly rootNode: dom.DOMElement

  private lastOutput: string
  private renderScheduled: boolean = false

  constructor(options?: Options) {
    this.options = options
    this.keyboardManager = createKeyboardManager()
    this.rootNode = dom.createNode("div")
    this.rootNode.onComputeLayout = this.calculateLayout
    this.rootNode.onRender = this.scheduleRender
    this.rootNode.onImmediateRender = this.onRender

    this.lastOutput = ""

    this.container = reconciler.createContainer(
      this.rootNode,
      // Legacy mode
      0,
      null,
      false,
      null,
      "id",
      () => {},
      null,
    )
  }

  resized = () => {
    this.calculateLayout()
    this.onRender()
  }

  calculateLayout = () => {
    this.rootNode.yogaNode!.calculateLayout(undefined, undefined, Direction.LTR)
  }

  scheduleRender: () => void = () => {
    if (this.renderScheduled) return
    this.renderScheduled = true

    requestAnimationFrame(() => {
      this.onRender()
      this.renderScheduled = false
    })
  }

  onRender: () => void = () => {
    const { text, styles } = renderer(this.rootNode)
    const key = text + JSON.stringify(styles)
    if (key === this.lastOutput) return

    console.clear()
    console.log(text + logger.formatLogs(), ...styles)
    // console.log(this.rootNode)
    this.lastOutput = key
  }

  async reset() {
    this.keyboardManager.reset()
  }

  async render() {
    reconciler.updateContainer(
      <App keyboardManager={this.keyboardManager} />,
      this.container,
      null,
      noop,
    )
  }
}
