import { Plugin } from "vite"
import * as fs from "fs"
import * as path from "path"
import { globSync } from "glob"
import { TextjsConfig } from "./config/types"
import type { RouteInfo, LayoutInfo } from "./router"

export function textjsPlugin(root = "./"): Plugin {
  const virtualModuleId = "textjs:routes"
  const resolvedVirtualModuleId = `\0${virtualModuleId}`

  let appRoot: string
  let textjsConfig: TextjsConfig
  let routes: RouteInfo[] = []

  const LAYOUT_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"] as const
  const LAYOUT_BASE_NAME = "layout"

  function findLayoutFile(dir: string): string | undefined {
    return LAYOUT_EXTENSIONS.map((ext) =>
      path.join(dir, `${LAYOUT_BASE_NAME}${ext}`),
    ).find((filePath) => fs.existsSync(filePath))
  }

  function resolveLayoutChain(
    pagePath: string,
    pagesDir: string,
  ): LayoutInfo[] {
    const layouts: LayoutInfo[] = []
    let currentPath = pagePath

    // Check for root layout first
    const rootLayout = findLayoutFile(pagesDir)
    if (rootLayout) {
      layouts.push({
        path: path.relative(pagesDir, rootLayout),
        component: rootLayout,
      })
    }

    // Process layouts up the directory tree
    while (currentPath !== ".") {
      const layoutFile = findLayoutFile(path.join(pagesDir, currentPath))

      if (layoutFile) {
        layouts.push({
          path: path.relative(pagesDir, layoutFile),
          component: layoutFile,
        })
      }
      currentPath = path.dirname(currentPath)
    }

    return layouts
  }

  function generateTypes() {
    // Scan pages directory
    const pagesDir = path.resolve(appRoot, textjsConfig.pages)
    const files = globSync("**/*.{js,jsx,ts,tsx}", { cwd: pagesDir }).sort(
      (a, b) => a.localeCompare(b),
    )

    routes = files
      .filter((file) => {
        const filename = path.basename(file)
        const [name] = filename.split(".")
        return name === "page"
      })
      .map((file) => {
        const dirPath = path.dirname(file)
        const rawPath = dirPath === "." ? "/" : `/${dirPath}`
        const { sourcePath, route } = transformPath(rawPath)

        return {
          route,
          sourcePath,
          component: `${pagesDir}/${file}`,
          layouts: resolveLayoutChain(dirPath, pagesDir),
          paramNames: extractParamNames(route),
        }
      })

    routes.forEach(generateRouteTypes)

    // Write route types to a file for better IDE support
    const routerTypesPath = path.resolve(appRoot, "./.textjs/types.d.ts")
    fs.mkdirSync(path.dirname(routerTypesPath), { recursive: true })
    fs.writeFileSync(routerTypesPath, generateRouterTypes(routes))
  }

  function generateRouteTypes(route: RouteInfo) {
    const typesDir = path.resolve(
      appRoot,
      ".textjs/types",
      textjsConfig.pages.replace(/^\//, ""),
      route.sourcePath.replace(/^\//, ""),
    )
    const typeFile = path.resolve(typesDir, "types.d.ts")
    fs.mkdirSync(typesDir, { recursive: true })

    const content = route.paramNames?.length
      ? `
export interface Props {
  params: {
    ${route.paramNames.map((p) => `${p}: string`).join("\n  ")}
  }
}
`.trim()
      : `export interface Props {}`
    fs.writeFileSync(typeFile, content)
  }

  function generateTsConfig() {
    const tsConfig = {
      extends: "@textjs/core/tsconfigs/base",
      compilerOptions: {
        rootDirs: [appRoot, path.resolve(appRoot, ".textjs/types")],
        types: [path.resolve(appRoot, ".textjs/types.d.ts")],
      },
    }
    fs.writeFileSync(
      path.resolve(appRoot, ".textjs/tsconfig.json"),
      JSON.stringify(tsConfig, null, 2),
    )
  }

  return {
    name: "vite-plugin-textjs",
    config() {
      return {
        esbuild: {
          supported: {
            "top-level-await": true,
          },
        },
        optimizeDeps: {
          esbuildOptions: {
            target: "esnext",
          },
        },
        build: {
          target: "esnext",
        },
      }
    },
    configResolved(config) {
      appRoot = path.resolve(
        config.root,
        root.endsWith("/") ? root : `${root}/`,
      )
      const configPath = path.resolve(appRoot, "textjs.config.json")
      const configExists = fs.existsSync(configPath)
      textjsConfig = configExists
        ? (JSON.parse(fs.readFileSync(configPath, "utf8")) as TextjsConfig)
        : { pages: "./src/pages", defaultRoute: "index" }

      const textjsDir = path.resolve(appRoot, ".textjs")
      fs.rmSync(textjsDir, { recursive: true, force: true })
      fs.mkdirSync(textjsDir, { recursive: true })
      generateTsConfig()
      generateTypes()
    },
    configureServer(server) {
      server.watcher.add("./.textjs/types.d.ts")

      server.watcher.on("add", handleFileChange)
      server.watcher.on("change", handleFileChange)
      server.watcher.on("unlink", handleFileChange)

      // Watch for file change
      async function handleFileChange(filePath: string) {
        // You can filter files you want to watch
        if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
          // Regenerate types or handle virtual modules
          generateTypes()

          // Invalidate module graph if needed
          const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
      }
    },
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `
export const routes = {
  ${routes
    .map(
      (route) =>
        `'${route.route}': {
  route: '${route.route}',
  sourcePath: '${route.sourcePath}',
  component: import('${route.component}'),
  layouts: [${route.layouts
    .map(
      (layout) => `
    {
      component: import('${layout.component}'),
      path: '${layout.path}',
    }`,
    )
    .join(",")}
  ],
  paramNames: ${JSON.stringify(route.paramNames)},
}`,
    )
    .join(",\n  ")}
}`
      }
    },
  }
}

function generateRouterTypes(routes: RouteInfo[]): string {
  const routePaths = routes.map((r) => `'${r.route}'`).join(" | ")
  return `
declare module "textjs:routes" {
  export type Route = ${routePaths}
}
`.trim()
}

function transformPath(path: string): { sourcePath: string; route: string } {
  const sourcePath = path
  const transformedPath = path.replace(/\[([^\]]+)\]/g, ":$1")
  return { sourcePath, route: transformedPath }
}

function extractParamNames(path: string): string[] {
  const matches = path.match(/:[^\/]+/g)
  return matches ? matches.map((m) => m.slice(1)) : []
}
