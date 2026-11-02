// Headless E2E for /coffee (the Playground's terminal.shop demo) on `wrangler pages dev` (the real
// Pages Functions): browse signed out → sign in through the OAuth redirect (registered as
// /terminal/callback, landing back on /coffee) → add to cart with keys.
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
// Loopback is only the site and the mock's stand-in auth server; never a local OpenCode server.
const allowedPorts = new Set([new URL(base).port, process.env.MOCK_PORT ?? "8790"]);
await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && !allowedPorts.has(url.port), (r) => r.abort());
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

await page.goto(`${base}/coffee`);
check("prerendered pad", (await page.locator("[data-textjs-focus-pad]").count()) === 1);
check("no footer link: the Playground picker reaches it", (await page.locator('footer a[href="/coffee"]').count()) === 0);
const picked = () => page.evaluate(() => document.querySelector('.pad-picker [aria-current="page"]')?.textContent);
check("/coffee opens the Playground with Coffee picked", (await picked()) === "Coffee", await picked());
await clickPad();
const shop = await until("~ featured ~");
check("signed out: the shop loads public products", shop !== null, await last());
await press("ArrowDown", "ArrowDown");
check("arrow keys browse products", (await last()).includes("segfault"), await last());
// Signed out, the account opens: faq is public, sections say what signing in unlocks.
await press("a");
check("signed out: account sections ask to sign in inline", (await until("sign in to see your orders")) !== null, await last());
for (let i = 0; i < 8; i++) await press("ArrowDown");
check("signed out: the faq is readable", (await until("help, i have a question about my order!")) !== null, await last());
await press("s");
await until("~ featured ~");
await press("ArrowDown", "ArrowDown");
await press("+");
const prompt = await until("sign in to add coffee to your cart");
check("adding to the cart asks you to sign in", prompt !== null, await last());
// Production adds no warning here (checkout asks before money moves); the sandbox says so.
check("sign in screen says how to sign in and back out", (await last()).includes("enter sign in   esc back") && !/orders here are charged/.test(await last()), await last());

const signedInNav = page.waitForURL((u) => u.pathname === "/coffee" && authorizeUrls.length > 0, { timeout: 10000 }).catch(() => null);
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
  check("back on /coffee after the callback, params stripped", new URL(page.url()).pathname === "/coffee" && new URL(page.url()).search === "", page.url());
  check("…with Coffee picked", (await picked()) === "Coffee", await picked());
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

  // A link can't drop you on a checkout step.
  await page.goto(`${base}/coffee?at=%2Fconfirm`);
  await clickPad();
  const landed = await until("~ featured ~");
  check("?at=/confirm opens the shop, not checkout", landed !== null && !landed.includes("press enter to confirm"), await last());
  await page.goto(`${base}/coffee?signin_error=Call%201-800-SCAM`);
  await clickPad();
  await until("~ featured ~");
  check("free-text ?signin_error= is never shown", !(await last()).includes("SCAM"), await last());
  const status = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/_status");
    return { csp: r.headers.get("content-security-policy"), nosniff: r.headers.get("x-content-type-options") };
  });
  check("Function responses carry CSP + nosniff", status.csp === "default-src 'none'; frame-ancestors 'none'" && status.nosniff === "nosniff", JSON.stringify(status));
  const minted = await page.evaluate(async () => (await fetch("/api/terminal/prod/api/token", { method: "POST", headers: { "x-terminal-client": "1", "content-type": "application/json" }, body: "{}" })).status);
  check("POST /token can't be reached from the page", minted === 404, String(minted));
}

// The console size picked on the pad changes the layout like a terminal window does.
for (const [size, needle, label] of [
  ["60x24", "m ☰", "60 × 24: the medium layout"],
  ["45x20", "c cart", "45 × 20: the small layout"],
  ["120x36", "s shop", "120 × 36: the large layout, centered"],
]) {
  await page.evaluate((s) => localStorage.setItem("textjs:viewport", s), size);
  await page.goto(`${base}/coffee`);
  await clickPad();
  const f = await until(needle);
  const lines = (f ?? "").split("\n");
  const ok = f !== null && (size !== "45x20" || !f.includes("s shop")) && (size !== "120x36" || lines.some((l) => l.indexOf("┌") === 21));
  check(label, ok, f ?? (await last()));
}
await page.evaluate(() => localStorage.setItem("textjs:viewport", "fit"));

// Only the callback and the API live under /terminal; the old page path redirects to /coffee (public/_redirects).
const statuses = await page.evaluate(async () => Object.fromEntries(await Promise.all(["/terminal", "/coffee"].map(async (p) => [p, await fetch(p).then((r) => `${r.status} ${new URL(r.url).pathname}`)]))));
check("/terminal redirects to /coffee, a 200", statuses["/terminal"] === "200 /coffee" && statuses["/coffee"] === "200 /coffee", JSON.stringify(statuses));

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
process.exit(failures ? 1 : 0);
