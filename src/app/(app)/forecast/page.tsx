"use client";

import { useState, useMemo, useEffect } from "react";
import { useFinancialData, signedBalance, isInvestment, prettyCategory, monthlyAverages } from "@/lib/useFinancialData";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import UpcomingBills from "@/components/UpcomingBills";
import { healthInputsFrom } from "@/lib/health";
import WhyExplanation, { ConfidenceBadge } from "@/components/WhyExplanation";
import type { Confidence, ExplanationPayload } from "@/lib/intelligence";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sliders, RotateCcw, Info, Circle, CircleDashed } from "lucide-react";

const MONTH_LABELS = ["Now", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];

export default function ForecastPage() {
  const { accounts, transactions, loading, hasData } = useFinancialData();

  // Derive everything from the user's real connected data
  const base = useMemo(() => {
    const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);
    const investments = accounts.filter(isInvestment).reduce((s, a) => s + (a.balance ?? 0), 0);
    const avg = monthlyAverages(transactions);
    const byCat: Record<string, number> = {};
    for (const [c, v] of Object.entries(avg.byCategory)) byCat[prettyCategory(c)] = v;
    const cash = healthInputsFrom(accounts, transactions).cash;
    return { netWorth, investments, cash, income: avg.income, expenses: avg.expenses, byCategory: byCat };
  }, [accounts, transactions]);

  const [income, setIncome] = useState(0);
  const [investmentReturn, setInvestmentReturn] = useState(7);
  const [expenseTarget, setExpenseTarget] = useState<string>("ALL");
  const [targetAmount, setTargetAmount] = useState(0);

  // Initialize sliders from real data once it loads
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

  const scenarioExpenses = expenseTarget === "ALL"
    ? targetAmount
    : base.expenses - baselineTargetAmount + targetAmount;

  function project(incomeM: number, expensesM: number, returnPct: number) {
    const monthlyNet = incomeM - expensesM;
    const monthlyRate = returnPct / 100 / 12;
    const series: number[] = [];
    let cash = base.netWorth - base.investments;
    let invest = base.investments;
    series.push(Math.round(cash + invest));
    for (let i = 1; i <= 12; i++) {
      cash += monthlyNet;
      invest *= 1 + monthlyRate;
      series.push(Math.round(cash + invest));
    }
    return series;
  }

  const baselineSeries = useMemo(() => project(base.income, base.expenses, 7), [base]);
  const scenarioSeries = project(income, scenarioExpenses, investmentReturn);
  const chartData = MONTH_LABELS.map((month, i) => ({ month, baseline: baselineSeries[i], scenario: scenarioSeries[i] }));

  const projectedNW = scenarioSeries[12];
  const baselineNW = baselineSeries[12];
  const monthlyNet = income - scenarioExpenses;

  // Confidence in the projection scales with how much real history backs it —
  // uncertainty is shown, not hidden (spec 005, Interaction Principle 3).
  const historyMonths = monthlyAverages(transactions).months;
  const confidence: Confidence = historyMonths >= 6 ? "high" : historyMonths >= 3 ? "medium" : "low";
  const projectionExplanation: ExplanationPayload = {
    sourceFacts: [
      { label: "Today's net worth (fact)", detail: "Sum of connected balances", amount: base.netWorth, href: "/accounts" },
      { label: "Avg monthly income", detail: `${historyMonths}-month average`, amount: base.income },
      { label: "Avg monthly spending", detail: `${historyMonths}-month average`, amount: -base.expenses },
      { label: "Investments compounding", detail: `at ${investmentReturn}% / yr`, amount: base.investments },
    ],
    reasoningSummary: `Each month, net worth changes by (income − expenses) and investments compound at the chosen annual return. Only today's balance is a fact; every point after it is a projection based on ${historyMonths} month(s) of your history.`,
    confidence,
  };

  // Sliders scale relative to the user's actual income/cash, not fixed caps
  const incomeMax = Math.max(20000, Math.ceil((base.income * 3) / 1000) * 1000);
  const expenseMax = expenseTarget === "ALL"
    ? Math.max(Math.ceil((base.income * 1.5) / 1000) * 1000, Math.ceil(base.expenses * 2))
    : Math.max(500, Math.ceil(baselineTargetAmount * 3));

  function reset() {
    setIncome(Math.round(base.income));
    setInvestmentReturn(7);
    selectTarget("ALL");
  }

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Financial Forecast</h1>
          <p className="text-sm text-stone-400">Your net worth 12 months out, plus the bills coming up next. Sliders are scaled to your real numbers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="w-4 h-4" /> Reset</Button>
          <Badge variant="info">12-month projection</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Net Worth Projection</CardTitle>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded" /> Baseline</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" /> Your scenario</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Fact vs projection — the first point is real, the rest are modelled. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <Circle className="w-3 h-3 text-stone-300 fill-current" /> Today&apos;s balance — fact
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <CircleDashed className="w-3 h-3 text-stone-500" /> Months 1–12 — projection, subject to uncertainty
              </span>
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
                <Area type="monotone" dataKey="baseline" stroke="#fb923c" strokeWidth={2} fill="url(#baseGrad)" dot={false} name="Baseline" />
                <Area type="monotone" dataKey="scenario" stroke="#10b981" strokeWidth={2} fill="url(#scenGrad)" dot={false} name="Scenario" strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Projected Net Worth (12 mo)</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(projectedNW)}</p>
            <p className="text-xs text-stone-500 mt-1">{formatCurrency(projectedNW - baselineNW, true)} vs baseline · {formatCurrency(projectedNW - base.netWorth, true)} vs today</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Monthly Cash Flow</p>
            <p className={`text-2xl font-bold ${monthlyNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(monthlyNet, true)}</p>
            <p className="text-xs text-stone-500 mt-1">Income {formatCurrency(income)} − expenses {formatCurrency(scenarioExpenses)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Your Avg Income</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(base.income)}/mo</p>
            <p className="text-xs text-stone-500 mt-1">From connected accounts (90-day avg)</p>
          </CardContent></Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="w-4 h-4" /> Scenario Variables</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-stone-300">Monthly Income</label>
                <span className="text-sm font-bold text-orange-400">${income.toLocaleString()}</span>
              </div>
              <input type="range" min={0} max={incomeMax} step={100} value={Math.min(income, incomeMax)}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-orange-500" />
              <div className="flex justify-between text-xs text-stone-500 mt-1"><span>$0</span><span>your avg: {formatCurrency(base.income)}</span><span>${incomeMax.toLocaleString()}</span></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-stone-300">Expenses:</label>
                  <select value={expenseTarget} onChange={(e) => selectTarget(e.target.value)}
                    className="text-xs border border-[#ffffff14] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500/40">
                    <option value="ALL">All expenses</option>
                    {Object.keys(base.byCategory).sort((a, b) => base.byCategory[b] - base.byCategory[a]).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <span className="text-sm font-bold text-orange-400">${targetAmount.toLocaleString()}/mo</span>
              </div>
              <input type="range" min={0} max={expenseMax} step={10} value={Math.min(targetAmount, expenseMax)}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-orange-500" />
              <div className="flex justify-between text-xs text-stone-500 mt-1">
                <span>$0</span>
                <span>current: {formatCurrency(baselineTargetAmount)}</span>
                <span>${expenseMax.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-stone-300">Investment Return (annual %)</label>
                <span className="text-sm font-bold text-orange-400">{investmentReturn}%</span>
              </div>
              <input type="range" min={-10} max={20} step={0.5} value={investmentReturn}
                onChange={(e) => setInvestmentReturn(Number(e.target.value))}
                className="w-full h-2 bg-[#ffffff1a] rounded-full appearance-none cursor-pointer accent-orange-500" />
              <div className="flex justify-between text-xs text-stone-500 mt-1"><span>−10%</span><span>20%</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <UpcomingBills transactions={transactions} cash={base.cash} className="mt-4" />

      <div className="mt-4 bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-stone-400">
            Sliders are scaled to your actual income ({formatCurrency(base.income)}/mo) and current investments ({formatCurrency(base.investments)}). Each month, net worth grows by (income − expenses) and investments compound at the chosen return. This is a simplified model for exploration only — not financial advice.
          </p>
          <div className="mt-2">
            <WhyExplanation explanation={projectionExplanation} />
          </div>
        </div>
      </div>
    </div>
  );
}
