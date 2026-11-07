"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFinancialData } from "@/lib/useFinancialData";
import { buildIntelligence, type Confidence } from "@/lib/intelligence";
import { pickNextMove } from "@/lib/navigator";
import { useBlindSpots } from "@/lib/useBlindSpots";
import { BLINDSPOT_PENALTY_CAP, penaltyOf } from "@/lib/blindspots";
import {
  computeHealth, healthInputsFrom, projectHealth, STATUS_LABEL, statusFor,
  HEALTH_VERSION, type IndicatorStatus,
} from "@/lib/health";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import UpcomingBills from "@/components/UpcomingBills";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import WhyExplanation, { ConfidenceBadge } from "@/components/WhyExplanation";
import { HeartPulse, ArrowRight, Sliders, Bot, Info, Radar } from "lucide-react";

const STATUS_STYLE: Record<IndicatorStatus, { text: string; bar: string; chip: string }> = {
  strong: { text: "text-emerald-300", bar: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  "on-track": { text: "text-indigo-300", bar: "bg-indigo-400", chip: "bg-indigo-500/15 text-indigo-300" },
  "needs-work": { text: "text-amber-300", bar: "bg-amber-400", chip: "bg-amber-500/15 text-amber-300" },
};

function Bar({ points, status }: { points: number; status: IndicatorStatus }) {
  return (
    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden>
      <div className={cn("h-full rounded-full", STATUS_STYLE[status].bar)} style={{ width: `${points}%` }} />
    </div>
  );
}

export default function HealthPage() {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const [spendLess, setSpendLess] = useState(0);
  const [extraToCards, setExtraToCards] = useState(0);
  const [fixBlindSpots, setFixBlindSpots] = useState(false);
  const bs = useBlindSpots();

  const inputs = useMemo(() => healthInputsFrom(accounts, transactions), [accounts, transactions]);
  const health = useMemo(() => computeHealth(inputs), [inputs]);
  const intel = useMemo(() => buildIntelligence(accounts, transactions), [accounts, transactions]);

  const confidence: Confidence = inputs.historyMonths >= 3 ? "high" : inputs.historyMonths >= 2 ? "medium" : "low";

  // Next best move: the recommendation that lifts the weakest indicator.
  const next = useMemo(() => pickNextMove(intel.recommendations, health.weakest), [intel.recommendations, health.weakest]);
  const nextMove = next?.move;

  // What-if: slider ranges scale to the user's own numbers.
  const spendMax = Math.max(100, Math.round(inputs.monthlyExpenses * 0.3 / 25) * 25);
  const cardsMax = Math.max(0, Math.ceil(inputs.revolvingBalance / 6 / 25) * 25);
  const baseline = useMemo(() => projectHealth(inputs, { spendLess: 0, extraToCards: 0 }), [inputs]);
  // Blind spots feed the score: unresolved ones deduct points (shown as their
  // own line), and fixing them in the what-if frees money and removes the deduction.
  const todayScore = Math.max(0, health.score - bs.penalty);
  const extraFromFixes = fixBlindSpots ? bs.fixableMonthly : 0;
  const scenario = useMemo(() => projectHealth(inputs, { spendLess: spendLess + extraFromFixes, extraToCards }), [inputs, spendLess, extraFromFixes, extraToCards]);
  const scenarioScore = Math.max(0, scenario.health.score - (fixBlindSpots ? 0 : bs.penalty));
  const baselineScore = Math.max(0, baseline.health.score - bs.penalty);
  const delta = scenarioScore - todayScore;

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) {
    return (
      <div className="p-6">
        <EmptyState title="Connect an account to get your health score" message="Your score comes from your real balances and transactions. Connect a bank or card to see it." />
      </div>
    );
  }

  if (health.indicators.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title="Not enough history yet" message="Your health score needs at least a few weeks of transactions. Check back once your accounts have synced some activity." />
      </div>
    );
  }

  const st = STATUS_STYLE[statusFor(todayScore)];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2"><HeartPulse className="w-5 h-5 text-indigo-400" /> Financial Health</h1>
          <p className="text-sm text-stone-400">Your whole picture in one score, and the one move that improves it most.</p>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {/* Score + next best move */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Health score</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-6xl font-bold text-white tracking-tight">{todayScore}</span>
              <span className="text-stone-500 text-lg">/ 100</span>
              <span className={cn("ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium", st.chip)}>{STATUS_LABEL[statusFor(todayScore)]}</span>
            </div>
            <div className="mt-4"><Bar points={todayScore} status={statusFor(todayScore)} /></div>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between text-stone-400"><span>Four indicators (average)</span><span className="text-stone-200">{health.score}</span></div>
              <Link href="/blindspots" className="flex justify-between text-stone-400 hover:text-stone-200">
                <span className="inline-flex items-center gap-1"><Radar className="w-3 h-3" /> Open blind spots ({bs.active.filter((f) => penaltyOf(f) > 0).length})</span>
                <span className={bs.penalty > 0 ? "text-amber-300" : "text-stone-200"}>{bs.penalty > 0 ? `−${bs.penalty}` : "0"}</span>
              </Link>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              From {inputs.historyMonths} month{inputs.historyMonths === 1 ? "" : "s"} of connected history.
            </p>
            <div className="mt-2">
              <WhyExplanation explanation={{
                sourceFacts: [
                  ...health.indicators.map((x) => ({ label: `${x.name}: ${x.display}`, detail: `${x.points}/100 · target ${x.target}` })),
                  ...bs.active.filter((f) => penaltyOf(f) > 0).map((f) => ({ label: `Blind spot: ${f.title}`, detail: `−${penaltyOf(f)} (${f.severity === "critical" ? "critical" : "needs attention"})`, href: "/blindspots" })),
                ],
                reasoningSummary: `Formula v${HEALTH_VERSION}: each indicator is scored 0–100 against its target, then averaged. Indicators without data (for example, no credit cards) are left out instead of guessed. Then each unresolved blind spot deducts points (critical −5, needs attention −2, opportunities 0), up to −${BLINDSPOT_PENALTY_CAP}.`,
                confidence,
              }} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-indigo-500/25">
          <CardContent className="pt-6 pb-6 h-full flex flex-col">
            <p className="text-xs text-indigo-300 uppercase tracking-wide font-semibold">Your next best move</p>
            {nextMove ? (
              <>
                <h2 className="text-lg font-semibold text-white mt-2">{nextMove.title}</h2>
                <p className="text-sm text-stone-400 mt-1">{nextMove.body}</p>
                {next?.targets ? (
                  <p className="text-sm text-stone-300 mt-3">
                    Why this one: your weakest indicator is <span className="font-semibold text-white">{next.targets.name.toLowerCase()}</span> ({next.targets.display}, target {next.targets.target.toLowerCase()}). This move lifts it fastest.
                  </p>
                ) : (
                  <p className="text-sm text-stone-300 mt-3">Why this one: it&apos;s the highest-impact move in your current data.</p>
                )}
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300">{nextMove.impactLabel}</span>
                  <Link href="/insights" className="text-sm text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1">See all moves <ArrowRight className="w-3.5 h-3.5" /></Link>
                  <Link href="/ai" className="text-sm text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Ask the coach</Link>
                </div>
                <div className="mt-2"><WhyExplanation explanation={nextMove.explanation} /></div>
                {bs.active[0]?.severity === "critical" && (
                  <Link href="/blindspots" className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15">
                    <Radar className="w-4 h-4 shrink-0" /> <span className="min-w-0 truncate">Urgent blind spot: {bs.active[0].title}</span> <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-stone-400 mt-2">Nothing urgent. Keep doing what you&apos;re doing, and check back as more history comes in.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {health.indicators.map((x) => {
          const s = STATUS_STYLE[x.status];
          return (
            <Card key={x.id}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">{x.name}</h3>
                  <span className={cn("text-xs", s.text)}>{x.points} pts</span>
                </div>
                <p className="text-3xl font-bold text-white mt-2">{x.display}</p>
                <div className="my-3"><Bar points={x.points} status={x.status} /></div>
                <p className="text-xs text-stone-400">{x.meaning}</p>
                <p className="text-xs text-stone-500 mt-2">Target: {x.target} · {STATUS_LABEL[x.status]}</p>
                <details className="mt-2 group">
                  <summary className="text-[11px] text-indigo-300 cursor-pointer hover:text-indigo-200">How it&apos;s calculated</summary>
                  <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">{x.formula}</p>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* What-if */}
        <Card className="lg:col-span-3 scroll-mt-20" id="whatif">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="w-4 h-4" /> What if… (6 months from now)</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="wi-spend" className="text-sm font-medium text-stone-300">Spend less each month</label>
                <span className="text-sm font-bold text-indigo-300">{formatCurrency(spendLess)}</span>
              </div>
              <input id="wi-spend" type="range" min={0} max={spendMax} step={25} value={Math.min(spendLess, spendMax)}
                onChange={(e) => setSpendLess(Number(e.target.value))}
                className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-indigo-500" />
            </div>
            {cardsMax > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="wi-cards" className="text-sm font-medium text-stone-300">Extra toward credit cards each month</label>
                  <span className="text-sm font-bold text-indigo-300">{formatCurrency(extraToCards)}</span>
                </div>
                <input id="wi-cards" type="range" min={0} max={cardsMax} step={25} value={Math.min(extraToCards, cardsMax)}
                  onChange={(e) => setExtraToCards(Number(e.target.value))}
                  className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-indigo-500" />
              </div>
            )}

            {bs.active.length > 0 && (
              <label htmlFor="wi-fix" className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04]">
                <input id="wi-fix" type="checkbox" checked={fixBlindSpots} onChange={(e) => setFixBlindSpots(e.target.checked)} className="mt-1 w-4 h-4 accent-indigo-500" />
                <span className="text-sm">
                  <span className="text-stone-200 font-medium">Fix my {bs.active.length} open blind spot{bs.active.length > 1 ? "s" : ""}</span>
                  <span className="block text-xs text-stone-400 mt-0.5">
                    Removes the −{bs.penalty} deduction{bs.fixableMonthly > 0 ? ` and frees about ${formatCurrency(Math.round(bs.fixableMonthly))}/mo from fees, interest, price increases and overspending` : ""}. <Link href="/blindspots" className="text-indigo-300 hover:text-indigo-200">Review them</Link>
                  </span>
                </span>
              </label>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-indigo-300 uppercase tracking-wide">Score in 6 mo</p>
                <p className="text-3xl font-bold text-white mt-1">{scenarioScore}</p>
                <p className="text-xs text-stone-400">{delta >= 0 ? "+" : ""}{delta} vs today · {baselineScore} if nothing changes</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Cash in 6 mo</p>
                <p className="text-xl font-bold text-white mt-1">{formatCurrency(scenario.inputs.cash)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Card balances</p>
                <p className="text-xl font-bold text-white mt-1">{formatCurrency(scenario.inputs.revolvingBalance)}</p>
                {scenario.cardsPaidOffInMonths !== null && inputs.revolvingBalance > 0 && (
                  <p className="text-xs text-emerald-300">Paid off in month {scenario.cardsPaidOffInMonths}</p>
                )}
              </div>
            </div>

            <ul className="divide-y divide-white/[0.05]">
              {scenario.health.indicators.map((x) => {
                const before = health.indicators.find((b) => b.id === x.id);
                return (
                  <li key={x.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-stone-300">{x.name}</span>
                    <span className="text-stone-400">{before?.display} → <span className={STATUS_STYLE[x.status].text}>{x.display}</span></span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-stone-500 flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Each month, cash grows by income minus spending and drops by any extra card payment. Interest is ignored, so payoff is slightly optimistic. For exploring, not financial advice.</p>
          </CardContent>
        </Card>

        {/* Upcoming bills */}
        <UpcomingBills transactions={transactions} cash={inputs.cash} className="lg:col-span-2" forecastLink />
      </div>
    </div>
  );
}
