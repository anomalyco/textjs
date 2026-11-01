import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Image, Text, useInput, useTheme, useTimeout } from "@textjs/react";
import { EggFrame, Facts, Raster } from "../ui";

/** Keys a–k play C4 to C5, the white keys of one octave. */
export const KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12];
// Black keys sit after these white keys.
const SHARP_AFTER = new Set([0, 1, 3, 4, 5]);
const KEY_W = 6;

/** One octave of keys, the pressed one in `accent`. */
export function keyboard(lit: number | null, accent: string): Raster {
  const r = new Raster(KEY_W * KEYS.length - 1, 16);
  KEYS.forEach((_, i) => r.rect(i * KEY_W, 0, KEY_W - 1, 16, lit === i ? accent : "#ececec"));
  for (const i of SHARP_AFTER) r.rect(i * KEY_W + 3, 0, 4, 9, "#151515");
  return r;
}

type Ctx = { ctx: AudioContext; filter: BiquadFilterNode } | null;

/** A short sawtooth through a low-pass filter. Silent where Web Audio isn't available. */
function play(audio: { current: Ctx | undefined }, semitone: number): void {
  try {
    if (audio.current === undefined) {
      const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
      if (!AC) {
        audio.current = null;
        return;
      }
      const ctx = new AC();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      filter.Q.value = 6;
      filter.connect(ctx.destination);
      audio.current = { ctx, filter };
    }
    const a = audio.current;
    if (!a) return;
    const t = a.ctx.currentTime;
    const osc = a.ctx.createOscillator();
    const gain = a.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 261.63 * 2 ** (semitone / 12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(a.filter);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    audio.current = null;
  }
}

export function SimonEgg(): ReactNode {
  const theme = useTheme();
  const [lit, setLit] = useState<{ i: number; n: number } | null>(null);
  const audio = useRef<Ctx | undefined>(undefined);
  useEffect(() => () => void audio.current?.ctx.close().catch(() => {}), []);
  useTimeout(() => setLit(null), lit ? 220 + (lit.n % 2) : null);
  useInput((e) => {
    if (e.ctrl || e.meta || e.alt) return;
    const i = KEYS.indexOf(e.input);
    if (i < 0) return;
    e.stopPropagation();
    play(audio, SEMITONES[i] as number);
    setLit((l) => ({ i, n: (l?.n ?? 0) + 1 }));
  });
  const keys = useMemo(() => keyboard(lit?.i ?? null, theme.accent), [lit, theme.accent]);
  return (
    <EggFrame crumb="sh-101" hints={[{ keys: "a – k", label: "play" }]}>
      <Box className="flex-row grow items-center justify-center gap-6">
        <Box className="flex-col shrink-0">
          <Image pixels={keys} />
          <Box className="flex-row h-1 shrink-0">
            {KEYS.map((k, i) => (
              <Text key={k} color={lit?.i === i ? "accent" : "subtle"} wrap="nowrap" width={KEY_W}>
                {`  ${k}`}
              </Text>
            ))}
          </Box>
        </Box>
        <Facts
          rows={[
            ["Model", "SH-101 (monophonic)"],
            ["Poster art", "MS Paint"],
            ["Rider", "1 × IPA, 1 × coffee"],
          ]}
        />
      </Box>
    </EggFrame>
  );
}
