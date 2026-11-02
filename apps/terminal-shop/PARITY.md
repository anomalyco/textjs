# Parity with `ssh terminal.shop`

The source of truth is the SSH app itself: `terminaldotshop/terminal`, `packages/go/pkg/tui` (Go + Bubble Tea, commit `371fed2`, 2026-10-06), and the API it calls (`api.terminal.shop`, OpenAPI from `packages/functions/src/api`). This file lists every feature of that app and how this port matches it.

**Status:** ✅ done · 🟡 partial · ❌ missing · ➕ ours only (not in the SSH app). "Before" is `main` at v1.0.3; "after" is this branch.

## Layout and chrome

| Feature | Go source | Before | After | Notes |
| --- | --- | --- | --- | --- |
| Large layout (80 wide, up to 30 tall) | `root.go` | ✅ | ✅ | Identical to the captures at 80 × 30 and 120 × 40. |
| Container centered in the console, background around it | `root.go` `View()` | ❌ | ✅ | Was pinned top-left at 80 × 30. |
| Medium layout (50 wide, under 80 columns) | `root.go`, `header.go`, `breadcrumbs.go` | ❌ | ✅ | `m ☰` · logo · cart header, short breadcrumbs (`cart / ship / pay / confirm`). |
| Small layout (whole console, under 50 columns) | `root.go`, `header.go`, `footer.go` | ❌ | ✅ | `t` + cart header, footer is only `m menu` (no message line, no errors). |
| `ResizeView` under 20 × 10 | `resize.go` | ❌ | ✅ | Pages stay mounted and keep handling keys, like the SSH app. |
| Shop and account stack their viewports below large | `shop.go`, `account.go` | ❌ | ✅ | Faithful, including the SSH app's quirk: each viewport is the full body height, so the list fills the body and the footer is pushed out. |
| Address form stacks its columns on small | `address_form.go` | ❌ | ✅ | `LayoutStack`, with the focused field scrolled into view. |
| Header tabs, active tab, cart badge (`$NN [n]`) | `header.go` | ✅ | ✅ | Includes lipgloss counting `☰` as two columns. |
| Footer: free shipping line, key hints, region flag, error panel | `footer.go` | ✅ | ✅ | Hints wrap at the content width like lipgloss. |
| Breadcrumbs (cart and subscribe flows) | `breadcrumbs.go` | ✅ | ✅ | |
| Splash (blinking brand cursor, ≥ 2 s) | `splash.go`, `cursor.go` | ✅ | ✅ | Centered in the console. |
| Menu (`m`) | `menu.go` | ✅ | ✅ | |
| Theme: per-product highlight, `#FF5C00` brand, borders `#3A3F42` | `theme/` | ✅ | ✅ | |
| Global keys `s` `a` `c` `m` `q` `ctrl+c`, `esc` dismisses errors | `header.go`, `root.go` | ✅ | ✅ | Off while a form has focus, like `HeaderNavigationEnabled`. |
| Deep links (`ssh terminal.shop -t cart`, `-t <product>`, `-t <account page>`) | `root.go` `routeToInitialPage` | ✅ | ✅ | `/cart`, `/shop?p=segfault`, `/account?page=faq`. The SSH app also takes prefixes (`-t ord`); this port takes full names. |

## Shop

| Feature | Before | After | Notes |
| --- | --- | --- | --- |
| Product list with `~ featured ~` / `~ originals ~` | ✅ | ✅ | |
| Product detail: name, variants, price, description | ✅ | ✅ | |
| Quantity `+`/`-` (optimistic cart, last write wins) | ✅ | ✅ | |
| Subscription-only products (cron): subscribe / manage sub | ✅ | ✅ | |
| Variant picker for subscriptions | ✅ | ✅ | `subscribe.go` |
| Region toggle `r` (US / EU / Global) | ✅ | ✅ | |
| "no products available for this region" | ✅ | ✅ | |

## Cart and checkout

| Feature | Before | After | Notes |
| --- | --- | --- | --- |
| Cart: items, quantities, subtotal, empty state | ✅ | ✅ | |
| Email gate before checkout | 🟡 | 🟡 | The API only links an email from an SSH session (`sshSessionRequired`), so the gate points at `ssh terminal.shop -t link-email`. |
| Shipping: pick, add, remove an address | ✅ | ✅ | Now starts on the cart's last address. |
| Payment: pick or remove a card | ✅ | ✅ | |
| Add a card via browser (`POST /card/collect`, QR code, poll `/card`) | ✅ | ✅ | |
| Add a card via ssh (card form, Stripe tokenization, `POST /card`) | ❌ | ❌ | On purpose: the console never handles card numbers. `POST /card` needs a Stripe token made with Terminal's publishable key. |
| Confirm: address, shipping service and timeframe, card, totals | ✅ | ✅ | |
| Place order (`POST /cart/convert`, idempotency key) | ✅ | ✅ | On textjs.org, a real order takes a letter shown only in the console. |
| Subscribe to the order just placed (every N weeks) | ✅ | ✅ | Same confirmation letter on textjs.org. |
| Thank-you page, then "connection closed" | ✅ | ✅ | |

## Account

| Section | Go source | Before | After | Notes |
| --- | --- | --- | --- | --- |
| Order history: list, totals, dates | `orders.go` | ✅ | ✅ | |
| Order detail: address, items, totals, change status | `orders.go` | ✅ | ✅ | |
| Order tracking: status, service, number | `orders.go` | ✅ | ✅ | ➕ Also `statusDetails` and the carrier link (`tracking.url`), clickable in the console. |
| Cancel an order (before fulfillment) | `orders.go` | ✅ | ✅ | `DELETE /order/{id}` |
| Change an order's shipping address | `orders.go` | ✅ | ✅ | `PATCH /order/{id}/shipping` |
| Subscriptions: list, detail, cancel | `subscriptions.go` | ✅ | ✅ | |
| Subscription: change address (`e`) or card (`c`) | `address_book.go`, `payment.go` | ✅ | ✅ | `PUT /subscription/{id}` |
| Subscription: change the weekly schedule | — | ❌ | ➕ | `+`/`-` then `enter` in the detail (`PUT /subscription/{id}` `schedule`). The API has it, the SSH app doesn't. Monthly (cron) schedules don't change. |
| Access tokens: list, create (shown once), revoke | `tokens.go` | 🟡 | ✅ | Local: full. textjs.org: create needs `TERMINAL_ALLOW_CREDENTIALS=1` on the deployment (off by default) plus the console-only letter; without it, it points at `ssh terminal.shop -t tokens`. |
| Apps (OAuth 2.0): list, create (secret shown once), remove | `apps.go` | 🟡 | ✅ | Same as tokens (`-t apps`). |
| Addresses: list, add, edit, remove | `address_book.go` | ✅ | ✅ | |
| Addresses: default | — | ❌ | 🟡 | Neither the API nor the SSH app has a default address. The cart remembers the last one (`PUT /cart/address`), and shipping now starts on it. |
| Payment methods: list, add (hosted page), remove | `account.go` `paymentPage` | ❌ | ✅ | Written in the SSH app but commented out of its menu; enabled here. Shows which cards pay for a subscription. |
| Profile: name (view, edit) | — | 🟡 | ➕ | `PUT /profile` takes only `name`. Before: read-only in debug info. |
| Profile: email | — | 🟡 | 🟡 | Shown; changing it means linking from SSH (`ssh terminal.shop -t link-email`). |
| Link email | `link_email.go` | 🟡 | 🟡 | `POST /account/link-email` refuses anything but an SSH session, so selecting it shows the ssh command. Preview copy matches ("select this item to start."). |
| FAQ | `faq.go`, `faq.json` | ✅ | ✅ | |
| About | `about.go` | ✅ | ✅ | |
| Debug info | `debug.go` | 🟡 | 🟡 | Shows the browser session (mode, environment, API) instead of the ssh key fingerprint and command. |

## Signed out (textjs.org)

| Feature | Before | After | Notes |
| --- | --- | --- | --- |
| Browse products (cached catalogue, recorded fallback) | ✅ | ✅ | No per-visitor live calls: the Functions cache `GET /product` per region; the page falls back to the recorded catalogue. |
| Menu | ✅ | ✅ | |
| Cart | 🟡 | ✅ | Before: a full-screen sign in prompt. Now the cart page opens and `enter` signs in, back to `/cart`. |
| Account menu, FAQ, about, debug info | ❌ | ✅ | Before: the whole account asked you to sign in. |
| Account sections that need an account | 🟡 | ✅ | Each says what signing in unlocks ("sign in to see your orders"); `enter` starts Terminal's OAuth and returns to that section. |

## Side-by-side shots

`parity/<shot>.png` shows the real app (left, `ssh terminal.shop` in a pty rendered by xterm, signed in with a throwaway key, browsing only) next to this port (right) at 120 × 40, 80 × 30, 60 × 24, 45 × 20 and 18 × 8. Screens the SSH app doesn't have are rendered alone. `test/responsive.test.tsx` compares the text of every capture with this port.

| Shot | Sizes | Text identical |
| --- | --- | --- |
| shop (cron selected) | 120 × 40, 80 × 30, 60 × 24, 45 × 20, 18 × 8 | ✅ |
| shop (segfault) | 80 × 30, 60 × 24, 45 × 20 | ✅ |
| cart (empty) | 80 × 30, 60 × 24, 45 × 20 | ✅ |
| account (order history) | 120 × 40, 80 × 30, 60 × 24, 45 × 20 | ✅ (with our two extra menu rows taken out) |
| account: subscriptions, tokens, apps, addresses, link email, faq, about | 80 × 30 (faq also 60 × 24) | ✅ (same) |
| account: debug info | 80 × 30 | ❌ on purpose (ssh key session vs. browser session) |
| address book | 80 × 30 | ✅ |
| menu | 120 × 40, 80 × 30, 60 × 24, 45 × 20 | ✅ |

To refresh them:

```bash
# On a host that can reach terminal.shop:22, with a throwaway key (never your own):
ssh-keygen -t ed25519 -N "" -f /tmp/throwaway
XTERM=…/@xterm/headless/lib-headless/xterm-headless.mjs SSH_KEY=/tmp/throwaway bun parity/capture-all.ts
bun parity/compare.ts      # diff the text, write parity/ours/
bun parity/render.ts       # write the PNGs
```
