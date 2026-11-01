import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { BYPASS_SELECTOR, shouldRouteToConsole } from "../console-companion/boot";
import { siteStore } from "../console-companion/store";
import { CloseIcon, PauseIcon, PipIcon, PlayIcon, ReturnIcon } from "../site/icons";
import { useInView } from "../site/useInView";
import { captionsMode, captionsStore, useCaptions } from "./captions";
import { escClosesMiniPlayer, miniPlayer, MINI_PLAYER_IDLE, type MiniPlayerEvent, type MiniPlayerState } from "./miniPlayer";
import { formatDuration, learnVideo, type LearnVideo } from "./video";

/** Narrow screens get the compact bottom-bar mini player (matches the site's phone breakpoint). */
const COMPACT_MEDIA = "(max-width: 640px)";

/**
 * The chapter's narrated video. The frame reserves its 16:9 box up front (no layout shift); the poster and the
 * video only load once the player is near the viewport, and the video itself only when played.
 *
 * While it plays with its slot scrolled out of view, the same `<video>` element is pinned to a corner as a mini
 * player (`position: fixed`), so playback and the caption track carry on untouched and the slot keeps its space.
 */
export function ChapterVideo({ slug, title, video = learnVideo(slug) }: { slug: string; title: string; video?: LearnVideo | null }): ReactNode {
  const [frameRef, near] = useInView<HTMLDivElement>("400px");
  // Once loaded, the player stays mounted: scrolling far away must not stop the video.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (near) setLoaded(true);
  }, [near]);
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const captions = useCaptions();
  const compact = useMedia(COMPACT_MEDIA);
  const [mini, send] = useMiniPlayer(frameRef, el, barRef);
  const floating = mini.floating;
  const dock = useDockPhase(floating);
  useCaptionTrack(el, captions);

  if (!video) return null;

  const togglePlay = (): void => {
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };
  const backToVideo = (): void => {
    if (el) focusVideo(el, frameRef.current);
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    frameRef.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  };
  const close = (): void => {
    el?.pause();
    send({ type: "close" });
  };
  const pip = el !== null && !compact && pipSupported(el);

  return (
    <figure className="learn-video">
      <div className="learn-video-frame" ref={frameRef} tabIndex={-1}>
        {loaded ? (
          <div
            className={`learn-video-player${floating ? ` floating${compact ? " compact" : ""}` : dock ? ` ${dock}` : ""}`}
            role={floating ? "region" : undefined}
            aria-label={floating ? "Mini player" : undefined}
            data-console-bypass=""
          >
            {floating ? (
              <div className="learn-mini-bar" ref={barRef}>
                <button type="button" className="learn-mini-back" onClick={backToVideo} aria-label={`${title}, back to video`} title="Back to video">
                  <ReturnIcon size={13} />
                  <span>{title}</span>
                </button>
                <button type="button" className="learn-mini-btn" onClick={togglePlay} aria-label={mini.playing ? "Pause" : "Play"} title={mini.playing ? "Pause" : "Play"}>
                  {mini.playing ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
                </button>
                <CaptionsToggle on={captions} className="learn-mini-btn learn-mini-cc" label="CC" />
                {pip ? (
                  <button type="button" className="learn-mini-btn" onClick={() => void el.requestPictureInPicture().catch(() => undefined)} aria-label="Picture-in-Picture" title="Picture-in-Picture">
                    <PipIcon size={14} />
                  </button>
                ) : null}
                <button type="button" className="learn-mini-btn" onClick={close} aria-label="Close mini player" title="Close (Esc)">
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : null}
            <video
              ref={setEl}
              controls={!(floating && compact)}
              preload="none"
              playsInline
              crossOrigin="anonymous"
              poster={video.poster}
              aria-label={`${title}, narrated video`}
              onClick={floating && compact ? backToVideo : undefined}
            >
              <source src={video.srcSmall} type="video/mp4" media="(max-width: 720px)" />
              <source src={video.src} type="video/mp4" />
              <track kind="captions" src={video.captions} srcLang="en" label="English" />
            </video>
          </div>
        ) : null}
      </div>
      <figcaption>
        <span>Watch the chapter</span>
        <span className="learn-video-meta">
          <span>{formatDuration(video.duration)}</span>
          <CaptionsToggle on={captions} className="learn-video-cc" label="Captions" />
        </span>
      </figcaption>
    </figure>
  );
}

function CaptionsToggle({ on, className, label }: { on: boolean; className: string; label: string }): ReactNode {
  return (
    <button type="button" className={className} aria-pressed={on} onClick={() => captionsStore.set(!on)} title={on ? "Hide captions" : "Show captions"}>
      {label}
    </button>
  );
}

function pipSupported(video: HTMLVideoElement): boolean {
  return typeof document !== "undefined" && document.pictureInPictureEnabled === true && typeof video.requestPictureInPicture === "function" && !video.disablePictureInPicture;
}

/** Focus the video without scrolling (falls back to its frame where a video with controls isn't focusable). */
function focusVideo(video: HTMLVideoElement, frame: HTMLElement | null): void {
  video.focus({ preventScroll: true });
  if (document.activeElement !== video) frame?.focus({ preventScroll: true });
}

/**
 * Docking hides the player for two frames, then fades it in. Chrome counts the jump from the corner back into the
 * slot as a layout shift unless the player is invisible for the frame it moves in. Focus survives the hidden frames.
 */
function useDockPhase(floating: boolean): "docking" | "docked" | null {
  const [phase, setPhase] = useState<"docking" | "docked" | null>(null);
  const [was, setWas] = useState(floating);
  if (was !== floating) {
    setWas(floating);
    setPhase(floating ? null : "docking");
  }
  useEffect(() => {
    if (phase !== "docking") return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setPhase("docked"));
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);
  return phase;
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(query);
    const sync = (): void => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** Applies the captions choice to the video's track, and follows changes made from the native controls. */
function useCaptionTrack(video: HTMLVideoElement | null, on: boolean): void {
  useEffect(() => {
    const track = video?.textTracks[0];
    if (!track) return;
    const mode = captionsMode(on, track.mode);
    if (mode) track.mode = mode;
  }, [video, on]);
  useEffect(() => {
    if (!video) return;
    const tracks = video.textTracks;
    const sync = (): void => {
      const track = tracks[0];
      if (track) captionsStore.set(track.mode === "showing");
    };
    tracks.addEventListener("change", sync);
    return () => tracks.removeEventListener("change", sync);
  }, [video]);
}

function headerOffset(): number {
  const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
  return Number.isFinite(h) ? h : 0;
}

function useMiniPlayer(
  frameRef: RefObject<HTMLDivElement | null>,
  video: HTMLVideoElement | null,
  barRef: RefObject<HTMLDivElement | null>,
): [MiniPlayerState, (e: MiniPlayerEvent) => void] {
  const [state, setState] = useState(MINI_PLAYER_IDLE);
  const current = useRef(state);

  const send = useCallback(
    (e: MiniPlayerEvent): void => {
      const prev = current.current;
      const next = miniPlayer(prev, e);
      if (next.floating === prev.floating && next.playing === prev.playing && next.slotInView === prev.slotInView && next.pip === prev.pip) return;
      // Docking removes the bar: keep focus on the video rather than dropping it to <body>.
      if (prev.floating && !next.floating && video && barRef.current?.contains(document.activeElement)) focusVideo(video, frameRef.current);
      current.current = next;
      setState(next);
    },
    [video, barRef, frameRef],
  );

  useEffect(() => {
    if (!video) return;
    const on = (type: string, e: () => MiniPlayerEvent): [string, () => void] => [type, () => send(e())];
    const handlers = [
      on("play", () => ({ type: "play" })),
      on("pause", () => ({ type: "pause" })),
      on("ended", () => ({ type: "ended" })),
      on("enterpictureinpicture", () => ({ type: "pip", active: true })),
      on("leavepictureinpicture", () => ({ type: "pip", active: false })),
    ];
    for (const [type, h] of handlers) video.addEventListener(type, h);
    return () => {
      for (const [type, h] of handlers) video.removeEventListener(type, h);
    };
  }, [video, send]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!video || !frame || typeof IntersectionObserver === "undefined") return;
    // The sticky header covers the top of the viewport: a slot under it is out of view.
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) send({ type: "slot", inView: last.isIntersecting });
      },
      { rootMargin: `-${headerOffset()}px 0px 0px 0px` },
    );
    io.observe(frame);
    return () => io.disconnect();
  }, [video, frameRef, send]);

  const floating = state.floating;
  useEffect(() => {
    if (!floating) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      const active = document.activeElement;
      const player = barRef.current?.parentElement ?? null;
      const owner = active?.closest(BYPASS_SELECTOR) ?? null;
      const close = escClosesMiniPlayer({
        inPlayer: player !== null && active !== null && player.contains(active),
        routedToConsole: shouldRouteToConsole(active, siteStore.getSnapshot().consoleInput),
        inOtherKeyOwner: owner !== null && owner !== player,
      });
      if (!close) return;
      video?.pause();
      send({ type: "close" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [floating, video, send, barRef]);

  return [state, send];
}
