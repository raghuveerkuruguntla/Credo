"use client";

// One finding from the Financial Intelligence Engine, shown inside its health
// category: what it is, how sure we are, what it costs, how it affects the
// score (only when the scoring model says so), and what to do.

import Link from "next/link";
import AskCoachLink from "@/components/AskCoachLink";
import { coachPrompt, type BlindSpot, type FindingKind, type Certainty } from "@/lib/blindspots";
import { cn, formatCurrency } from "@/lib/utils";
import WhyExplanation from "@/components/WhyExplanation";
import { Bot, Check, X, ChevronDown, ArrowRight, HeartPulse } from "lucide-react";

export const KIND: Record<FindingKind, { label: string; cls: string; dot: string }> = {
  risk: { label: "Risk", cls: "text-rose-200/90 border-rose-400/25 bg-rose-400/[0.08]", dot: "bg-rose-400" },
  opportunity: { label: "Opportunity", cls: "text-emerald-200/90 border-emerald-400/25 bg-emerald-400/[0.08]", dot: "bg-emerald-400" },
  info: { label: "Insight", cls: "text-sky-200/90 border-sky-400/25 bg-sky-400/[0.08]", dot: "bg-sky-400" },
};
const CERT: Record<Certainty, { label: string; hint: string }> = {
  verified: { label: "Verified", hint: "Directly in your transactions or balances" },
  likely: { label: "Likely", hint: "A strong pattern or a projection" },
  possible: { label: "Worth checking", hint: "A suggestion we can't confirm from data" },
};

function impactLine(f: BlindSpot) {
  if (!f.impact) return null;
  const amt = formatCurrency(Math.round(f.impact.amount));
  if (f.impact.period === "one-time") return { text: `${amt} one-time`, tone: "text-rose-300/90" };
  return f.impact.kind === "loss" ? { text: `${amt}/yr if it continues`, tone: "text-rose-300/90" } : { text: `up to ${amt}/yr`, tone: "text-emerald-300/90" };
}

export default function InsightCard({ f, contribution, open, onToggle, onDecide }: {
  f: BlindSpot;
  contribution: { text: string; overall: number } | null;
  open: boolean;
  onToggle: () => void;
  onDecide: (s: "resolved" | "dismissed") => void;
}) {
  const k = KIND[f.kind];
  const imp = impactLine(f);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left flex gap-3 items-start px-4 py-3 cursor-pointer">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-2", k.dot)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-stone-100">{f.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px]">
            <span className={cn("px-1.5 py-px rounded-md border", k.cls)}>{k.label}</span>
            <span className="text-stone-500" title={CERT[f.certainty].hint}>{CERT[f.certainty].label}</span>
            {imp && <span className={imp.tone}>{imp.text}</span>}
            {contribution && contribution.overall > 0 && <span className="text-indigo-300/90 inline-flex items-center gap-1"><HeartPulse className="w-3 h-3" /> costing ~{contribution.overall} pts</span>}
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-stone-500 shrink-0 mt-1 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[34px] space-y-3">
          <p className="text-sm text-stone-300 leading-relaxed">{f.summary}</p>
          {f.kind !== "info" && <p className="text-sm text-stone-400"><span className="text-stone-300">If nothing changes: </span>{f.consequence}</p>}
          <p className="text-xs text-stone-400 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
            <span className="text-stone-300 font-medium">Effect on your score: </span>
            {contribution ? contribution.text : f.kind === "risk" ? "Not part of the score formula, but it costs you money, so it's worth fixing." : f.kind === "opportunity" ? "None. Opportunities never lower your score." : "None. This is an informational pattern, not a problem."}
          </p>
          <div>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">{f.kind === "info" ? "If you want to act on it" : "Recommended actions"}</p>
            <ol className="space-y-1.5">
              {f.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-300">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>
          <WhyExplanation explanation={f.explanation} />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AskCoachLink question={coachPrompt(f, contribution?.text)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-[#0a0b0f] hover:bg-stone-200">
              <Bot className="w-3.5 h-3.5" /> Ask the coach
            </AskCoachLink>
            {f.links.filter((l) => !l.href.startsWith("/health")).map((l) => (
              <Link key={l.href + l.label} href={l.href} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-stone-300 hover:bg-white/[0.05]">
                {l.label} <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
            <span className="flex-1" />
            <button type="button" onClick={() => onDecide("resolved")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-emerald-300/90 hover:bg-emerald-500/10 cursor-pointer"><Check className="w-3.5 h-3.5" /> Mark resolved</button>
            <button type="button" onClick={() => onDecide("dismissed")} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-stone-400 hover:bg-white/[0.05] cursor-pointer"><X className="w-3.5 h-3.5" /> Not an issue</button>
          </div>
        </div>
      )}
    </div>
  );
}
