"use client";

// Financial Health & Insights
//   1. How healthy are my finances?            → score + five categories
//   2. What am I overlooking?                  → insights inside each category
//   3. What can I do to improve my position?   → next best move, what-if, progress

import AskCoachLink from "@/components/AskCoachLink";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFinancialHealth } from "@/lib/useFinancialHealth";
import { useFinancialData } from "@/lib/useFinancialData";
import { projectHealth, STATUS_LABEL, HEALTH_VERSION, type CategoryId, type HealthCategory, type IndicatorStatus } from "@/lib/health";
import { findingsByCategory } from "@/lib/financialIntelligence";
import type { BlindSpot, FindingKind } from "@/lib/blindspots";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import UpcomingBills from "@/components/UpcomingBills";
import NextBestMove from "@/components/NextBestMove";
import InsightCard, { KIND } from "@/components/InsightCard";
import { HeartPulse, Sliders, Info, ChevronDown, MessageCircle, ArrowRight, Check, EyeOff, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";

const TONE: Record<IndicatorStatus, { text: string; bar: string; stroke: string }> = {
  strong: { text: "text-emerald-300", bar: "bg-emerald-400", stroke: "#34d399" },
  "on-track": { text: "text-indigo-300", bar: "bg-indigo-400", stroke: "#818cf8" },
  "needs-work": { text: "text-amber-300", bar: "bg-amber-400", stroke: "#fbbf24" },
};

const COACH_QUESTIONS = [
  "Why is my financial health score this number?",
  "What's hurting my score the most?",
  "What am I overlooking?",
  "How can I improve my weakest category?",
  "Which action would improve my finances the most?",
];

function Bar({ points, status }: { points: number; status: IndicatorStatus }) {
  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden>
      <div className={cn("h-full rounded-full", TONE[status].bar)} style={{ width: `${points}%` }} />
    </div>
  );
}

function ScoreRing({ score, status }: { score: number; status: IndicatorStatus }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 sm:w-36 sm:h-36 shrink-0" role="img" aria-label={`Financial health score ${score} out of 100`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={TONE[status].stroke} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 64 64)" />
      <text x="64" y="62" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="700" fontFamily="inherit">{score}</text>
      <text x="64" y="84" textAnchor="middle" fill="#a8a29e" fontSize="12" fontFamily="inherit">of 100</text>
    </svg>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 160, h = 36, min = Math.min(...points) - 2, max = Math.max(...points) + 2;
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * w},${h - ((p - min) / (max - min || 1)) * h}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-40 h-9" aria-hidden><path d={d} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="inline-flex items-center gap-0.5 text-stone-400"><Minus className="w-3 h-3" />0</span>;
  return n > 0
    ? <span className="inline-flex items-center gap-0.5 text-emerald-300"><TrendingUp className="w-3 h-3" />+{n}</span>
    : <span className="inline-flex items-center gap-0.5 text-amber-300"><TrendingDown className="w-3 h-3" />{n}</span>;
}

function CategorySection({ cat, findings, open, onToggle, openIds, toggleFinding, fh }: {
  cat: HealthCategory; findings: BlindSpot[]; open: boolean; onToggle: () => void;
  openIds: Set<string>; toggleFinding: (id: string) => void; fh: ReturnType<typeof useFinancialHealth>;
}) {
  const counts = { risk: 0, opportunity: 0, info: 0 } as Record<FindingKind, number>;
  for (const f of findings) counts[f.kind]++;
  const groups: [FindingKind, string][] = [["risk", "Risks"], ["opportunity", "Opportunities"], ["info", "Insights"]];
  return (
    <div id={`cat-${cat.id}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.015] scroll-mt-20">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left px-5 py-4 flex items-center gap-4 cursor-pointer">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-[15px] font-semibold text-stone-100">{cat.name}</span>
            <span className="text-xs text-stone-500">{cat.question}</span>
          </span>
          <span className="block text-sm text-stone-400 mt-1">{cat.summary}</span>
          {findings.length > 0 && (
            <span className="flex flex-wrap gap-3 mt-1.5 text-[11px]">
              {groups.filter(([k]) => counts[k]).map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-stone-400"><span className={cn("w-1.5 h-1.5 rounded-full", KIND[k].dot)} />{counts[k]} {l.toLowerCase()}</span>
              ))}
            </span>
          )}
        </span>
        <span className="text-right shrink-0">
          {cat.score == null ? <span className="text-xs text-stone-500">Not enough data</span> : (
            <>
              <span className={cn("block text-2xl font-semibold", TONE[cat.status!].text)}>{cat.score}</span>
              <span className="block text-[11px] text-stone-500">{STATUS_LABEL[cat.status!]}</span>
            </>
          )}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-stone-500 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {cat.metrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.metrics.map((m) => (
                <div key={m.id} className="rounded-xl bg-white/[0.025] border border-white/[0.05] p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-stone-200">{m.name}</span>
                    <span className={cn("text-xs", TONE[m.status].text)}>{m.points}/100</span>
                  </div>
                  <p className="text-xl font-semibold text-white mt-1">{m.display}</p>
                  <div className="my-2"><Bar points={m.points} status={m.status} /></div>
                  <p className="text-xs text-stone-400">{m.meaning} Target: {m.target.toLowerCase()}.</p>
                  <details className="mt-1.5">
                    <summary className="text-[11px] text-indigo-300 cursor-pointer hover:text-indigo-200">How it&apos;s calculated</summary>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">{m.formula}</p>
                  </details>
                </div>
              ))}
            </div>
          )}
          {cat.missing && <p className="text-xs text-stone-500 flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Not measured yet: {cat.missing}.</p>}

          {findings.length === 0 ? (
            <p className="text-sm text-stone-500">Nothing overlooked here in your current data.</p>
          ) : groups.map(([k, label]) => {
            const list = findings.filter((f) => f.kind === k);
            if (!list.length) return null;
            return (
              <div key={k}>
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">{label}</p>
                <div className="space-y-2">
                  {list.map((f) => (
                    <InsightCard key={f.id} f={f} contribution={fh.contribution(f)} open={openIds.has(f.id)} onToggle={() => toggleFinding(f.id)} onDecide={(st) => fh.decide(f, st)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  const fh = useFinancialHealth();
  const { transactions } = useFinancialData();
  const { health, inputs } = fh;
  const [openCats, setOpenCats] = useState<Set<CategoryId> | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showLog, setShowLog] = useState(false);

  // Old /blindspots links land on #insights (the weakest category opens by default).
  useEffect(() => {
    if (window.location.hash === "#insights") document.getElementById("insights")?.scrollIntoView();
  }, [fh.loading]);

  const byCat = useMemo(() => findingsByCategory(fh.active), [fh.active]);
  const cats = openCats ?? new Set<CategoryId>(health.weakest ? [health.weakest.id] : []);
  const toggleCat = (id: CategoryId) => { const n = new Set(cats); if (n.has(id)) n.delete(id); else n.add(id); setOpenCats(n); };
  const toggleFinding = (id: string) => { const n = new Set(openIds); if (n.has(id)) n.delete(id); else n.add(id); setOpenIds(n); };

  const baseline = useMemo(() => projectHealth(inputs, { spendLess: 0, extraToCards: 0 }), [inputs]);

  if (fh.loading) return <div className="p-6"><LoadingState /></div>;
  if (!fh.hasData) {
    return <div className="p-6"><EmptyState title="Connect an account to see your financial health" message="Your score and insights come from your real balances and transactions. Connect a bank or card to see them." /></div>;
  }

  const history = fh.history;
  const first = history[0], last = history[history.length - 1];
  const delta = history.length >= 2 ? last.s - first.s : null;
  const sinceLabel = first ? new Date(first.d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const total = fh.active.length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2"><HeartPulse className="w-5 h-5 text-indigo-400" /> Financial Health &amp; Insights</h1>
          <p className="text-sm text-stone-400">How healthy your finances are, what you might be missing, and how to improve.</p>
        </div>
        <p className="text-xs text-stone-500">From {Math.round(inputs.historyDays ?? 0)} days of connected history · score formula v{HEALTH_VERSION}</p>
      </div>

      {/* 1 ── Score */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-2 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-5 items-start">
              {health.score != null && health.status ? <ScoreRing score={health.score} status={health.status} /> : (
                <div className="w-32 h-32 rounded-full border-[10px] border-white/[0.07] flex items-center justify-center text-center text-xs text-stone-400 px-2 shrink-0">Not enough data yet</div>
              )}
              <div className="min-w-0">
                <p className={cn("text-sm font-semibold", health.status ? TONE[health.status].text : "text-stone-300")}>{health.label}</p>
                <p className="text-sm text-stone-300 mt-1 leading-relaxed">{health.standing}</p>
                <p className="text-xs text-stone-500 mt-3">
                  <a href="#insights" className="hover:text-stone-300">{fh.meaningful} meaningful insight{fh.meaningful === 1 ? "" : "s"} · {fh.counts.risk} risk{fh.counts.risk === 1 ? "" : "s"} · {fh.counts.opportunity} opportunit{fh.counts.opportunity === 1 ? "y" : "ies"}{fh.counts.info ? ` · ${fh.counts.info} informational` : ""}</a>
                </p>
                {delta != null && (
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <Sparkline points={history.slice(-60).map((x) => x.s)} />
                    <span className="text-stone-400"><Delta n={delta} /> since {sinceLabel}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-3">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">Score breakdown</p>
              <ul className="space-y-3">
                {health.categories.map((c) => {
                  const n = (byCat[c.id] ?? []).filter((f) => f.kind !== "info").length;
                  const prev = first?.c?.[c.id];
                  return (
                    <li key={c.id}>
                      <a href={`#cat-${c.id}`} onClick={() => { const s = new Set(cats); s.add(c.id); setOpenCats(s); }} className="block group">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-stone-200 group-hover:text-white">{c.name}</span>
                          <span className="flex items-center gap-3 text-xs">
                            {n > 0 && <span className="text-stone-500">{n} insight{n > 1 ? "s" : ""}</span>}
                            {c.score != null && prev != null && history.length >= 2 && <Delta n={c.score - prev} />}
                            <span className={cn("font-semibold w-7 text-right", c.status ? TONE[c.status].text : "text-stone-500")}>{c.score ?? "—"}</span>
                          </span>
                        </div>
                        <div className="mt-1.5">{c.score != null && c.status ? <Bar points={c.score} status={c.status} /> : <div className="h-1.5 rounded-full bg-white/[0.04]" />}</div>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-stone-500 mt-3">Overall = average of the categories we can measure. Each category averages its metrics, each scored against a stated target. Opportunities and informational insights never lower your score.</p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Ask the coach</p>
            <div className="flex flex-wrap gap-2">
              {COACH_QUESTIONS.map((q) => (
                <AskCoachLink key={q} question={q} className="text-xs text-stone-300 rounded-full border border-white/[0.08] px-3 py-1.5 hover:border-indigo-400/40 hover:text-white hover:bg-indigo-500/[0.06] transition-colors">{q}</AskCoachLink>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3a ── What to do first (Priority Engine consumes the same findings) */}
      <NextBestMove />

      {/* 2 ── Insights inside each category */}
      <section id="insights" className="space-y-3 scroll-mt-20" aria-labelledby="insights-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="insights-title" className="text-lg font-semibold text-white">Inside your score</h2>
            <p className="text-sm text-stone-400">What each category measures, and what you might be overlooking in it.</p>
          </div>
          <p className="text-xs text-stone-500">{total} open finding{total === 1 ? "" : "s"} · {fh.fi.report.txnCount} transactions scanned</p>
        </div>
        {health.categories.map((c) => (
          <CategorySection key={c.id} cat={c} findings={byCat[c.id] ?? []} open={cats.has(c.id)} onToggle={() => toggleCat(c.id)} openIds={openIds} toggleFinding={toggleFinding} fh={fh} />
        ))}
      </section>

      {/* 3b ── What-if (one simulator, on Forecast) + upcoming obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="w-4 h-4" /> What if…</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-400">Test a change before you make it: earn more, spend less, pay down cards, or fix the insights above. See your net worth and this score update together.</p>
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3">
              <p className="text-[11px] text-indigo-300 uppercase tracking-wide">Score in 6 months if nothing changes</p>
              <p className="text-2xl font-bold text-white mt-1">{baseline.health.score ?? "—"}<span className="text-sm text-stone-400 font-normal">{health.score != null ? ` · ${health.score} today` : ""}</span></p>
            </div>
            <Link href="/forecast#whatif" className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-white text-[#0a0b0f] hover:bg-stone-200">Open the what-if simulator <ArrowRight className="w-4 h-4" /></Link>
          </CardContent>
        </Card>
        <UpcomingBills transactions={transactions} cash={inputs.checkingCash ?? inputs.cash} className="lg:col-span-3" forecastLink />
      </div>

      {/* 3c ── Progress */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Your progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {history.length >= 2 ? (
            <div className="flex flex-wrap items-center gap-4">
              <Sparkline points={history.slice(-90).map((x) => x.s)} />
              <p className="text-sm text-stone-300">Score {first.s} on {sinceLabel} → {last.s} today (<Delta n={last.s - first.s} />). The score changes only when your account data changes.</p>
            </div>
          ) : (
            <p className="text-sm text-stone-400">We&apos;ve saved today&apos;s score{health.score != null ? ` (${health.score})` : ""}. Come back after your accounts update to see how it changes.</p>
          )}
          {fh.resolvedLog.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowLog(!showLog)} aria-expanded={showLog} className="text-sm text-stone-300 inline-flex items-center gap-1 cursor-pointer">
                Resolved &amp; dismissed ({fh.resolvedLog.length}) <ChevronDown className={cn("w-4 h-4 transition-transform", showLog && "rotate-180")} />
              </button>
              {showLog && (
                <ul className="mt-2 divide-y divide-white/[0.05]">
                  {fh.resolvedLog.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-stone-300">
                          {r.status === "resolved" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-stone-500" />}
                          {r.title}
                        </span>
                        <span className="block text-xs text-stone-500">
                          {r.status === "resolved" ? "Resolved" : "Dismissed"} {new Date(r.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {r.impact ? ` · ${r.impact}` : ""}
                          {r.status === "resolved" && (r.confirmed ? " · confirmed: no longer in your data" : " · waiting for your data to confirm")}
                        </span>
                      </span>
                      {!r.confirmed && (
                        <button type="button" onClick={() => fh.reopen(r.id)} className="text-xs inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 cursor-pointer"><RotateCcw className="w-3 h-3" /> Reopen</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="text-[11px] text-stone-500">History and resolved items are saved in this browser.</p>
        </CardContent>
      </Card>

      {/* Honest limits */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-3">What we can&apos;t check from account data</p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {fh.fi.report.cannotCheck.map((x) => (
              <li key={x.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-sm font-medium text-stone-200">{x.title}</p>
                <p className="text-xs text-stone-400 mt-1">{x.detail}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-stone-500 mt-3">Credo never moves money or cancels anything for you. Every action is a suggestion you carry out yourself.</p>
        </CardContent>
      </Card>
    </div>
  );
}
