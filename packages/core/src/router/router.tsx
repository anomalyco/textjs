import React, { useState, useEffect, Fragment } from "react"
import { RouterContext, RouteParams } from "./context"
import { Route, routes } from "textjs:routes"
import {
  LayoutProps,
  PageProps,
  ResolvedLayoutInfo,
  ResolvedRouteInfo,
} from "./types"
import { useKeyboardManager } from "../keyboard"

function LayoutTree({
  layouts,
  page: Page,
  params,
}: {
  layouts: ResolvedLayoutInfo[]
  page: React.ComponentType<PageProps>
  params: Record<string, string>
}) {
  const [loadedLayouts, setLoadedLayouts] = useState<
    React.ComponentType<LayoutProps>[]
  >([])

  useEffect(() => {
    Promise.all(layouts.map((l) => l.component))
      .then((modules) => setLoadedLayouts(modules.map((m) => m.default)))
      .catch(console.error)
  }, [layouts, setLoadedLayouts])

  return loadedLayouts
    .reverse()
    .reduce(
      (children, Layout) => <Layout params={params}>{children}</Layout>,
      <Page params={params} />,
    )
}

export function Router() {
  const keyboardManager = useKeyboardManager()
  const [route, setRoute] = useState<Route>("/")
  const [routeInfo, setRouteInfo] = useState<ResolvedRouteInfo | undefined>(
    undefined,
  )
  const [params, setParams] = useState<RouteParams[typeof route]>()
  const [Page, setPage] = useState<React.ComponentType<PageProps> | undefined>(
    undefined,
  )

  keyboardManager.setCurrentRoute(route)

  useEffect(() => {
    const routeInfo: ResolvedRouteInfo = routes[route]

    routeInfo.component
      .then((mod) => {
        setRouteInfo(routeInfo)
        setPage(() => mod.default)
      })
      .catch((error) => {
        console.error(`Failed to load route: ${route}`, error)
        setPage(undefined)
      })
  }, [route, routes, setRouteInfo, setPage])

  const navigate = <T extends Route>(
    to: T,
    ...args: RouteParams[T] extends Record<string, never>
      ? []
      : [params: RouteParams[T]]
  ) => {
    if (!(to in routes)) {
      console.error(`Route not found: ${to}`)
      throw new Error(`Route not found: ${to}`)
    }
    setRoute(to)
    setParams((args[0] ?? {}) as Record<string, string>)
  }

  return (
    <RouterContext.Provider value={{ route, params, navigate }}>
      {Page ? (
        <LayoutTree layouts={routeInfo.layouts} page={Page} params={params} />
      ) : (
        <Fragment />
      )}
    </RouterContext.Provider>
  )
}
