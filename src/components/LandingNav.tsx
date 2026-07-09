"use client";

// Landing navigation. Three jobs the old static <nav> couldn't do:
//   1. Scroll-aware backdrop — transparent over the hero, frosted once scrolled.
//   2. A reading-progress bar pinned to the very top.
//   3. A real mobile menu (the old links were simply hidden < sm).
// Motion drives the progress bar and the menu transition; both degrade to an
// instant state under prefers-reduced-motion.

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Menu, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <nav className="sticky top-0 z-40">
      {/* reading-progress bar */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] origin-left z-10"
        style={{
          scaleX: reduce ? 1 : progress,
          background:
            "linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #38bdf8 100%)",
          boxShadow: "0 0 12px rgba(124,92,224,0.6)",
        }}
      />

      {/* scroll-reactive backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-500"
        style={{
          background: scrolled
            ? "linear-gradient(to bottom, rgba(8,7,14,0.82) 0%, rgba(8,7,14,0.62) 100%)"
            : "linear-gradient(to bottom, rgba(4,3,8,0.55) 0%, rgba(4,3,8,0) 100%)",
          backdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(184,170,255,0.12)"
            : "1px solid transparent",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-lg font-bold text-white tracking-tight">Credo</span>
        </Link>

        {/* desktop links */}
        <div className="hidden sm:flex items-center gap-7">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="relative inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-full border border-white/20 backdrop-blur-md hover:border-white/40 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            style={{
              background:
                "linear-gradient(135deg,rgba(255,255,255,0.15) 0%,rgba(139,92,246,0.3) 50%,rgba(255,255,255,0.08) 100%)",
              boxShadow:
                "0 0 20px rgba(139,92,246,0.35),inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Get Started</span>
          </Link>
        </div>

        {/* mobile trigger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="sm:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="sm:hidden mx-4 mt-2 rounded-2xl overflow-hidden p-2"
            style={{
              background: "rgba(12,10,22,0.92)",
              border: "1px solid rgba(184,170,255,0.16)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            }}
          >
            {[...LINKS, { href: "/login", label: "Sign In" }].map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 rounded-xl text-[15px] text-slate-200 hover:bg-white/[0.06] transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-semibold text-white"
              style={{
                background: "linear-gradient(90deg,#6366F1,#8B5CF6)",
                boxShadow: "0 0 24px rgba(124,92,224,0.45)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Get Started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
