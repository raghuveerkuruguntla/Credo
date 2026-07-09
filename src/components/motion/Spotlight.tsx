"use client";

// Pointer-follow spotlight. Wraps a card and adds one soft radial highlight
// that tracks the cursor, plus a gentle lift on hover. Pure CSS-variable
// updates on pointermove (no React re-render, no layout animation). On touch /
// reduced-motion devices it stays inert — the wrapper just passes children
// through with the static styling already on the card.

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

export function Spotlight({
  children,
  className,
  radius = 320,
  color = "rgba(168,140,255,0.16)",
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spot", "1");
  }

  function onLeave() {
    ref.current?.style.setProperty("--spot", "0");
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{ position: "relative" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[26px] transition-opacity duration-300"
        style={{
          opacity: "var(--spot, 0)",
          background: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 50%), ${color}, transparent 70%)`,
          mixBlendMode: "screen",
          zIndex: 5,
        }}
      />
      {children}
    </div>
  );
}
