"use client";

// Scroll-reveal primitives for the landing page. Built on Motion (motion/react).
// Every reveal enhances an already-visible default: the content renders in the
// DOM regardless; only the entrance transform/opacity is animated. Under
// `prefers-reduced-motion` the elements appear instantly with no transform, so
// nothing is ever gated behind an animation that might not fire.

import { useReducedMotion, type Variants } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { MOTION_TAGS, type MotionTagName } from "./tags";

// Exponential ease-out — premium, no bounce. (cubic-bezier ease-out-quint)
const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Entrance offset in px (vertical). */
  y?: number;
  /** Delay in seconds before this element animates in. */
  delay?: number;
  /** Duration in seconds. */
  duration?: number;
  /** Render as a different element (e.g. "section", "li"). */
  as?: MotionTagName;
  /** Re-animate every time it enters the viewport. Set false to animate once. */
  repeat?: boolean;
};

export function Reveal({
  children,
  className,
  style,
  y = 24,
  delay = 0,
  duration = 0.7,
  as = "div",
  repeat = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = MOTION_TAGS[as];

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: !repeat, margin: "-12% 0px -12% 0px" }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

// ── Stagger container + item ────────────────────────────────────────────────
// Wrap a list in <Stagger> and each child in <StaggerItem>; children animate in
// sequence as the group scrolls into view.

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

type GroupProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: MotionTagName;
};

export function Stagger({ children, className, style, as = "div" }: GroupProps) {
  const reduce = useReducedMotion();
  const MotionTag = MOTION_TAGS[as];

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className, style, as = "div" }: GroupProps) {
  const reduce = useReducedMotion();
  const MotionTag = MOTION_TAGS[as];

  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag className={className} style={style} variants={itemVariants}>
      {children}
    </MotionTag>
  );
}
