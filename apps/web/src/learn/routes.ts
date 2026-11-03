import { t } from "../i18n/t";
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
  if (slug === COMPLETE_SLUG) return t("Certificate | {course}", { course: COURSE_TITLE });
  const c = getChapterMeta(slug);
  return c ? t("{title} | {course}", { title: c.title, course: COURSE_TITLE }) : t("{course}: Build a Deploy Dashboard in the Console | Text.js", { course: COURSE_TITLE });
}

export const LEARN_DESCRIPTION = t("A free {chapters}-chapter course. Build a deploy dashboard that runs in the DevTools console, with a live app in every chapter. About {minutes} minutes.", { chapters: CHAPTERS_META.length, minutes: ABOUT_MINUTES });

/** Prerendered learn pages (overview, chapters, certificate), with each share card's title. */
export const LEARN_ROUTES: ReadonlyArray<{ path: string; title: string; description: string; cardTitle: string }> = [
  { path: "/learn", title: learnTitle(""), description: LEARN_DESCRIPTION, cardTitle: t("Build a Deploy Dashboard in the Console") },
  ...CHAPTERS_META.map((c) => ({ path: `/learn/${c.slug}`, title: learnTitle(c.slug), description: c.summary, cardTitle: c.title })),
  { path: `/learn/${COMPLETE_SLUG}`, title: learnTitle(COMPLETE_SLUG), description: t("Your Learn Text.js certificate, rendered on the page and in the console."), cardTitle: t("Certificate") },
];
