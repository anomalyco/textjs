/**
 * The chapter video's floating mini player as a pure state machine. The component feeds it media events and the
 * slot's IntersectionObserver entries.
 *
 * It floats once the video is playing and its slot has scrolled fully out of view. It stays up while paused, so it
 * can be resumed, and docks when the slot is back in view, the video ends, native Picture-in-Picture takes over or
 * the viewer closes it.
 */

export interface MiniPlayerState {
  playing: boolean;
  slotInView: boolean;
  pip: boolean;
  floating: boolean;
}

export type MiniPlayerEvent =
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" }
  | { type: "slot"; inView: boolean }
  | { type: "pip"; active: boolean }
  | { type: "close" };

export const MINI_PLAYER_IDLE: MiniPlayerState = { playing: false, slotInView: true, pip: false, floating: false };

function settle(s: MiniPlayerState): MiniPlayerState {
  return { ...s, floating: !s.slotInView && !s.pip && (s.floating || s.playing) };
}

export function miniPlayer(s: MiniPlayerState, e: MiniPlayerEvent): MiniPlayerState {
  switch (e.type) {
    case "play":
      return settle({ ...s, playing: true });
    case "pause":
      return { ...s, playing: false };
    case "ended":
      return { ...s, playing: false, floating: false };
    case "slot":
      return settle({ ...s, slotInView: e.inView });
    case "pip":
      return settle({ ...s, pip: e.active });
    case "close":
      return { ...s, floating: false };
  }
}

/** Esc closes the mini player unless the keystroke belongs to the console app or another surface that owns its keys. */
export function escClosesMiniPlayer({ inPlayer, routedToConsole, inOtherKeyOwner }: { inPlayer: boolean; routedToConsole: boolean; inOtherKeyOwner: boolean }): boolean {
  if (inPlayer) return true;
  return !routedToConsole && !inOtherKeyOwner;
}
