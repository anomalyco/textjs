// Paste into the DevTools console.
const width = 32
const line = "─".repeat(width - 2)
const pad = (s) => s + " ".repeat(width - 4 - s.length)

const border = "color: #666"
const text = "color: #fafafa; font-weight: bold"

console.log(
  `%c┌${line}┐\n│ %c${pad("Text.js")}%c │\n└${line}┘`,
  border,
  text,
  border,
)
