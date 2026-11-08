"use client";

// Shown across the app while the sample household is on, with a one-click way
// back to the user's own accounts.

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { useFinancialData, setSampleData } from "@/lib/useFinancialData";

export default function SampleDataBanner() {
  const { demo } = useFinancialData();
  const [busy, setBusy] = useState(false);
  if (!demo) return null;
  return (
    <div className="mx-4 sm:mx-6 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-2.5 text-sm">
      <FlaskConical className="w-4 h-4 text-indigo-300 shrink-0" />
      <span className="text-indigo-100 flex-1 min-w-0">
        <span className="font-semibold">Sample data.</span> You&apos;re exploring a sample household with checking, savings, a CD, retirement and brokerage accounts, two credit cards, auto, personal and student loans, and a mortgage.
      </span>
      <button
        onClick={() => { setBusy(true); void setSampleData(false); }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15 disabled:opacity-60"
      >
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Back to my accounts
      </button>
    </div>
  );
}

/** Button that switches the sample household on. */
export function TrySampleDataButton({ className, label = "Explore with sample data" }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => { setBusy(true); void setSampleData(true); }}
      disabled={busy}
      className={className ?? "inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-white/15 text-stone-200 hover:bg-white/[0.06] disabled:opacity-60"}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} {label}
    </button>
  );
}
