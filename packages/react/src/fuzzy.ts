/**
 * Subsequence fuzzy matching with match positions (for highlighting).
 */

export interface FuzzyMatch {
  /** Higher is better. */
  score: number;
  /** UTF-16 indices of matched characters in the target. */
  indices: number[];
}

function isBoundary(text: string, i: number): boolean {
  if (i === 0) return true;
  const prev = text[i - 1] as string;
  const cur = text[i] as string;
  return /[\s\-_/.:]/.test(prev) || (prev === prev.toLowerCase() && cur !== cur.toLowerCase());
}

/**
 * Match `query` as a case-insensitive subsequence of `text`. Contiguous runs,
 * word starts and early matches score higher. Returns `null` when it doesn't match.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct >= 0) {
    const indices: number[] = [];
    for (let i = 0; i < q.length; i++) indices.push(direct + i);
    return { score: 1000 + (isBoundary(text, direct) ? 200 : 0) - direct - text.length * 0.01, indices };
  }
  const indices: number[] = [];
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    streak = found === ti && indices.length > 0 ? streak + 1 : 0;
    score += 10 + streak * 8 + (isBoundary(text, found) ? 12 : 0) - Math.min(8, found - ti);
    indices.push(found);
    ti = found + 1;
  }
  return { score: score - text.length * 0.01, indices };
}

/** Filter and rank `items` by `fuzzyMatch` against `getText(item)` (stable for ties). */
export function fuzzyFilter<T>(query: string, items: readonly T[], getText: (item: T) => string): Array<{ item: T; match: FuzzyMatch }> {
  const out: Array<{ item: T; match: FuzzyMatch; i: number }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as T;
    const match = fuzzyMatch(query, getText(item));
    if (match) out.push({ item, match, i });
  }
  if (query.trim().length > 0) out.sort((a, b) => b.match.score - a.match.score || a.i - b.i);
  return out.map(({ item, match }) => ({ item, match }));
}
