# ▼ terminal

A Text.js port of [terminal.shop](https://www.terminal.shop)'s SSH shop (Go + Bubble Tea, [`terminaldotshop/terminal`](https://github.com/terminaldotshop/terminal) `packages/go/pkg/tui`). It renders the shop in the DevTools console, with the same small, medium and large layouts as the SSH app, and orders coffee through the real Terminal API. [PARITY.md](PARITY.md) lists every feature of the SSH app and how this port matches it.

```bash
bun run dev:terminal                         # from the repo root → http://localhost:3002
bun run --cwd apps/terminal-shop test        # unit + UI tests against an in-memory Terminal API
bun run --cwd apps/terminal-shop typecheck
bun run --cwd apps/terminal-shop e2e -- --mock   # headless Chromium, full checkout, mock API
```

Open the page, [open the browser console](https://textjs.org/docs/installation#open-the-console), then click back into the page so it gets the keyboard.

## Signing in

The SSH shop knows you by your ssh key. In the browser you bring one of:

- **A personal access token.** Create one in the SSH shop (`ssh dev.terminal.shop -t tokens` for the sandbox, `ssh terminal.shop -t tokens` for production) and paste it on the sign in screen. It's stored in this browser's `localStorage` (`terminal-shop:auth:<env>`) and sent only to the local proxy.
- **A server-side token.** Put it in `apps/terminal-shop/.env.local` (git-ignored; see `.env.example`) as `TERMINAL_DEV_TOKEN=trm_test_…`. The proxy attaches it, and the browser never sees it.
- **The browser (OAuth 2.0 + PKCE).** "sign in with the browser" opens Terminal's OpenAuth server (password, email code, GitHub or Twitch). It redirects back to `/auth/callback` and the code is exchanged through the proxy. Terminal's auth server accepts `localhost` redirects for any client id, so nothing needs registering.

Checkout needs an email on the account (the API refuses orders without one). Accounts made over ssh can add one on the hosted card page, or link one with `ssh … -t link-email`.

## Environments: dev by default, production only when you say so

| | dev sandbox (default) | production |
| --- | --- | --- |
| API | `api.dev.terminal.shop` | `api.terminal.shop` |
| Cards | Stripe test mode: `4242 4242 4242 4242`, any future expiry, any CVC | real cards, real charges |
| Orders | never fulfilled | shipped |
| Tokens | `trm_test_…` | `trm_live_…` |

Production has two locks. The dev server refuses every `/prod/*` request unless it was started with `TERMINAL_ENABLE_PRODUCTION=1`. In the app you then switch explicitly, and it asks first. Tokens are also checked against the environment: a `trm_live_` token is rejected in the sandbox and vice versa. The confirm screen says "dev sandbox: test card, nothing is charged or shipped" while you're in the sandbox, and nothing extra in production, like the original.

To order for real:

```bash
cd apps/terminal-shop
TERMINAL_ENABLE_PRODUCTION=1 bun run dev     # or put it in .env.local
```

Then go to **a account → debug info**, press **e**, answer **y**, and sign in with a production token (`ssh terminal.shop -t tokens`) or the browser. To go back to the sandbox, press **e** on the same page again, or restart the server without the variable.

## On textjs.org (`/coffee`)

[textjs.org/coffee](https://textjs.org/coffee) runs this same app in the site's console companion (`embed.tsx` → `apps/web/src/demos/terminal.tsx`). It differs in three ways:

- **Sign in uses Terminal's OAuth.** There's no token paste or API key. Cloudflare Pages Functions in `apps/web/functions/` (logic in `apps/web/server/terminal-session.ts`) run the authorization code + PKCE flow. They keep the tokens in a `__Host-` cookie (httpOnly, Secure, SameSite=Lax), so page JavaScript never sees one. The cookie is sealed with AES-256-GCM, so other `*.textjs.org` hosts can't plant, read or forge it. By default the proxy never forwards anything that mints a long-lived credential: new access tokens and OAuth apps come from `ssh terminal.shop -t tokens` / `-t apps`. Keep it that way in production: a token or app secret is a long-lived credential, and any script running on textjs.org could request one with the visitor's session and send it elsewhere, where revoking the session wouldn't stop it. `TERMINAL_ALLOW_CREDENTIALS=1` turns creation on (each one then takes the console-only confirmation letter described below); it's meant for preview deployments against the dev sandbox. The local app (`bun run dev:terminal`, the mock) always lets you create them. Terminal's OpenAuth issuer treats apps as public clients: the token exchange sends `client_id`, `redirect_uri` and the PKCE verifier, with no client secret.
- **Production by default.** It's the real store. Products, the menu, the cart page and the account's faq, about and debug info are public, so you can browse signed out. Adding to the cart, checkout and each account section ask you to sign in, and come back to where you were. Placing a real order, or subscribing to one, needs one more key: a letter that changes every time and appears only in the console frame. A key script like "press enter, then y" can't buy anything for someone who can't see the console, and held-down keys never confirm. Links (and the sign in round trip) only open the shop, cart, account or menu, never a checkout step. Cards are still entered only on Terminal's hosted card page.
- **Fixed environment.** A deployment talks to one Terminal (`TERMINAL_ENVIRONMENT`, default `prod`), so `e` doesn't switch.

Configuration (Pages environment):

| Variable | |
| --- | --- |
| `TERMINAL_COOKIE_SECRET` | Required in production (a Pages secret): at least 32 random bytes, e.g. `openssl rand -base64 32`. Seals the session cookies. Without it, sign in stays off (browsing still works). On `localhost`, a random key is generated per process. Changing it signs everyone out. |
| `TERMINAL_CLIENT_ID` | Required in production. The id of the registered "textjs.org" Terminal app (below). Without it, sign in says it isn't set up and browsing still works. On `localhost`, `textjs-local` is used, because Terminal accepts localhost redirects for any client id. |
| `TERMINAL_ALLOW_CREDENTIALS` | `1` lets signed-in visitors create personal access tokens and OAuth apps from the console. Off by default; leave it off in production. |
| `TERMINAL_ENVIRONMENT` | `prod` (default) or `dev` (sandbox, for preview deployments). Anything else fails closed. |
| `TERMINAL_API_URL`, `TERMINAL_AUTH_URL` | Local e2e only: point at `apps/web/scripts/terminal-mock.ts` |

There's no `TERMINAL_CLIENT_SECRET`. The app's secret is never used, so don't store it anywhere.

**Registering the app (once, per environment):** run `ssh terminal.shop -t apps`, choose "create app", name it `textjs.org`, and set the redirect URI to `https://textjs.org/terminal/callback`. The callback then opens the shop at `/coffee`. Copy the app id (`cli_…`). Terminal checks `client_id` plus the exact origin + path of `redirect_uri` against that row, and an app has exactly one redirect URI. Local development needs no app. For a sandbox preview deployment, register a second app with `ssh dev.terminal.shop -t apps` and its own `https://<preview-host>/terminal/callback`.

```bash
cd apps/web
openssl rand -base64 32 | bunx wrangler pages secret put TERMINAL_COOKIE_SECRET --project-name textjs
bunx wrangler pages secret put TERMINAL_CLIENT_ID --project-name textjs   # paste the cli_… id
bun run build                                                               # after `bun run build:packages` at the root
bunx wrangler pages deploy dist --project-name textjs                       # run from apps/web so ./functions is uploaded
```

Locally, against an in-memory Terminal:

```bash
cd apps/web && bun run build
bun scripts/terminal-mock.ts --port 8790 &
bunx wrangler pages dev dist --port 8788 --compatibility-date 2026-10-01 --binding TERMINAL_CLIENT_ID=cli_e2e \
  --binding TERMINAL_API_URL=http://127.0.0.1:8790 --binding TERMINAL_AUTH_URL=http://127.0.0.1:8790/auth
BASE=http://localhost:8788 CLIENT_ID=cli_e2e node scripts/e2e-terminal.mjs
```

`vite dev` and `vite preview` mount the same handler, configured from `process.env`.

## Keys

Same bindings as the SSH shop:

| Where | Keys |
| --- | --- |
| everywhere (outside forms) | `s` shop · `a` account · `c` cart · `m` menu · `q` quit · `ctrl+c` quit · `esc` dismiss error |
| shop | `↑/↓` `j/k` `tab` products · `+/-` `←/→` qty · `enter` cart or subscribe · `r` region · `pgup/pgdn` scroll |
| cart | `↑/↓` items · `+/-` qty · `enter` checkout · `esc` back |
| shipping / payment | `↑/↓` choose · `enter` select · `x`/`del` remove (`y`/`n`) · `esc` back |
| forms | `tab`/`enter` next · `shift+tab` previous · `enter` on the last field submits |
| payment via browser | `enter` opens the link (or click it in the console, or scan the QR code) |
| confirm | `enter` places the order · `esc` back |
| after ordering | `+/-` weeks · `enter` subscribe · `esc` skip |
| account | `↑/↓` sections · `enter`/`→` open · `esc`/`←` back · `pgup/pgdn` scroll; orders `x` cancel, `a` edit address; subscriptions `e` address, `c` card, `+/-` then `enter` schedule, `x` cancel; tokens/apps `enter` create, `x` revoke; payment methods `enter` add, `x` remove; profile `enter` edit name |
| account → debug info | `e` switch environment · `x` sign out |

Deep links work like `ssh terminal.shop -t <command>`: `/cart`, `/account?page=faq`, `/shop?p=segfault`. Account pages: `orders`, `subscriptions`, `tokens`, `apps`, `addresses`, `link-email`, `payment`, `profile`, `faq`, `about`, `debug`.

## Console size

Like the SSH app, the layout follows the window (`root.go`'s `tea.WindowSizeMsg` handler). The container is centered in the console:

| Console | Layout |
| --- | --- |
| 80 columns or more | large: 80 wide, up to 30 tall, tabs for shop, account and cart |
| 50 to 79 columns | medium: 50 wide, up to 30 tall, `m ☰` header, short breadcrumbs |
| 20 to 49 columns | small: the whole console, `t` and cart header, only `m menu` in the footer |
| under 20 × 10 | "your terminal is too small" |

Below the large layout the shop and the account stack their two panes, as the SSH app does.

## How it's built

Each screen is ported from its Go view (`shop.go`, `cart.go`, `shipping.go`, `payment.go`, `confirm.go`, `final-sub.go`, `final.go`, `account.go`, `orders.go`, …). `lib/ui.ts` is a small lipgloss-style span layout (place, join, boxes, word wrap with lipgloss' rounding rules), so the views match the Go layout. `components/Screen.tsx` paints the lines as `<Text>` rows.

| Path | Purpose |
| --- | --- |
| `app/*/page.tsx` | One route per SSH page (`/shop`, `/cart`, `/shipping`, `/payment`, `/confirm`, `/order/subscribe`, `/order/complete`, `/subscribe`, `/account`, `/addresses`, `/menu`, `/email`, `/auth/callback`) |
| `app/api/terminal/[...path]/route.ts` | The proxy for `text start` |
| `components/Shell.tsx` | Splash, sign in, quit screen and the global/header keys (`HeaderUpdate`) |
| `components/screens/*` | The pages |
| `lib/store.ts` | `tui.model`: `/view/init` data, optimistic cart, checkout state, environment and credentials |
| `lib/api.ts` | Terminal API client (the `@terminaldotshop/sdk` surface the shop uses) |
| `lib/auth.ts` | Token storage, OAuth 2.0 + PKCE |
| `lib/frame.ts` | Size classes, header table, breadcrumbs, footer, the container centered in the console |
| `lib/form.ts` | `huh` forms (two-column address form) |
| `lib/qr.ts` | QR encoder plus the `qrfefe` half-block renderer |
| `server/terminal-proxy.ts` | `/__terminal/{dev,prod}/{api,auth}` proxy |
| `embed.tsx` | The shop as a component plus a static route manifest, for textjs.org |

The proxy exists because the API's CORS reply (`Access-Control-Allow-Headers: *`) doesn't cover `Authorization`, so the page can't send bearer tokens itself. It only answers loopback `Host`s and same-origin requests, requires `x-terminal-client: 1` on writes, caps bodies at 1 MB, and logs nothing.

### Differences from the SSH shop

- **No card form in the console.** The SSH shop offers "add payment information via ssh", which tokenizes the raw card number with Stripe. This port lists only "add payment information via browser": `POST /card/collect` returns a short terminal.shop link where Stripe collects the card over https, shown as a QR code and a clickable URL. The app polls `/card` until the new card appears, like the original, and never handles card numbers.
- **Sign in, email and quitting.** There's a sign in screen in place of the ssh key handshake. "link email" and the email gate point to `ssh … -t link-email`, because the API only allows linking from an ssh session. `q` shows "Connection to terminal.shop closed.", and `enter` reconnects.
- **debug info** shows the environment, API and token source instead of the ssh fingerprint. It's also where you switch environments and sign out.
- **QR code.** qrfefe pads the code's odd last module row with a solid row; this draws the real modules, so the code is the same shape and still decodes.
- **Order address picker.** Its boxes are 2 columns narrower so their right border isn't clipped.
- **Account extras.** "payment methods" is the SSH app's own `paymentPage`, which it leaves commented out of its menu. "profile" (change your name, `PUT /profile`) and changing a subscription's weekly schedule (`PUT /subscription/{id}`) use API routes the SSH app doesn't expose. Order tracking also shows the carrier link.

## Tests

- `test/unit.test.ts` covers the proxy (host, CSRF and production locks, token precedence, no leaks), the client, OAuth/PKCE, the layout helpers, forms, the QR encoder and the store (last-write-wins cart, rejected tokens, production lock).
- `test/shop.test.tsx` mounts the real `app/` routes. It compares screens with text captured from `ssh terminal.shop` (`test/fixtures/ssh/*.txt`, shop/cart/account/menu, identical), checks theme colors in the cell buffer, and runs checkout end to end against `test/mock-terminal.ts`: address, browser card, idempotent convert with retry, subscribe-after-order, cron, email gate. It also covers account actions, sign in and deep links.
- `test/responsive.test.tsx` covers each size class, centering, live resizing and `ResizeView`, and compares this port's text with every capture in `parity/ssh/` (see PARITY.md).
- `test/site.test.tsx` runs the textjs.org mode behind a stand-in for the site's proxy. It covers signed-out browsing, the sign in gates and redirect, the y/n before real orders, sign out and an expired session. It also checks that the embed's route manifest matches `app/`.
- `scripts/e2e.ts` runs headless Chromium (`bench/devtools`' playwright-core), presses real keys, and decodes every `console.log("%c…")` frame back to text. It checks each frame against the renderer's cell buffer, and writes the frames to `--out` (default `$TMPDIR/terminal-shop-e2e-*`).
  - `--mock` starts an in-memory API behind a fresh dev server.
  - Without `--mock` it drives `http://localhost:3002` against the dev sandbox. It signs in with `TERMINAL_DEV_TOKEN` (or uses the server's token), adds the Stripe test card on the dev card page, and stops at confirm.
  - `--place-order` also converts the cart.
  - It refuses to run unless the debug page says "dev sandbox", and refuses to type a card anywhere but `dev.trm.sh` / `dev.terminal.shop`.
