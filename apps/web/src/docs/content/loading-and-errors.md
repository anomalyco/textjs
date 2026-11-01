Loading states and error boundaries render in the console. Define them per route segment with `loading.tsx` and `error.tsx`.

## Loading UI

Add `loading.tsx` to show a fallback while a page suspends.

```tsx@app/sessions/[id]/loading.tsx
import { Spinner } from "@textjs/next";

export default function Loading() {
  return <Spinner variant="dots" label="Loading session…" />;
}
```

```tsx#spinner
<Box className="flex-col gap-1 p-1">
  <Spinner variant="dots" label="Loading session…" />
  <Spinner variant="pulse" label="Streaming frames" />
</Box>
```

## Errors

Add `error.tsx` to catch render errors. It receives the error and a `reset` function.

```tsx@app/sessions/[id]/error.tsx
import { Text, useInput, type ErrorComponentProps } from "@textjs/next";

export default function SessionError({ error, reset }: ErrorComponentProps) {
  useInput((e) => e.input === "r" && reset());
  return <Text color="danger">{error.message} · press r to retry</Text>;
}
```

## Not found

Call `notFound()` to render the nearest `not-found.tsx`.

```tsx
import { notFound } from "@textjs/next/navigation";

if (!session) notFound();
```

## The in-console Redbox

In development, uncaught errors open an overlay inside the console with the message and source location. Fixing the file dismisses it.

```text
╭─ ▼ Unhandled Runtime Error ─────────────────╮
│  TypeError: Cannot read 'title'             │
│  app/sessions/[id]/page.tsx (14:27)         │
╰───────────────────────────── esc dismiss ───╯
```

## Dev Overlay

In development, the `[▼]` pill in the console's bottom-left corner is the Dev Overlay. Press `F2` or `` Ctrl+` `` to open it and inspect the route, frame timings and layout. Disable with `devIndicators: false`.
