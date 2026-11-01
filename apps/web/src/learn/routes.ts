import { ABOUT_MINUTES, CHAPTERS_META, COMPLETE_SLUG, COURSE_TITLE, getChapterMeta } from "./meta";

/** `/learn`, `/learn/<chapter>` and `/learn/certificate`; `null` for anything else. */
export function learnRoute(path: string): { name: "learn"; slug: string } | { name: "not-found" } | null {
  if (path === "/learn") return { name: "learn", slug: "" };
  const m = /^\/learn\/([^/]+)$/.exec(path);
  if (!m) return path.startsWith("/learn/") ? { name: "not-found" } : null;
  const slug = m[1] as string;
  return slug === COMPLETE_SLUG || getChapterMeta(slug) ? { name: "learn", slug } : { name: "not-found" };
}

export function learnTitle(slug: string): string {
  if (slug === COMPLETE_SLUG) return `Certificate | ${COURSE_TITLE}`;
  const c = getChapterMeta(slug);
  return c ? `${c.title} | ${COURSE_TITLE}` : `${COURSE_TITLE}: Build a Deploy Dashboard in the Console | Text.js`;
}

export const LEARN_DESCRIPTION = `A free ${CHAPTERS_META.length}-chapter course. Build a deploy dashboard that runs in the DevTools console, with a live app in every chapter. About ${ABOUT_MINUTES} minutes.`;

/** Prerendered learn pages (overview, chapters, certificate). */
export const LEARN_ROUTES: ReadonlyArray<{ path: string; title: string; description: string }> = [
  { path: "/learn", title: learnTitle(""), description: LEARN_DESCRIPTION },
  ...CHAPTERS_META.map((c) => ({ path: `/learn/${c.slug}`, title: learnTitle(c.slug), description: c.summary })),
  { path: `/learn/${COMPLETE_SLUG}`, title: learnTitle(COMPLETE_SLUG), description: "Your Learn Text.js certificate, rendered on the page and in the console." },
];
