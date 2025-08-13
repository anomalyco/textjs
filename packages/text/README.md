# ▼ textjs

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
| `text proxy` | Bridge a local opencode server to textjs.org (CORS, :4096)    |

## Entry points

- `textjs` — the full `@textjs/react` component kit plus `defineConfig`, `Metadata`, `ViewportConfig`, `useAppTheme`
- `textjs/navigation` — `useRouter`, `usePathname`, `useParams`, `useSearchParams`, `notFound`, `redirect`
- `textjs/link` — `<Link href>` (focusable; `Enter` navigates, optional `shortcut`)
- `textjs/router` — `<AppRouter>`, `matchAppRoutes`, `createBrowserHistory`, `createMemoryHistory`
- `textjs/devtools` — `<TextDevOverlay>` (`F2` / ``Ctrl+` ``), `<RedboxOverlay>`, `connectViteHmr`
- `textjs/vite` — `textjsVitePlugin()` for custom Vite setups

## `app/` conventions

`layout.tsx`, `page.tsx`, `loading.tsx` (Suspense), `error.tsx` (error boundary with `reset`), `not-found.tsx`, `[param]`, `[...slug]`, `[[...slug]]`, `(group)` and `api/**/route.ts` handlers exporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
