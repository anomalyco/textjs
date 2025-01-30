import { ComponentType, PropsWithChildren } from "react"

export type Component<T> = Promise<{ default: ComponentType<T> }>

export interface LayoutInfo {
  path: string
  component: string
}

export type ResolvedLayoutInfo = Omit<LayoutInfo, "component"> & {
  component: Component<LayoutProps>
}

export interface RouteInfo {
  route: string
  sourcePath: string
  component: string
  layouts: LayoutInfo[]
  paramNames: string[]
}

export type ResolvedRouteInfo = Omit<RouteInfo, "component" | "layouts"> & {
  component: Component<PageProps>
  layouts: ResolvedLayoutInfo[]
}

export interface LayoutProps extends PropsWithChildren {
  params?: Record<string, string>
}

export interface PageProps {
  // context: Context? route, etc.
  params?: Record<string, string>
}
