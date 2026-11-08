"use client";

// Forecast & What-if: one simulator for every "what if". The same sliders
// drive the 12-month net worth projection and the Financial Health Score
// projection, from the same numbers the score uses.

import { useState, useMemo, useEffect, type ReactNode } from "react";
import { useFinancialData, signedBalance, isInvestment, prettyCategory, monthlyAverages } from "@/lib/useFinancialData";
import { useFinancialHealth } from "@/lib/useFinancialHealth";
import { projectHealth, STATUS_LABEL, type IndicatorStatus } from "@/lib/health";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import UpcomingBills from "@/components/UpcomingBills";
import WhyExplanation, { ConfidenceBadge } from "@/components/WhyExplanation";
import type { Confidence, ExplanationPayload } from "@/lib/intelligence";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sliders, RotateCcw, Info, Circle, CircleDashed, HeartPulse } from "lucide-react";

const MONTH_LABELS = ["Now", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
const DISCRETIONARY = ["Food And Drink", "Entertainment", "General Merchandise", "Personal Care", "Travel"];
const TONE: Record<IndicatorStatus, string> = { strong: "text-emerald-300", "on-track": "text-indigo-300", "needs-work": "text-amber-300" };

function Slider({ id, label, value, display, min, max, step, onChange, hint }: {
  id: string; label: ReactNode; value: number; display: string; min: number; max: number; step: number;
  onChange: (v: number) => void; hint?: [string, string, string];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <label htmlFor={id} className="text-sm font-medium text-stone-300">{label}</label>
        <span className="text-sm font-bold text-indigo-300">{display}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.max(min, Math.min(value, max))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-indigo-500" />
      {hint && <div className="flex justify-between text-xs text-stone-500 mt-1"><span>{hint[0]}</span><span>{hint[1]}</span><span>{hint[2]}</span></div>}
    </div>
  );
}

export default function ForecastPage() {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const fh = useFinancialHealth();
  const { inputs, health } = fh;

  // Baseline income/spending come from the health score's inputs (card
  // payments to your own cards aren't double counted). Categories feed the dropdown.
  const base = useMemo(() => {
    const avg = monthlyAverages(transactions);
    const byCat: Record<string, number> = {};
    for (const [c, v] of Object.entries(avg.byCategory)) byCat[prettyCategory(c)] = v;
    return {
      netWorth: accounts.reduce((s, a) => s + signedBalance(a), 0),
      investments: accounts.filter(isInvestment).reduce((s, a) => s + (a.balance ?? 0), 0),
      income: inputs.monthlyIncome,
      expenses: inputs.monthlyExpenses,
      byCategory: byCat,
      months: avg.months,
    };
  }, [accounts, transactions, inputs.monthlyIncome, inputs.monthlyExpenses]);

  const [income, setIncome] = useState(0);
  const [investmentReturn, setInvestmentReturn] = useState(7);
  const [expenseTarget, setExpenseTarget] = useState<string>("ALL");
  const [targetAmount, setTargetAmount] = useState(0);
  const [extraToCards, setExtraToCards] = useState(0);
  const [applyFixes, setApplyFixes] = useState(false);

  // Initialise sliders from real data once it loads.
  useEffect(() => {
    setIncome(Math.round(base.income));
    setTargetAmount(Math.round(base.expenses));
    setExpenseTarget("ALL");
  }, [base.income, base.expenses]);

  const baselineTargetAmount = expenseTarget === "ALL" ? base.expenses : (base.byCategory[expenseTarget] ?? 0);
  function selectTarget(t: string) {
    setExpenseTarget(t);
    setTargetAmount(Math.round(t === "ALL" ? base.expenses : (base.byCategory[t] ?? 0)));
  }

  const fixes = applyFixes ? fh.fixableMonthly : 0;
  const sliderCut = baselineTargetAmount - targetAmount;                 // + = spending less
  const spendingChange = sliderCut + fixes;
  const scenarioExpenses = Math.max(0, base.expenses - spendingChange);
  const incomeChange = income - base.income;
  const discretionaryLess = (expenseTarget === "ALL" || DISCRETIONARY.includes(expenseTarget) ? Math.max(0, sliderCut) : 0) + fixes;

  // Net worth: each month changes by (income − spending); investments compound.
  // Extra card payments move money from cash to debt, so net worth is unchanged.
  const project = (incomeM: number, expensesM: number, returnPct: number) => {
    const monthlyNet = incomeM - expensesM;
    const monthlyRate = returnPct / 100 / 12;
    const series: number[] = [];
    let other = base.netWorth - base.investments;
    let invest = base.investments;
    series.push(Math.round(other + invest));
    for (let i = 1; i <= 12; i++) {
      other += monthlyNet;
      invest *= 1 + monthlyRate;
      series.push(Math.round(other + invest));
    }
    return series;
  };
  const baselineSeries = project(base.income, base.expenses, 7);
  const scenarioSeries = project(income, scenarioExpenses, investmentReturn);
  const chartData = MONTH_LABELS.map((month, i) => ({ month, baseline: baselineSeries[i], scenario: scenarioSeries[i] }));
  const projectedNW = scenarioSeries[12];
  const baselineNW = baselineSeries[12];
  const monthlyNet = income - scenarioExpenses;

  // Health score in 6 months, same formula as Financial Health & Insights.
  const healthBase = useMemo(() => projectHealth(inputs, { spendLess: 0, extraToCards: 0 }), [inputs]);
  const healthScenario = useMemo(
    () => projectHealth(inputs, { spendLess: spendingChange, extraToCards, incomeChange, discretionaryLess }),
    [inputs, spendingChange, extraToCards, incomeChange, discretionaryLess],
  );

  const confidence: Confidence = base.months >= 6 ? "high" : base.months >= 3 ? "medium" : "low";
  const projectionExplanation: ExplanationPayload = {
    sourceFacts: [
      { label: "Today's net worth (fact)", detail: "Sum of connected balances", amount: base.netWorth, href: "/accounts" },
      { label: "Avg monthly income", detail: "From your connected history", amount: base.income },
      { label: "Avg monthly spending", detail: "Card payments to your own cards excluded", amount: -base.expenses },
      { label: "Investments compounding", detail: `at ${investmentReturn}% / yr`, amount: base.investments },
    ],
    reasoningSummary: `Net worth: each month changes by (income − spending) and investments compound at the chosen return. Health score: the same five-category formula as your score, applied to the scenario six months out. Only today's figures are facts; everything after is a projection from ${base.months} month(s) of history.`,
    confidence,
  };

  const incomeMax = Math.max(20000, Math.ceil((base.income * 3) / 1000) * 1000);
  const expenseMax = expenseTarget === "ALL"
    ? Math.max(Math.ceil((base.income * 1.5) / 1000) * 1000, Math.ceil(base.expenses * 2))
    : Math.max(500, Math.ceil(baselineTargetAmount * 3));
  const cardsMax = Math.max(0, Math.ceil(inputs.revolvingBalance / 6 / 25) * 25);

  function reset() {
    setIncome(Math.round(base.income));
    setInvestmentReturn(7);
    selectTarget("ALL");
    setExtraToCards(0);
    setApplyFixes(false);
  }

  if (loading || fh.loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  const hs = healthScenario.health;
  const delta = hs.score != null && health.score != null ? hs.score - health.score : null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Forecast &amp; What-if</h1>
          <p className="text-sm text-stone-400">See where you&apos;re heading, then test changes before you make them. Sliders start at your real numbers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-4 h-4" /> Reset</Button>
          <Badge variant="info">12-month projection</Badge>
        </div>
      </div>

      {/* Simulator controls */}
      <div id="whatif" className="scroll-mt-20 mb-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="w-4 h-4" /> What if…</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <Slider id="wi-income" label="Monthly income" value={income} display={formatCurrency(income)} min={0} max={incomeMax} step={100} onChange={setIncome}
                hint={["$0", `your avg: ${formatCurrency(base.income)}`, formatCurrency(incomeMax)]} />
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="wi-spend" className="text-sm font-medium text-stone-300">Spending:</label>
                    <select value={expenseTarget} onChange={(e) => selectTarget(e.target.value)} aria-label="Which spending to change"
                      className="text-xs border border-[#ffffff14] rounded-lg px-2 py-1 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                      <option value="ALL">All spending</option>
                      {Object.keys(base.byCategory).sort((a, b) => base.byCategory[b] - base.byCategory[a]).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <span className="text-sm font-bold text-indigo-300">{formatCurrency(targetAmount)}/mo</span>
                </div>
                <input id="wi-spend" type="range" min={0} max={expenseMax} step={10} value={Math.min(targetAmount, expenseMax)}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-indigo-500" />
                <div className="flex justify-between text-xs text-stone-500 mt-1"><span>$0</span><span>current: {formatCurrency(baselineTargetAmount)}</span><span>{formatCurrency(expenseMax)}</span></div>
              </div>
              {cardsMax > 0 && (
                <Slider id="wi-cards" label="Extra toward credit cards" value={extraToCards} display={`${formatCurrency(extraToCards)}/mo`} min={0} max={cardsMax} step={25} onChange={setExtraToCards}
                  hint={["$0", `balance: ${formatCurrency(inputs.revolvingBalance)}`, formatCurrency(cardsMax)]} />
              )}
              <Slider id="wi-return" label="Investment return (annual)" value={investmentReturn} display={`${investmentReturn}%`} min={-10} max={20} step={0.5} onChange={setInvestmentReturn}
                hint={["−10%", "", "20%"]} />
            </div>
            {fh.fixableMonthly > 0 && (
              <label htmlFor="wi-fix" className="mt-5 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04]">
                <input id="wi-fix" type="checkbox" checked={applyFixes} onChange={(e) => setApplyFixes(e.target.checked)} className="mt-1 w-4 h-4 accent-indigo-500" />
                <span className="text-sm">
                  <span className="text-stone-200 font-medium">Fix the insights with measurable savings</span>
                  <span className="block text-xs text-stone-400 mt-0.5">Frees about {formatCurrency(Math.round(fh.fixableMonthly))}/mo from fees, interest, price increases and overspending flagged in Financial Health.</span>
                </span>
              </label>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Net worth in 12 months</CardTitle>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" /> If nothing changes</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" /> Your scenario</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-stone-400"><Circle className="w-3 h-3 text-stone-300 fill-current" /> Today&apos;s balance: fact</span>
              <span className="flex items-center gap-1.5 text-[11px] text-stone-400"><CircleDashed className="w-3 h-3 text-stone-500" /> Months 1–12: projection</span>
              <ConfidenceBadge confidence={confidence} className="ml-auto" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fb923c" stopOpacity={0.15} /><stop offset="95%" stopColor="#fb923c" stopOpacity={0} /></linearGradient>
                  <linearGradient id="scenGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} domain={["auto", "auto"]} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#171a21", color: "#f8fafc" }} />
                <Area type="monotone" dataKey="baseline" stroke="#fb923c" strokeWidth={2} fill="url(#baseGrad)" dot={false} name="If nothing changes" />
                <Area type="monotone" dataKey="scenario" stroke="#10b981" strokeWidth={2} fill="url(#scenGrad)" dot={false} name="Your scenario" strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Net worth in 12 mo</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(projectedNW)}</p>
                <p className="text-xs text-stone-500">{formatCurrency(projectedNW - baselineNW, true)} vs no change · {formatCurrency(projectedNW - base.netWorth, true)} vs today</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Monthly cash flow</p>
                <p className={cn("text-xl font-bold mt-1", monthlyNet >= 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(monthlyNet, true)}</p>
                <p className="text-xs text-stone-500">Income {formatCurrency(income)} − spending {formatCurrency(scenarioExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="w-4 h-4" /> Health score in 6 months</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-bold", hs.status ? TONE[hs.status] : "text-white")}>{hs.score ?? "—"}</span>
                {delta != null && <span className="text-sm text-stone-400">{delta >= 0 ? "+" : ""}{delta} vs today ({health.score})</span>}
              </p>
              <p className="text-xs text-stone-500 mt-1">{healthBase.health.score ?? "—"} if nothing changes{hs.status ? ` · ${STATUS_LABEL[hs.status]}` : ""}</p>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {hs.categories.map((c) => {
                const before = health.categories.find((b) => b.id === c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-stone-300">{c.name}</span>
                    <span className="text-stone-400">{before?.score ?? "—"} → <span className={c.status ? TONE[c.status] : ""}>{c.score ?? "—"}</span></span>
                  </li>
                );
              })}
            </ul>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Cash in 6 mo</p>
                <p className="font-bold text-white mt-1">{formatCurrency(healthScenario.inputs.cash)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[11px] text-stone-400 uppercase tracking-wide">Card balances</p>
                <p className="font-bold text-white mt-1">{formatCurrency(healthScenario.inputs.revolvingBalance)}</p>
                {healthScenario.cardsPaidOffInMonths !== null && inputs.revolvingBalance > 0 && <p className="text-xs text-emerald-300">Paid off in month {healthScenario.cardsPaidOffInMonths}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <UpcomingBills transactions={transactions} cash={inputs.checkingCash ?? inputs.cash} />

      <div className="mt-4 bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-stone-400">
            Simplified model for exploring, not financial advice. Each month, cash changes by income minus spending, extra card payments move cash to debt, and investments compound at the chosen return. Interest on debt is ignored, so payoff dates are slightly optimistic.
          </p>
          <div className="mt-2"><WhyExplanation explanation={projectionExplanation} /></div>
        </div>
      </div>
    </div>
  );
}
