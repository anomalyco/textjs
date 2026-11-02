/** Connection discovery for the HTML focus pad. All session traffic and SSE
 * are owned by the embedded app, never by the page or its prerenderer. */
export const DEFAULT_SERVER_URL = "http://127.0.0.1:4096";
export const BRIDGE_COMMAND = "bunx @textjs/opencode proxy";
export const BRIDGE_TOKEN_HEADER = "x-textjs-bridge-token";
const REMEMBER_KEY = "textjs:opencode-server";
const TOKEN_KEY = "textjs:opencode-bridge-token:";
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const loopback = () => typeof location !== "undefined" && LOOPBACK.test(location.hostname);

/** The bridge wants the pairing code from its terminal before it forwards anything. */
export class PairingRequired extends Error {
  constructor(readonly apiBase: string) {
    super("Enter the pairing code shown by the bridge.");
    this.name = "PairingRequired";
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

/** Trade the code printed by `bunx @textjs/opencode proxy` for a token. */
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
    throw new Error(`Can't reach ${new URL(apiBase).host}. Is the bridge still running?`);
  }
  const body = (await res.json().catch(() => null)) as { token?: unknown } | null;
  if (res.ok && typeof body?.token === "string") {
    rememberBridgeToken(apiBase, body.token);
    return body.token;
  }
  if (res.status === 429) throw new Error("Too many wrong codes. Restart the bridge for a new code.");
  if (res.status === 403) throw new Error("Wrong code. Try again.");
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

/** A simple read-only GET avoids a CORS preflight during local-network discovery, until a bridge has paired. */
export async function discoverServer(raw: string, timeoutMs = 3000): Promise<DiscoverResult> {
  const apiBase = normalizeServerUrl(raw);
  const fail = (message: string): never => {
    console.warn(`OpenCode Lite: ${message}`);
    throw new Error(message);
  };
  let u: URL;
  try { u = new URL(apiBase); } catch { return fail(`Invalid URL. Enter ${DEFAULT_SERVER_URL} and run ${BRIDGE_COMMAND}.`); }
  if (u.username || u.password) return fail(`Don't put credentials in the URL. Run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
  // The site's Content-Security-Policy allows loopback servers only.
  if (!LOOPBACK.test(u.hostname)) return fail(`Connect to the bridge on this computer, such as ${DEFAULT_SERVER_URL}.`);
  const token = bridgeToken(apiBase) ?? undefined;
  const reach = `Can't reach ${u.host}. Run ${BRIDGE_COMMAND} and ${loopback() ? "connect to 127.0.0.1:4096" : "allow local network access"}.`;
  if (typeof location !== "undefined" && !loopback()) timeoutMs = Math.max(timeoutMs, 60_000);
  for (const protocol of ["v2", "v1"] as const) {
    let res: Response;
    try {
      res = await fetch(`${apiBase}${protocol === "v2" ? "/api/info" : "/session?limit=1"}`, { headers: { accept: "application/json", ...(token ? { [BRIDGE_TOKEN_HEADER]: token } : {}) }, signal: AbortSignal.timeout(timeoutMs) });
    } catch { return fail(reach); }
    const bridge = res.headers.get("x-textjs-bridge") === "1";
    if (res.status === 428 && bridge) {
      if (token) rememberBridgeToken(apiBase, null);
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
