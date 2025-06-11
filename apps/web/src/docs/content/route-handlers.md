Route Handlers let you create custom request handlers for a route using the Web `Request` and `Response` APIs. They make every Text.js app full-stack: your console UI and its API ship from the same `app` directory.

## Convention

Route Handlers are defined in a `route.ts` file inside the `app` directory:

```ts@app/api/health/route.ts
export function GET(): Response {
  return Response.json({
    status: "ok",
    engine: "Turbolog",
    region: "iad1",
    time: new Date().toISOString(),
  });
}
```

Supported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` and `OPTIONS`. Unsupported methods return `405 Method Not Allowed`.

> **Good to know:** A `route.ts` cannot live in the same segment as a `page.tsx`. Route handlers are served by `text dev` and `text start`; static hosts serve only the console UI.

## Dynamic route handlers

```ts@app/api/sessions/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await db.sessions.find(params.id);
  if (!session) return new Response("Not found", { status: 404 });
  return Response.json(session);
}
```

## Fetching from the console

Your components fetch route handlers like any web API:

```tsx@app/page.tsx
function useHealth() {
  const [state, setState] = useState<"checking" | "healthy" | "offline">("checking");
  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? setState("healthy") : setState("offline")))
      .catch(() => setState("offline"));
  }, []);
  return state;
}
```

## Streaming

Return a `ReadableStream` to stream server-sent events directly into console state:

```ts@app/api/ticks/route.ts
export function GET() {
  const stream = new ReadableStream({
    start(controller) {
      let n = 0;
      const id = setInterval(() => controller.enqueue(`data: ${n++}\n\n`), 1000);
      return () => clearInterval(id);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}
```

## Rewrites

Rewrites map an incoming path to a different destination. External destinations are proxied by the dev and production servers, which avoids CORS entirely:

```ts@text.config.ts
export default defineConfig({
  rewrites: [
    { source: "/api/opencode/:path*", destination: "http://127.0.0.1:4096/:path*" },
    { source: "/docs/:slug", destination: "/documentation/:slug" },
  ],
});
```

## Local daemon proxying

For local tools — a database UI, a build daemon, a coding agent — use `proxy` and `configureServer` to discover and forward to a process on your machine:

```ts@text.config.ts
import { defineConfig } from "textjs";

export default defineConfig({
  proxy: {
    "/api/opencode": { target: "http://127.0.0.1:4096", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/opencode/, "") },
  },
  configureServer(server) {
    server.middlewares.use("/api/discover", (_req, res) => {
      res.end(JSON.stringify({ url: process.env.OPENCODE_URL ?? "http://127.0.0.1:4096" }));
    });
  },
});
```

This is exactly how the [OpenCode template](/docs/opencode) connects a console UI to a running `opencode` server.
