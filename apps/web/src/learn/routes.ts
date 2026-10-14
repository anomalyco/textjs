import { CHAPTERS, COMPLETE_SLUG, COURSE_TITLE, getChapter, TOTAL_MINUTES } from "./course";

/** `/learn`, `/learn/<chapter>` and `/learn/certificate`; `null` for anything else. */
export function learnRoute(path: string): { name: "learn"; slug: string } | { name: "not-found" } | null {
  if (path === "/learn") return { name: "learn", slug: "" };
  const m = /^\/learn\/([^/]+)$/.exec(path);
  if (!m) return path.startsWith("/learn/") ? { name: "not-found" } : null;
  const slug = m[1] as string;
  return slug === COMPLETE_SLUG || getChapter(slug) ? { name: "learn", slug } : { name: "not-found" };
}

export function learnTitle(slug: string): string {
  if (slug === COMPLETE_SLUG) return `Certificate | ${COURSE_TITLE}`;
  const c = getChapter(slug);
  return c ? `${c.title} | ${COURSE_TITLE}` : `${COURSE_TITLE}: Build a Deploy Dashboard in the Console | Text.js`;
}

export const LEARN_DESCRIPTION = `A free ${CHAPTERS.length}-chapter course: build a deploy dashboard that runs in the DevTools console, one live step at a time. About ${TOTAL_MINUTES} minutes.`;

/** Prerendered learn pages (overview, chapters, certificate). */
export const LEARN_ROUTES: ReadonlyArray<{ path: string; title: string; description: string }> = [
  { path: "/learn", title: learnTitle(""), description: LEARN_DESCRIPTION },
  ...CHAPTERS.map((c) => ({ path: `/learn/${c.slug}`, title: learnTitle(c.slug), description: c.summary })),
  { path: `/learn/${COMPLETE_SLUG}`, title: learnTitle(COMPLETE_SLUG), description: "Your Learn Text.js certificate, printed in the console." },
];
