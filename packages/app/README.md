# ▼ @textjs/app

**The Console Framework for the Web.** Build React 19 App Router apps that render in the DevTools console. Turbolog writes each changed frame as one `console.log` call.

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

- `@textjs/app`: the full `@textjs/react` component kit plus `defineConfig`, `Metadata`, `ViewportConfig`, `useAppTheme`
- `@textjs/app/navigation`: `useRouter`, `usePathname`, `useParams`, `useSearchParams`, `notFound`, `redirect`
- `@textjs/app/link`: `<Link href>` (focusable; `Enter` navigates, optional `shortcut`)
- `@textjs/app/server`: `NextRequest` and `NextResponse` for `middleware.ts`
- `@textjs/app/cache`: `unstable_cache`, `cache`, `revalidateTag`, `revalidatePath`
- `@textjs/app/testing`: `render`, `renderToString` and `cleanup` for offscreen tests
- `@textjs/app/terminal`: `renderToTerminal`
- `@textjs/app/router`: `<AppRouter>`, `matchAppRoutes`, `createBrowserHistory`, `createMemoryHistory`
- `@textjs/app/devtools`: `<TextDevOverlay>` (`F2` / ``Ctrl+` ``), `<RedboxOverlay>`, `connectViteHmr`
- `@textjs/app/vite`: `textjsVitePlugin()` for custom Vite setups
- `@textjs/app/mcp`: `createTextMcpServer()` and `HeadlessSession` for driving apps from coding agents

## `app/` conventions

`layout.tsx`, `page.tsx`, `loading.tsx` (Suspense), `error.tsx` (error boundary with `reset`), `not-found.tsx`, `[param]`, `[...slug]`, `[[...slug]]`, `(group)` and `api/**/route.ts` handlers exporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
