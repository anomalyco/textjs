/**
 * Narrated chapter videos (rendered by media/learn, hosted on Cloudflare R2 at media.textjs.org).
 *
 * Off until a chapter's files are uploaded: add its slug to PUBLISHED (with the duration from the render's
 * manifest.json) and the chapter page shows the player. Video and poster live at
 * `${LEARN_MEDIA_BASE}/learn/<slug>/<slug>-{1080p,720p}.mp4` and `<slug>-poster.jpg`. A re-rendered chapter uploads
 * under new names (`<slug>-v2-1080p.mp4`, …; set its REVISIONS entry), so the live site keeps serving the old files
 * until it deploys.
 *
 * Captions are served by textjs.org itself, so they deploy with the page and need no CORS: the English track comes
 * from `src/learn/captions/<slug>.vtt`, and translated tracks from `locales/<code>/captions/<slug>.json`
 * (scripts/postbuild-pages.ts writes both to `/captions/learn/<slug>-v<rev>.<code>.vtt`).
 */

import { LOCALE, SOURCE_LOCALE, type Locale } from "../i18n/locales";

/** Chapters whose captions this build's locale has translated (`vite.config.ts`). */
declare const __TEXTJS_CAPTIONS__: readonly string[] | undefined;
const TRANSLATED_CAPTIONS: readonly string[] = typeof __TEXTJS_CAPTIONS__ === "undefined" ? [] : __TEXTJS_CAPTIONS__;

export const LEARN_MEDIA_BASE = "https://media.textjs.org";

/** Published chapter videos: slug → length in seconds. */
export const PUBLISHED: Readonly<Record<string, number>> = {
  "getting-started": 235.3,
  layout: 218.7,
  styling: 204.4,
  "input-and-keymaps": 205.1,
  routing: 226.1,
  "data-fetching": 212.3,
  components: 184.8,
  testing: 194.4,
  terminal: 211.1,
  shipping: 183.7,
};

/** Re-rendered chapters: slug → file revision (2 and up). */
export const REVISIONS: Readonly<Record<string, number>> = {
  "getting-started": 4,
  layout: 3,
  styling: 3,
  "input-and-keymaps": 2,
  routing: 3,
  "data-fetching": 2,
  components: 3,
  testing: 2,
  terminal: 2,
  shipping: 2,
};

export interface CaptionTrack {
  src: string;
  /** BCP 47 code: `en`, `ja`. */
  lang: string;
  /** The language's own name, for the player's captions menu. */
  label: string;
}

export interface LearnVideo {
  src: string;
  /** Smaller file for narrow screens. */
  srcSmall: string;
  poster: string;
  /** The page's language first when it has a translation, then English. */
  captions: readonly CaptionTrack[];
  duration: number;
}

/** `/captions/learn/routing-v3.ja.vtt`. */
export function captionsPath(slug: string, lang: string, revisions: Readonly<Record<string, number>> = REVISIONS): string {
  const revision = revisions[slug];
  return `/captions/learn/${slug}${revision && revision > 1 ? `-v${revision}` : ""}.${lang}.vtt`;
}

export function learnVideo(
  slug: string,
  published: Readonly<Record<string, number>> = PUBLISHED,
  base = LEARN_MEDIA_BASE,
  revisions: Readonly<Record<string, number>> = REVISIONS,
  locale: Locale = LOCALE,
  translated: readonly string[] = TRANSLATED_CAPTIONS,
): LearnVideo | null {
  const duration = published[slug];
  if (duration === undefined) return null;
  const revision = revisions[slug];
  const dir = `${base}/learn/${slug}/${slug}${revision && revision > 1 ? `-v${revision}` : ""}`;
  const track = (l: Locale): CaptionTrack => ({ src: captionsPath(slug, l.code, revisions), lang: l.code, label: l.name });
  const captions = locale !== SOURCE_LOCALE && translated.includes(slug) ? [track(locale), track(SOURCE_LOCALE)] : [track(SOURCE_LOCALE)];
  return { src: `${dir}-1080p.mp4`, srcSmall: `${dir}-720p.mp4`, poster: `${dir}-poster.jpg`, captions, duration };
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
