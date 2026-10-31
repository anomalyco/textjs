import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { MOCK_TOKEN, startMockTerminal, type MockTerminal } from "../../terminal-shop/test/mock-terminal";
import { onRequest as apiFunction } from "../functions/api/terminal/[[path]]";
import { onRequest as callbackFunction } from "../functions/terminal/callback";
import {
  handleTerminal,
  LOCAL_CLIENT_ID,
  matchRoute,
  pkceChallenge,
  randomToken,
  readCookie,
  safeReturnPath,
  type SessionConfig,
  type StoredSession,
} from "../server/terminal-session";

const ORIGIN = "https://textjs.org";
const CLIENT_ID = "cli_textjs_org";
let api: MockTerminal;
let config: SessionConfig;

beforeAll(() => {
  api = startMockTerminal();
  config = { TERMINAL_CLIENT_ID: CLIENT_ID, TERMINAL_API_URL: api.url, TERMINAL_AUTH_URL: `${api.url}/auth` };
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

const b64 = (v: unknown): string => Buffer.from(JSON.stringify(v)).toString("base64url");
const unb64 = <T>(v: string): T => JSON.parse(Buffer.from(v, "base64url").toString()) as T;

function setCookies(res: Response): Record<string, { value: string; attrs: string }> {
  const out: Record<string, { value: string; attrs: string }> = {};
  for (const c of res.headers.getSetCookie()) {
    const [pair, ...attrs] = c.split("; ");
    const i = (pair as string).indexOf("=");
    out[(pair as string).slice(0, i)] = { value: (pair as string).slice(i + 1), attrs: attrs.join("; ") };
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

/** Runs login → (mock) authorize → callback and returns the session cookie header. */
async function signIn(returnTo = "/cart", cfg = config, now?: () => number): Promise<{ cookie: string; callback: Response }> {
  const login = await handleTerminal(req(`/api/terminal/login?return=${encodeURIComponent(returnTo)}`, { headers: { "sec-fetch-site": "same-origin" } }), cfg);
  const oauth = setCookies(login)["__Secure-trm_oauth"]!;
  const authorized = await fetch(login.headers.get("location")!, { redirect: "manual" });
  const back = new URL(authorized.headers.get("location")!);
  const callback = await handleTerminal(req(`${back.pathname}${back.search}`, { cookie: `__Secure-trm_oauth=${oauth.value}` }), cfg, { now });
  const session = setCookies(callback)["__Secure-trm_session"];
  return { cookie: session ? `__Secure-trm_session=${session.value}` : "", callback };
}

describe("PKCE", () => {
  test("S256 challenge is BASE64URL(SHA256(verifier))", async () => {
    const verifier = randomToken(32);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await pkceChallenge(verifier)).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(randomToken(32)).not.toBe(verifier);
  });

  test("return paths stay in the app", () => {
    expect(safeReturnPath("/cart")).toBe("/cart");
    expect(safeReturnPath("/shop?p=segfault")).toBe("/shop?p=segfault");
    for (const bad of [null, "", "//evil.com", "https://evil.com", "/\\evil", "cart", "/a b", `/${"x".repeat(300)}`]) expect(safeReturnPath(bad)).toBe("/shop");
  });
});

describe("sign in", () => {
  test("login redirects to Terminal's /authorize with PKCE and a short-lived httpOnly state cookie", async () => {
    const res = await handleTerminal(req("/api/terminal/login?return=%2Fcart", { headers: { "sec-fetch-site": "same-origin" } }), config);
    expect(res.status).toBe(302);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const loc = new URL(res.headers.get("location")!);
    expect(`${loc.origin}${loc.pathname}`).toBe(`${api.url}/auth/authorize`);
    const q = loc.searchParams;
    expect(q.get("client_id")).toBe(CLIENT_ID);
    expect(q.get("redirect_uri")).toBe("https://textjs.org/terminal/callback");
    expect(q.get("response_type")).toBe("code");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.has("client_secret")).toBe(false);
    const cookie = setCookies(res)["__Secure-trm_oauth"]!;
    expect(cookie.attrs).toBe("Path=/terminal/callback; Max-Age=600; HttpOnly; SameSite=Lax; Secure");
    const pending = unb64<{ v: string; s: string; r: string; u: string }>(cookie.value);
    expect(q.get("state")).toBe(pending.s);
    expect(q.get("code_challenge")).toBe(await pkceChallenge(pending.v));
    expect(pending.r).toBe("/cart");
    // The verifier never leaves the cookie.
    expect(res.headers.get("location")).not.toContain(pending.v);
  });

  test("production by default: auth.terminal.shop, the registered client id, the textjs.org redirect uri", async () => {
    const res = await handleTerminal(req("/api/terminal/login"), { TERMINAL_CLIENT_ID: CLIENT_ID });
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin).toBe("https://auth.terminal.shop");
    expect(loc.pathname).toBe("/authorize");
    expect(loc.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(loc.searchParams.get("redirect_uri")).toBe("https://textjs.org/terminal/callback");
  });

  test("no client id: sign in reports it on the page; loopback hosts use a local id", async () => {
    const res = await handleTerminal(req("/api/terminal/login"), {});
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/terminal?signin_error=sign+in+isn%27t+set+up+on+this+deployment+yet");
    expect(res.headers.getSetCookie()).toEqual([]);
    const local = await handleTerminal(new Request("http://localhost:8788/api/terminal/login"), {});
    const loc = new URL(local.headers.get("location")!);
    expect(loc.searchParams.get("client_id")).toBe(LOCAL_CLIENT_ID);
    expect(loc.searchParams.get("redirect_uri")).toBe("http://localhost:8788/terminal/callback");
    // Plain cookie names and no Secure flag on http://localhost.
    expect(Object.keys(setCookies(local))).toEqual(["trm_oauth"]);
    expect(setCookies(local).trm_oauth!.attrs).not.toContain("Secure");
  });

  test("cross-site requests can't start a sign in", async () => {
    const res = await handleTerminal(req("/api/terminal/login", { headers: { "sec-fetch-site": "cross-site" } }), config);
    expect(res.status).toBe(403);
  });

  test("the callback exchanges the code with the verifier (no secret) and sets an httpOnly session", async () => {
    const { cookie, callback } = await signIn("/cart");
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("/terminal?at=%2Fcart");
    const set = setCookies(callback);
    expect(set["__Secure-trm_oauth"]!.attrs).toContain("Max-Age=0");
    expect(set["__Secure-trm_session"]!.attrs).toBe("Path=/api/terminal; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure");
    const form = api.tokenRequests[0]!;
    expect(form.grant_type).toBe("authorization_code");
    expect(form.client_id).toBe(CLIENT_ID);
    expect(form.redirect_uri).toBe("https://textjs.org/terminal/callback");
    expect(form.code_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(form.client_secret).toBeUndefined();
    const session = unb64<StoredSession>(cookie.split("=")[1]!);
    expect(session.a).toBe(MOCK_TOKEN);
    expect(session.r).toMatch(/^rt_/);
    // The token is never in the redirect.
    expect(callback.headers.get("location")).not.toContain(MOCK_TOKEN);
    const { callback: home } = await signIn("/shop");
    expect(home.headers.get("location")).toBe("/terminal");
  });

  test("the callback rejects a wrong state, a missing cookie, auth errors and failed exchanges", async () => {
    const login = await handleTerminal(req("/api/terminal/login"), config);
    const oauth = `__Secure-trm_oauth=${setCookies(login)["__Secure-trm_oauth"]!.value}`;
    const state = new URL(login.headers.get("location")!).searchParams.get("state")!;
    const cases: Array<[string, string | undefined, string]> = [
      [`/terminal/callback?code=x&state=nope`, oauth, "sign in state didn't match"],
      [`/terminal/callback?code=x&state=${state}`, undefined, "that sign in expired"],
      [`/terminal/callback?state=${state}`, oauth, "didn't send an authorization code"],
      [`/terminal/callback?error=unauthorized_client&error_description=Client+x+is+not+authorized`, oauth, "isn't registered for this address"],
      [`/terminal/callback?error=access_denied`, oauth, "sign in was cancelled"],
      [`/terminal/callback?code=unknown&state=${state}`, oauth, "invalid_grant"],
    ];
    for (const [path, cookie, message] of cases) {
      const res = await handleTerminal(req(path, { cookie }), config);
      expect(res.status).toBe(302);
      const loc = new URL(res.headers.get("location")!, ORIGIN);
      expect(loc.pathname).toBe("/terminal");
      expect(loc.searchParams.get("signin_error")).toContain(message);
      const set = setCookies(res);
      expect(set["__Secure-trm_session"]).toBeUndefined();
      expect(set["__Secure-trm_oauth"]!.attrs).toContain("Max-Age=0");
    }
  });
});

describe("api proxy", () => {
  test("only the shop's routes are forwarded", async () => {
    expect(matchRoute("GET", "/product")).toEqual({ public: true });
    expect(matchRoute("POST", "/cart/convert")).toEqual({ public: false });
    expect(matchRoute("PUT", "/subscription/sub_123")).toEqual({ public: false });
    for (const [m, p] of [["GET", "/hook/stripe"], ["POST", "/print"], ["POST", "/email"], ["POST", "/account/link-email"], ["GET", "/doc"], ["DELETE", "/profile"], ["GET", "/product/a/b"]] as const) {
      expect(matchRoute(m, p)).toBe(null);
    }
    const { cookie } = await signIn();
    for (const path of ["/api/terminal/prod/api/hook/stripe", "/api/terminal/prod/api/doc", "/api/terminal/prod/api/../admin", "/api/terminal/prod/api//product", "/api/terminal/prod/nope"]) {
      const res = await handleTerminal(req(path, { cookie }), config);
      expect([400, 404]).toContain(res.status);
    }
    expect(api.requests).toEqual([]);
    const dev = await handleTerminal(req("/api/terminal/dev/api/product"), config);
    expect(dev.status).toBe(403);
  });

  test("signed out: public products only", async () => {
    const products = await handleTerminal(req("/api/terminal/prod/api/product"), config);
    expect(products.status).toBe(200);
    expect(((await products.json()) as { data: unknown[] }).data.length).toBeGreaterThan(0);
    expect(api.requests.at(-1)).toMatchObject({ path: "/product", authorized: false });
    const cart = await handleTerminal(req("/api/terminal/prod/api/cart"), config);
    expect(cart.status).toBe(401);
    expect(await cart.json()).toMatchObject({ code: "signed_out" });
    expect(api.requests.some((r) => r.path === "/cart")).toBe(false);
  });

  test("signed in: the bearer is attached server-side and never echoed", async () => {
    const { cookie } = await signIn();
    const res = await handleTerminal(req("/api/terminal/prod/api/view/init", { cookie, headers: { cookie, "cf-connecting-ip": "203.0.113.9", "x-terminal-region": "eu" } }), config);
    expect(res.status).toBe(200);
    expect(api.requests.at(-1)).toMatchObject({ path: "/view/init", authorized: true });
    const body = await res.text();
    expect(body).toContain("Ada Lovelace");
    expect(body).not.toContain(MOCK_TOKEN);
    expect([...res.headers.keys()].sort()).toEqual(["cache-control", "content-type", "referrer-policy"]);
    const put = await handleTerminal(req("/api/terminal/prod/api/cart/item", { ...write("PUT", { productVariantID: api.state.products[1]!.variants[0]!.id, quantity: 2 }), cookie }), config);
    expect(put.status).toBe(200);
    expect(api.state.cart.items[0]?.quantity).toBe(2);
  });

  test("writes need our Origin and client header; cross-site reads are refused", async () => {
    const { cookie } = await signIn();
    const body = JSON.stringify({ productVariantID: "x", quantity: 1 });
    const attempts: RequestInit[] = [
      { method: "PUT", body, headers: { "x-terminal-client": "1" } },
      { method: "PUT", body, headers: { origin: "https://evil.example", "x-terminal-client": "1" } },
      { method: "PUT", body, headers: { origin: ORIGIN } },
      { method: "POST", headers: { origin: ORIGIN, "x-terminal-client": "1", "sec-fetch-site": "cross-site" } },
    ];
    for (const init of attempts) {
      const res = await handleTerminal(req("/api/terminal/prod/api/cart/item", { ...init, cookie }), config);
      expect(res.status).toBe(403);
    }
    const read = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie, headers: { cookie, "sec-fetch-site": "cross-site" } }), config);
    expect(read.status).toBe(403);
    expect(api.requests).toEqual([]);
    const big = await handleTerminal(req("/api/terminal/prod/api/address", { ...write("POST", { name: "x".repeat(70_000) }), cookie }), config);
    expect(big.status).toBe(413);
  });

  test("refreshes an expiring access token before the request", async () => {
    const t0 = Date.now();
    const { cookie } = await signIn("/shop", config, () => t0);
    const later = t0 + 31 * 60 * 1000;
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie }), config, { now: () => later });
    expect(res.status).toBe(200);
    expect(api.tokenRequests.at(-1)).toMatchObject({ grant_type: "refresh_token", client_id: CLIENT_ID });
    const next = unb64<StoredSession>(setCookies(res)["__Secure-trm_session"]!.value);
    expect(next.x).toBeGreaterThan(later);
    expect(next.r).not.toBe(unb64<StoredSession>(cookie.split("=")[1]!).r);
  });

  test("on a 401 it refreshes once and retries; a dead refresh token signs you out", async () => {
    const { cookie } = await signIn();
    const good = unb64<StoredSession>(cookie.split("=")[1]!);
    const stale = `__Secure-trm_session=${b64({ ...good, a: "expired-token" })}`;
    const res = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: stale }), config);
    expect(res.status).toBe(200);
    expect(api.requests.filter((r) => r.path === "/cart").map((r) => r.authorized)).toEqual([false, true]);
    expect(unb64<StoredSession>(setCookies(res)["__Secure-trm_session"]!.value).a).toBe(MOCK_TOKEN);

    const dead = `__Secure-trm_session=${b64({ ...good, a: "expired-token", r: "rt_revoked" })}`;
    const out = await handleTerminal(req("/api/terminal/prod/api/cart", { cookie: dead }), config);
    expect(out.status).toBe(401);
    expect(await out.json()).toMatchObject({ code: "signed_out" });
    expect(setCookies(out)["__Secure-trm_session"]!.attrs).toContain("Max-Age=0");
  });

  test("status says whether you're signed in, never with a token", async () => {
    const out = await (await handleTerminal(req("/api/terminal/_status"), config)).json();
    expect(out).toMatchObject({ mode: "site", defaultEnv: "prod", session: { signedIn: false, configured: true, signInUrl: "/api/terminal/login", signOutUrl: "/api/terminal/logout" } });
    expect((out as { environments: { dev: { enabled: boolean } } }).environments.dev.enabled).toBe(false);
    const { cookie } = await signIn();
    const res = await handleTerminal(req("/api/terminal/_status", { cookie }), config);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ session: { signedIn: true } });
    expect(text).not.toContain(MOCK_TOKEN);
    expect(await (await handleTerminal(req("/api/terminal/_status"), {})).json()).toMatchObject({ session: { configured: false } });
    expect(await (await handleTerminal(req("/api/terminal/_status"), { TERMINAL_ENVIRONMENT: "dev" })).json()).toMatchObject({ defaultEnv: "dev" });
  });

  test("logout needs a same-origin write and clears the session", async () => {
    const { cookie } = await signIn();
    expect((await handleTerminal(req("/api/terminal/logout", { method: "POST", cookie }), config)).status).toBe(403);
    expect((await handleTerminal(req("/api/terminal/logout", { cookie }), config)).status).toBe(405);
    const res = await handleTerminal(req("/api/terminal/logout", { ...write("POST"), cookie }), config);
    expect(res.status).toBe(200);
    expect(setCookies(res)["__Secure-trm_session"]!.attrs).toContain("Max-Age=0");
  });

  test("the Pages Functions delegate to the handler", async () => {
    const status = await apiFunction({ request: req("/api/terminal/_status"), env: config });
    expect(status.status).toBe(200);
    const cb = await callbackFunction({ request: req("/terminal/callback?error=access_denied"), env: config });
    expect(cb.status).toBe(302);
    expect(readCookie(new Request(ORIGIN, { headers: { cookie: "a=1; b=2" } }), "b")).toBe("2");
  });
});
