import { Style, Position } from "./style"

export function classNameToStyle(className: string) {
  const style: Style = {}
  const classNames = className?.split(" ") || []
  for (const className of classNames) {
    switch (className) {
      // Box Decoration
      case "box-decoration-clone":
        style.boxDecorationBreak = "clone"
        break
      case "box-decoration-slice":
        style.boxDecorationBreak = "slice"
        break

      // Box Sizing
      case "box-border":
        style.boxSizing = "border-box"
        break
      case "box-content":
        style.boxSizing = "content-box"
        break

      // Display
      case "block":
        style.display = undefined
        break
      case "flex":
        style.display = "flex"
        break
      case "hidden":
        style.display = "none"
        break

      // Flex
      case "basis-auto":
        style.flexBasis = "auto"
        break
      case "basis-full":
        style.flexBasis = "100%"
        break
      case "flex-row":
        style.flexDirection = "row"
        break
      case "flex-row-reverse":
        style.flexDirection = "row-reverse"
        break
      case "flex-col":
        style.flexDirection = "column"
        break
      case "flex-col-reverse":
        style.flexDirection = "column-reverse"
        break
      case "flex-1":
        style.flexGrow = 1
        style.flexShrink = 1
        style.flexBasis = "0%"
        break
      case "flex-auto":
        style.flexGrow = 1
        style.flexShrink = 1
        style.flexBasis = "auto"
        break
      case "flex-initial":
        style.flexGrow = 0
        style.flexShrink = 1
        style.flexBasis = "auto"
        break
      case "flex-none":
        style.flexGrow = 0
        style.flexShrink = 0
        style.flexBasis = "auto"
        break
      case "flex-wrap":
        style.flexWrap = "wrap"
        break
      case "flex-wrap-reverse":
        style.flexWrap = "wrap-reverse"
        break
      case "flex-nowrap":
        style.flexWrap = "nowrap"
        break
      case "grow":
        style.flexGrow = 1
        break
      case "grow-0":
        style.flexGrow = 0
        break
      case "shrink":
        style.flexShrink = 1
        break
      case "shrink-0":
        style.flexShrink = 0
        break

      // Overflow
      case "overflow-visible":
        style.overflow = "visible"
        break
      case "overflow-hidden":
        style.overflow = "hidden"
        break
      case "overflow-scroll":
        style.overflow = "scroll"
        break

      // Position
      case "relative":
        style.position = "relative"
        break
      case "absolute":
        style.position = "absolute"
        break
      case "static":
        style.position = "static"
        break

      // Top / Right / Bottom / Left
      case "top-auto":
        style.top = "auto"
        break
      case "right-auto":
        style.right = "auto"
        break
      case "bottom-auto":
        style.bottom = "auto"
        break
      case "left-auto":
        style.left = "auto"
        break

      // Line Height
      case "leading-none":
        style.lineHeight = 1
        break
      case "leading-tight":
        style.lineHeight = 1.25
        break
      case "leading-snug":
        style.lineHeight = 1.375
        break
      case "leading-normal":
        style.lineHeight = 1.5
        break
      case "leading-relaxed":
        style.lineHeight = 1.625
        break
      case "leading-loose":
        style.lineHeight = 2
        break

      // Justify Content
      case "justify-start":
        style.justifyContent = "flex-start"
        break
      case "justify-end":
        style.justifyContent = "flex-end"
        break
      case "justify-center":
        style.justifyContent = "center"
        break
      case "justify-between":
        style.justifyContent = "space-between"
        break
      case "justify-around":
        style.justifyContent = "space-around"
        break
      case "justify-evenly":
        style.justifyContent = "space-evenly"
        break

      // Align Content
      case "content-start":
        style.alignContent = "flex-start"
        break
      case "content-end":
        style.alignContent = "flex-end"
        break
      case "content-center":
        style.alignContent = "center"
        break
      case "content-between":
        style.alignContent = "space-between"
        break
      case "content-around":
        style.alignContent = "space-around"
        break
      case "content-stretch":
        style.alignContent = "stretch"
        break

      // Align Items
      case "items-start":
        style.alignItems = "flex-start"
        break
      case "items-end":
        style.alignItems = "flex-end"
        break
      case "items-center":
        style.alignItems = "center"
        break
      case "items-baseline":
        style.alignItems = "baseline"
        break
      case "items-stretch":
        style.alignItems = "stretch"
        break

      // Align Self
      case "self-auto":
        style.alignSelf = "auto"
        break
      case "self-start":
        style.alignSelf = "flex-start"
        break
      case "self-end":
        style.alignSelf = "flex-end"
        break
      case "self-center":
        style.alignSelf = "center"
        break
      case "self-stretch":
        style.alignSelf = "stretch"
        break
      case "self-baseline":
        style.alignSelf = "baseline"
        break

      case "underline":
        style.textDecoration = "underline"
        break
      case "line-through":
        style.textDecoration = "line-through"
        break
      case "no-underline":
        style.textDecoration = "none"
        break
      case "overline":
        style.textDecoration = "overline"
        break

      case "border":
        style.border = 1
        break
      case "border-t":
        style.borderTop = 1
        break
      case "border-r":
        style.borderRight = 1
        break
      case "border-b":
        style.borderBottom = 1
        break
      case "border-l":
        style.borderLeft = 1
        break
      case "border-ansi":
        style.borderStyle = "ansi-single"
        break
      case "border-double":
        style.borderStyle = "ansi-double"
        break
      case "border-rounded":
        style.borderStyle = "ansi-rounded"
        break

      case "w-full":
        style.width = "100%"
        break
      case "h-full":
        style.height = "100%"
        break
      case "size-full":
        style.width = "100%"
        style.height = "100%"
        break

      case "font-sans":
        style.fontFamily = "sans-serif"
        break
      case "font-serif":
        style.fontFamily = "serif"
        break
      case "font-mono":
        style.fontFamily = "monospace"
        break

      // Parse the rest
      default:
        const bg = parseValue<string>(className, "bg")
        if (bg) style.backgroundColor = bg.value

        const borderColor = parseValue<string>(className, "border")
        if (borderColor) style.borderColor = borderColor.value

        const color = parseValue<string>(className, "text")
        if (color) style.color = color.value

        const leading = parseValue<string>(className, "leading")
        if (leading) style.lineHeight = leading.value

        const position = parseValue<Position>(
          className,
          "top",
          "left",
          "right",
          "bottom",
        )
        if (position) style[position.prefix] = position.value

        const gap = parseValue<number>(className, "gap")
        if (gap) style.gap = gap.value
        const gapX = parseValue<number>(className, "gap-x")
        if (gapX) style.columnGap = gapX.value
        const gapY = parseValue<number>(className, "gap-y")
        if (gapY) style.rowGap = gapY.value

        const padding = parseValue<number>(className, "p")
        if (padding) style.padding = padding.value
        const paddingX = parseValue<number>(className, "px")
        if (paddingX) style.paddingLeft = style.paddingRight = paddingX.value
        const paddingY = parseValue<number>(className, "py")
        if (paddingY) style.paddingTop = style.paddingBottom = paddingY.value
        const paddingTop = parseValue<number>(className, "pt")
        if (paddingTop) style.paddingTop = paddingTop.value
        const paddingRight = parseValue<number>(className, "pr")
        if (paddingRight) style.paddingRight = paddingRight.value
        const paddingBottom = parseValue<number>(className, "pb")
        if (paddingBottom) style.paddingBottom = paddingBottom.value
        const paddingLeft = parseValue<number>(className, "pl")
        if (paddingLeft) style.paddingLeft = paddingLeft.value

        const margin = parseValue<number>(className, "m")
        if (margin) style.margin = margin.value
        const marginX = parseValue<number>(className, "mx")
        if (marginX) style.marginLeft = style.marginRight = marginX.value
        const marginY = parseValue<number>(className, "my")
        if (marginY) style.marginTop = style.marginBottom = marginY.value
        const marginTop = parseValue<number>(className, "mt")
        if (marginTop) style.marginTop = marginTop.value
        const marginRight = parseValue<number>(className, "mr")
        if (marginRight) style.marginRight = marginRight.value
        const marginBottom = parseValue<number>(className, "mb")
        if (marginBottom) style.marginBottom = marginBottom.value
        const marginLeft = parseValue<number>(className, "ml")
        if (marginLeft) style.marginLeft = marginLeft.value

        const width = parseValue<number>(className, "w")
        if (width) style.width = width.value
        const height = parseValue<number>(className, "h")
        if (height) style.height = height.value
    }
  }

  return style
}

function parseValue<T, P extends string = string>(
  className: string,
  ...prefixes: P[]
) {
  const prefix = prefixes.find((p) => className.startsWith(`${p}-`))
  if (!prefix) return undefined

  const valueString = className.slice(prefix.length + 1) // +1 for the hyphen

  // Check for arbitrary value [...]
  const arbitraryMatch = valueString.match(/^\[(.*)\]$/)
  if (arbitraryMatch) {
    return {
      type: "arbitrary" as const,
      prefix,
      value: arbitraryMatch[1] as T,
    }
  }

  if (validSpacingKeys.includes(valueString)) {
    const spacing = valueString
    const value = spacingMap[spacing] as T
    return {
      type: "spacing" as const,
      prefix,
      value,
      spacing,
    }
  }

  const fractionMatch = valueString.match(/^(\d)\/(\d)$/)
  if (fractionMatch) {
    const [, numerator, denominator] = fractionMatch
    const value =
      `${(Number.parseInt(numerator) / Number.parseInt(denominator)) * 100}%` as T
    return {
      type: "fraction" as const,
      prefix,
      value,
    }
  }

  return {
    type: "value" as const,
    prefix,
    value: valueString as T,
  }
}

const spacingMap: Record<string, number> = {
  "0": 0,
  px: 1,
  "0.5": 0.5,
  "1": 1,
  "1.5": 1.5,
  "2": 2,
  "2.5": 2.5,
  "3": 3,
  "3.5": 3.5,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "11": 11,
  "12": 12,
  "14": 14,
  "16": 16,
  "20": 20,
  "24": 24,
  "28": 28,
  "32": 32,
  "36": 36,
  "40": 40,
  "44": 44,
  "48": 48,
  "52": 52,
  "56": 56,
  "60": 60,
  "64": 64,
  "72": 72,
  "80": 80,
  "96": 96,
}
const validSpacingKeys = Object.keys(spacingMap)
