/**
 * Marks a reader types or leaves out at will: Arabic tashkeel and tatweel, Hebrew niqqud and cantillation, the
 * zero-width non-joiner (Persian) and bidi marks and isolates (around Latin in right-to-left titles).
 */
const IGNORED = /[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0640\u200c\u200e\u200f\u061c\u2066-\u2069]/g;

/**
 * Text as search compares it (docs search, the search dialog, the error index): lowercase, without ignorable marks,
 * and alef with hamza or madda as a bare alef (أ إ آ ٱ → ا).
 */
export function searchFold(text: string): string {
  return text.toLowerCase().replace(IGNORED, "").replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627");
}
