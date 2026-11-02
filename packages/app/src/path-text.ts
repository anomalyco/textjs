/** Characters the WHATWG URL parser percent-encodes in a path, plus `%` itself. */
const PATH_ESCAPE = /[\u0020"#%<>?^`{}]|[^\u0000-\u007f]+/gu;
const PATH_ESCAPE_TEXT = /[\u0020"#<>?^`{}]|[^\u0000-\u007f]+/gu;

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
 * Literal path text a developer wrote (a matcher, rewrite source, route
 * segment or basePath) in the form canonical request paths use: `/café` →
 * `/caf%C3%A9`. A `%` is kept, so text written already encoded stays as is.
 */
export function encodePathText(text: string): string {
  return text.replace(PATH_ESCAPE_TEXT, encode);
}
