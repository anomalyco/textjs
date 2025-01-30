import { createContext } from "react"
import { Route } from "textjs:routes"
import { ExtractRouteParams } from "./utilities"

export type RouteParams = {
  [K in Route]: ExtractRouteParams<K>
}

export type RouterContextValue = {
  [R in Route]: {
    route: R
    params: RouteParams[R]
    navigate: {
      <T extends Route>(
        to: T,
        ...args: RouteParams[T] extends Record<string, never>
          ? []
          : [params: RouteParams[T]]
      ): void
    }
  }
}[Route]

export const RouterContext = createContext<RouterContextValue | null>(null)
