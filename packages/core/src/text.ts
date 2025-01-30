type TextWrap =
  | "wrap"
  | "nowrap"
  | "truncate-start"
  | "truncate-middle"
  | "truncate-end"

interface WrapOptions {
  width: number
  textWrap?: TextWrap
}

const ELLIPSIS = "..."

export function wrapText(text: string, options: WrapOptions): string {
  const { width, textWrap = "wrap" } = options

  if (width <= 0) return text
  if (!text) return ""

  // If width is less than ellipsis length for truncate styles, return truncated ellipsis
  if (textWrap.startsWith("truncate") && width <= ELLIPSIS.length) {
    return ELLIPSIS.slice(0, width)
  }

  switch (textWrap) {
    case "nowrap":
      return text

    case "truncate-start":
      return text.length <= width
        ? text
        : ELLIPSIS + text.slice(-(width - ELLIPSIS.length))

    case "truncate-middle":
      if (text.length <= width) return text
      const leftHalf = Math.floor((width - ELLIPSIS.length) / 2)
      const rightHalf = width - ELLIPSIS.length - leftHalf
      return text.slice(0, leftHalf) + ELLIPSIS + text.slice(-rightHalf)

    case "truncate-end":
      return text.length <= width
        ? text
        : text.slice(0, width - ELLIPSIS.length) + ELLIPSIS

    case "wrap":
    default:
      const words = text.split(" ")
      const lines: string[] = []
      let currentLine = ""

      for (const word of words) {
        if (currentLine.length + word.length + 1 > width) {
          if (currentLine.length === 0) {
            let remainingWord = word
            while (remainingWord.length > 0) {
              lines.push(remainingWord.slice(0, width))
              remainingWord = remainingWord.slice(width)
            }
            continue
          }
          lines.push(currentLine.trim())
          currentLine = word
        } else {
          currentLine =
            currentLine.length === 0 ? word : `${currentLine} ${word}`
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine.trim())
      }

      return lines.join("\n")
  }
}

export function measureText(text: string): { width: number; height: number } {
  if (!text) return { width: 0, height: 0 }

  const lines = text.split("\n")
  return {
    width: Math.max(...lines.map((line) => line.length)),
    height: lines.length,
  }
}
