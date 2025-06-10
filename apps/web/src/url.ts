/** `decodeURIComponent` that never throws on malformed input (`/docs/%E0%A4%A`). */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
