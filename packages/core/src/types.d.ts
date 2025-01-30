declare module "textjs:routes" {
  import type { ComponentType } from "react"
  import type { ExtractRouteParams } from "./router/utilities"
  import type { ResolvedRouteInfo } from "./router"

  export type Route = string
  export type ParamsFromPath<T> = ExtractRouteParams<T>
  export const routes: Record<Route, ResolvedRouteInfo>
}
