"use client";

// Count-up number that animates every time it scrolls into view. Used in the
// social-proof strip. Respects reduced-motion by rendering the final value
// immediately. Formatting (prefix/suffix, decimals) is caller-controlled.

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

export function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.8,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Reduced motion shows the final value directly (see `display` below) — no
    // animation, no setState here, so this effect only runs the count-up.
    if (reduce) return;
    // Out of view: reset to 0 so the count-up replays from scratch on re-entry.
    if (!inView) {
      setValue(0);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  const display = reduce ? to : value;
  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
