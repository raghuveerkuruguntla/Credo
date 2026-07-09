"use client";

// ─────────────────────────────────────────────────────────────────────────────
// "Why am I seeing this?" — the single, shared explainability affordance from
// spec `005 — UX Bible`. Every insight, prediction, and recommendation exposes
// its ExplanationPayload through THIS component and no other: it is built once
// and reused everywhere (per the "one canonical definition" rule), rather than
// re-implemented per feature.
//
// It is a real, focusable, screen-reader-navigable control (not a decorative
// icon) — it renders the payload's source_facts, reasoning_summary and
// confidence, satisfying SR3's explanation requirement at the UI layer.
// ─────────────────────────────────────────────────────────────────────────────

import { useId, useState } from "react";
import Link from "next/link";
import { HelpCircle, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExplanationPayload, Confidence } from "@/lib/intelligence";

const confidenceStyles: Record<Confidence, { label: string; className: string }> = {
  high: { label: "High confidence", className: "bg-emerald-500/15 text-emerald-300" },
  medium: { label: "Medium confidence", className: "bg-amber-500/15 text-amber-300" },
  low: { label: "Lower confidence", className: "bg-slate-500/20 text-slate-300" },
};

export function ConfidenceBadge({ confidence, className }: { confidence: Confidence; className?: string }) {
  const c = confidenceStyles[confidence];
  return (
    <span
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", c.className, className)}
      // Confidence is never conveyed by colour alone (accessibility rule) — the
      // label text carries the same meaning.
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {c.label}
    </span>
  );
}

export default function WhyExplanation({
  explanation,
  align = "left",
}: {
  explanation: ExplanationPayload;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={cn("text-left", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300 hover:text-indigo-200 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-indigo-500/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden />
        Why am I seeing this?
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Explanation"
          className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left space-y-3 animate-in fade-in"
        >
          {/* Confidence — uncertainty is shown, not hidden. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Explanation</span>
            <ConfidenceBadge confidence={explanation.confidence} />
          </div>

          {/* Reasoning summary — plain language. */}
          <p className="text-xs text-slate-300 leading-relaxed">{explanation.reasoningSummary}</p>

          {/* Source facts — the user can drill from the output into the data. */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Based on</p>
            <ul className="space-y-1">
              {explanation.sourceFacts.map((f, i) => {
                const row = (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5">
                    <span className="min-w-0">
                      <span className="block text-xs text-slate-200 truncate">{f.label}</span>
                      {f.detail && <span className="block text-[11px] text-slate-500 truncate">{f.detail}</span>}
                    </span>
                    {f.amount != null ? (
                      <span className={cn("text-xs font-semibold shrink-0", f.amount < 0 ? "text-slate-200" : "text-emerald-400")}>
                        {f.amount > 0 ? "+" : ""}{formatCurrency(f.amount)}
                      </span>
                    ) : f.href ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden />
                    ) : null}
                  </div>
                );
                return (
                  <li key={i}>
                    {f.href ? (
                      <Link href={f.href} className="block hover:opacity-90 transition-opacity">
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
