Acme Deploys needs real data. Route handlers live next to your pages in `app/`, use the Web `Request` and `Response` APIs, and run on `text dev` and `text start`. They share the app's origin, so requests need no CORS setup.

## A route handler

```diff-ts@app/api/deployments/route.ts
+import { DEPLOYMENTS, createDeployment } from "../../../lib/deployments";
+
+export function GET(): Response {
+  return Response.json(DEPLOYMENTS);
+}
+
+export async function POST(req: Request): Promise<Response> {
+  const deployment = createDeployment(await req.json());
+  return Response.json(deployment, { status: 201 });
+}
```

Call it from the console prompt while `text dev` is running:

```js
await (await fetch("/api/deployments")).json()
```

## Fetching in a page

Fetch in an effect and show a `<Spinner>` until the data arrives. `r` refetches; `n` posts a new deployment, which shows up as building and turns ready once the build finishes.

```diff-tsx@app/deployments/page.tsx
-import { DEPLOYMENTS } from "../../lib/deployments";
+import { useEffect, useState } from "react";
+import { Spinner, useInput } from "@textjs/next";
+import type { Deployment } from "../../lib/deployments";
 
 export default function DeploymentsPage() {
+  const [rows, setRows] = useState<Deployment[]>([]);
+  const [loading, setLoading] = useState(true);
+
+  const refetch = async () => {
+    setLoading(true);
+    setRows(await (await fetch("/api/deployments")).json());
+    setLoading(false);
+  };
+  useEffect(() => void refetch(), []);
+
+  useInput((e) => {
+    if (e.input === "r") void refetch();
+    if (e.input === "n") void fetch("/api/deployments", { method: "POST", body: "{}" }).then(refetch);
+  });
+
+  if (loading) return <Spinner label="Loading deployments…" />;
   return (
     <Box className="flex-col">
-      {DEPLOYMENTS.map((d) => (
+      {rows.map((d) => (
         <Box key={d.id} className="flex-row h-1 gap-2">
+          <Status status={d.status} />
           …
```

## Loading and error states

Instead of handling `loading` by hand, a `loading.tsx` next to the page is shown while it suspends, and `error.tsx` catches anything it throws. Both are plain components:

```tsx@app/deployments/loading.tsx
import { Spinner } from "@textjs/next";

export default function Loading() {
  return <Spinner label="Loading deployments…" />;
}
```

## Streaming

Handlers can return a `ReadableStream`, which is how build logs stream into the dashboard line by line. See [Route Handlers](/docs/route-handlers) for server-sent events and proxying a local daemon.
