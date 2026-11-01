/** Connection discovery for the HTML focus pad. All session traffic and SSE
 * are owned by the embedded app, never by the page or its prerenderer. */
export const DEFAULT_SERVER_URL = "http://127.0.0.1:4096";
export const BRIDGE_COMMAND = "bunx @textjs/next opencode";
const REMEMBER_KEY = "textjs:opencode-server";
const loopback = () => typeof location !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

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
}

/** A simple read-only GET avoids a CORS preflight during local-network discovery. */
export async function discoverServer(raw: string, timeoutMs = 3000): Promise<DiscoverResult> {
  const apiBase = normalizeServerUrl(raw);
  const fail = (message: string): never => {
    console.warn(`OpenCode Lite: ${message}`);
    throw new Error(message);
  };
  let u: URL;
  try { u = new URL(apiBase); } catch { return fail(`Invalid URL — enter ${DEFAULT_SERVER_URL} and run ${BRIDGE_COMMAND}.`); }
  if (u.username || u.password) return fail(`Don't put credentials in the URL — run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
  const reach = `Can't reach ${u.host} — run ${BRIDGE_COMMAND} and ${loopback() ? "connect to 127.0.0.1:4096" : "allow local network access"}.`;
  if (typeof location !== "undefined" && !loopback()) timeoutMs = Math.max(timeoutMs, 60_000);
  for (const protocol of ["v2", "v1"] as const) {
    let res: Response;
    try {
      res = await fetch(`${apiBase}${protocol === "v2" ? "/api/info" : "/session?limit=1"}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    } catch { return fail(reach); }
    const bridge = res.headers.get("x-textjs-bridge") === "1";
    if (res.status === 401) return fail(bridge ? "OpenCode rejected the bridge password — check opencode service status or OPENCODE_PASSWORD." : `Auth required — run ${BRIDGE_COMMAND} and connect to ${DEFAULT_SERVER_URL}.`);
    if (res.status === 403) return fail(`Origin blocked — pass --allow-origin ${typeof location === "undefined" ? "<origin>" : location.origin} to ${BRIDGE_COMMAND}.`);
    if (res.status === 502 && bridge) return fail("Bridge can't reach OpenCode — run opencode service start (or pass --target).");
    if (!res.ok && ![404, 405, 415].includes(res.status)) return fail(`OpenCode returned HTTP ${res.status} at ${u.host} — check opencode service status or run ${BRIDGE_COMMAND}.`);
    if (!res.ok) continue;
    const data = await res.json().catch(() => null);
    if (protocol === "v2" && typeof data?.version === "string") return { apiBase, protocol, bridge, version: data.version };
    if (protocol === "v1" && Array.isArray(data)) return { apiBase, protocol, bridge };
  }
  return fail(`Not an OpenCode server at ${u.host} — run ${BRIDGE_COMMAND} and connect to 127.0.0.1:4096.`);
}
