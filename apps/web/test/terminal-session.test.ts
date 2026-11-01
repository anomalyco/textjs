import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { MOCK_TOKEN, startMockTerminal, type MockTerminal } from "../../terminal-shop/test/mock-terminal";
import { onRequest as apiFunction } from "../functions/api/terminal/[[path]]";
import { onRequest as callbackFunction } from "../functions/terminal/callback";
import {
  handleTerminal,
  isPublicIp,
  LOCAL_CLIENT_ID,
  matchRoute,
  MAX_COOKIE_BYTES,
  pkceChallenge,
  randomToken,
  readBounded,
  readCookies,
  seal,
  SECURITY_HEADERS,
  unseal,
  type Fetch,
  type PendingSignIn,
  type SessionConfig,
  type StoredSession,
} from "../server/terminal-session";

const ORIGIN = "https://textjs.org";
const CLIENT_ID = "cli_textjs_org";
// Test-only key material, generated per run.
const SECRET = randomToken(32);
const SESSION = "__Host-trm_session";
const OAUTH = "__Host-trm_oauth";
let api: MockTerminal;
let config: SessionConfig;

beforeAll(() => {
  api = startMockTerminal();
  config = { TERMINAL_CLIENT_ID: CLIENT_ID, TERMINAL_COOKIE_SECRET: SECRET, TERMINAL_API_URL: api.url, TERMINAL_AUTH_URL: `${api.url}/auth` };
});
afterAll(() => api.stop());
beforeEach(() => {
  api.requests.length = 0;
  api.tokenRequests.length = 0;
  api.authorizations.length = 0;
});

// Nothing in the handler may log: tokens must never reach a log line.
const logs: unknown[][] = [];
const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => spyOn(console, m).mockImplementation((...a: unknown[]) => void logs.push(a)));
afterEach(() => {
  expect(logs).toEqual([]);
  logs.length = 0;
});
afterAll(() => spies.forEach((s) => s.mockRestore()));

function setCookies(res: Response): Record<string, { value: string; attrs: string; raw: string }> {
  const out: Record<string, { value: string; attrs: string; raw: string }> = {};
  for (const c of res.headers.getSetCookie()) {
    const [pair, ...attrs] = c.split("; ");
    const i = (pair as string).indexOf("=");
    out[(pair as string).slice(0, i)] = { value: (pair as string).slice(i + 1), attrs: attrs.join("; "), raw: c };
  }
  return out;
}

function req(path: string, init: RequestInit & { cookie?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new Request(`${ORIGIN}${path}`, { ...init, headers });
}

const write = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { origin: ORIGIN, "x-terminal-client": "1", "content-type": "application/json", "sec-fetch-site": "same-origin" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const open = (cookie: string): Promise<StoredSession | null> => unseal<StoredSession>(SECRET, SESSION, cookie.slice(cookie.indexOf("=") + 1));
const sessionWith = async (s: StoredSession): Promise<string> => `${SESSION}=${await seal(SECRET, SESSION, s)}`;

/** Runs login → (mock) authorize → callback and returns the session cookie header. */
async function signIn(returnTo = "/cart", cfg = config, now?: () => number, fetchImpl?: Fetch): Promise<{ cookie: string; callback: Response }> {
  const login = await handleTerminal(req(`/api/terminal/login?return=${encodeURIComponent(returnTo)}`, { headers: { "sec-fetch-site": "same-origin" } }), cfg, { now });
  const oauth = setCookies(login)[OAUTH]!;
  const authorized = await fetch(login.headers.get("location")!, { redirect: "manual" });
  const back = new URL(authorized.headers.get("location")!);
  const callback = await handleTerminal(req(`${back.pathname}${back.search}`, { cookie: `${OAUTH}=${oauth.value}` }), cfg, { now, fetch: fetchImpl });
  const session = setCookies(callback)[SESSION];
  return { cookie: session ? `${SESSION}=${session.value}` : "", callback };
}

/** A fetch that fails the token endpoint the way `mode` says, everything else goes to the mock. */
function flakyToken(mode: { kind: "ok" } | { kind: "status"; status: number } | { kind: "throw" }, counter?: { n: number }): Fetch {
  return async (input, init) => {
    if (input.endsWith("/token")) {
      if (counter) counter.n++;
      if (mode.kind === "throw") throw new TypeError("network down");
      if (mode.kind === "status") return Response.json({ error: "server_error" }, { status: mode.status });
    }
    return fetch(input, init);
  };
}

describe("PKCE + entry paths", () => {
  test("S256 challenge is BASE64URL(SHA256(verifier))", async () => {
    const verifier = randomToken(32);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await pkceChallenge(verifier)).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(randomToken(32)).not.toBe(verifier);
  });

  test("F-12: only public client IPs are passed on for region detection", () => {
    for (const ip of ["203.0.114.9", "8.8.8.8", "2606:4700::1111", "2a00:1450:4001:80b::200e"]) expect(isPublicIp(ip)).toBe(true);
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.1.1",
      "172.20.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "224.0.0.1",
      "255.255.255.255",
      "203.0.113.9",
      "999.999.999.999",
      "::1",
      "::",
      "fd00::1",
      "fe80::1",
      "fe90::1",
      "ff00::1",
      "2001:db8::1",
      "::ffff:10.0.0.1",
      "::ffff:192.168.1.1",
      "::ffff:169.254.169.254",
      "::ffff:7f00:1",
      "not:an:ip",
      "nonsense",
    ]) {
      expect(isPublicIp(ip)).toBe(false);
    }
    expect(isPublicIp("::ffff:8.8.8.8")).toBe(true);
  });
});

describe("F-01: sealed __Host- cookies", () => {
  test("values are AES-GCM sealed and bound to the cookie name", async () => {
    const sealed = await seal(SECRET, SESSION, { a: "secret-token" });
    expect(sealed).toStartWith("v1.");
    expect(sealed).not.toContain("secret-token");
    expect(Buffer.from(sealed.slice(3), "base64url").toString("latin1")).not.toContain("secret-token");
    expect(await unseal(SECRET, SESSION, sealed)).toEqual({ a: "secret-token" });
    // Wrong name (AAD), wrong key, tampered bytes, legacy/unsealed values: all rejected.
    expect(await unseal(SECRET, OAUTH, sealed)).toBe(null);
    expect(await unseal(randomToken(32), SESSION, sealed)).toBe(null);
    const bytes = Buffer.from(sealed.slice(3), "base64url");
    bytes[bytes.length - 1]! ^= 1;
    expect(await unseal(SECRET, SESSION, `v1.${bytes.toString("base64url")}`)).toBe(null);
    expect(await unseal(SECRET, SESSION, Buffer.from(JSON.stringify({ a: MOCK_TOKEN, e: "prod", i: Date.now() })).toString("base64url"))).toBe(null);
  });

  test("a forged or planted session cookie is ignored, and can't shadow the real one", async () => {
    const forged = `${SESSION}=${Buffer.from(JSON.stringify({ a: MOCK_TOKEN, e: "prod", i: Date.now() })).toString("base64url")}`;
    expect((await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: forged }), config)).status).toBe(401);
    const otherKey = `${SESSION}=${await seal(randomToken(32), SESSION, { a: MOCK_TOKEN, e: "prod", i: Date.now() })}`;
    expect((await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: otherKey }), config)).status).toBe(401);
    const { cookie } = await signIn();
    // A sibling host's planted cookie comes first in the header; the real one still wins.
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: `${otherKey}; ${forged}; ${cookie}` }), config);
    expect(res.status).toBe(200);
    expect(readCookies(new Request(ORIGIN, { headers: { cookie: "a=1; b=2; a=3" } }), "a")).toEqual(["1", "3"]);
  });

  test("both cookies are __Host- (Path=/, Secure, no Domain), httpOnly and SameSite=Lax", async () => {
    const login = await handleTerminal(req("/api/terminal/login?return=%2Fcart"), config);
    expect(setCookies(login)[OAUTH]!.attrs).toBe("Path=/; Max-Age=600; HttpOnly; SameSite=Lax; Secure");
    const { callback } = await signIn();
    const set = setCookies(callback);
    expect(set[SESSION]!.attrs).toBe("Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure");
    expect(set[OAUTH]!.attrs).toBe("Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
    for (const c of callback.headers.getSetCookie()) expect(c.toLowerCase()).not.toContain("domain=");
  });

  test("off localhost, a missing or short TERMINAL_COOKIE_SECRET fails closed", async () => {
    const { cookie } = await signIn();
    for (const cfg of [{ ...config, TERMINAL_COOKIE_SECRET: undefined }, { ...config, TERMINAL_COOKIE_SECRET: "too-short" }]) {
      expect(await (await handleTerminal(req("/api/terminal/_status", { cookie }), cfg)).json()).toMatchObject({ session: { signedIn: false, configured: false } });
      const login = await handleTerminal(req("/api/terminal/login"), cfg);
      expect(login.headers.get("location")).toBe("/coffee?signin_error=unconfigured");
      expect(login.headers.getSetCookie()).toEqual([]);
      expect((await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), cfg)).status).toBe(401);
      // Browsing stays up.
      expect((await handleTerminal(req("/api/terminal/prod/api/product"), cfg)).status).toBe(200);
    }
    // Localhost gets an ephemeral key and the local client id.
    const local = await handleTerminal(new Request("http://localhost:8788/api/terminal/login"), {});
    const loc = new URL(local.headers.get("location")!);
    expect(loc.searchParams.get("client_id")).toBe(LOCAL_CLIENT_ID);
    expect(loc.searchParams.get("redirect_uri")).toBe("http://localhost:8788/terminal/callback");
    expect(Object.keys(setCookies(local))).toEqual(["trm_oauth"]);
    expect(setCookies(local).trm_oauth!.attrs).not.toContain("Secure");
  });

  test("the callback uses this origin's redirect_uri, never one from the cookie", async () => {
    const login = await handleTerminal(req("/api/terminal/login"), config);
    const pending = (await unseal<PendingSignIn & { u?: string }>(SECRET, OAUTH, setCookies(login)[OAUTH]!.value))!;
    expect(pending.u).toBeUndefined();
    const forgedPending = `${OAUTH}=${await seal(SECRET, OAUTH, { ...pending, u: "https://evil.example/cb" })}`;
    const authorized = await fetch(login.headers.get("location")!, { redirect: "manual" });
    const back = new URL(authorized.headers.get("location")!);
    await handleTerminal(req(`${back.pathname}${back.search}`, { cookie: forgedPending }), config);
    expect(api.tokenRequests.at(-1)!.redirect_uri).toBe("https://textjs.org/terminal/callback");
  });

  test("F-06: realistic tokens fit in one cookie; an oversized one is refused out loud", async () => {
    const jwt = `eyJ${"a".repeat(1500)}.${"b".repeat(400)}.${"c".repeat(86)}`;
    const big = await sessionWith({ a: jwt, r: `user:${"x".repeat(60)}:${"y".repeat(36)}`, x: Date.now() + 1800_000, e: "prod", i: Date.now() });
    expect(new TextEncoder().encode(`${big}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`).byteLength).toBeLessThan(MAX_COOKIE_BYTES);
    const huge: Fetch = async (input, init) =>
      input.endsWith("/token") ? Response.json({ access_token: "z".repeat(4000), refresh_token: "r", expires_in: 1800 }) : fetch(input, init);
    const { callback, cookie } = await signIn("/cart", config, undefined, huge);
    expect(cookie).toBe("");
    expect(callback.headers.get("location")).toBe("/coffee?signin_error=session_too_large");
    for (const c of callback.headers.getSetCookie()) expect(new TextEncoder().encode(c).byteLength).toBeLessThanOrEqual(MAX_COOKIE_BYTES);
  });
});

describe("sign in", () => {
  test("login redirects to Terminal's /authorize with PKCE and a sealed state cookie", async () => {
    const res = await handleTerminal(req("/api/terminal/login?return=%2Fcart", { headers: { "sec-fetch-site": "same-origin" } }), config);
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(`${loc.origin}${loc.pathname}`).toBe(`${api.url}/auth/authorize`);
    const q = loc.searchParams;
    expect(q.get("client_id")).toBe(CLIENT_ID);
    expect(q.get("redirect_uri")).toBe("https://textjs.org/terminal/callback");
    expect(q.get("response_type")).toBe("code");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.has("client_secret")).toBe(false);
    const pending = (await unseal<PendingSignIn>(SECRET, OAUTH, setCookies(res)[OAUTH]!.value))!;
    expect(q.get("state")).toBe(pending.s);
    expect(q.get("code_challenge")).toBe(await pkceChallenge(pending.v));
    expect(pending.r).toBe("/cart");
    expect(res.headers.get("location")).not.toContain(pending.v);
  });

  test("F-03: return paths are browse/cart/account only, never checkout", async () => {
    const back = async (ret: string): Promise<string> => (await unseal<PendingSignIn>(SECRET, OAUTH, setCookies(await handleTerminal(req(`/api/terminal/login?return=${encodeURIComponent(ret)}`), config))[OAUTH]!.value))!.r;
    expect(await back("/cart")).toBe("/cart");
    expect(await back("/account?page=faq")).toBe("/account?page=faq");
    expect(await back("/shop?p=segfault")).toBe("/shop?p=segfault");
    for (const bad of ["/confirm", "/payment", "/shipping", "/subscribe", "/order/subscribe", "/order/complete", "/addresses", "/email", "//evil.com", "/\\evil.com", "https://evil.com"]) {
      expect(await back(bad)).toBe("/shop");
    }
  });

  test("production by default: auth.terminal.shop, the registered client id, the textjs.org redirect uri", async () => {
    const res = await handleTerminal(req("/api/terminal/login"), { TERMINAL_CLIENT_ID: CLIENT_ID, TERMINAL_COOKIE_SECRET: SECRET });
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin).toBe("https://auth.terminal.shop");
    expect(loc.pathname).toBe("/authorize");
    expect(loc.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(loc.searchParams.get("redirect_uri")).toBe("https://textjs.org/terminal/callback");
  });

  test("no client id: sign in reports it on the page", async () => {
    const res = await handleTerminal(req("/api/terminal/login"), { TERMINAL_COOKIE_SECRET: SECRET });
    expect(res.headers.get("location")).toBe("/coffee?signin_error=unconfigured");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  test("cross-site requests can't start a sign in or read the status", async () => {
    expect((await handleTerminal(req("/api/terminal/login", { headers: { "sec-fetch-site": "cross-site" } }), config)).status).toBe(403);
    expect((await handleTerminal(req("/api/terminal/_status", { headers: { "sec-fetch-site": "cross-site" } }), config)).status).toBe(403);
  });

  test("the callback exchanges the code with the verifier (no secret) and sets a sealed session", async () => {
    const { cookie, callback } = await signIn("/cart");
    // The registered redirect URI is /terminal/callback; the visitor lands on the Coffee demo.
    expect(callback.headers.get("location")).toBe("/coffee?at=%2Fcart");
    const form = api.tokenRequests[0]!;
    expect(form).toMatchObject({ grant_type: "authorization_code", client_id: CLIENT_ID, redirect_uri: "https://textjs.org/terminal/callback" });
    expect(form.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(form.client_secret).toBeUndefined();
    expect(cookie).not.toContain(MOCK_TOKEN);
    const session = (await open(cookie))!;
    expect(session.a).toBe(MOCK_TOKEN);
    expect(session.r).toMatch(/^rt_/);
    expect(callback.headers.get("location")).not.toContain(MOCK_TOKEN);
    expect((await signIn("/shop")).callback.headers.get("location")).toBe("/coffee");
  });

  test("F-07: the callback reports fixed codes, and requests without our state never cancel a sign in", async () => {
    const login = await handleTerminal(req("/api/terminal/login"), config);
    const oauth = `${OAUTH}=${setCookies(login)[OAUTH]!.value}`;
    const state = new URL(login.headers.get("location")!).searchParams.get("state")!;
    const cases: Array<[string, string | undefined, string, boolean]> = [
      [`/terminal/callback?code=x&state=nope`, oauth, "state_mismatch", false],
      [`/terminal/callback?error=access_denied&error_description=Call+1-800-SCAM`, oauth, "cancelled", false],
      [`/terminal/callback?error=custom&error_description=<b>pwned</b>`, oauth, "exchange_failed", false],
      [`/terminal/callback?error=unauthorized_client&error_description=Client+x+is+not+authorized`, undefined, "unauthorized_client", false],
      [`/terminal/callback?error=access_denied&state=${state}`, oauth, "cancelled", true],
      [`/terminal/callback?code=x&state=${state}`, undefined, "expired", true],
      [`/terminal/callback?state=${state}`, oauth, "exchange_failed", true],
      [`/terminal/callback?code=unknown&state=${state}`, oauth, "exchange_failed", true],
    ];
    for (const [path, cookie, code, clears] of cases) {
      const res = await handleTerminal(req(path, { cookie }), config);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(`/coffee?signin_error=${code}`);
      const set = setCookies(res);
      expect(set[SESSION]).toBeUndefined();
      expect(set[OAUTH] !== undefined).toBe(clears);
    }
  });

  test("an expired state cookie can't be used", async () => {
    const t0 = Date.now();
    const login = await handleTerminal(req("/api/terminal/login"), config, { now: () => t0 });
    const oauth = `${OAUTH}=${setCookies(login)[OAUTH]!.value}`;
    const authorized = await fetch(login.headers.get("location")!, { redirect: "manual" });
    const back = new URL(authorized.headers.get("location")!);
    const res = await handleTerminal(req(`${back.pathname}${back.search}`, { cookie: oauth }), config, { now: () => t0 + 11 * 60_000 });
    expect(res.headers.get("location")).toBe("/coffee?signin_error=expired");
  });
});

describe("api proxy", () => {
  test("F-02: only the shop's routes are forwarded, and nothing that mints credentials", async () => {
    expect(matchRoute("GET", "/product")).toEqual({ public: true });
    expect(matchRoute("POST", "/cart/convert")).toEqual({ public: false });
    expect(matchRoute("DELETE", "/token/pat_1")).toEqual({ public: false });
    for (const [m, p] of [["POST", "/token"], ["POST", "/app"], ["GET", "/hook/stripe"], ["POST", "/print"], ["POST", "/email"], ["POST", "/account/link-email"], ["GET", "/doc"], ["DELETE", "/profile"], ["GET", "/product/a/b"]] as const) {
      expect(matchRoute(m, p)).toBe(null);
    }
    const { cookie } = await signIn();
    for (const path of ["/api/terminal/prod/api/token", "/api/terminal/prod/api/app"]) {
      expect((await handleTerminal(req(path, { ...write("POST", { name: "x", redirectURI: "https://evil.example" }), cookie }), config)).status).toBe(404);
    }
    for (const path of ["/api/terminal/prod/api/hook/stripe", "/api/terminal/prod/api/doc", "/api/terminal/prod/api/../admin", "/api/terminal/prod/api//product", "/api/terminal/prod/nope"]) {
      expect([400, 404]).toContain((await handleTerminal(req(path, { cookie }), config)).status);
    }
    expect(api.requests).toEqual([]);
    expect((await handleTerminal(req("/api/terminal/dev/api/product"), config)).status).toBe(403);
  });

  test("signed out: public products only", async () => {
    const products = await handleTerminal(req("/api/terminal/prod/api/product"), config);
    expect(products.status).toBe(200);
    expect(((await products.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
    expect(api.requests.at(-1)).toMatchObject({ path: "/product", authorized: false });
    const cart = await handleTerminal(req("/api/terminal/prod/api/cart"), config);
    expect(cart.status).toBe(401);
    expect(await cart.json()).toMatchObject({ code: "signed_out" });
  });

  test("signed in: the bearer is attached server-side and never echoed", async () => {
    const { cookie } = await signIn();
    const res = await handleTerminal(req("/api/terminal/prod/api/view/init", { cookie, headers: { cookie, "cf-connecting-ip": "8.8.8.8", "x-terminal-region": "eu" } }), config);
    expect(res.status).toBe(200);
    expect(api.requests.at(-1)).toMatchObject({ path: "/view/init", authorized: true });
    const body = await res.text();
    expect(body).toContain("Ada Lovelace");
    expect(body).not.toContain(MOCK_TOKEN);
    const put = await handleTerminal(req("/api/terminal/prod/api/cart/item", { ...write("PUT", { productVariantID: api.state.products[1]!.variants[0]!.id, quantity: 2 }), cookie }), config);
    expect(put.status).toBe(200);
    expect(api.state.cart.items[0]?.quantity).toBe(2);
  });

  test("F-04: security headers on every response; only JSON content types pass through", async () => {
    const { cookie } = await signIn();
    const responses = [
      await handleTerminal(req("/api/terminal/_status"), config),
      await handleTerminal(req("/api/terminal/login"), config),
      await handleTerminal(req("/terminal/callback?error=access_denied"), config),
      await handleTerminal(req("/api/terminal/prod/api/product"), config),
      await handleTerminal(req("/api/terminal/prod/api/nope"), config),
      await handleTerminal(req("/api/terminal/logout", { ...write("POST"), cookie }), config),
    ];
    for (const res of responses) for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(res.headers.get(k)).toBe(v);
    expect(SECURITY_HEADERS["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    const html: Fetch = async () => new Response("<script>alert(1)</script>", { status: 502, headers: { "content-type": "text/html" } });
    const res = await handleTerminal(req("/api/terminal/prod/api/product"), config, { fetch: html });
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const none: Fetch = async () => new Response("{}", { status: 200 });
    expect((await handleTerminal(req("/api/terminal/prod/api/product"), config, { fetch: none })).headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const vendor: Fetch = async () => new Response("{}", { headers: { "content-type": "application/problem+json" } });
    expect((await handleTerminal(req("/api/terminal/prod/api/product"), config, { fetch: vendor })).headers.get("content-type")).toBe("application/problem+json");
  });

  test("writes need our Origin, client header and JSON; cross-site reads are refused", async () => {
    const { cookie } = await signIn();
    const body = JSON.stringify({ productVariantID: "x", quantity: 1 });
    const attempts: RequestInit[] = [
      { method: "PUT", body, headers: { "x-terminal-client": "1" } },
      { method: "PUT", body, headers: { origin: "https://evil.example", "x-terminal-client": "1" } },
      { method: "PUT", body, headers: { origin: ORIGIN } },
      { method: "POST", headers: { origin: ORIGIN, "x-terminal-client": "1", "sec-fetch-site": "cross-site" } },
    ];
    for (const init of attempts) expect((await handleTerminal(req("/api/terminal/prod/api/cart/item", { ...init, cookie }), config)).status).toBe(403);
    const read = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie, headers: { cookie, "sec-fetch-site": "cross-site" } }), config);
    expect(read.status).toBe(403);
    const form = await handleTerminal(req("/api/terminal/prod/api/cart/item", { method: "PUT", body: "a=1", cookie, headers: { cookie, origin: ORIGIN, "x-terminal-client": "1", "content-type": "text/plain" } }), config);
    expect(form.status).toBe(415);
    expect(api.requests).toEqual([]);
  });

  test("F-08: bodies are capped while reading, chunked ones included", async () => {
    const { cookie } = await signIn();
    expect((await handleTerminal(req("/api/terminal/prod/api/address", { ...write("POST", { name: "x".repeat(70_000) }), cookie }), config)).status).toBe(413);
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled++;
        if (pulled > 1000) c.close();
        else c.enqueue(new Uint8Array(16 * 1024));
      },
    });
    const chunked = new Request(`${ORIGIN}/api/terminal/prod/api/address`, { method: "POST", body: stream, headers: { cookie, origin: ORIGIN, "x-terminal-client": "1", "content-type": "application/json" }, duplex: "half" } as RequestInit);
    expect(chunked.headers.get("content-length")).toBe(null);
    expect((await handleTerminal(chunked, config)).status).toBe(413);
    // It stopped reading right after the limit, not after the whole 16 MB.
    expect(pulled).toBeLessThan(10);
    expect(await readBounded(new Request(ORIGIN, { method: "POST", body: "{}" }))).toBeInstanceOf(ArrayBuffer);
  });

  test("F-12: no query string, and only well-formed region/idempotency headers, go upstream", async () => {
    const { cookie } = await signIn();
    const seen: Array<{ url: string; headers: Headers }> = [];
    const spy: Fetch = async (input, init) => {
      seen.push({ url: input, headers: new Headers(init?.headers) });
      return fetch(input, init);
    };
    await handleTerminal(req("/api/terminal/prod/api/cart?authorization=Bearer+x&x=1", { cookie, headers: { cookie, "x-terminal-region": "mars", "idempotency-key": "a b;c=../../x", "cf-connecting-ip": "10.0.0.1" } }), config, { fetch: spy });
    expect(seen[0]!.url).toBe(`${api.url}/cart`);
    expect(seen[0]!.headers.has("x-terminal-region")).toBe(false);
    expect(seen[0]!.headers.has("idempotency-key")).toBe(false);
    expect(seen[0]!.headers.has("x-terminal-ip")).toBe(false);
    await handleTerminal(req("/api/terminal/prod/api/cart", { cookie, headers: { cookie, "x-terminal-region": "eu", "idempotency-key": "6f1c2a3e-1b2c-4d5e-8f90-1234567890ab" } }), config, { fetch: spy });
    expect(seen[1]!.headers.get("x-terminal-region")).toBe("eu");
    expect(seen[1]!.headers.get("idempotency-key")).toBe("6f1c2a3e-1b2c-4d5e-8f90-1234567890ab");
  });

  test("refreshes an expiring access token before the request", async () => {
    const t0 = Date.now();
    const { cookie } = await signIn("/shop", config, () => t0);
    const later = t0 + 31 * 60 * 1000;
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => later });
    expect(res.status).toBe(200);
    expect(api.tokenRequests.at(-1)).toMatchObject({ grant_type: "refresh_token", client_id: CLIENT_ID });
    const next = (await open(setCookies(res)[SESSION]!.raw.split("; ")[0]!))!;
    expect(next.x).toBeGreaterThan(later);
    expect(next.i).toBe(t0);
    expect(next.r).not.toBe((await open(cookie))!.r);
  });

  test("F-05: transient refresh failures keep the session; only a refused grant ends it", async () => {
    const t0 = Date.now();
    const { cookie } = await signIn("/shop", config, () => t0);
    const nearExpiry = t0 + 1800_000 - 30_000;
    const expired = t0 + 1800_000 + 5_000;
    for (const mode of [{ kind: "throw" as const }, { kind: "status" as const, status: 503 }, { kind: "status" as const, status: 429 }]) {
      // Still valid: the request goes through with the current token, cookie untouched.
      const ok = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => nearExpiry, fetch: flakyToken(mode) });
      expect(ok.status).toBe(200);
      expect(ok.headers.getSetCookie()).toEqual([]);
      // Expired: 503, still no cookie change.
      const down = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => expired, fetch: flakyToken(mode) });
      expect(down.status).toBe(503);
      expect(down.headers.getSetCookie()).toEqual([]);
      // A public route during the outage doesn't silently sign you out either.
      const pub = await handleTerminal(req("/api/terminal/prod/api/product", { cookie }), config, { now: () => expired, fetch: flakyToken(mode) });
      expect(pub.headers.getSetCookie()).toEqual([]);
    }
    const refused = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => expired, fetch: flakyToken({ kind: "status", status: 400 }) });
    expect(refused.status).toBe(401);
    expect(setCookies(refused)[SESSION]!.attrs).toContain("Max-Age=0");
  });

  test("F-05: without a refresh token the access token is used until it actually expires", async () => {
    const t0 = Date.now();
    const cookie = await sessionWith({ a: MOCK_TOKEN, x: t0 + 30_000, e: "prod", i: t0 });
    const counter = { n: 0 };
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => t0, fetch: flakyToken({ kind: "ok" }, counter) });
    expect(res.status).toBe(200);
    expect(counter.n).toBe(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  test("F-05: parallel requests share one refresh", async () => {
    const t0 = Date.now();
    const { cookie } = await signIn("/shop", config, () => t0);
    const counter = { n: 0 };
    const later = () => t0 + 31 * 60_000;
    const slow: Fetch = async (input, init) => {
      if (input.endsWith("/token")) {
        counter.n++;
        await Bun.sleep(20);
      }
      return fetch(input, init);
    };
    const results = await Promise.all([1, 2, 3].map(() => handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: later, fetch: slow })));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(counter.n).toBe(1);
    const refreshTokens = new Set(await Promise.all(results.map(async (r) => (await open(setCookies(r)[SESSION]!.raw.split("; ")[0]!))!.r)));
    expect(refreshTokens.size).toBe(1);
  });

  test("on a 401 it refreshes once and retries; a dead refresh token signs you out", async () => {
    const { cookie } = await signIn();
    const good = (await open(cookie))!;
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: await sessionWith({ ...good, a: "expired-token" }) }), config);
    expect(res.status).toBe(200);
    expect(api.requests.filter((r) => r.path === "/cart").map((r) => r.authorized)).toEqual([false, true]);
    expect((await open(setCookies(res)[SESSION]!.raw.split("; ")[0]!))!.a).toBe(MOCK_TOKEN);
    const out = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: await sessionWith({ ...good, a: "expired-token", r: "rt_revoked" }) }), config);
    expect(out.status).toBe(401);
    expect(await out.json()).toMatchObject({ code: "signed_out" });
    expect(setCookies(out)[SESSION]!.attrs).toContain("Max-Age=0");
  });

  test("sessions older than 30 days are ignored", async () => {
    const t0 = Date.now() - 31 * 24 * 3600_000;
    const cookie = await sessionWith({ a: MOCK_TOKEN, r: "rt_x", e: "prod", i: t0 });
    expect((await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config)).status).toBe(401);
  });

  test("status says whether you're signed in, never with a token", async () => {
    const out = await (await handleTerminal(req("/api/terminal/_status"), config)).json();
    expect(out).toMatchObject({ mode: "site", defaultEnv: "prod", session: { signedIn: false, configured: true, signInUrl: "/api/terminal/login", signOutUrl: "/api/terminal/logout" } });
    const { cookie } = await signIn();
    const text = await (await handleTerminal(req("/api/terminal/_status", { cookie }), config)).text();
    expect(JSON.parse(text)).toMatchObject({ session: { signedIn: true } });
    expect(text).not.toContain(MOCK_TOKEN);
    expect(await (await handleTerminal(req("/api/terminal/_status"), { TERMINAL_COOKIE_SECRET: SECRET })).json()).toMatchObject({ session: { configured: false } });
    expect(await (await handleTerminal(req("/api/terminal/_status"), { ...config, TERMINAL_ENVIRONMENT: "dev" })).json()).toMatchObject({ defaultEnv: "dev" });
  });

  test("F-10: an unknown TERMINAL_ENVIRONMENT fails closed instead of meaning production", async () => {
    for (const env of ["development", "sandbox", "PROD "]) {
      const cfg = { ...config, TERMINAL_ENVIRONMENT: env };
      if (env.trim() === "PROD") {
        // Case matters: only `prod` and `dev` are recognized.
        expect((await handleTerminal(req("/api/terminal/prod/api/product"), cfg)).status).toBe(503);
        continue;
      }
      expect((await handleTerminal(req("/api/terminal/prod/api/product"), cfg)).status).toBe(503);
      expect(await (await handleTerminal(req("/api/terminal/_status"), cfg)).json()).toMatchObject({ session: { configured: false }, environments: { prod: { enabled: false } } });
      expect((await handleTerminal(req("/api/terminal/login"), cfg)).headers.get("location")).toBe("/coffee?signin_error=unconfigured");
    }
    expect((await handleTerminal(req("/api/terminal/prod/api/product"), { ...config, TERMINAL_ENVIRONMENT: " prod " })).status).toBe(200);
  });

  test("logout needs a same-origin write and clears the session", async () => {
    const { cookie } = await signIn();
    expect((await handleTerminal(req("/api/terminal/logout", { method: "POST", cookie }), config)).status).toBe(403);
    expect((await handleTerminal(req("/api/terminal/logout", { cookie }), config)).status).toBe(405);
    const res = await handleTerminal(req("/api/terminal/logout", { ...write("POST"), cookie }), config);
    expect(res.status).toBe(200);
    expect(setCookies(res)[SESSION]!.attrs).toBe("Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure");
  });

  test("the Pages Functions delegate to the handler", async () => {
    expect((await apiFunction({ request: req("/api/terminal/_status"), env: config })).status).toBe(200);
    expect((await callbackFunction({ request: req("/terminal/callback?error=access_denied"), env: config })).status).toBe(302);
  });
});

describe("F-08: vite dev/preview adapter", () => {
  test("loopback hosts only, bodies capped, cf-connecting-ip dropped", async () => {
    const { createServer } = await import("node:http");
    const { terminalDevMiddleware } = await import("../server/terminal-dev");
    const upstreamIps: Array<string | null> = [];
    const echo = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (r) => (upstreamIps.push(r.headers.get("x-terminal-ip")), Response.json({ data: [] })) });
    const server = createServer((rq, rs) =>
      terminalDevMiddleware(() => ({ TERMINAL_API_URL: `http://127.0.0.1:${echo.port}` }))(rq, rs, () => {
        rs.statusCode = 404;
        rs.end();
      }),
    );
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    try {
      expect((await fetch(`${base}/api/terminal/_status`)).status).toBe(200);
      expect((await fetch(`${base}/api/terminal/_status`, { headers: { host: "evil.example" } })).status).toBe(403);
      const big = await fetch(`${base}/api/terminal/prod/api/address`, { method: "POST", body: "x".repeat(70_000), headers: { origin: base, "x-terminal-client": "1", "content-type": "application/json" } });
      expect(big.status).toBe(413);
      expect((await fetch(`${base}/api/terminal/prod/api/product`, { headers: { "cf-connecting-ip": "8.8.8.8" } })).status).toBe(200);
      expect(upstreamIps).toEqual([null]);
      expect((await fetch(`${base}/other`)).status).toBe(404);
    } finally {
      server.close();
      echo.stop(true);
    }
  });
});

describe("Workers global scope", () => {
  test("loading the Functions makes no random values or I/O (workerd refuses both at module scope)", () => {
    const script = [
      `crypto.getRandomValues = () => { throw new Error("random at module scope"); };`,
      `globalThis.fetch = () => { throw new Error("fetch at module scope"); };`,
      `await import(${JSON.stringify(new URL("../functions/api/terminal/[[path]].ts", import.meta.url).pathname)});`,
      `await import(${JSON.stringify(new URL("../functions/terminal/callback.ts", import.meta.url).pathname)});`,
      `console.log("ok");`,
    ].join("\n");
    const proc = Bun.spawnSync(["bun", "-e", script], { cwd: new URL("..", import.meta.url).pathname, stdout: "pipe", stderr: "pipe" });
    expect(proc.stderr.toString()).toBe("");
    expect(proc.stdout.toString().trim()).toBe("ok");
  });
});
