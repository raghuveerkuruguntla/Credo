"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Insights — Credo's "decisions, not dashboards" surface.
//
// Implements three product capabilities from spec `003 — Product Requirements`
// on top of the three-layer engine in `@/lib/intelligence`:
//
//   C3  Insights & Explanations   — ranked by materiality, each explainable
//   C5  Recommendations           — specific, actionable: accept / adjust / dismiss
//   C6  Action & Tracking         — accepted recs become tracked goals
//
// Every insight and recommendation exposes its "Why am I seeing this?" affordance
// (spec 005). Dismissals are respected and not re-surfaced (C5 functional req).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFinancialData, sampleScoped } from "@/lib/useFinancialData";
import {
  buildIntelligence,
  type Recommendation,
  type Insight,
  type Goal,
} from "@/lib/intelligence";
import WhyExplanation, { ConfidenceBadge } from "@/components/WhyExplanation";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Lightbulb, Sparkles, Check, X, SlidersHorizontal, Target,
  TrendingUp, TrendingDown, Minus, Bot, ArrowRight, CheckCircle2,
} from "lucide-react";

const card =
  "bg-gradient-to-b from-[#171a21] to-[#0f1117] border border-white/[0.06] rounded-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]";

const DISMISS_KEY = "credo.dismissedRecs";
const ACCEPT_KEY = "credo.acceptedRecs";

type Accepted = Record<string, { amount: number; at: string }>;

const toneIcon = { positive: TrendingUp, warning: TrendingDown, neutral: Minus } as const;
const toneColor = {
  positive: "text-emerald-400",
  warning: "text-amber-400",
  neutral: "text-slate-400",
} as const;

export default function InsightsPage() {
  const { accounts, transactions, loading, hasData } = useFinancialData();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Accepted>({});
  const [adjust, setAdjust] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load persisted decisions (dismissed / accepted) once on mount.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(sampleScoped(DISMISS_KEY)) ?? "[]");
      const a = JSON.parse(localStorage.getItem(sampleScoped(ACCEPT_KEY)) ?? "{}");
      if (Array.isArray(d)) setDismissed(new Set(d));
      if (a && typeof a === "object") setAccepted(a);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const persistDismissed = (next: Set<string>) => {
    setDismissed(next);
    try { localStorage.setItem(sampleScoped(DISMISS_KEY), JSON.stringify([...next])); } catch {}
  };
  const persistAccepted = (next: Accepted) => {
    setAccepted(next);
    try { localStorage.setItem(sampleScoped(ACCEPT_KEY), JSON.stringify(next)); } catch {}
  };

  const { insights, recommendations, goals } = useMemo(
    () => buildIntelligence(accounts, transactions),
    [accounts, transactions]
  );

  const dismiss = (id: string) => persistDismissed(new Set(dismissed).add(id));
  const accept = (rec: Recommendation) => {
    const amount = rec.action.type === "adjustable" ? (adjust[rec.id] ?? rec.action.amount) : 0;
    persistAccepted({ ...accepted, [rec.id]: { amount, at: new Date().toISOString() } });
  };
  const undoAccept = (id: string) => {
    const next = { ...accepted };
    delete next[id];
    persistAccepted(next);
  };

  // Active recommendations = not dismissed and not already accepted.
  const activeRecs = recommendations.filter((r) => !dismissed.has(r.id) && !accepted[r.id]);
  const acceptedRecs = recommendations.filter((r) => accepted[r.id]);
  const [lead, ...restRecs] = activeRecs;

  if (loading || !hydrated) return <div className="p-4 sm:p-6"><LoadingState /></div>;

  if (!hasData) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          title="No insights yet"
          message="Connect an account and Credo will start explaining what's changing in your finances and what to do next."
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[280px] bg-indigo-500/[0.08] blur-[120px] rounded-full pointer-events-none" />

      <div className="p-4 sm:p-6 relative max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Insights
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              What changed, what it means, and what to do next — each one you can interrogate.
            </p>
          </div>
          <Link
            href="/ai"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300 hover:text-indigo-200 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4" /> Ask AI
          </Link>
        </div>

        <div className="space-y-8">
          {/* ── Lead recommendation (most material) ─────────────────────── */}
          {lead && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                Do this next
              </h2>
              <div className={`${card} p-5 sm:p-6 relative overflow-hidden`}>
                <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
                <div className="relative">
                  <RecommendationBody
                    rec={lead}
                    value={adjust[lead.id] ?? (lead.action.type === "adjustable" ? lead.action.amount : 0)}
                    onAdjust={(v) => setAdjust({ ...adjust, [lead.id]: v })}
                    onAccept={() => accept(lead)}
                    onDismiss={() => dismiss(lead.id)}
                    emphasis
                  />
                </div>
              </div>
            </section>
          )}

          {/* ── Other recommendations ───────────────────────────────────── */}
          {restRecs.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                More recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {restRecs.map((rec) => (
                  <div key={rec.id} className={`${card} p-5 min-w-0 overflow-hidden`}>
                    <RecommendationBody
                      rec={rec}
                      value={adjust[rec.id] ?? (rec.action.type === "adjustable" ? rec.action.amount : 0)}
                      onAdjust={(v) => setAdjust({ ...adjust, [rec.id]: v })}
                      onAccept={() => accept(rec)}
                      onDismiss={() => dismiss(rec.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeRecs.length === 0 && (
            <div className={`${card} p-6 text-center`}>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-200">You&apos;re all caught up</p>
              <p className="text-xs text-slate-500 mt-1">No open recommendations right now. New ones appear as your spending changes.</p>
            </div>
          )}

          {/* ── Goals & tracking (C6) ───────────────────────────────────── */}
          {goals.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Goals &amp; tracking
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}

          {/* ── Accepted (tracked) ──────────────────────────────────────── */}
          {acceptedRecs.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                Tracking ({acceptedRecs.length})
              </h2>
              <div className="space-y-2">
                {acceptedRecs.map((rec) => (
                  <div key={rec.id} className={`${card} px-4 py-3 flex items-center gap-3`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">{rec.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Accepted{accepted[rec.id]?.amount ? ` · ${formatCurrency(accepted[rec.id].amount)}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => undoAccept(rec.id)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Insights (C3), ranked ───────────────────────────────────── */}
          {insights.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> What&apos;s happening
              </h2>
              <div className="space-y-3">
                {insights.map((ins) => (
                  <InsightCard key={ins.id} insight={ins} />
                ))}
              </div>
            </section>
          )}
        </div>

        <p className="text-[11px] text-slate-600 mt-8 text-center">
          Recommendations are derived deterministically from your connected data — not financial advice.
        </p>
      </div>
    </div>
  );
}

// ── Recommendation card body (shared between lead + list) ──────────────────────

function RecommendationBody({
  rec, value, onAdjust, onAccept, onDismiss, emphasis = false,
}: {
  rec: Recommendation;
  value: number;
  onAdjust: (v: number) => void;
  onAccept: () => void;
  onDismiss: () => void;
  emphasis?: boolean;
}) {
  const adjustable = rec.action.type === "adjustable";
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("font-semibold text-white tracking-tight", emphasis ? "text-lg sm:text-xl" : "text-sm")}>
            {rec.title}
          </h3>
          <p className={cn("text-slate-400 mt-1 leading-relaxed", emphasis ? "text-sm" : "text-xs")}>{rec.body}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300">
          {rec.impactLabel}
        </span>
      </div>

      {/* Adjustable action — assumptions are editable, effect visible immediately. */}
      {adjustable && rec.action.type === "adjustable" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust amount
            </label>
            <span className="text-sm font-bold text-indigo-300">{formatCurrency(value)}</span>
          </div>
          <input
            type="range"
            min={rec.action.min}
            max={rec.action.max}
            step={rec.action.step}
            value={Math.min(value, rec.action.max)}
            onChange={(e) => onAdjust(Number(e.target.value))}
            aria-label={`Adjust amount for ${rec.title}`}
            className="w-full h-2 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>{formatCurrency(rec.action.min)}</span>
            <span>{formatCurrency(rec.action.max)}</span>
          </div>
        </div>
      )}

      {/* Actions — always accept / adjust / dismiss in the same view (C5).
          flex-wrap so the buttons + confidence badge never overflow a narrow
          two-column card (they wrap to a new line instead). */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button
          onClick={onAccept}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" /> {adjustable ? "Accept & track" : rec.action.type === "simple" ? rec.action.ctaLabel : "Accept"}
        </button>
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-full px-3 py-2 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" /> Dismiss
        </button>
        <div className="ml-auto">
          <ConfidenceBadge confidence={rec.explanation.confidence} />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <WhyExplanation explanation={rec.explanation} />
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = toneIcon[insight.tone];
  return (
    <div className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className={cn("w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center shrink-0", toneColor[insight.tone])}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">{insight.title}</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{insight.body}</p>
          <div className="mt-2.5">
            <WhyExplanation explanation={insight.explanation} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const fmt = (n: number) => (goal.unit === "percent" ? `${n}%` : formatCurrency(n));
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-100">{goal.title}</p>
        <span className="text-xs font-medium text-slate-400">{goal.progress}%</span>
      </div>
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            goal.progress >= 100 ? "from-emerald-500 to-emerald-400" : "from-indigo-500 to-violet-500"
          )}
          style={{ width: `${Math.max(2, goal.progress)}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
        <span>{fmt(goal.current)}</span>
        <span>Target {fmt(goal.target)}</span>
      </div>
      {goal.fromRecommendation && (
        <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> Linked to a recommendation
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <WhyExplanation explanation={goal.explanation} />
      </div>
    </div>
  );
}
