API endpoints with the Web `Request` and `Response` APIs, in the same `app` directory.

## Convention

```ts@app/api/health/route.ts
export function GET(): Response {
  return Response.json({ status: "ok" });
}
```

Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` or `OPTIONS`. Handlers run on `text dev`, `text start` and every [deploy adapter](/docs/deploying), after [middleware](/docs/middleware). Cache `GET` handlers with [route segment config](/docs/caching).

## Dynamic handlers

```ts@app/api/sessions/[id]/route.ts
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await db.sessions.find(params.id);
  return session ? Response.json(session) : new Response("Not found", { status: 404 });
}
```

## Streaming

Return a `ReadableStream` for server-sent events:

```ts@app/api/ticks/route.ts
export function GET() {
  let n = 0;
  const stream = new ReadableStream({
    start(c) {
      setInterval(() => c.enqueue(`data: ${n++}\n\n`), 1000);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}
```

## Rewrites

External destinations are proxied, so there's no CORS.

```ts@text.config.ts
export default defineConfig({
  rewrites: [{ source: "/api/opencode/:path*", destination: "http://127.0.0.1:4096/:path*" }],
});
```

## Local daemon proxying

Use `proxy` and `configureServer` to reach a process on your machine:

```ts@text.config.ts
export default defineConfig({
  proxy: { "/api/opencode": { target: "http://127.0.0.1:4096", changeOrigin: true } },
});
```

This is how the [OpenCode template](/docs/opencode) connects to a local server.
