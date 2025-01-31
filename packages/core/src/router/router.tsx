import React, { useState, useEffect, Fragment } from "react"
import { RouterContext, RouteParams } from "./context"
import { Route, routes } from "textjs:routes"
import { LayoutProps, PageProps, ResolvedRouteInfo } from "./types"
import { useKeyboardManager } from "../keyboard"

function LayoutTree({
  route,
  page: Page,
  params,
}: {
  route: ResolvedRouteInfo
  page: React.ComponentType<PageProps>
  params: Record<string, string>
}) {
  const [loadedLayouts, setLoadedLayouts] = useState<
    React.ComponentType<LayoutProps>[]
  >([])

  useEffect(() => {
    Promise.all(route.layouts.map((l) => l.component))
      .then((modules) => setLoadedLayouts(modules.map((m) => m.default)))
      .catch(console.error)
  }, [route.layouts, setLoadedLayouts])

  const context = {
    route: route.route,
  }

  return loadedLayouts.toReversed().reduce(
    (children, Layout) => (
      <Layout context={context} params={params}>
        {children}
      </Layout>
    ),
    <Page context={context} params={params} />,
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
        <LayoutTree route={routeInfo} page={Page} params={params} />
      ) : (
        <Fragment />
      )}
    </RouterContext.Provider>
  )
}
