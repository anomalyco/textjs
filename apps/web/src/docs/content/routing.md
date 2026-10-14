A file-system router, synced with the browser's URL and history.

## Pages

Default-export a component from `page.tsx`:

```tsx@app/sessions/page.tsx
import { Text } from "@textjs/next";

export default function SessionsPage() {
  return <Text bold>Sessions</Text>;
}
```

## Layouts

Layouts wrap routes and keep their state across navigation.

```tsx@app/layout.tsx
import type { ReactNode } from "react";
import { Box, Text } from "@textjs/next";
import Link from "@textjs/next/link";

export const metadata = { title: { default: "Acme", template: "%s · Acme" } };

export default function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-2">
        <Text bold>▼ Acme</Text>
        <Link href="/" shortcut="1">Home</Link>
        <Link href="/sessions" shortcut="2">Sessions</Link>
      </Box>
      <Box className="grow">{children}</Box>
    </Box>
  );
}
```

## Dynamic segments

```tsx@app/sessions/[id]/page.tsx
import { Text, type PageProps } from "@textjs/next";

export default function SessionPage({ params }: PageProps<{ id: string }>) {
  return <Text>Session {params.id}</Text>;
}
```

## Navigation

### `<Link>`

`<Link>` is focusable and supports single-key shortcuts.

| Prop | Description |
| :-- | :-- |
| `href` | Destination path |
| `shortcut` | Key that follows the link |
| `replace` | Replace the history entry |

### `useRouter`

Navigate from code:

```tsx
const router = useRouter();
router.push("/sessions/new");
router.back();
```

### `usePathname` and `useParams`

Read the current route:

```tsx
import { useParams, usePathname } from "@textjs/next/navigation";

const pathname = usePathname(); // "/sessions/42"
const { id } = useParams<{ id: string }>(); // "42"
```

Back, forward and deep links all work. Static hosts need one SPA rewrite.
