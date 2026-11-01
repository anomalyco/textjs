# ▼ @textjs/next

**The Console Framework for the Web.** React 19 App Router apps that render inside DevTools `console.log`, powered by the Turbolog engine.

```bash
bunx create-text-app my-app
cd my-app && bun install && bun dev
```

| Command      | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| `text dev`   | Vite dev server with React Fast Refresh and the in-console Redbox |
| `text build` | Optimized console production build + route summary            |
| `text start` | Serve the production build (static files + route handlers)    |
| `text run`   | Render the App Router app in a terminal (Bun)                 |
| `text proxy` | Bridge textjs.org/opencode to your local OpenCode server; same as `bunx @textjs/opencode proxy` |
| `text mcp`   | Serve the app headless to coding agents over MCP (stdio)      |

## Entry points

- `@textjs/next`: the full `@textjs/react` component kit plus `defineConfig`, `Metadata`, `ViewportConfig`, `useAppTheme`
- `@textjs/next/navigation`: `useRouter`, `usePathname`, `useParams`, `useSearchParams`, `notFound`, `redirect`
- `@textjs/next/link`: `<Link href>` (focusable; `Enter` navigates, optional `shortcut`)
- `@textjs/next/server`: `NextRequest` and `NextResponse` for `middleware.ts`
- `@textjs/next/cache`: `unstable_cache`, `cache`, `revalidateTag`, `revalidatePath`
- `@textjs/next/testing`: `render`, `renderToString` and `cleanup` for offscreen tests
- `@textjs/next/terminal`: `renderToTerminal`
- `@textjs/next/router`: `<AppRouter>`, `matchAppRoutes`, `createBrowserHistory`, `createMemoryHistory`
- `@textjs/next/devtools`: `<TextDevOverlay>` (`F2` / ``Ctrl+` ``), `<RedboxOverlay>`, `connectViteHmr`
- `@textjs/next/vite`: `textjsVitePlugin()` for custom Vite setups
- `@textjs/next/mcp`: `createTextMcpServer()` and `HeadlessSession` for driving apps from coding agents

## `app/` conventions

`layout.tsx`, `page.tsx`, `loading.tsx` (Suspense), `error.tsx` (error boundary with `reset`), `not-found.tsx`, `[param]`, `[...slug]`, `[[...slug]]`, `(group)` and `api/**/route.ts` handlers exporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
