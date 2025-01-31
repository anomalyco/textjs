import { useState } from "react"
import { useGlobalHandlers, useKeyboardManager } from "../keyboard"

export interface ButtonProps {
  children?: string | undefined
  trigger?: string
  onClick?: () => void
  className?: string
  color?: string
  hint?: boolean
  hintType?: "underline" | "before" | "after"
}

export const Button = (props: ButtonProps) => {
  const keyboardManager = useKeyboardManager()
  const color = props.color
  const hint = props.hint ?? true
  const hintType = props.hintType ?? "underline"

  const [key] = useState(() => {
    if (props.trigger) return props.trigger

    const chars = props.children.split("")
    let char = chars.shift()
    while (char) {
      const key = char.toLowerCase()
      if (keyboardManager.hasGlobalHandler(key)) {
        char = chars.shift()
        continue
      }
      return key
    }
  })

  const hintIndex = props.children?.toLowerCase().indexOf(key)

  useGlobalHandlers([
    {
      keys: [key],
      handler: () => {
        if (props.onClick) {
          props.onClick()
          return true
        }
      },
    },
  ])

  return (
    <div
      className={{
        "flex gap-1": true,
        "flex-row-reverse": hintType === "before",
      }}
    >
      <div
        className={{
          "text-white px-1": true,
          [props.className ?? ""]: !!props.className,
        }}
        style={color ? { backgroundColor: color } : {}}
      >
        {hintType === "underline" ? (
          <div className="flex">
            {props.children?.split("").map((char, i) => (
              <span key={char + i} className={{ underline: i === hintIndex }}>
                {char}
              </span>
            ))}
          </div>
        ) : (
          <span>{props.children}</span>
        )}
      </div>
      {hint && (hintType === "before" || hintType === "after") && (
        <span>{key}</span>
      )}
    </div>
  )
}
