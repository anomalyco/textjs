# textjs.org crash reports

textjs.org reports its own JavaScript errors to `POST /api/errors`, a Pages Function that stores them in Workers Analytics Engine. `apps/web/scripts/errors.ts` lists the most frequent ones.

## What's captured

- Uncaught errors (`window` `error` events) from our own scripts. Errors whose stack has only other origins' frames (browser extensions, third-party scripts) are dropped, and so are events without an error value (cross-origin `Script error.`, `ResizeObserver loop` notices).
- Unhandled promise rejections.
- Crashes caught by the website's React error boundary (`apps/web/src/ErrorBoundary.tsx`).
- Errors in the Text.js console apps: the DevTools companion and the in-page sandboxes pass `onUncaughtError` and `onCaughtError` to `createConsoleRoot`. Text.js errors keep their code (`TX004`).
- Chunks that fail to load, usually a tab opened before a deploy asking for a file the new deploy no longer has. When it's the chunk for the page the visitor is opening, the page reloads once and the next page load reports `Reloaded after a chunk failed to load: …`. Another failure in the same tab within 10 minutes, or in a browser without sessionStorage, is reported as a `chunk` error without reloading.
- Other imports never reload the page. A failed link prefetch (on hover, focus or pointer down) or companion import is reported, at most once per page and outside the 5-report cap, and a failed reporter import is ignored.

Each report has the kind (`error`, `rejection`, `boundary`, `console`, `chunk`), the message, up to 10 stack frames from our own origin, the route, the release (`TEXTJS_RELEASE`, else the short commit hash at build time), the browser family and version (`Chrome 142`, `Safari 18.4`), the OS family, a viewport bucket (`xs` under 640 px, `sm` under 1024, `md` under 1440, `lg`) and the Text.js error code, if there is one.

Reports never contain the user agent, cookies or the page's query string or fragment, and the Function stores no IP address. Unknown paths are reported as `/404`. Reports are sent with `fetch(…, { keepalive: true, credentials: "omit", referrerPolicy: "origin" })`, so the Terminal session cookie (`Path=/`) isn't sent and `Referer` is the origin only. `sendBeacon` can't omit cookies.

Messages are free text, so their redaction is best effort. The browser and the Function both strip query strings, fragments and `key=value` parameters from absolute and relative URLs, and replace emails, IP addresses, long numbers and long tokens with `<email>`, `<ip>`, `<number>` and `<token>`. Values thrown or rejected that aren't `Error`s (strings, plain objects, events) are reported by type only, such as `Non-Error rejection: string` or `Non-Error throw: Object`.

## Volume and performance

The entry bundle has the listeners and a 10-error buffer. The reporter (`assets/reporter-*.js`, 2 KB gzipped) loads after hydration, when the browser is idle, and is never preloaded. Each page load sends at most 5 reports, one per fingerprint. `SAMPLE_RATE` in `apps/web/src/telemetry/shared.ts` is 1; lower it to sample page loads. The Function weights every report by `1 / SAMPLE_RATE` from that same constant, never from the request, so a client can't change a report's weight.

The Function (`apps/web/functions/api/errors.ts`, handler in `apps/web/server/reports.ts`) rejects POSTs whose `Origin` or `Sec-Fetch-Site` is cross-origin and bodies over 8 KB, drops bots and headless browsers by user agent, and validates every field. Before reading the body, each isolate accepts at most 20 reports a minute per IP (`cf-connecting-ip`, counted in memory and never written) and 2,000 a minute in total. Every request, accepted or not, counts as one Workers request.

A Cloudflare rate limiting rule on the textjs.org zone also covers `/api/errors`. `*.pages.dev` URLs have only the Function's limits.

## Where it goes

Each report is one data point in the Analytics Engine dataset `textjs_errors` (binding `ERRORS` in `apps/web/wrangler.toml`) and one JSON log line (`"event":"textjs.report"`) that `wrangler pages deployment tail` shows.

| Column | Field |
| --- | --- |
| `index1` | fingerprint: a hash of the kind, the message with numbers and chunk hashes removed, and the top frame's chunk name |
| `blob1` to `blob10` | kind, message, route, release, browser, OS, viewport, code, stack, `production` or `preview` |
| `double1` | weight (`1 / SAMPLE_RATE`, set by the Function) |

The dataset is created when a deployment with the binding receives its first report. Until then `scripts/errors.ts` prints `No crash reports in production in the last 24 h.` Analytics Engine keeps data for 3 months. See [Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/).

## Reading it

```sh
cd apps/web
bun scripts/errors.ts                  # top 20 fingerprints in production, last 24 hours
bun scripts/errors.ts --hours 2 --limit 50
bun scripts/errors.ts --env preview    # *.pages.dev deployments
bun scripts/errors.ts --json
bun scripts/errors.ts --tail           # live, from wrangler pages deployment tail
bun scripts/errors.ts --help
```

Each fingerprint shows its estimated count, kind, latest message and top frames, the release it was last seen in, and counts by route, browser, OS and viewport.

The script queries the Analytics Engine SQL API with `CLOUDFLARE_API_TOKEN` if it's set, otherwise the `wrangler login` token. An API token needs **Account > Account Analytics > Read**. Set `CLOUDFLARE_ACCOUNT_ID` to skip looking up the account: without it the script uses the token's only account, or with several, the one that owns the `textjs` project.

To check it end to end on a preview deployment, open `/__textjs/throw` there. That route throws after hydration on every host except textjs.org and its subdomains, and its report shows up under `--env preview`. Only production builds send reports; under `vite preview` the report is logged to the terminal.

`apps/web/scripts/e2e-reports.mjs` checks that every page in the sitemap and a run of client navigations send no reports, that the test route sends exactly one with an origin-only `Referer` and no cookies, that a stale route chunk reloads once and never twice, that a failed reporter import never reloads, and that failed hover prefetches never reload and send one `chunk` report:

```sh
bun run build && bun run preview -- --port 4173 --strictPort
PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 node scripts/e2e-reports.mjs
```

## Deploying

`apps/web/wrangler.toml` defines the `ERRORS` binding and the compatibility date. It's the source of truth for the Pages project's bindings, and the dashboard shows them read-only. The secrets `TERMINAL_CLIENT_ID` and `TERMINAL_COOKIE_SECRET` are set in the dashboard. Deploys run `wrangler pages deploy` from `apps/web`, either through the Deploy site workflow or with `bun run deploy`.
