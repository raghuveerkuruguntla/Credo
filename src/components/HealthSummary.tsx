"use client";

// Compact Financial Health & Insights card for the home dashboard: the score,
// a one-line standing, the five categories, and how many meaningful insights
// were found. The single most important action is shown by "Your Next Best
// Move" right below it, so nothing is repeated here.

import Link from "next/link";
import { useFinancialHealth } from "@/lib/useFinancialHealth";
import { STATUS_LABEL, type IndicatorStatus } from "@/lib/health";
import { cn } from "@/lib/utils";
import { ArrowRight, HeartPulse } from "lucide-react";

const TONE: Record<IndicatorStatus, { text: string; bar: string; stroke: string }> = {
  strong: { text: "text-emerald-300", bar: "bg-emerald-400", stroke: "#34d399" },
  "on-track": { text: "text-indigo-300", bar: "bg-indigo-400", stroke: "#818cf8" },
  "needs-work": { text: "text-amber-300", bar: "bg-amber-400", stroke: "#fbbf24" },
};

const SHORT: Record<string, string> = { cashflow: "Cash flow", debt: "Debt", savings: "Savings", spending: "Spending", obligations: "Bills" };

export default function HealthSummary({ compact = false }: { compact?: boolean }) {
  const fh = useFinancialHealth();
  if (fh.loading) return <div className={cn("rounded-2xl border border-white/[0.07] animate-pulse", compact ? "h-full min-h-[180px]" : "h-40")} aria-busy="true" />;
  if (!fh.hasData) return null;
  const { health } = fh;
  const r = 34, c = 2 * Math.PI * r;

  // Compact: just the score and a few details; the full breakdown lives on /health.
  if (compact) {
    return (
      <section aria-labelledby="hs-title" className="h-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#171a21] to-[#0f1117] p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 id="hs-title" className="text-sm font-semibold text-slate-100 flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-indigo-400" /> Financial health</h2>
          <Link href="/health" className="text-xs text-indigo-400 font-medium hover:text-indigo-300 inline-flex items-center gap-1">Details <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="flex items-center gap-4">
          {health.score != null && health.status ? (
            <svg viewBox="0 0 84 84" className="w-[72px] h-[72px] shrink-0" role="img" aria-label={`Financial health score ${health.score} out of 100`}>
              <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <circle cx="42" cy="42" r={r} fill="none" stroke={TONE[health.status].stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * c} ${c}`} transform="rotate(-90 42 42)" />
              <text x="42" y="49" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700" fontFamily="inherit">{health.score}</text>
            </svg>
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[6px] border-white/[0.07] flex items-center justify-center text-center text-[9px] text-slate-400 px-1 shrink-0">Not enough data</div>
          )}
          <div className="min-w-0">
            <p className={cn("text-base font-semibold", health.status ? TONE[health.status].text : "text-slate-200")}>{health.label}</p>
            {health.weakest && health.score != null && (
              <p className="text-xs text-slate-400 mt-0.5">Weakest: {health.weakest.name.toLowerCase()} ({health.weakest.score})</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{fh.meaningful} insight{fh.meaningful === 1 ? "" : "s"} detected</p>
          </div>
        </div>
        <ul className="mt-auto pt-4 grid grid-cols-5 gap-2">
          {health.categories.map((cat) => (
            <li key={cat.id} title={`${cat.name}: ${cat.score ?? "not enough data"}`}>
              <span className="block text-[10px] text-slate-500 truncate">{SHORT[cat.id]}</span>
              <span className={cn("block text-sm font-semibold", cat.status ? TONE[cat.status].text : "text-slate-500")}>{cat.score ?? "—"}</span>
              <span className="block h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden" aria-hidden>
                {cat.score != null && cat.status && <span className={cn("block h-full rounded-full", TONE[cat.status].bar)} style={{ width: `${cat.score}%` }} />}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  const first = fh.history[0];
  const delta = fh.history.length >= 2 && health.score != null ? health.score - first.s : null;

  return (
    <section aria-labelledby="hs-title" className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.015] p-5 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 flex items-start gap-5">
          {health.score != null && health.status ? (
            <svg viewBox="0 0 84 84" className="w-24 h-24 shrink-0" role="img" aria-label={`Financial health score ${health.score} out of 100`}>
              <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
              <circle cx="42" cy="42" r={r} fill="none" stroke={TONE[health.status].stroke} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * c} ${c}`} transform="rotate(-90 42 42)" />
              <text x="42" y="47" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="700" fontFamily="inherit">{health.score}</text>
            </svg>
          ) : (
            <div className="w-24 h-24 rounded-full border-[7px] border-white/[0.07] flex items-center justify-center text-center text-[10px] text-slate-400 px-2 shrink-0">Not enough data</div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 flex items-center gap-1.5"><HeartPulse className="w-3.5 h-3.5 text-indigo-300" /> Financial health</p>
            <h2 id="hs-title" className={cn("text-lg font-semibold mt-1", health.status ? TONE[health.status].text : "text-slate-200")}>
              {health.label}{delta != null && delta !== 0 && <span className="text-xs font-normal text-slate-400"> · {delta > 0 ? "+" : ""}{delta} since {new Date(first.d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{health.standing}</p>
            <Link href="/health#insights" className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 mt-3">
              {fh.meaningful > 0 ? `${fh.meaningful} insight${fh.meaningful > 1 ? "s" : ""} detected · explore all` : "Explore your insights"} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <ul className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-5 gap-3 self-center">
          {health.categories.map((cat) => (
            <li key={cat.id}>
              <Link href={`/health#cat-${cat.id}`} className="block rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] p-3 h-full">
                <span className="block text-[11px] text-slate-400 leading-tight min-h-[28px]">{cat.name}</span>
                <span className={cn("block text-xl font-semibold mt-1", cat.status ? TONE[cat.status].text : "text-slate-500")}>{cat.score ?? "—"}</span>
                <span className="block h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden" aria-hidden>
                  {cat.score != null && cat.status && <span className={cn("block h-full rounded-full", TONE[cat.status].bar)} style={{ width: `${cat.score}%` }} />}
                </span>
                <span className="sr-only">{cat.status ? STATUS_LABEL[cat.status] : "Not enough data"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
