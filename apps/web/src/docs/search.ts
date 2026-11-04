import { DOCS_META, type DocMeta } from "./meta";
import { DOC_HEADINGS, type Heading } from "./search-index";
import { searchFold } from "../i18n/search-fold";

export { searchFold };

export interface MetaSearchHit {
  doc: DocMeta;
  heading?: Heading;
  score: number;
}

/** Subsequence fuzzy score (higher is better); `-1` when `query` doesn't match. */
export function fuzzyScore(query: string, target: string): number {
  const q = searchFold(query).replace(/\s+/g, "");
  const t = searchFold(target);
  if (q.length === 0) return 0;
  const direct = t.indexOf(searchFold(query).trim());
  if (direct >= 0) return 1000 - direct - t.length * 0.1;
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 5 - (found - ti);
    ti = found + 1;
  }
  return score - t.length * 0.1;
}

/** `open-the-console` → `open the console`: the English words behind a slug or heading id. */
const words = (id: string): string => id.replace(/-/g, " ");

/**
 * Titles, nav labels, descriptions and headings, as this build shows them. The English slug and heading ids also
 * match, so an English query finds a translated page (`routing` on `/ja`).
 */
export function searchDocsMeta(query: string, limit = 12): MetaSearchHit[] {
  const q = query.trim();
  if (q.length === 0) return DOCS_META.map((doc) => ({ doc, score: 0 }));
  const hits: MetaSearchHit[] = [];
  for (const doc of DOCS_META) {
    const s = Math.max(fuzzyScore(q, doc.title) * 1.5, fuzzyScore(q, doc.nav ?? doc.title) * 1.5, fuzzyScore(q, doc.description), fuzzyScore(q, words(doc.slug)) * 1.5);
    if (s >= 0) hits.push({ doc, score: s + 50 });
    for (const h of DOC_HEADINGS[doc.slug] ?? []) {
      const hs = Math.max(fuzzyScore(q, h.text), fuzzyScore(q, words(h.id)));
      if (hs >= 0) hits.push({ doc, heading: h, score: hs });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
