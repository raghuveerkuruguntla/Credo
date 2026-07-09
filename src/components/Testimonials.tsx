"use client";

// Testimonials. A responsive masonry-ish grid of glass quote cards matched to
// the landing page's indigo-glass system. Cards reveal on scroll with a stagger
// and lift slightly on hover. Avatars are gradient initial-chips (no external
// image requests). Heights vary with quote length via CSS columns so the grid
// reads organically rather than as identical tiles.

import { Star, Quote } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type T = { quote: string; name: string; role: string; initials: string; hue: string };

const TESTIMONIALS: T[] = [
  {
    quote:
      "I finally see every account in one place. Credo connected my checking, two cards, and my brokerage in under five minutes — and the net-worth number alone changed how I think about money.",
    name: "Maya R.",
    role: "Product designer",
    initials: "MR",
    hue: "#6366F1",
  },
  {
    quote:
      "The AI assistant is the killer feature. I asked if I could afford a trip in March and it actually walked through my upcoming bills. It's like a financial advisor that knows my real numbers.",
    name: "Daniel K.",
    role: "Software engineer",
    initials: "DK",
    hue: "#8B5CF6",
  },
  {
    quote:
      "Budgeting used to be a spreadsheet I'd abandon by week two. Credo's category limits update against real spending automatically — I haven't touched a spreadsheet since.",
    name: "Priya S.",
    role: "Small-business owner",
    initials: "PS",
    hue: "#38bdf8",
  },
  {
    quote:
      "Clean, fast, and genuinely calming to use. No clutter, no upsells in my face — just my money, organized. Worth the Plus plan for the forecasting alone.",
    name: "Marcus T.",
    role: "Marketing lead",
    initials: "MT",
    hue: "#a855f7",
  },
  {
    quote:
      "Security was my big worry and Credo nailed it — read-only Plaid connections, nothing stored. I felt comfortable linking everything, which I'd never done with another app.",
    name: "Elena V.",
    role: "Nurse practitioner",
    initials: "EV",
    hue: "#6366F1",
  },
  {
    quote:
      "Forecasting is what sold me. Seeing how a big purchase ripples through the next six months helped me delay a decision I would've regretted.",
    name: "Jordan P.",
    role: "Freelance consultant",
    initials: "JP",
    hue: "#8B5CF6",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5" style={{ color: "#FBBF24", fill: "#FBBF24" }} />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:balance]">
      {TESTIMONIALS.map((t, i) => (
        <Reveal
          key={i}
          y={20}
          delay={(i % 3) * 0.08}
          className="mb-5 break-inside-avoid"
        >
          <figure
            className="group relative rounded-[22px] p-6 transition-transform duration-300 hover:-translate-y-1"
            style={{
              background: "linear-gradient(160deg, rgba(40,35,58,0.46) 0%, rgba(16,14,26,0.5) 100%)",
              border: "1px solid rgba(184,170,255,0.16)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 44px rgba(0,0,0,0.4), 0 0 44px rgba(124,92,224,0.08)",
              backdropFilter: "blur(16px) saturate(140%)",
              WebkitBackdropFilter: "blur(16px) saturate(140%)",
            }}
          >
            <Quote className="absolute right-5 top-5 h-7 w-7 opacity-15" style={{ color: "#C9BEFF" }} aria-hidden />
            <Stars />
            <blockquote className="mt-3.5 text-[14.5px] leading-relaxed" style={{ color: "rgba(214,210,230,0.92)" }}>
              {t.quote}
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{
                  background: `linear-gradient(150deg, ${t.hue}, rgba(80,60,180,0.7))`,
                  boxShadow: `0 0 18px ${t.hue}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
                }}
                aria-hidden
              >
                {t.initials}
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-white">{t.name}</span>
                <span className="block text-[12.5px]" style={{ color: "rgba(170,166,196,0.8)" }}>{t.role}</span>
              </span>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
