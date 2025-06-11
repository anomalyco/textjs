Text.js builds on React Suspense and error boundaries to provide instant loading states and graceful recovery — rendered in the console.

## Loading UI

Add `loading.tsx` to a segment to show a fallback while its page suspends. Text.js wraps the page in a `<Suspense>` boundary automatically:

```tsx@app/sessions/[id]/loading.tsx
import { Box, Spinner } from "textjs";

export default function Loading() {
  return (
    <Box className="p-1">
      <Spinner variant="dots" label="Loading session…" />
    </Box>
  );
}
```

```tsx#spinner
<Box className="flex-col gap-1 p-1">
  <Spinner variant="dots" label="Loading session…" />
  <Spinner variant="pulse" label="Streaming frames downward" />
  <Spinner variant="matrix" label="Encoding %c spans" />
</Box>
```

Spinners animate only while output is not paused, and stop their timers when the console is paused with `text.pause()`. An idle app emits zero frames.

## Error handling

Add `error.tsx` to catch errors thrown while rendering a segment. The boundary receives the error and a `reset` function:

```tsx@app/sessions/[id]/error.tsx
import { Box, Text, useInput } from "textjs";
import type { ErrorComponentProps } from "textjs";

export default function SessionError({ error, reset }: ErrorComponentProps) {
  useInput((e) => e.input === "r" && reset());
  return (
    <Box className="flex-col p-1 border rounded border-danger">
      <Text bold color="danger">Something went wrong</Text>
      <Text color="muted">{error.message}</Text>
      <Text color="subtle">Press r to retry</Text>
    </Box>
  );
}
```

Errors bubble to the nearest parent `error.tsx`. Layouts above the boundary remain mounted and interactive.

## Not found

Call `notFound()` from a page to render the closest `not-found.tsx`. Unmatched URLs render the root `app/not-found.tsx`:

```tsx
import { notFound } from "textjs/navigation";

const session = findSession(params.id);
if (!session) notFound();
```

`redirect(href)` and `permanentRedirect(href)` are also available from `textjs/navigation`.

## The in-console Redbox

During development, uncaught render errors, unhandled promise rejections and Vite compile errors open a full-frame Redbox overlay **inside the console**, with the error message, the component stack and the source location.

```text
╭─ ▼ Unhandled Runtime Error ───────────────────────────────────────╮
│                                                                   │
│  TypeError: Cannot read properties of undefined (reading 'title') │
│                                                                   │
│  app/sessions/[id]/page.tsx (14:27) @ SessionPage                 │
│    12 │   const session = useSession(params.id);                  │
│  > 14 │   return <Text bold>{session.title}</Text>;               │
│                                                                   │
│  esc dismiss · ←/→ previous/next error                            │
╰───────────────────────────────────────────────────────────────────╯
```

Fixing the file dismisses the Redbox automatically via Fast Refresh.

## [▼] DevTools

In development, a `[▼]` pill is drawn in the bottom-left corner of the console frame. Press `F2` (or `` Ctrl+` ``) to open the Turbolog DevTools inspector, rendered inside `console.log`:

| Panel | Shows |
| :-- | :-- |
| Route | Pattern, params, `○ Static` / `ƒ Dynamic`, resolved metadata |
| Frame | Grid size, `%c` span count, layout / raster / encode timings |
| Yoga | Node count and the layout wireframe overlay |
| Gate | Frames skipped by the dirty-row gate (`0` noop logs) |

Disable the pill with `devIndicators: false` in `text.config.ts`. It is never included in production builds.
