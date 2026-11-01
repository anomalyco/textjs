/**
 * Narrated chapter videos (rendered by media/learn, hosted on Cloudflare R2 at media.textjs.org).
 *
 * Off until a chapter's files are uploaded: add its slug to PUBLISHED (with the duration from the render's
 * manifest.json) and the chapter page shows the player. Files live at
 * `${LEARN_MEDIA_BASE}/learn/<slug>/<slug>-{1080p,720p}.mp4`, `<slug>-poster.jpg` and `<slug>.vtt`; the bucket needs
 * CORS for the textjs.org origin (GET) so the captions track loads.
 */

export const LEARN_MEDIA_BASE = "https://media.textjs.org";

/** Published chapter videos: slug → length in seconds. */
export const PUBLISHED: Readonly<Record<string, number>> = {};

export interface LearnVideo {
  src: string;
  /** Smaller file for narrow screens. */
  srcSmall: string;
  poster: string;
  captions: string;
  duration: number;
}

export function learnVideo(slug: string, published: Readonly<Record<string, number>> = PUBLISHED, base = LEARN_MEDIA_BASE): LearnVideo | null {
  const duration = published[slug];
  if (duration === undefined) return null;
  const dir = `${base}/learn/${slug}/${slug}`;
  return { src: `${dir}-1080p.mp4`, srcSmall: `${dir}-720p.mp4`, poster: `${dir}-poster.jpg`, captions: `${dir}.vtt`, duration };
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
