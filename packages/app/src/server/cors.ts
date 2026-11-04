/**
 * Cross-origin access for embeds (`text.config.ts` `embed`).
 *
 * - Static embed files (`embed.js`, `/assets/*`) are public: any site may load
 *   them (`Access-Control-Allow-Origin: *`, never with credentials).
 * - Live sessions are same-origin unless `embed.allowOrigins` lists the
 *   sites whose pages may open them. Allowed origins are reflected one at a
 *   time; `credentials: true` requires exact origins.
 *
 * No Node imports: the adapters bundle this into Bun, Vercel and Cloudflare servers.
 */

import type { TextConfig } from "../config";

/** Headers on `embed.js` and `/assets/*` when `embed` is on. */
export const EMBED_ASSET_HEADERS: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "cross-origin-resource-policy": "cross-origin",
};

/** Loopback origins `text dev` accepts for embeds (any port), unless `credentials` is on. */
export const LOOPBACK_ORIGINS: readonly string[] = ["http://localhost:*", "http://127.0.0.1:*", "http://[::1]:*"];

/**
 * Whether `pathname` (canonical, without basePath) is an embed file: `embed.js`
 * or a file under `/assets/`. Documents never are.
 */
export function isEmbedAsset(pathname: string): boolean {
  if (pathname !== "/embed.js" && !pathname.startsWith("/assets/")) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1).toLowerCase();
  return last.includes(".") && !last.endsWith(".html") && !last.endsWith(".htm");
}

export interface EmbedSettings {
  enabled: boolean;
  allowOrigins: string[];
  allowCredentials: boolean;
}

/** `text.config.ts` `embed`, validated (throws on an invalid `allowOrigins`). */
export function resolveEmbed(config: Pick<TextConfig, "embed"> | undefined): EmbedSettings {
  const e = config?.embed;
  if (!e) return { enabled: false, allowOrigins: [], allowCredentials: false };
  const o = e === true ? {} : e;
  const settings = { enabled: true, allowOrigins: [...(o.allowOrigins ?? [])], allowCredentials: o.credentials === true };
  compileAllowOrigins(settings.allowOrigins, { credentials: settings.allowCredentials });
  return settings;
}

const DEFAULT_PORT: Record<string, string> = { "http:": "80", "https:": "443" };

function invalid(pattern: string, why: string): Error {
  return new Error(`▼ Text.js: embed.allowOrigins: ${JSON.stringify(pattern)} ${why}`);
}

/**
 * A serialized browser origin (`https://a.example`, no path, userinfo or
 * trailing slash, lowercase, default port omitted), or `null`.
 */
function parseOrigin(origin: string): URL | null {
  if (origin === "null") return null;
  try {
    const u = new URL(origin);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.origin !== origin) return null;
    return u;
  } catch {
    return null;
  }
}

type Matcher = (u: URL) => boolean;

function compilePattern(raw: string, credentials: boolean): Matcher {
  if (typeof raw !== "string") throw invalid(String(raw), "isn't a string.");
  const pattern = raw.trim().toLowerCase();
  if (pattern === "*") {
    if (credentials) throw invalid(pattern, "can't be used with `embed.credentials`: list each site's exact origin.");
    return () => true;
  }
  const m = /^(https?):\/\/(\*\.)?(\[[0-9a-f:.]+\]|[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\*|\d{1,5}))?$/.exec(pattern);
  if (!m) throw invalid(pattern, 'isn\'t an origin. Use scheme://host[:port] with no path or trailing slash, like "https://www.example.com", "https://*.example.com" or "http://localhost:*".');
  const [, scheme, wildcard, host = "", port] = m;
  if (credentials && (wildcard || port === "*")) throw invalid(pattern, "can't be used with `embed.credentials`: wildcards are only allowed without credentials. List each site's exact origin.");
  if (wildcard && (host.startsWith("[") || (!host.includes(".") && host !== "localhost"))) throw invalid(pattern, 'needs a domain after "*.", like "https://*.example.com".');
  if (port !== undefined && port !== "*" && Number(port) > 65535) throw invalid(pattern, "has an invalid port.");
  if (!wildcard && port !== "*" && parseOrigin(pattern) === null) throw invalid(pattern, `isn't in the form browsers send. Use ${JSON.stringify(new URL(pattern).origin)}.`);
  const protocol = `${scheme}:`;
  const wantPort = port === undefined || port === DEFAULT_PORT[protocol] ? "" : port;
  return (u) => {
    if (u.protocol !== protocol) return false;
    if (wildcard ? !u.hostname.endsWith(`.${host}`) : u.hostname !== host) return false;
    return wantPort === "*" || u.port === wantPort;
  };
}

/**
 * Compile `allowOrigins` into a check for a request's `Origin` header, or
 * `null` when the list is empty (same-origin only). Throws on an invalid
 * pattern, and on wildcards when `credentials` is on.
 */
export function compileAllowOrigins(patterns: readonly string[], options: { credentials?: boolean } = {}): ((origin: string) => boolean) | null {
  const matchers = patterns.map((p) => compilePattern(p, options.credentials === true));
  if (matchers.length === 0) return null;
  return (origin) => {
    const u = parseOrigin(origin);
    return u !== null && matchers.some((m) => m(u));
  };
}
