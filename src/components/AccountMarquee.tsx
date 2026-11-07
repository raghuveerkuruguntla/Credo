"use client";

// Account-type marquee. Shows the kinds of accounts Credo brings into one
// picture (checking through mortgages) instead of bank logos, so the page makes
// no implied partnership claims. The track is duplicated once so the CSS
// translateX(-50%) loop is seamless; it pauses on hover and freezes under
// prefers-reduced-motion (see globals.css .marquee-track).

import { Landmark, PiggyBank, Lock, LineChart, CreditCard, Car, HandCoins, House } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TYPES: { label: string; icon: LucideIcon }[] = [
  { label: "Checking", icon: Landmark },
  { label: "Savings", icon: PiggyBank },
  { label: "CDs", icon: Lock },
  { label: "IRAs & brokerage", icon: LineChart },
  { label: "Credit cards", icon: CreditCard },
  { label: "Auto loans", icon: Car },
  { label: "Personal loans", icon: HandCoins },
  { label: "Mortgages", icon: House },
];

function Chip({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <span className="flex items-center gap-2.5 shrink-0 mx-3 sm:mx-4 px-5 py-2.5 rounded-full text-[14px] sm:text-[15px] font-medium whitespace-nowrap" style={{
      color: "rgba(226,222,244,0.92)",
      background: "rgba(14,12,26,0.55)",
      border: "1px solid rgba(184,170,255,0.20)",
    }}>
      <Icon className="w-4 h-4" style={{ color: "#C9BEFF" }} aria-hidden />
      {label}
    </span>
  );
}

export default function AccountMarquee() {
  const row = [...TYPES, ...TYPES];
  return (
    <div className="relative overflow-hidden">
      <p className="sr-only">Supported account types: {TYPES.map((t) => t.label).join(", ")}.</p>
      {/* edge fades so chips dissolve into the page rather than hard-cropping */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 z-10" style={{ background: "linear-gradient(to right, #000 0%, transparent 100%)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 z-10" style={{ background: "linear-gradient(to left, #000 0%, transparent 100%)" }} />
      <div className="marquee-track py-2" aria-hidden>
        {row.map((t, i) => (
          <Chip key={i} label={t.label} icon={t.icon} />
        ))}
      </div>
    </div>
  );
}
