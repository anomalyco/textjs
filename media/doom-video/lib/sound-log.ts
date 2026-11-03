import type { DoomSoundSink } from "../../../apps/web/src/demos/doom/sound";
import { decodeDmx } from "../../../apps/web/src/demos/doom/sound";

/** One call from the engine's `sound` imports. `t` is milliseconds on the capture's clock. */
export type SoundEvent =
  | { t: number; kind: "start"; lump: number; channel: number; vol: number; sep: number }
  | { t: number; kind: "update"; channel: number; vol: number; sep: number }
  | { t: number; kind: "stop"; channel: number };

/**
 * A sound sink with Web Audio's timing but no audio: a channel plays until its decoded sound runs out (as
 * `AudioBufferSourceNode.onended` would) or the engine stops it. Logs every call, for offline previews.
 */
export class LoggingSink implements DoomSoundSink {
  readonly events: SoundEvent[] = [];
  private readonly ends: (number | null)[] = [];

  constructor(private readonly now: () => number) {}

  start(lump: number, dmx: Uint8Array, channel: number, vol: number, sep: number): void {
    const t = this.now();
    this.events.push({ t, kind: "start", lump, channel, vol, sep });
    const s = decodeDmx(dmx);
    this.ends[channel] = s ? t + (s.samples.length / s.rate) * 1000 : null;
  }

  update(channel: number, vol: number, sep: number): void {
    this.events.push({ t: this.now(), kind: "update", channel, vol, sep });
  }

  stop(channel: number): void {
    if (this.ends[channel] == null) return;
    this.events.push({ t: this.now(), kind: "stop", channel });
    this.ends[channel] = null;
  }

  isPlaying(channel: number): boolean {
    const end = this.ends[channel];
    if (end == null) return false;
    if (this.now() >= end) {
      this.ends[channel] = null;
      return false;
    }
    return true;
  }
}
