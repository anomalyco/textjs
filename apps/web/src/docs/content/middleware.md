Middleware runs code before a request completes. It can redirect, rewrite, set headers and cookies, or return a response itself.

## Convention

Create `middleware.ts` in the project root (or `src/`), next to `app/`. Export a `middleware` function (or a default export) and an optional `config`.

```ts@middleware.ts
import { NextResponse, type NextRequest } from "@textjs/app/server";

export function middleware(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

Middleware runs before [route handlers](/docs/route-handlers), static files and console pages, on `text dev`, `text start` and every server [deploy adapter](/docs/deploying). It uses Web `Request` and `Response`, so the same file runs on Node, Bun, Vercel Edge and Cloudflare Workers.

## Matching paths

Without a `config.matcher`, middleware runs for every request. Matchers use the same syntax as Next.js:

| Matcher | Matches |
| :-- | :-- |
| `/about` | `/about` and `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`, `/docs/a/b` |
| `/a/:rest+` | `/a/b`, not `/a` |
| `/user/:id(\\d+)` | `/user/42`, not `/user/ada` |
| `/((?!api/).*)` | Everything except `/api/*` |

Add conditions with `has` and `missing` (header, cookie, query or host):

```ts@middleware.ts
export const config = {
  matcher: [{ source: "/beta/:path*", has: [{ type: "cookie", key: "beta", value: "1" }] }],
};
```

Matchers apply to the pathname without `basePath`. In `text dev`, Vite's own module requests (`/@vite/*`, source files) never run middleware.

Every host works out one canonical pathname before middleware runs, and uses it for matching, `request.nextUrl` and the route, handler and file lookup. Percent-escapes are decoded and the path is re-encoded the way `new URL()` writes it, `.` and `..` segments are resolved, and repeated and trailing slashes are removed. `/ad%6din//users/` reaches middleware as `/admin/users`, while `/café` stays `/caf%C3%A9`. A matcher written with a trailing slash, such as `/admin/`, matches `/admin`. Requests whose path has an encoded slash or backslash (`%2F`, `%5C`), a control character or invalid percent-encoding get a `400`. Routes are case-sensitive: `/Admin` doesn't match `/admin`, and static files are only served under their exact name.

Match the URLs a file is served at, not only its file name. Cloudflare Pages serves `report.html` at `/report` too, so a matcher for `/report.html` doesn't protect `/report`. Use a prefix such as `/reports/:path*`.

## NextResponse

| API | Effect |
| :-- | :-- |
| `NextResponse.next()` | Continue to the route |
| `NextResponse.redirect(url, status?)` | `307` by default; `url` must be absolute |
| `NextResponse.rewrite(url)` | Serve another path; external origins are proxied |
| `NextResponse.json(body, init?)` | Respond with JSON |
| `new Response(...)` | Respond with anything |

Return nothing to continue unchanged. `next()` and `rewrite()` accept `{ status }` to change the final response's status. Only responses created by `NextResponse.next()` / `NextResponse.rewrite()` steer routing: any other `Response`, including one returned from `fetch()`, is sent to the client as-is with its `x-middleware-*` headers removed.

`request.nextUrl` excludes `basePath` from `pathname`, while its `href` and `toString()` include it. To stay inside the app, clone it: `const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`.

```ts@middleware.ts
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/status") {
    return NextResponse.rewrite(new URL("/api/health", request.url));
  }
}
```

## Headers

Pass `request.headers` to change what downstream handlers receive, and `headers` to add response headers:

```ts@middleware.ts
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-user", "ada");
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-frame", "▼");
  return response;
}
```

Response headers from middleware are added to the final response unless the route handler sets the same header.

## Cookies

`request.cookies` reads the `Cookie` header; `response.cookies` writes `Set-Cookie`.

```ts@middleware.ts
export function middleware(request: NextRequest) {
  const theme = request.cookies.get("theme")?.value ?? "geistDark";
  const response = NextResponse.next();
  response.cookies.set("theme", theme, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
  return response;
}
```

Cookies set on a `next()` or `rewrite()` response are also visible to the route handler in the same request.

## Background work

The second argument has `waitUntil()`, which keeps serverless runtimes alive after the response is sent:

```ts@middleware.ts
import type { NextFetchEvent, NextRequest } from "@textjs/app/server";

export function middleware(request: NextRequest, event: NextFetchEvent) {
  event.waitUntil(fetch("https://analytics.example.com", { method: "POST", body: request.url }));
}
```

## Notes

- Client-rendered pages render in the browser, so a rewrite to another page changes which file is served, not which route the console app renders. Rewrites to route handlers, static files and external origins behave as expected.
- Middleware can read the request body; route handlers still receive it. Requests a matcher excludes never have their body touched.
- `request.url` always has the server's origin: request targets such as `//other.host/x` are normalized to a single leading slash.
- The [static adapter](/docs/deploying#static) cannot run middleware.
