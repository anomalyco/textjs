import recordedProducts from "../../../terminal-shop/test/fixtures/products.json";

/**
 * The Coffee demo's last resort. The Functions behind `/api/terminal` already fall back to a cached or
 * recorded catalogue when Terminal is down; this covers the Functions themselves failing (an outage, a
 * deploy gone wrong). The shop then opens signed out on the recorded catalogue instead of an error.
 */
export const RECORDED_STATUS = {
  mode: "site",
  defaultEnv: "prod",
  environments: {
    prod: { label: "production", api: "https://api.terminal.shop", enabled: true, serverToken: false },
    dev: { label: "dev sandbox", api: "https://api.dev.terminal.shop", enabled: false, serverToken: false },
  },
  session: { signedIn: false, configured: true, signInUrl: "/api/terminal/login", signOutUrl: "/api/terminal/logout", credentials: false },
} as const;

const json = (body: unknown): Response => Response.json(body, { headers: { "x-terminal-catalogue": "recorded" } });

/** Only the two signed-out reads every visit makes are replaced, and only when they fail. */
export function withRecordedFallback(base: string, doFetch: typeof fetch = ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)) as typeof fetch): typeof fetch {
  const status = `${base}/_status`;
  const products = `${base}/prod/api/product`;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith("/") ? url : new URL(url).pathname;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const fallback = method === "GET" && path === status ? RECORDED_STATUS : method === "GET" && path === products ? { data: recordedProducts } : null;
    if (!fallback) return doFetch(input, init);
    try {
      const res = await doFetch(input, init);
      const fromFunction = (res.headers.get("content-type") ?? "").includes("json");
      // JSON is the Function answering (a 403 is a real answer). HTML, 429 and 5xx mean it isn't there.
      if (fromFunction && (res.ok || (res.status < 500 && res.status !== 429))) return res;
    } catch {
      // the Function is unreachable
    }
    return json(fallback);
  }) as typeof fetch;
}
