---
title: Text.js 0.1
date: 2025-03-25
author: Adam
summary: Text.js 0.1 brings a React 19 reconciler, Yoga layout and a file-system App Router to apps that render in the DevTools console.
---

Text.js 0.1 is tagged. It is the first version with all three layers: `@textjs/core` draws frames into the console, `@textjs/react` renders React 19 into those frames, and `textjs` adds an App Router and a CLI.

## The App Router

Routes are folders in `app/`, following the Next.js App Router conventions. This is the `dashboard` template from `create-text-app`:

```text
app/
├── layout.tsx
├── page.tsx
├── not-found.tsx
├── deployments/
│   └── [id]/
│       └── page.tsx
└── api/
    └── metrics/
        └── route.ts
```

A layout wraps every page below it and keeps its state across navigation. `<Link>` takes a `shortcut`, so a single key follows it, and `activeClassName` styles the link to the current route:

```tsx@app/layout.tsx
import type { ReactNode } from "react";
import { Box, KeyHint, Text, useTheme, type Metadata } from "textjs";
import Link from "textjs/link";

export const metadata: Metadata = { title: { default: "Acme", template: "%s · Acme" } };

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col w-full h-full">
      <Box className="flex-row h-1 px-1 gap-3 bg-surface shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          ▼ Acme
        </Text>
        <Link href="/" shortcut="1" className="text-muted no-underline" activeClassName="text-fg bold">
          1 Metrics
        </Link>
        <Link href="/deployments/dpl_a1" shortcut="2" className="text-muted no-underline" activeClassName="text-fg bold">
          2 Latest deploy
        </Link>
      </Box>
      <Box className="grow flex-col px-2 pt-1">{children}</Box>
      <Box className="flex-row h-1 gap-2 pl-6 shrink-0 bg-surface">
        <KeyHint keys="1-2" label="navigate" />
        <KeyHint keys="tab" label="focus" />
        <KeyHint keys="F2" label="devtools" />
      </Box>
    </Box>
  );
}
```

Dynamic segments work the same way as in Next.js. `[id]` becomes a param, `[...slug]` catches the rest of the path and `[[...slug]]` also matches the parent. Static segments win over dynamic ones, and route groups like `(marketing)` organize files without adding to the URL.

```tsx@app/deployments/[id]/page.tsx
import { Box, Text, useInput } from "textjs";
import { notFound, useParams, useRouter } from "textjs/navigation";
import { DEPLOYMENTS } from "../../../lib/data";

export default function DeploymentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const deployment = DEPLOYMENTS.find((d) => d.id === id);
  useInput((e) => {
    if (e.key === "escape") router.back();
  });
  if (!deployment) notFound();
  return (
    <Box className="flex-col gap-1">
      <Text bold>{deployment.id}</Text>
      <Text>{deployment.branch}</Text>
    </Box>
  );
}
```

`loading.tsx` and `error.tsx` wrap a segment in a Suspense boundary and an error boundary. The error component receives the error and a `reset` function:

```tsx@app/deployments/error.tsx
import { Box, Text, useInput, type ErrorComponentProps } from "textjs";

export default function DeploymentsError({ error, reset }: ErrorComponentProps) {
  useInput((e) => {
    if (e.key === "r") reset();
  });
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Text bold>Something went wrong loading deployments.</Text>
      <Text>{error.message}</Text>
    </Box>
  );
}
```

Route handlers live in `app/api` and return a standard `Response`:

```ts@app/api/metrics/route.ts
export function GET(): Response {
  return Response.json({ cpu: Math.random(), memory: Math.random(), at: new Date().toISOString() });
}
```

The router keeps `window.location` in sync through `history.pushState`, so Back, Forward and deep links work, and `metadata.title` is written to `document.title`. The app draws in the console, and the page hosts a focus pad that collects input.

## The CLI

- `text dev` starts Vite with React Fast Refresh. Saving a file updates the console in place.
- `text build` writes a production build of the app and its route handlers.
- `text start` serves the build and the route handlers.

`create-text-app` scaffolds a project from the `starter` or `dashboard` template.

## The inspector

Press `` Ctrl+` `` or `F2` in a running app to open the `[▼]` inspector inside the console. It shows the matched route and its params, the frame's size, span count and phase timings, and the number of frames the dirty gate skipped. `W` draws the Yoga layout as a wireframe.

## Also in 0.1

`@textjs/react` ships with PascalCase components (`Box`, `Text`, `ScrollBox`, `Input`, `Textarea`, `Select`, `Tabs`, `Code`, `Markdown`, `Diff`, `Modal`, `Spinner`), Tailwind-style `className` utilities that work in cells, and themes. Layout runs on Yoga in WebAssembly.

The full list is in the [changelog](/changelog#v0-1-0).
