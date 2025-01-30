import { Style } from "./style"

interface BorderCharacters {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  horizontal: string
  vertical: string
  intersectLeft: string
  intersectRight: string
  intersectTop: string
  intersectBottom: string
  intersectMiddle: string
}

type AnsiBorderStyle = "ansi-single" | "ansi-double" | "ansi-rounded"

export interface BorderInfo {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
  style: AnsiBorderStyle
}

export function getBorderInfo(style: Style): BorderInfo | undefined {
  const {
    border,
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    borderStyle,
  } = style

  if (!border && !borderTop && !borderRight && !borderBottom && !borderLeft) {
    return undefined
  }
  if (!borderStyle || borderStyle === "css") return undefined

  return {
    top: Boolean(border || borderTop),
    right: Boolean(border || borderRight),
    bottom: Boolean(border || borderBottom),
    left: Boolean(border || borderLeft),
    style: borderStyle,
  }
}

export function getBorderCharacter(
  edges: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  },
  borderInfo: BorderInfo,
) {
  if (!borderInfo) return undefined
  const { top, right, bottom, left, style } = borderInfo
  const chars = borderStyles[style] || borderStyles["ansi-single"]

  // Corner cases
  if (edges.top && edges.left && top && left) return chars.topLeft
  if (edges.top && edges.right && top && right) return chars.topRight
  if (edges.bottom && edges.left && bottom && left) return chars.bottomLeft
  if (edges.bottom && edges.right && bottom && right) return chars.bottomRight

  // Edge cases
  if (edges.top && top) return chars.horizontal
  if (edges.bottom && bottom) return chars.horizontal
  if (edges.left && left) return chars.vertical
  if (edges.right && right) return chars.vertical

  return undefined
}

const borderStyles: Record<AnsiBorderStyle, BorderCharacters> = {
  "ansi-single": {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    intersectLeft: "├",
    intersectRight: "┤",
    intersectTop: "┬",
    intersectBottom: "┴",
    intersectMiddle: "┼",
  },
  "ansi-double": {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    intersectLeft: "╠",
    intersectRight: "╣",
    intersectTop: "╦",
    intersectBottom: "╩",
    intersectMiddle: "╬",
  },
  "ansi-rounded": {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    intersectLeft: "├",
    intersectRight: "┤",
    intersectTop: "┬",
    intersectBottom: "┴",
    intersectMiddle: "┼",
  },
}
