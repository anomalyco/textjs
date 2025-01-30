import { type PropsWithChildren } from "react"
import { useGlobalHandlers } from "../keyboard"

export interface ButtonProps extends PropsWithChildren {
  className?: string
  color?: string
  keys?: string[]
  hint?: boolean
  hintPosition?: "before" | "after"
  onClick?: () => void
}

export const Button = (props: ButtonProps) => {
  const keys = props.keys ?? ["enter"]
  const color = props.color
  const hint = props.hint ?? true
  const hintPosition = props.hintPosition ?? "after"

  useGlobalHandlers([
    {
      keys,
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
        "flex-row-reverse": hintPosition === "before",
      }}
    >
      <div
        className={{
          "text-white px-1": true,
          [props.className ?? ""]: !!props.className,
        }}
        style={color ? { backgroundColor: color } : {}}
      >
        <span>{props.children}</span>
      </div>
      {hint && <span>{keys.join("/")}</span>}
    </div>
  )
}
