// Plays Doom's sound effects with Web Audio. The engine picks each sound, its channel, volume and stereo
// separation (s_sound.c); this file only turns DMX lumps into AudioBuffers and plays them on the page.

/** What host.ts calls when the engine starts, moves or stops a sound. */
export interface DoomSoundSink {
  /** `dmx` is the whole lump, header included. Only valid during the call. */
  start(lump: number, dmx: Uint8Array, channel: number, vol: number, sep: number): void;
  update(channel: number, vol: number, sep: number): void;
  stop(channel: number): void;
  isPlaying(channel: number): boolean;
}

export interface DmxSound {
  rate: number;
  samples: Float32Array;
}

/**
 * Decode a DMX sound lump: format 3, sample rate, sample count, then 8-bit unsigned PCM.
 * Like DMX and Chocolate Doom, skip the 16 padding samples at each end and ignore sounds of 48 samples or fewer.
 */
export function decodeDmx(lump: Uint8Array): DmxSound | null {
  if (lump.length < 8 || lump[0] !== 3 || lump[1] !== 0) return null;
  const view = new DataView(lump.buffer, lump.byteOffset, lump.byteLength);
  const rate = view.getUint16(2, true);
  const length = view.getUint32(4, true);
  // Browsers only promise AudioBuffers from 8,000 Hz up.
  if (rate < 8000 || length > lump.length - 8 || length <= 48) return null;
  const pcm = lump.subarray(8 + 16, 8 + length - 16);
  const samples = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) samples[i] = ((pcm[i] as number) - 128) / 128;
  return { rate, samples };
}

/** Doom's volume, 0–127, as a gain. */
export const gainFor = (vol: number): number => Math.min(127, Math.max(0, vol)) / 127;
/** Doom's separation, 0 (left) to 254 (right) with 128 centred, as a StereoPannerNode pan. */
export const panFor = (sep: number): number => Math.min(1, Math.max(-1, (sep - 128) / 127));

/** s_sound.c's snd_channels: Doom mixes at most this many sounds at once. */
export const DOOM_CHANNELS = 8;

export interface GestureEvent {
  type: string;
  isTrusted: boolean;
  key?: string;
  metaKey?: boolean;
}

/**
 * Whether an event can start audio. Escape and ⌘ shortcuts (⌘⌥J opens DevTools) don't count as a user gesture,
 * and Safari only sends the page the modifier keydowns, so they're skipped. Control fires, so it counts.
 */
export function canStartAudio(e: GestureEvent, activation?: { isActive: boolean }): boolean {
  if (!e.isTrusted || activation?.isActive === false) return false;
  if (e.type !== "keydown") return e.type === "mousedown";
  return e.key !== "Escape" && e.key !== "Meta" && e.key !== "Alt" && e.key !== "Shift" && !e.metaKey;
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

const ignore = (): void => {};

/** The page's one AudioContext, kept across remounts: browsers cap how many a page may open. */
export class PageAudio {
  private ctx: AudioContext | null = null;
  /** A gesture has started the context, so a remounted player can use it without another one. */
  unlocked = false;

  constructor(private readonly create: () => AudioContext = () => new AudioContext()) {}

  context(): AudioContext | null {
    if (this.ctx === null) {
      try {
        this.ctx = this.create();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }
}

const pageAudio = new PageAudio();

export class DoomSound implements DoomSoundSink {
  private ctx: AudioContext | null;
  private running = false;
  private resuming = false;
  private readonly buffers = new Map<number, AudioBuffer | null>();
  private readonly voices: (Voice | null)[] = [];

  constructor(private readonly page: PageAudio = pageAudio) {
    this.ctx = page.unlocked ? page.context() : null;
  }

  /**
   * Resume the page's AudioContext, creating it the first time. Call it synchronously inside a user gesture
   * (see `canStartAudio`): browsers only start audio from one, and Safari checks the call happens in the handler.
   * If the browser refuses anyway, the next gesture tries again.
   */
  unlock(): void {
    const ctx = this.ctx ?? this.page.context();
    if (ctx === null) return;
    this.ctx = ctx;
    this.resuming = true;
    ctx.resume().then(
      () => {
        this.resuming = false;
        this.page.unlocked = true;
        if (!this.running) ctx.suspend().catch(ignore);
      },
      () => {
        this.resuming = false;
        if (ctx.state !== "running") this.ctx = null;
      },
    );
  }

  /** Call from capture-phase `mousedown` and `keydown` listeners: unlocks audio, or resumes it if the browser suspended it. */
  gesture(e: GestureEvent, activation?: { isActive: boolean }): void {
    if (!canStartAudio(e, activation)) return;
    if (!this.unlocked || (this.running && !this.active)) this.unlock();
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  /** Whether sound is playing now, not suspended or still locked. */
  get active(): boolean {
    return this.ctx?.state === "running";
  }

  /** Follow Doom's clock: suspend while the game stands still (unfocused page, paused console). */
  setRunning(running: boolean): void {
    this.running = running;
    if (this.ctx === null) return;
    if (running) this.ctx.resume().catch(ignore);
    else this.ctx.suspend().catch(ignore);
  }

  /** Stop every sound and suspend the page's AudioContext (it's shared, so it stays open). */
  dispose(): void {
    for (let ch = 0; ch < this.voices.length; ch++) this.stop(ch);
    this.setRunning(false);
  }

  start(lump: number, dmx: Uint8Array, channel: number, vol: number, sep: number): void {
    const ctx = this.ctx;
    // A sound started on a suspended context would hold its channel until resume, then play late.
    if (ctx === null || (ctx.state !== "running" && !this.resuming)) return;
    if (!Number.isInteger(channel) || channel < 0 || channel >= DOOM_CHANNELS) return;
    this.stop(channel);
    let buffer = this.buffers.get(lump);
    if (buffer === undefined) {
      buffer = null;
      const sound = decodeDmx(dmx);
      if (sound) {
        try {
          buffer = ctx.createBuffer(1, sound.samples.length, sound.rate);
          buffer.getChannelData(0).set(sound.samples);
        } catch {
          buffer = null;
        }
      }
      this.buffers.set(lump, buffer);
    }
    if (buffer === null) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = gainFor(vol);
    const panner = ctx.createStereoPanner();
    panner.pan.value = panFor(sep);
    source.connect(gain).connect(panner).connect(ctx.destination);
    const voice: Voice = { source, gain, panner };
    source.onended = () => {
      if (this.voices[channel] === voice) this.release(channel);
    };
    this.voices[channel] = voice;
    source.start();
  }

  update(channel: number, vol: number, sep: number): void {
    const voice = this.voices[channel];
    if (!voice) return;
    voice.gain.gain.value = gainFor(vol);
    voice.panner.pan.value = panFor(sep);
  }

  stop(channel: number): void {
    const voice = this.voices[channel];
    if (!voice) return;
    voice.source.onended = null;
    voice.source.stop();
    this.release(channel);
  }

  isPlaying(channel: number): boolean {
    return Boolean(this.voices[channel]);
  }

  private release(channel: number): void {
    const voice = this.voices[channel];
    if (!voice) return;
    voice.source.disconnect();
    voice.gain.disconnect();
    voice.panner.disconnect();
    this.voices[channel] = null;
  }
}
