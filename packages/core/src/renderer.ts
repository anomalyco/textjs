import { Display } from "yoga-layout"
import { getBorderCharacter, getBorderInfo } from "./border"
import { CssStyle, styleToString } from "./style"
import { wrapText } from "./text"
import { DOMElement, DOMNode, squashTextNodes } from "./dom"

export interface Cell {
  char: string
  style: CssStyle
}

export type Matrix = Cell[][]

export const renderer = (
  node: DOMElement,
): { text: string; styles: string[] } => {
  if (node.yogaNode) {
    const { width, height } = node.yogaNode.getComputedLayout()
    const matrix = createMatrix(width, height)
    renderNodeToMatrix(node, matrix)

    const texts: string[] = []
    const styles: string[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const previous =
          x === 0
            ? y === 0
              ? undefined
              : matrix[y - 1][width - 1]
            : matrix[y][x - 1]
        const char = matrix[y][x].char
        const style = styleToString(matrix[y][x].style)
        if (previous && style === styleToString(previous.style)) {
          texts[texts.length - 1] += char
          continue
        }

        texts.push("%c" + char)
        styles.push(style)
      }
      texts.push("\n")
    }

    const text = texts.join("")
    return { text, styles }
  }

  return { text: "", styles: [] }
}

function createMatrix(width: number, height: number): Matrix {
  return Array(height)
    .fill(null)
    .map(() =>
      Array(width)
        .fill(null)
        .map(() => ({
          char: " ",
          style: {},
        })),
    )
}

function renderNodeToMatrix(
  node: DOMNode,
  matrix: Matrix,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): void {
  if (node.nodeName === "#text") return
  const yogaNode = node.yogaNode ?? node.parentNode?.yogaNode
  if (yogaNode.getDisplay() === Display.None) return

  const layout = yogaNode?.getComputedLayout()
  const text = node.nodeName === "span" ? squashTextNodes(node) : ""
  const style = node.style

  const left = offset.x + layout.left
  const top = offset.y + layout.top

  const topEdge = Math.max(top, 0)
  const rightEdge = Math.min(left + layout.width, matrix[0]?.length)
  const bottomEdge = Math.min(top + layout.height, matrix.length)
  const leftEdge = Math.max(left, 0)

  if (text) {
    // Get wrapped text based on the computed layout width
    const wrappedText = wrapText(text, {
      width: layout?.width,
      textWrap: style.textWrap,
    })

    // Split into lines and render each line
    const lines = wrappedText.split("\n")
    lines.forEach((line, lineIndex) => {
      const y = top + lineIndex
      if (y >= matrix.length) return

      for (let i = 0; i < line.length; i++) {
        const x = left + i
        if (x >= matrix[0].length) break

        matrix[y][x] = {
          char: line[i],
          // inherit existing styles
          style: { ...matrix[y][x].style, ...style },
        }
      }
    })
  } else {
    // For non-text elements, just fill the computed layout area
    for (let y = topEdge; y < bottomEdge; y++) {
      for (let x = leftEdge; x < rightEdge; x++) {
        let {
          border,
          borderTop,
          borderRight,
          borderBottom,
          borderLeft,
          borderColor,
          borderStyle,
          ...rest
        } = style

        const borderStyles: Record<string, any> = {}
        if ((!borderStyle || borderStyle === "css") && borderColor) {
          if (y === topEdge && (borderTop || border)) {
            borderStyles.borderTop = `${borderTop || border}px solid ${borderColor}`
          }
          if (x === rightEdge - 1 && (borderRight || border)) {
            borderStyles.borderRight = `${borderRight || border}px solid ${borderColor}`
          }
          if (y === bottomEdge - 1 && (borderBottom || border)) {
            borderStyles.borderBottom = `${borderBottom || border}px solid ${borderColor}`
          }
          if (x === leftEdge && (borderLeft || border)) {
            borderStyles.borderLeft = `${borderLeft || border}px solid ${borderColor}`
          }
        }

        const borderInfo = getBorderInfo(style)
        const borderChar = getBorderCharacter(
          {
            top: y === topEdge,
            right: x === rightEdge - 1,
            bottom: y === bottomEdge - 1,
            left: x === leftEdge,
          },
          borderInfo,
        )
        if (borderChar) borderStyles.color = borderColor

        matrix[y][x] = {
          char: borderChar ?? " ",
          // inherit existing styles
          style: { ...matrix[y][x].style, ...rest, ...borderStyles },
        }
      }
    }
  }

  if ("childNodes" in node) {
    for (const child of node.childNodes ?? []) {
      renderNodeToMatrix(child as DOMElement, matrix, { x: left, y: top })
    }
  }
}
