import type { ReactNode } from "react";
import { useInView } from "../site/useInView";
import { formatDuration, learnVideo, type LearnVideo } from "./video";

/**
 * The chapter's narrated video. The frame reserves its 16:9 box up front (no layout shift); the poster and the
 * video only load once the player is near the viewport, and the video itself only when played.
 */
export function ChapterVideo({ slug, title, video = learnVideo(slug) }: { slug: string; title: string; video?: LearnVideo | null }): ReactNode {
  const [ref, near] = useInView<HTMLDivElement>("400px");
  if (!video) return null;
  return (
    <figure className="learn-video">
      <div className="learn-video-frame" ref={ref}>
        {near ? (
          <video controls preload="none" playsInline crossOrigin="anonymous" poster={video.poster} aria-label={`${title}, narrated video`}>
            <source src={video.srcSmall} type="video/mp4" media="(max-width: 720px)" />
            <source src={video.src} type="video/mp4" />
            <track kind="captions" src={video.captions} srcLang="en" label="English" />
          </video>
        ) : null}
      </div>
      <figcaption>
        <span>Watch the chapter</span>
        <span className="learn-video-meta">{`${formatDuration(video.duration)} · narrated · captions`}</span>
      </figcaption>
    </figure>
  );
}
