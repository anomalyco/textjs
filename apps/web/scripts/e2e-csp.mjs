// Headless CSP audit: every prerendered page, plus learn video playback, the certificate, a paired
// OpenCode bridge (a mock OpenCode server behind the real bridge) and the /coffee sign-in redirect,
// with no `securitypolicyviolation` and no CSP or Permissions-Policy console warnings.
//
// Needs a server that applies dist/_headers (`vite preview` doesn't):
//   bun scripts/terminal-mock.ts --port 8790 &
//   bunx wrangler pages dev dist --port 8788 --compatibility-date 2026-10-01 \
//     --binding TERMINAL_CLIENT_ID=cli_e2e \
//     --binding TERMINAL_API_URL=http://127.0.0.1:8790 --binding TERMINAL_AUTH_URL=http://127.0.0.1:8790/auth
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:8788 MOCK_PORT=8790 node scripts/e2e-csp.mjs
//
// CSP_MODE=report-only serves the same policy as Content-Security-Policy-Report-Only, so a violation is
// reported without breaking the page (run this before enforcing a changed policy). Cloudflare Web
// Analytics is injected into every page the way production does, with a stub beacon that reports to a
// stubbed cloudflareinsights.com, so no analytics leave this machine.
import { createServer } from "node:http";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const { startProxy } = await import(fileURLToPath(new URL("../../../packages/opencode/dist/index.js", import.meta.url)));
const base = (process.env.BASE ?? "http://localhost:8788").replace(/\/$/, "");
const mode = process.env.CSP_MODE === "report-only" ? "report-only" : "enforce";
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n${detail}`}`);
  if (!ok) failures++;
};

// ── A mock OpenCode server behind the real bridge ─────────────────────────────
const upstream = createServer((req, res) => {
  const path = (req.url ?? "/").split("?")[0];
  if (path === "/api/event" || path === "/event") {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ type: "server.connected", data: {} })}\n\n`);
    const t = setInterval(() => res.write(": ping\n\n"), 1000);
    req.on("close", () => clearInterval(t));
    return;
  }
  res.setHeader("content-type", "application/json");
  if (path === "/api/info") return res.end(JSON.stringify({ version: "0.0.0-mock" }));
  if (req.method === "GET" && path.startsWith("/api/")) return res.end(JSON.stringify({ data: [] }));
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
});
await new Promise((r) => upstream.listen(0, "127.0.0.1", r));
const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
const PAIRING_CODE = "K7F2QM";
const bridge = await startProxy({ port: 0, log: false, pairingCode: PAIRING_CODE, discover: async () => ({ url: upstreamUrl, source: "flag" }) });

// ── Browser ───────────────────────────────────────────────────────────────────
// CHANNEL=chrome uses installed Chrome, which can decode the H.264 chapter videos.
const browser = await chromium.launch({ headless: true, ...(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// Documents served through page.route have no server address, so Chrome treats them as public and
// asks before they reach loopback (Local Network Access). Grant it, as a user connecting would.
await context.grantPermissions(["local-network-access"]).catch((e) => console.log(`(no local-network-access permission: ${e.message.split("\n")[0]})`));
const allowedPorts = new Set([new URL(base).port, process.env.MOCK_PORT ?? "8790", new URL(bridge.url).port]);
// Never reach a real local OpenCode server: loopback is only the site, the terminal mock and the mock bridge.
await context.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && !allowedPorts.has(url.port), (r) => r.abort());
await context.route("https://static.cloudflareinsights.com/**", (r) =>
  r.fulfill({
    status: 200,
    contentType: "text/javascript",
    headers: { "access-control-allow-origin": "*" },
    body: `navigator.sendBeacon("https://cloudflareinsights.com/cdn-cgi/rum", "{}"); fetch("https://cloudflareinsights.com/cdn-cgi/rum", { method: "POST", body: "{}", keepalive: true }).catch(() => {}); window.__beacon = true;`,
  }),
);
await context.route("https://cloudflareinsights.com/**", (r) => r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
const BEACON = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js/v-e2e" data-cf-beacon='{"token":"e2e"}' crossorigin="anonymous"></script>`;
// Documents from the site: add the beacon, and in report-only mode demote the policy.
await context.route(
  (url) => url.origin === base,
  async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const res = await route.fetch({ maxRedirects: 0 });
    const headers = res.headers();
    const type = headers["content-type"] ?? "";
    if (!type.includes("text/html")) return route.fulfill({ response: res });
    if (mode === "report-only" && headers["content-security-policy"]) {
      // frame-ancestors is ignored (with a console warning) in a report-only policy.
      headers["content-security-policy-report-only"] = headers["content-security-policy"].replace(/;\s*frame-ancestors [^;]*/, "");
      delete headers["content-security-policy"];
    }
    const body = (await res.text()).replace("</body>", `${BEACON}</body>`);
    return route.fulfill({ status: res.status(), headers, body });
  },
);
await context.addInitScript(() => {
  window.__csp = [];
  document.addEventListener("securitypolicyviolation", (e) =>
    window.__csp.push(`${e.disposition} ${e.effectiveDirective} blocked=${e.blockedURI} at ${e.sourceFile}:${e.lineNumber} ${e.sample ?? ""}`.trim()),
  );
});
const page = await context.newPage();
const warnings = [];
page.on("console", (m) => {
  const t = m.text();
  if (/Content.Security.Policy|Permissions.Policy|Refused to|Cross-Origin-(Opener|Resource)-Policy|Strict-Transport/i.test(t)) warnings.push(`${page.url()}: ${t.slice(0, 300)}`);
});
const errors = [];
if (process.env.DEBUG) page.on("requestfailed", (r) => console.log("requestfailed", r.url(), r.failure()?.errorText));
page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
const violations = async () => page.evaluate(() => window.__csp.splice(0)).catch(() => []);
const settle = (ms = 300) => page.waitForTimeout(ms);

/** Load `path`, scroll the whole page (lazy images, the mini player) and collect what was reported. */
async function visit(path, after) {
  const res = await page.goto(`${base}${path}`, { waitUntil: "load" });
  await settle(600);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    scrollTo(0, 0);
  });
  if (after) await after();
  await settle(300);
  return { res, found: await violations() };
}

// ── The policy is served ──────────────────────────────────────────────────────
const home = await fetch(`${base}/`, { headers: { accept: "text/html", "user-agent": "Mozilla/5.0" } });
const csp = home.headers.get("content-security-policy") ?? "";
check("the home page is served with the built policy", /script-src 'self' 'sha256-/.test(csp) && csp.includes("object-src 'none'"), csp);
for (const [h, v] of [
  ["strict-transport-security", "max-age=31536000; includeSubDomains"],
  ["cross-origin-opener-policy", "same-origin"],
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
]) check(`${h}: ${v}`, home.headers.get(h) === v, String(home.headers.get(h)));
console.log(`mode: ${mode}`);

// ── Every prerendered page, and a 404 ─────────────────────────────────────────
const pages = [];
const walk = (d, prefix = "") => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(d, e.name), `${prefix}/${e.name}`);
    else if (e.name.endsWith(".html") && e.name !== "404.html") pages.push(e.name === "index.html" && !prefix ? "/" : `${prefix}/${e.name.slice(0, -5)}`);
  }
};
walk(dist);
pages.sort();
pages.push("/this-page-does-not-exist", "/playground/dashboard");
let beaconRan = 0;
for (const path of pages) {
  if (only && !only.test(path)) continue;
  const { res, found } = await visit(path);
  if (await page.evaluate(() => window.__beacon === true)) beaconRan++;
  check(`${path} (${res?.status()})`, found.length === 0, found.join("\n"));
}
if (!only) check("the analytics beacon loads and reports on every page", beaconRan === pages.length, `${beaconRan} of ${pages.length}`);

// ── Learn: video and captions from media.textjs.org ───────────────────────────
if (!only || only.test("/learn/getting-started")) {
  await page.goto(`${base}/learn/getting-started`);
  await settle(500);
  const media = [];
  page.on("response", (r) => {
    if (r.url().startsWith("https://media.textjs.org/")) media.push(`${r.status()} ${r.url().split("/").pop()}`);
  });
  const played = await page.evaluate(async () => {
    const v = document.querySelector("video");
    if (!v) return "no <video>";
    v.muted = true;
    for (const t of v.textTracks) t.mode = "showing";
    // Chromium builds without H.264 can't decode the mp4; the request (and the policy check) still happens.
    const h264 = v.canPlayType('video/mp4; codecs="avc1.640028"') !== "";
    const t0 = performance.now();
    if (h264) {
      await Promise.race([v.play().catch(() => undefined), new Promise((r) => setTimeout(r, 10000))]);
      while (v.currentTime < 1 && performance.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
    } else {
      v.preload = "auto";
      v.load();
    }
    const track = v.querySelector("track");
    while (track && track.readyState < 2 && performance.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
    const out = { h264, time: v.currentTime, src: v.currentSrc, track: track?.readyState, cues: v.textTracks[0]?.cues?.length ?? 0 };
    v.pause();
    return out;
  });
  await settle(1000);
  const ok = typeof played === "object" && played.src.startsWith("https://media.textjs.org/") && played.track === 2 && played.cues > 0 && (!played.h264 || played.time >= 1);
  check(`learn: the chapter video ${played?.h264 ? "plays" : "loads"} from media.textjs.org with captions`, ok && media.some((m) => /\.mp4$/.test(m)), `${JSON.stringify(played)}\n${media.join("\n")}`);
  // Scroll the playing video away so the mini player docks.
  await page.evaluate(() => document.querySelector("video")?.play());
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await settle(1000);
  const found = await violations();
  check("learn: playback and the mini player report nothing", found.length === 0, found.join("\n"));
}

// ── Learn: the certificate, on the page and in print ──────────────────────────
if (!only || only.test("/learn/certificate")) {
  await page.goto(`${base}/learn/certificate`);
  await settle(500);
  const name = page.getByLabel("Name on certificate");
  if (await name.count()) await name.fill("Ada Lovelace");
  await page.emulateMedia({ media: "print" });
  await settle(300);
  await page.pdf().catch(() => undefined);
  await page.emulateMedia({ media: "screen" });
  const found = await violations();
  check("learn: the certificate prints without reports", found.length === 0, found.join("\n"));
}

// ── OpenCode: the sandbox, then a paired bridge ───────────────────────────────
if (!only || only.test("/opencode")) {
  await page.goto(`${base}/opencode`);
  await settle(800);
  const status = () => page.getAttribute(".pad-connect", "data-status");
  check("opencode: the sandbox runs", (await status()) === "sandbox", String(await status()));
  await page.fill('input[aria-label="OpenCode server URL"]', bridge.url);
  await page.click('.connect-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelector(".pad-connect")?.getAttribute("data-status") === "pair", null, { timeout: 10000 }).catch(() => undefined);
  check("opencode: the bridge asks for its pairing code", (await status()) === "pair", `${await status()} ${await page.textContent(".status-line")}`);
  check("opencode: the code field has focus", await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Pairing code"));
  await page.keyboard.type("aaa-bbb");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => /Wrong code/.test(document.querySelector(".status-line")?.textContent ?? ""), null, { timeout: 10000 }).catch(() => undefined);
  check("opencode: a wrong code is refused", /Wrong code/.test((await page.textContent(".status-line")) ?? ""), String(await page.textContent(".status-line")));
  await page.fill('input[aria-label="Pairing code"]', "k7f-2qm");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".pad-connect")?.getAttribute("data-status") === "live", null, { timeout: 15000 }).catch(() => undefined);
  check("opencode: the right code connects", (await status()) === "live", `${await status()} ${await page.textContent(".status-line")}`);
  await settle(1500);
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".pad-connect")?.getAttribute("data-status") === "live", null, { timeout: 15000 }).catch(() => undefined);
  check("opencode: a reload reconnects without the code", (await status()) === "live", `${await status()} ${await page.textContent(".status-line")}`);
  await settle(1000);
  const found = await violations();
  check("opencode: connecting to the bridge reports nothing", found.length === 0, found.join("\n"));
  await page.click(".status-action");
  await page.evaluate(() => localStorage.clear());
}

// ── /coffee: the sign-in redirect (the mock Terminal approves at once) ────────
if (!only || only.test("/coffee")) {
  await page.goto(`${base}/coffee`);
  await settle(1000);
  const mockPort = process.env.MOCK_PORT ?? "8790";
  const back = page.waitForURL((u) => u.pathname === "/coffee" && u.port === new URL(base).port, { timeout: 15000 });
  // The redirects (login → auth → callback → /coffee) happen inside one navigation.
  let left = false;
  const onRequest = (r) => {
    if (r.isNavigationRequest() && new URL(r.url()).port === mockPort) left = true;
  };
  page.on("request", onRequest);
  await page.evaluate(() => location.assign("/api/terminal/login?return=/shop"));
  await back.catch(() => undefined);
  await settle(1500);
  page.off("request", onRequest);
  check("coffee: sign in leaves for the auth server and comes back", left && new URL(page.url()).pathname === "/coffee", page.url());
  const st = await page.evaluate(() => fetch("/api/terminal/_status").then((r) => r.json()));
  check("coffee: signed in", st?.session?.signedIn === true, JSON.stringify(st));
  const found = await violations();
  check("coffee: the sign-in round trip reports nothing", found.length === 0, found.join("\n"));
}

check("no CSP, Permissions-Policy or COOP console messages", warnings.length === 0, [...new Set(warnings)].slice(0, 20).join("\n"));
check("no page errors", errors.length === 0, [...new Set(errors)].slice(0, 20).join("\n"));

await browser.close();
await bridge.close();
upstream.closeAllConnections?.();
upstream.close();
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
