/**
 * Tween and spring values driven by the frame-paced animation loop.
 */

import { useRef, useState } from "react";
import { useAnimationFrame } from "./timers";

export type Easing = (t: number) => number;

/** Standard easing curves (`t` in 0..1). */
export const easings = Object.freeze({
  linear: ((t) => t) as Easing,
  easeInQuad: ((t) => t * t) as Easing,
  easeOutQuad: ((t) => 1 - (1 - t) * (1 - t)) as Easing,
  easeInOutQuad: ((t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)) as Easing,
  easeOutCubic: ((t) => 1 - (1 - t) ** 3) as Easing,
  easeInOutCubic: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)) as Easing,
  easeOutExpo: ((t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))) as Easing,
});

export type EasingName = keyof typeof easings;

export interface UseTweenOptions {
  /** Milliseconds (default `240`). */
  duration?: number;
  easing?: Easing | EasingName;
  /** Start value on mount (default: `target`, i.e. no initial animation). */
  from?: number;
}

/** Animate toward `target` whenever it changes. Returns the current value. */
export function useTween(target: number, options: UseTweenOptions = {}): number {
  const duration = Math.max(1, options.duration ?? 240);
  const ease = typeof options.easing === "function" ? options.easing : easings[options.easing ?? "easeOutCubic"];
  const [value, setValue] = useState(options.from ?? target);
  const anim = useRef({ from: options.from ?? target, to: target, elapsed: 0, value: options.from ?? target });
  const a = anim.current;
  if (a.to !== target) {
    a.from = a.value;
    a.to = target;
    a.elapsed = 0;
  }
  const done = a.value === a.to;
  useAnimationFrame(
    (dt) => {
      const s = anim.current;
      s.elapsed += dt;
      const t = Math.min(1, s.elapsed / duration);
      s.value = t >= 1 ? s.to : s.from + (s.to - s.from) * ease(t);
      setValue(s.value);
    },
    { isActive: !done },
  );
  return done ? a.to : value;
}

export interface UseSpringOptions {
  /** Spring stiffness (default `170`). */
  stiffness?: number;
  /** Damping (default `26`). */
  damping?: number;
  mass?: number;
  /** Settle threshold (default `0.01`). */
  precision?: number;
  from?: number;
}

/** Physically animate toward `target` (critically-damped defaults; no overshoot). */
export function useSpring(target: number, options: UseSpringOptions = {}): number {
  const { stiffness = 170, damping = 26, mass = 1, precision = 0.01 } = options;
  const [value, setValue] = useState(options.from ?? target);
  const s = useRef({ x: options.from ?? target, v: 0 });
  const settled = Math.abs(s.current.x - target) < precision && Math.abs(s.current.v) < precision;
  useAnimationFrame(
    (dt) => {
      const st = s.current;
      // Fixed sub-steps keep the integration stable at ~15fps.
      let remaining = Math.min(dt, 250) / 1000;
      while (remaining > 0) {
        const h = Math.min(remaining, 1 / 120);
        const force = -stiffness * (st.x - target) - damping * st.v;
        st.v += (force / mass) * h;
        st.x += st.v * h;
        remaining -= h;
      }
      if (Math.abs(st.x - target) < precision && Math.abs(st.v) < precision) {
        st.x = target;
        st.v = 0;
      }
      setValue(st.x);
    },
    { isActive: !settled },
  );
  return settled ? target : value;
}
