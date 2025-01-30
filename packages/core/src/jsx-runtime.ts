import { type ReactNode, type Key } from "react"
import { Style } from "./style"
import cn from "classnames"

declare namespace TextJS {
  type Div = {
    children?: Exclude<ReactNode, string>
    key?: Key
    style?: Style
    className?: string | cn.Argument
  }

  type Span = {
    children?: ReactNode
    key?: Key
    style?: Style
    className?: string | cn.Argument
  }
}

export namespace JSX {
  export type IntrinsicElements = {
    div: TextJS.Div
    span: TextJS.Span
  }
}

export { jsx, jsxs } from "react/jsx-runtime"
export { jsxDEV } from "react/jsx-dev-runtime"
