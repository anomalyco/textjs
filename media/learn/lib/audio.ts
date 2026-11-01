/** The soundtrack: narration clips placed on the timeline, loudness-normalized (EBU R128) for the web. */
import { join } from "node:path";
import { FFMPEG, run } from "./env";
import type { Clip } from "./timeline";

export const TARGET_LUFS = -16;
export const TRUE_PEAK = -1.5;

function loudnorm(input: string, output: string, extra: string[] = []): { input_i: string; output_i: string } {
  const probe = Bun.spawnSync([FFMPEG, "-hide_banner", "-i", input, "-af", `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11:print_format=json`, "-f", "null", "-"], { stderr: "pipe" });
  const text = probe.stderr.toString();
  const json = JSON.parse(text.slice(text.lastIndexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, string>;
  const af = `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
  run([FFMPEG, "-y", "-loglevel", "error", "-i", input, "-af", af, "-ar", "48000", "-ac", "2", ...extra, output]);
  return { input_i: json.input_i!, output_i: json.output_i! };
}

/** Integrated loudness and true peak of a file. */
export function measure(file: string): { lufs: number; peak: number } {
  const p = Bun.spawnSync([FFMPEG, "-hide_banner", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { stderr: "pipe" });
  const text = p.stderr.toString();
  const summary = text.slice(text.lastIndexOf("Summary:"));
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]);
  return { lufs, peak };
}

/** A soft, license-clean pad (synthesized here: two slow chords), for an optional music bed. */
function pad(duration: number, out: string): void {
  // Two chords (A add9 / F♯m11 voicings), eight seconds each, slow swells; filtered warm.
  const chord = (fs: number[]) => fs.map((f) => `sin(2*PI*${f}*t)+0.3*sin(2*PI*${f * 2.002}*t)`).join("+");
  const a = chord([110, 164.81, 246.94, 277.18]);
  const b = chord([92.5, 138.59, 220, 329.63]);
  const expr = `0.05*((0.5+0.5*cos(PI*mod(t,16)/8))*(${a})+(0.5-0.5*cos(PI*mod(t,16)/8))*(${b}))*(0.75+0.25*sin(2*PI*t/11))`;
  run([FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", `aevalsrc='${expr}':s=48000:d=${duration.toFixed(2)}`, "-af", "lowpass=f=900,highpass=f=60,aecho=0.8:0.7:120|240:0.3|0.2,afade=t=in:d=3,afade=t=out:st=" + Math.max(0, duration - 4).toFixed(2) + ":d=4", "-ac", "2", out]);
}

export function soundtrack(clips: Clip[], duration: number, work: string, opts: { music?: boolean } = {}): { file: string; lufs: number; peak: number } {
  const raw = join(work, "narration-raw.wav");
  const inputs = clips.flatMap((c) => ["-i", c.file]);
  const chains = clips.map((c, i) => `[${i}:a]adelay=delays=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(";");
  const mix = `${chains};${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad=whole_dur=${duration.toFixed(3)},atrim=0:${duration.toFixed(3)}[out]`;
  run([FFMPEG, "-y", "-loglevel", "error", ...inputs, "-filter_complex", mix, "-map", "[out]", "-ar", "48000", "-ac", "1", raw]);
  const voice = join(work, "narration.wav");
  loudnorm(raw, voice);
  let file = voice;
  if (opts.music) {
    const bed = join(work, "pad.wav");
    pad(duration, bed);
    const mixed = join(work, "mix-raw.wav");
    // The bed sits ~22 dB under the voice and ducks a further ~8 dB while she speaks.
    run([
      FFMPEG, "-y", "-loglevel", "error", "-i", voice, "-i", bed, "-filter_complex",
      "[1:a]volume=-21dB[bed];[0:a]asplit=2[v][key];[bed][key]sidechaincompress=threshold=0.02:ratio=6:attack=80:release=600[ducked];[v][ducked]amix=inputs=2:normalize=0[out]",
      "-map", "[out]", "-ar", "48000", "-ac", "2", mixed,
    ]);
    file = join(work, "mix.wav");
    loudnorm(mixed, file);
  }
  return { file, ...measure(file) };
}
