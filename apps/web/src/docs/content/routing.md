Text.js uses a file-system based App Router. Folders define routes, special files define UI, and navigation is synchronized with `window.history` — so the browser's address bar, back button and deep links all work, while the UI renders in the console.

## Pages

A page is UI unique to a route. Define it by default-exporting a component from `page.tsx`:

```tsx@app/sessions/page.tsx
import { Box, Text } from "textjs";

export default function SessionsPage() {
  return (
    <Box className="flex-col p-1">
      <Text bold>Sessions</Text>
    </Box>
  );
}
```

## Layouts

A layout is UI shared between routes. On navigation, layouts preserve state, remain interactive, and do not re-render. The root layout is required and wraps every route.

```tsx@app/layout.tsx
import type { ReactNode } from "react";
import { Box, KeyHint, Text } from "textjs";
import Link from "textjs/link";

export default function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-2 bg-surface">
        <Text bold>▼ Acme</Text>
        <Link href="/" shortcut="1">Overview</Link>
        <Link href="/sessions" shortcut="2">Sessions</Link>
      </Box>
      <Box className="grow">{children}</Box>
      <Box className="h-1 px-1 gap-2 bg-surface">
        <KeyHint keys="1-2" label="navigate" />
        <KeyHint keys="tab" label="focus" />
      </Box>
    </Box>
  );
}
```

### Nested layouts

Layouts in a folder apply to that segment and below. `app/sessions/layout.tsx` wraps `/sessions` and `/sessions/[id]`, nested inside the root layout.

### Metadata

Export `metadata` (or `generateMetadata`) from a layout or page. Titles compose through templates and update `document.title`:

```tsx@app/layout.tsx
export const metadata: Metadata = {
  title: { default: "Acme Console", template: "%s · Acme Console" },
};
```

## Dynamic segments

Wrap a folder name in square brackets to create a dynamic segment. Params are passed to layouts and pages:

```tsx@app/sessions/[id]/page.tsx
import type { PageProps } from "textjs";
import { Text } from "textjs";

export default function SessionPage({ params }: PageProps<{ id: string }>) {
  return <Text>Session {params.id}</Text>;
}

export function generateMetadata({ params }: PageProps<{ id: string }>) {
  return { title: `Session ${params.id}` };
}
```

Catch-all segments (`[...slug]`) receive an array; optional catch-all segments (`[[...slug]]`) also match the parent path.

## Linking and navigating

### The `<Link>` component

`<Link>` is a focusable, keyboard-driven client-side navigation primitive. It participates in Tab order, navigates on `Enter` or `Space`, and supports single-key shortcuts:

```tsx
import Link from "textjs/link";

<Link href="/sessions/42" shortcut="s">Open session</Link>
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `href` | `string` | — | Destination path |
| `replace` | `boolean` | `false` | Replace the history entry |
| `shortcut` | `string` | — | Single key that follows the link from anywhere |
| `focusable` | `boolean` | `true` | Include in Tab order |
| `prefetch` | `boolean` | `true` | Preload the route's modules on mount |
| `activeClassName` | `string` | — | Classes applied when `href` is active |

> **Good to know:** Links render with DevTools URL auto-linking enabled (`allowLink`), so external `href`s remain clickable inside the console itself.

### `useRouter`

Programmatic navigation from event handlers:

```tsx
import { useRouter } from "textjs/navigation";

const router = useRouter();
useInput((e) => {
  if (e.key === "escape") router.back();
  if (e.input === "n") router.push("/sessions/new");
});
```

| Method | Description |
| :-- | :-- |
| `push(href)` | Navigate and add a history entry |
| `replace(href)` | Navigate without adding a history entry |
| `back()` / `forward()` | Traverse history |
| `refresh()` | Re-render the current route and reset its error boundaries |
| `prefetch(href)` | Preload a lazy route |

### `usePathname`, `useParams`, `useSearchParams`

```tsx
import { useParams, usePathname, useSearchParams } from "textjs/navigation";

const pathname = usePathname();          // "/sessions/42"
const { id } = useParams<{ id: string }>(); // "42"
const tab = useSearchParams().get("tab");  // "diff"
```

## Browser URL sync

The router owns `window.history`. When a route changes, Text.js calls `pushState`, updates `document.title` from metadata, and renders the new frame. When the user presses the browser's back button, `popstate` restores the previous route.

> **Good to know:** Deep links work on any static host with a single SPA rewrite. On Vercel: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
