# ▼ terminal — the `ssh terminal.shop` storefront in `console.log`

A Text.js port of [terminal.shop](https://www.terminal.shop)'s SSH shop (Go + Bubble Tea, [`terminaldotshop/terminal`](https://github.com/terminaldotshop/terminal) `packages/go/pkg/tui`). It renders the shop's 80 × 30 "large" layout cell for cell inside the DevTools Console and orders coffee through the real Terminal API.

```bash
bun run dev:terminal                         # from the repo root → http://localhost:3002
bun run --cwd apps/terminal-shop test        # unit + UI tests against an in-memory Terminal API
bun run --cwd apps/terminal-shop typecheck
bun run --cwd apps/terminal-shop e2e -- --mock   # headless Chromium, full checkout, mock API
```

Open the page, press **⌘⌥J**, then click back into the page so it gets the keyboard.

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
| account | `↑/↓` sections · `enter`/`→` open · `esc`/`←` back; orders `x` cancel, `a` edit address; subscriptions `e` address, `c` card, `x` cancel; tokens/apps `enter` create, `x` revoke |
| account → debug info | `e` switch environment · `x` sign out |

Deep links work like `ssh terminal.shop -t <command>`: `/cart`, `/account?page=faq`, `/shop?p=segfault`.

## How it's built

Each screen is ported from its Go view (`shop.go`, `cart.go`, `shipping.go`, `payment.go`, `confirm.go`, `final-sub.go`, `final.go`, `account.go`, `orders.go`, …). `lib/ui.ts` is a small lipgloss-style span layout (place, join, boxes, word wrap with lipgloss' rounding rules), so the views come out cell for cell. `components/Screen.tsx` paints the lines as `<Text>` rows.

| Path | Purpose |
| --- | --- |
| `app/*/page.tsx` | One route per SSH page (`/shop`, `/cart`, `/shipping`, `/payment`, `/confirm`, `/order/subscribe`, `/order/complete`, `/subscribe`, `/account`, `/addresses`, `/menu`, `/email`, `/auth/callback`) |
| `app/api/terminal/[...path]/route.ts` | The proxy for `text start` |
| `components/Shell.tsx` | Splash, sign in, quit screen and the global/header keys (`HeaderUpdate`) |
| `components/screens/*` | The pages |
| `lib/store.ts` | `tui.model`: `/view/init` data, optimistic cart, checkout state, environment and credentials |
| `lib/api.ts` | Terminal API client (the `@terminaldotshop/sdk` surface the shop uses) |
| `lib/auth.ts` | Token storage, OAuth 2.0 + PKCE |
| `lib/frame.ts` | Header table, breadcrumbs, footer, 80 × 30 frame |
| `lib/form.ts` | `huh` forms (two-column address form) |
| `lib/qr.ts` | QR encoder plus the `qrfefe` half-block renderer |
| `server/terminal-proxy.ts` | `/__terminal/{dev,prod}/{api,auth}` proxy |

The proxy exists because the API's CORS reply (`Access-Control-Allow-Headers: *`) doesn't cover `Authorization`, so the page can't send bearer tokens itself. It only answers loopback `Host`s and same-origin requests, requires `x-terminal-client: 1` on writes, caps bodies at 1 MB, and logs nothing.

### Differences from the SSH shop

- **No card form in the console.** The SSH shop offers "add payment information via ssh", which tokenizes the raw card number with Stripe. This port lists only "add payment information via browser": `POST /card/collect` returns a short terminal.shop link where Stripe collects the card over https, shown as a QR code and a clickable URL. The app polls `/card` until the new card appears, like the original, and never handles card numbers.
- **Sign in, email and quitting.** There's a sign in screen in place of the ssh key handshake. "link email" and the email gate point to `ssh … -t link-email`, because the API only allows linking from an ssh session. `q` shows "Connection to terminal.shop closed.", and `enter` reconnects.
- **debug info** shows the environment, API and token source instead of the ssh fingerprint. It's also where you switch environments and sign out.
- **QR code.** qrfefe pads the code's odd last module row with a solid row; this draws the real modules, so the code is the same shape and still decodes.
- **Order address picker.** Its boxes are 2 columns narrower so their right border isn't clipped.
- **Only the large layout.** The grid is fixed at 80 × 30, so the small and medium layouts aren't ported.

## Tests

- `test/unit.test.ts` covers the proxy (host, CSRF and production locks, token precedence, no leaks), the client, OAuth/PKCE, the layout helpers, forms, the QR encoder and the store (last-write-wins cart, rejected tokens, production lock).
- `test/shop.test.tsx` mounts the real `app/` routes. It compares screens with text captured from `ssh terminal.shop` (`test/fixtures/ssh/*.txt`, shop/cart/account/menu, identical), checks theme colors in the cell buffer, and runs checkout end to end against `test/mock-terminal.ts`: address, browser card, idempotent convert with retry, subscribe-after-order, cron, email gate. It also covers account actions, sign in and deep links.
- `scripts/e2e.ts` runs headless Chromium (`bench/devtools`' playwright-core), presses real keys, and decodes every `console.log("%c…")` frame back to text. It checks each frame against the renderer's cell buffer, and writes the frames to `--out` (default `$TMPDIR/terminal-shop-e2e-*`).
  - `--mock` starts an in-memory API behind a fresh dev server.
  - Without `--mock` it drives `http://localhost:3002` against the dev sandbox. It signs in with `TERMINAL_DEV_TOKEN` (or uses the server's token), adds the Stripe test card on the dev card page, and stops at confirm.
  - `--place-order` also converts the cart.
  - It refuses to run unless the debug page says "dev sandbox", and refuses to type a card anywhere but `dev.trm.sh` / `dev.terminal.shop`.
