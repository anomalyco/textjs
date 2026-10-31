import { useEffect, useRef, useState, type RefObject } from "react";
import { useInView } from "../../site/useInView";

/** `true` when the visitor asked for reduced motion. `false` during prerender and hydration. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * A number that counts up once when it scrolls into view. Prerendered (and with reduced motion)
 * it shows the final value; it resets to zero while still offscreen, so the reset is never seen.
 */
export function useCountUp(value: number, duration = 1100): [RefObject<HTMLSpanElement | null>, number] {
  const [near, setNear] = useState(false);
  const [ref, visible] = useInView<HTMLSpanElement>("0px 0px -12% 0px");
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setNear(entries[entries.length - 1]?.isIntersecting ?? false), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    if (reduced || done.current) return;
    if (near && !visible) setShown(0);
  }, [near, visible, reduced]);

  useEffect(() => {
    if (reduced || done.current || !visible) return;
    done.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setShown(value);
    };
  }, [visible, reduced, value, duration]);

  return [ref, reduced ? value : shown];
}
