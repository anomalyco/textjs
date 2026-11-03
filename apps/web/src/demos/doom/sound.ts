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
  if (length > lump.length - 8 || length <= 48) return null;
  const pcm = lump.subarray(8 + 16, 8 + length - 16);
  const samples = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) samples[i] = ((pcm[i] as number) - 128) / 128;
  return { rate, samples };
}

/** Doom's volume, 0–127, as a gain. */
export const gainFor = (vol: number): number => Math.min(127, Math.max(0, vol)) / 127;
/** Doom's separation, 0 (left) to 254 (right) with 128 centred, as a StereoPannerNode pan. */
export const panFor = (sep: number): number => Math.min(1, Math.max(-1, (sep - 128) / 127));

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

// One AudioContext for the page, kept across remounts: browsers cap how many a page may open.
let shared: AudioContext | null = null;
const defaultContext = (): AudioContext => (shared ??= new AudioContext());

export class DoomSound implements DoomSoundSink {
  private ctx: AudioContext | null = null;
  private running = false;
  private readonly buffers = new Map<number, AudioBuffer | null>();
  private readonly voices: (Voice | null)[] = [];

  constructor(private readonly createContext: () => AudioContext = defaultContext) {}

  /**
   * Create and resume the AudioContext. Call it synchronously inside a user gesture (`mousedown`, `keydown`):
   * browsers only let a page start audio from one, and Safari checks that the call happens inside the handler.
   */
  unlock(): void {
    if (this.ctx !== null) return;
    const ctx = (this.ctx = this.createContext());
    void ctx.resume().then(() => {
      if (!this.running) void ctx.suspend();
    });
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  /** Follow Doom's clock: suspend while the game stands still (unfocused page, paused console). */
  setRunning(running: boolean): void {
    this.running = running;
    if (this.ctx === null) return;
    if (running) void this.ctx.resume();
    else void this.ctx.suspend();
  }

  /** Stop every sound and suspend the page's AudioContext (it's shared, so it stays open). */
  dispose(): void {
    for (let ch = 0; ch < this.voices.length; ch++) this.stop(ch);
    this.setRunning(false);
  }

  start(lump: number, dmx: Uint8Array, channel: number, vol: number, sep: number): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    this.stop(channel);
    let buffer = this.buffers.get(lump);
    if (buffer === undefined) {
      const sound = decodeDmx(dmx);
      buffer = sound ? ctx.createBuffer(1, sound.samples.length, sound.rate) : null;
      if (sound && buffer) buffer.getChannelData(0).set(sound.samples);
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
