/** Characters the WHATWG URL parser percent-encodes in a path, plus `%` itself. */
const PATH_ESCAPE = /[\u0020"#%<>?^`{}]|[^\u0000-\u007f]+/gu;

function encode(match: string): string {
  try {
    return encodeURIComponent(match);
  } catch {
    // A lone surrogate: no request path can contain it.
    return match;
  }
}

/** One decoded path segment, percent-encoded the way `new URL()` serializes paths. */
export function encodePathSegment(segment: string): string {
  return segment.replace(PATH_ESCAPE, encode);
}

/**
 * Literal path text a developer wrote (a matcher, rewrite source or
 * basePath) in the form canonical request paths use, the way
 * `canonicalPathname` treats a request: valid escapes are decoded and
 * re-encoded (`/caf%c3%a9` and `/café` → `/caf%C3%A9`, `/%61dmin` →
 * `/admin`, `/ops%40corp` → `/ops@corp`), a stray `%` becomes `%25`, and
 * `%2F` / `%5C` stay escaped (they'd change where segments split).
 */
export function encodePathText(text: string): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(/(?:%[0-9A-Fa-f]{2})+/g)) {
    out += encodePathSegment(text.slice(last, m.index));
    out += canonicalEscapes(m[0]);
    last = m.index + m[0].length;
  }
  return out + encodePathSegment(text.slice(last));
}

function canonicalEscapes(run: string): string {
  return run
    .split(/(%2[Ff]|%5[Cc])/)
    .map((part, i) => {
      if (i % 2 === 1) return part.toUpperCase();
      try {
        return encodePathSegment(decodeURIComponent(part));
      } catch {
        return part.toUpperCase();
      }
    })
    .join("");
}
