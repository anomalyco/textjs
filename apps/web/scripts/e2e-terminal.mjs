// Headless E2E for /terminal on `wrangler pages dev` (the real Pages Functions):
// browse signed out → sign in through the OAuth redirect → add to cart with keys.
//
//   bun scripts/terminal-mock.ts --port 8790 &
//   bunx wrangler pages dev dist --port 8788 --compatibility-date 2026-10-01 \
//     --binding TERMINAL_CLIENT_ID=cli_e2e \
//     --binding TERMINAL_API_URL=http://127.0.0.1:8790 --binding TERMINAL_AUTH_URL=http://127.0.0.1:8790/auth
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:8788 CLIENT_ID=cli_e2e node scripts/e2e-terminal.mjs
//
// With a stand-in auth server (the mock) the flow completes; against the real one
// (`REAL_AUTH=1`, no URL overrides) it checks the redirect to auth.terminal.shop and stops
// there, before Terminal's login page loads.
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:8788").replace(/\/$/, "");
const clientId = process.env.CLIENT_ID ?? "textjs-local";
const realAuth = process.env.REAL_AUTH === "1";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  window.__frames = [];
  const orig = console.log.bind(console);
  console.log = (...a) => {
    if (typeof a[0] === "string" && a[0].includes("%c")) window.__frames.push(a[0].replace(/%c/g, "").replace(/%%/g, "%").replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, ""));
    return orig(...a);
  };
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const authorizeUrls = [];
// Never load Terminal's real login page: record the redirect and stop.
await page.route(
  (url) => url.hostname === "auth.terminal.shop" || url.hostname === "auth.dev.terminal.shop",
  (r) => {
    authorizeUrls.push(r.request().url());
    return r.abort();
  },
);
page.on("request", (r) => {
  if (r.isNavigationRequest() && new URL(r.url()).pathname.endsWith("/authorize")) authorizeUrls.push(r.url());
});

const last = () => page.evaluate(() => window.__frames[window.__frames.length - 1] ?? "");
const settle = (ms = 200) => page.waitForTimeout(ms);
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n${detail}`}`);
  if (!ok) failures++;
};
async function until(text, timeout = 8000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const f = await last();
    if (typeof text === "string" ? f.includes(text) : text.test(f)) return f;
    if (Date.now() > deadline) return null;
    await settle(100);
  }
}
async function press(...keys) {
  for (const k of keys) {
    await page.keyboard.press(k);
    await settle(120);
  }
  await settle(200);
}
const clickPad = async () => {
  await page.mouse.click(640, 640);
  await settle(300);
};

await page.goto(`${base}/terminal`);
check("prerendered pad", (await page.locator("[data-textjs-focus-pad]").count()) === 1);
check("footer links to /terminal", (await page.locator('footer a[href="/terminal"]').count()) === 1);
await clickPad();
const shop = await until("~ featured ~");
check("signed out: the shop loads public products", shop !== null, await last());
await press("ArrowDown", "ArrowDown");
check("arrow keys browse products", (await last()).includes("segfault"), await last());
await press("+");
const prompt = await until("sign in to add coffee to your cart");
check("adding to the cart asks you to sign in", prompt !== null, await last());
check("sign in screen offers Terminal OAuth, no API key", (await last()).includes("sign in with terminal (oauth 2.0)") && (await last()).includes("no api key needed"), await last());

const signedInNav = page.waitForURL((u) => u.pathname === "/terminal" && authorizeUrls.length > 0, { timeout: 10000 }).catch(() => null);
await press("Enter");
await (realAuth ? page.waitForTimeout(1500) : signedInNav);
const authorize = authorizeUrls[0] ? new URL(authorizeUrls[0]) : null;
const q = authorize?.searchParams;
check("sign in redirects to /authorize", authorize !== null && authorize.pathname.endsWith("/authorize"), String(authorizeUrls));
if (realAuth) check("…on auth.terminal.shop", authorize?.origin === "https://auth.terminal.shop", authorize?.origin);
check("…with the configured client id", q?.get("client_id") === clientId, q?.get("client_id"));
check("…the callback as redirect_uri", q?.get("redirect_uri") === `${base}/terminal/callback`, q?.get("redirect_uri"));
check("…code + PKCE S256 + state", q?.get("response_type") === "code" && q?.get("code_challenge_method") === "S256" && /^[\w-]{43}$/.test(q?.get("code_challenge") ?? "") && /^[\w-]{20,}$/.test(q?.get("state") ?? ""), authorize?.search);
check("…and no secret in the URL", !q?.has("client_secret"));

if (!realAuth) {
  check("back on /terminal after the callback, params stripped", new URL(page.url()).pathname === "/terminal" && new URL(page.url()).search === "", page.url());
  check("the session cookie is invisible to page JS", !(await page.evaluate(() => document.cookie)).includes("trm_"), await page.evaluate(() => document.cookie));
  await clickPad();
  check("signed in: the shop loads", (await until("~ featured ~")) !== null, await last());
  // The mock keeps its cart between runs, so compare against the count before.
  const count = (f) => Number(/c cart \$\s*\d+ \[(\d+)\]/.exec(f)?.[1] ?? NaN);
  const before = count(await last());
  await press("ArrowDown", "ArrowDown", "+", "+");
  await settle(500);
  check("+ adds to the cart", count(await last()) === before + 2, await last());
  await press("c");
  const cart = await until("cart / shipping");
  check("c opens the cart with the item", cart !== null && new RegExp(`segfault\\s+- ${before + 2} \\+`).test(cart), await last());
  await press("a");
  await until("orders");
  check("account opens", (await last()).includes("Ada Lovelace") || (await last()).includes("orders"), await last());
}

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
process.exit(failures ? 1 : 0);
