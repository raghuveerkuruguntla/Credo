"use client";

// Staggered entrance for the hero content. Fires on load (the hero is in view
// at the top) and re-fires whenever the hero scrolls back into view, so the
// entrance is never a one-shot. Children opt in by wrapping in <HeroItem>.

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { MOTION_TAGS, type MotionTagName } from "./tags";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE },
  },
};

export function HeroReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: MotionTagName;
}) {
  const reduce = useReducedMotion();
  const MotionTag = MOTION_TAGS[as];
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <MotionTag className={className} variants={item}>
      {children}
    </MotionTag>
  );
}
