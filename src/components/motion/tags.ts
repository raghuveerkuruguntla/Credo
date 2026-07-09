// Pre-created motion components, declared once at module scope. Calling
// `motion(tag)` inside a render creates a brand-new component every render,
// which resets its state and trips react-hooks lint. A static registry keyed by
// tag name lets callers pick an animated element via an `as` prop without that
// cost. Add tags here as needed.

import { motion } from "motion/react";

export const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  ul: motion.ul,
  li: motion.li,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  a: motion.a,
} as const;

export type MotionTagName = keyof typeof MOTION_TAGS;
