/** Connection discovery for the HTML focus pad. All session traffic and SSE
 * are owned by the embedded app, never by the page or its prerenderer. */
export const DEFAULT_SERVER_URL = "http://127.0.0.1:4096";
export const BRIDGE_COMMAND = "bunx @textjs/opencode@latest proxy";
export const BRIDGE_TOKEN_HEADER = "x-textjs-bridge-token";
/** Followed on the page by the copyable {@link BRIDGE_COMMAND}. */
export const OUTDATED_BRIDGE = "This bridge is out of date. Stop it and run:";
/** The same words as the bridge's own replies (`@textjs/opencode`). */
export const PAIRING_PROMPT = "Enter the code from your terminal.";
export const PAIRING_LOCKED = "Too many wrong codes. Restart the bridge.";
const REMEMBER_KEY = "textjs:opencode-server";
const TOKEN_KEY = "textjs:opencode-bridge-token:";
const loopback = () => typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
/** The hosts the site's Content-Security-Policy lets the page connect to (CSP has no IPv6 literals). */
const SERVER_HOSTS = /^(localhost|127\.0\.0\.1)$/;

/** The bridge wants the pairing code from its terminal before it forwards anything. */
export class PairingRequired extends Error {
  constructor(readonly apiBase: string) {
    super(PAIRING_PROMPT);
    this.name = "PairingRequired";
  }
}

/** The bridge refused a code; `attemptsLeft` more before it locks. */
export class WrongCode extends Error {
  constructor(readonly attemptsLeft: number) {
    super(`Wrong code. ${attemptsLeft} ${attemptsLeft === 1 ? "try" : "tries"} left.`);
    this.name = "WrongCode";
  }
}

/** The token a bridge issued this page for its current run (a restarted bridge rejects it). */
export function bridgeToken(url: string): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY + url);
  } catch {
    return null;
  }
}

export function rememberBridgeToken(url: string, token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY + url, token);
    else localStorage.removeItem(TOKEN_KEY + url);
  } catch { /* Storage unavailable: the token lasts as long as this page. */ }
}

/** Trade the code printed by `bunx @textjs/opencode@latest proxy` for a token. Expected outcomes are 200s, so DevTools logs no failed request. */
export async function pairBridge(apiBase: string, code: string, timeoutMs = 10_000): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}/__bridge/pair`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-opencode-client": "1" },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(`Can't reach ${new URL(apiBase).host}. Run ${BRIDGE_COMMAND}.`);
  }
  const body = (await res.json().catch(() => null)) as { ok?: unknown; token?: unknown; locked?: unknown; attemptsLeft?: unknown } | null;
  if (res.ok && body?.ok === true && typeof body.token === "string") {
    rememberBridgeToken(apiBase, body.token);
    return body.token;
  }
  if (res.ok && body?.locked === true) throw new Error(PAIRING_LOCKED);
  if (res.ok && typeof body?.attemptsLeft === "number") throw new WrongCode(body.attemptsLeft);
  throw new Error(`The bridge returned HTTP ${res.status}.`);
}

export function normalizeServerUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const value = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(value);
    if (u.hostname === "0.0.0.0" || u.hostname === "[::]") u.hostname = "127.0.0.1";
    return u.href.replace(/\/+$/, "");
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function rememberServer(url: string | null): void {
  try {
    if (url) localStorage.setItem(REMEMBER_KEY, url);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch { /* Storage unavailable. */ }
}

export function autoConnectTarget(): string | null {
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) return saved;
  } catch { /* Storage unavailable. */ }
  return loopback() ? DEFAULT_SERVER_URL : null;
}

interface DiscoverResult {
  apiBase: string;
  version?: string;
  protocol: "v1" | "v2";
  bridge: boolean;
  /** Sent as `x-textjs-bridge-token` on every request to a paired bridge. */
  token?: string;
}

type BridgeProbe = { kind: "none" } | { kind: "outdated" } | { kind: "bridge"; paired: boolean; locked: boolean; connected?: boolean };

/** `GET /__bridge` answers 200 whether or not this page is paired, so asking never logs a failed request. */
async function probeBridge(apiBase: string, token: string | undefined, timeoutMs: number): Promise<BridgeProbe> {
  const res = await fetch(`${apiBase}/__bridge`, { headers: { accept: "application/json", ...(token ? { [BRIDGE_TOKEN_HEADER]: token } : {}) }, signal: AbortSignal.timeout(timeoutMs) });
  if (res.headers.get("x-textjs-bridge") !== "1") {
    await res.body?.cancel().catch(() => undefined);
    return { kind: "none" };
  }
  // A bridge from before pairing (1.0.x) forwards without a code: don't connect through it.
  if (res.headers.get("x-textjs-bridge-pairing") !== "1") {
    await res.body?.cancel().catch(() => undefined);
    return { kind: "outdated" };
  }
  const data = (await res.json().catch(() => null)) as { paired?: unknown; locked?: unknown; connected?: unknown } | null;
  return { kind: "bridge", paired: data?.paired === true, locked: data?.locked === true, connected: typeof data?.connected === "boolean" ? data.connected : undefined };
}

/**
 * Asks `/__bridge` first: an unpaired bridge throws {@link PairingRequired} without a failed request. Then a
 * read-only GET of the API (a simple request, with no preflight, when there's no token).
 */
export async function discoverServer(raw: string, timeoutMs = 3000, pairedToken?: string): Promise<DiscoverResult> {
  const apiBase = normalizeServerUrl(raw);
  const fail = (message: string): never => {
    console.warn(`OpenCode Lite: ${message}`);
    throw new Error(message);
  };
  let u: URL;
  try { u = new URL(apiBase); } catch { return fail(`Invalid URL. Enter ${DEFAULT_SERVER_URL} and run ${BRIDGE_COMMAND}.`); }
  if (u.username || u.password) return fail(`Don't put credentials in the URL. Run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
  if (!SERVER_HOSTS.test(u.hostname)) return fail(`Connect to the bridge on this computer, such as ${DEFAULT_SERVER_URL}.`);
  // A token fresh from pairing works even where storage is off or full; storage only carries it across reloads.
  let token = pairedToken ?? bridgeToken(apiBase) ?? undefined;
  const reach = `Can't reach ${u.host}. Run ${BRIDGE_COMMAND}.`;
  if (typeof location !== "undefined" && !loopback()) timeoutMs = Math.max(timeoutMs, 60_000);
  let probe: BridgeProbe;
  try {
    probe = await probeBridge(apiBase, token, timeoutMs);
  } catch {
    return fail(reach);
  }
  if (probe.kind === "outdated") throw new Error(OUTDATED_BRIDGE);
  if (probe.kind === "bridge" && !probe.paired) {
    if (token) rememberBridgeToken(apiBase, null);
    if (probe.locked) return fail(PAIRING_LOCKED);
    throw new PairingRequired(apiBase);
  }
  if (probe.kind === "bridge" && probe.connected === false) return fail("Bridge can't reach OpenCode. Run opencode service start (or pass --target).");
  if (probe.kind === "none") token = undefined;
  for (const protocol of ["v2", "v1"] as const) {
    let res: Response;
    try {
      res = await fetch(`${apiBase}${protocol === "v2" ? "/api/info" : "/session?limit=1"}`, { headers: { accept: "application/json", ...(token ? { [BRIDGE_TOKEN_HEADER]: token } : {}) }, signal: AbortSignal.timeout(timeoutMs) });
    } catch { return fail(reach); }
    const bridge = res.headers.get("x-textjs-bridge") === "1";
    if (bridge && res.headers.get("x-textjs-bridge-pairing") !== "1") {
      await res.body?.cancel().catch(() => undefined);
      throw new Error(OUTDATED_BRIDGE);
    }
    // The bridge restarted between the probe and this request.
    if (res.status === 428 && bridge) {
      rememberBridgeToken(apiBase, null);
      throw new PairingRequired(apiBase);
    }
    if (res.status === 401) return fail(bridge ? "OpenCode rejected the bridge password. Check opencode service status or OPENCODE_PASSWORD." : `Auth required. Run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
    if (res.status === 403) return fail(`Origin blocked. Pass --allow-origin ${typeof location === "undefined" ? "<origin>" : location.origin} to ${BRIDGE_COMMAND}.`);
    if (res.status === 502 && bridge) return fail("Bridge can't reach OpenCode. Run opencode service start (or pass --target).");
    if (!res.ok && ![404, 405, 415].includes(res.status)) return fail(`OpenCode returned HTTP ${res.status} at ${u.host}. Check opencode service status or run ${BRIDGE_COMMAND}.`);
    if (!res.ok) continue;
    const data = await res.json().catch(() => null);
    if (protocol === "v2" && typeof data?.version === "string") return { apiBase, protocol, bridge, version: data.version, token: bridge ? token : undefined };
    if (protocol === "v1" && Array.isArray(data)) return { apiBase, protocol, bridge, token: bridge ? token : undefined };
  }
  return fail(`Not an OpenCode server at ${u.host}. Run ${BRIDGE_COMMAND} and connect to 127.0.0.1:4096.`);
}
