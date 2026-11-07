"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import { useFinancialData, refreshFinancialData, signedBalance, isInvestment, isDebt, prettyCategory, categoryColor } from "@/lib/useFinancialData";
import { buildIntelligence } from "@/lib/intelligence";
import { STATUS_LABEL, statusFor } from "@/lib/health";
import { useBlindSpots } from "@/lib/useBlindSpots";
import { pickNextMove } from "@/lib/navigator";
import WhyExplanation from "@/components/WhyExplanation";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowRight, Lightbulb, HeartPulse, Radar, ShieldAlert, AlertTriangle, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from "recharts";

const card = "bg-gradient-to-b from-[#171a21] to-[#0f1117] border border-white/[0.06] rounded-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]";

const ALLOC = { cash: "#38bdf8", invest: "#818cf8", debt: "#fb7185" };

const monthLabel = (ym: string) => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(ym.slice(5)) - 1];
};

type Opt<T extends string> = { label: string; value: T };

function Segmented<T extends string>({ options, value, onChange, ariaLabel }: {
  options: Opt<T>[]; value: T; onChange: (v: T) => void; ariaLabel: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
            value === o.value ? "bg-indigo-500/20 text-white" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const { accounts, transactions, loading, hasData } = useFinancialData();

  const [chartView, setChartView] = useState<"flow" | "net">("flow");
  const [catPeriod, setCatPeriod] = useState<"month" | "30d">("month");

  // Greeting depends on the clock — render after mount to avoid hydration drift
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const greeting = !mounted ? "Welcome back" : (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  const stats = useMemo(() => {
    const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);
    const cashAccts = accounts.filter((a) => !isDebt(a) && !isInvestment(a));
    const cash = cashAccts.reduce((s, a) => s + (a.balance ?? 0), 0);
    const debt = accounts.filter(isDebt).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
    const investments = accounts.filter(isInvestment).reduce((s, a) => s + (a.balance ?? 0), 0);
    const assets = cash + investments;
    return { netWorth, cash, debt, investments, assets };
  }, [accounts]);

  // Income vs spending (+ net) by month across the available window
  const monthly = useMemo(() => {
    const byMonth: Record<string, { income: number; spending: number }> = {};
    for (const t of transactions) {
      const ym = t.date.slice(0, 7);
      byMonth[ym] = byMonth[ym] ?? { income: 0, spending: 0 };
      if (t.amount > 0) byMonth[ym].income += t.amount;
      else byMonth[ym].spending += Math.abs(t.amount);
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => ({
        month: monthLabel(ym),
        income: Math.round(v.income),
        spending: Math.round(v.spending),
        net: Math.round(v.income - v.spending),
      }));
  }, [transactions]);

  // This month's pulse
  const thisMonth = new Date().toISOString().slice(0, 7);
  const pulse = useMemo(() => {
    let income = 0, spending = 0;
    for (const t of transactions) {
      if (!t.date.startsWith(thisMonth)) continue;
      if (t.amount > 0) income += t.amount;
      else spending += Math.abs(t.amount);
    }
    const net = income - spending;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;
    return { income, spending, net, savingsRate };
  }, [transactions, thisMonth]);

  // Top spending categories for the chosen period
  const topCategories = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const inPeriod = catPeriod === "month" ? t.date.startsWith(thisMonth) : t.date >= cutoffStr;
      if (!inPeriod) continue;
      const c = prettyCategory(t.category);
      totals[c] = (totals[c] ?? 0) + Math.abs(t.amount);
    }
    const sum = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([category, amount]) => ({ category, amount, pct: (amount / sum) * 100, color: categoryColor(category) }));
  }, [transactions, catPeriod, thisMonth]);

  // Shared three-layer intelligence engine (spec 006) — the same ranked,
  // explainable insights and recommendations that power the /insights surface.
  const { insights, recommendations } = useMemo(
    () => buildIntelligence(accounts, transactions),
    [accounts, transactions]
  );
  const topInsights = insights.slice(0, 3);
  const bs = useBlindSpots();
  const health = bs.baseHealth;
  const next = pickNextMove(recommendations, health.weakest);
  const leadRec = next?.move;

  const recentTxns = transactions.slice(0, 6);
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";

  return (
    <div className="relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[280px] bg-indigo-500/[0.08] blur-[120px] rounded-full pointer-events-none" />

      <div className="p-4 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-white tracking-tight">
              {greeting}{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Here's where your money stands today.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { refreshFinancialData(); window.location.reload(); }}
              aria-label="Refresh data"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 px-2.5 sm:px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
            <PlaidLinkButton
              size="sm"
              label="Connect"
              className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 rounded-full px-4 py-2 font-semibold shadow-[0_0_24px_rgba(99,102,241,0.3)] whitespace-nowrap"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : !hasData ? (
          <EmptyState
            title="Welcome to Credo"
            message="Your dashboard is empty because no accounts are connected yet. Connect your bank to see your net worth, spending, and personalized AI insights."
          />
        ) : (
          <div className="space-y-4">
            {/* ── HERO: net-worth focal panel + monthly pulse ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Net worth focal */}
              <div className={`${card} lg:col-span-2 p-5 sm:p-6 relative overflow-hidden`}>
                <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Total net worth</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      pulse.net >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {pulse.net >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pulse.net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(pulse.net))} this month
                    </span>
                  </div>
                  <p className="text-3xl sm:text-5xl font-semibold text-white tracking-tight mt-2 mb-5">{formatCurrency(stats.netWorth)}</p>

                  {/* Allocation bar */}
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-white/[0.05]">
                    {stats.assets > 0 && (
                      <>
                        <div style={{ width: `${(stats.cash / stats.assets) * 100}%`, background: ALLOC.cash }} />
                        <div style={{ width: `${(stats.investments / stats.assets) * 100}%`, background: ALLOC.invest }} />
                      </>
                    )}
                  </div>

                  {/* Legend rows (clickable to detail) */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <Link href="/accounts" className="rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors p-3 cursor-pointer">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1"><span className="w-2 h-2 rounded-full" style={{ background: ALLOC.cash }} /> Cash</span>
                      <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(stats.cash)}</span>
                    </Link>
                    <Link href="/investments" className="rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors p-3 cursor-pointer">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1"><span className="w-2 h-2 rounded-full" style={{ background: ALLOC.invest }} /> Investments</span>
                      <span className="text-sm sm:text-base font-semibold text-white">{formatCurrency(stats.investments)}</span>
                    </Link>
                    <Link href="/accounts" className="rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors p-3 cursor-pointer">
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1"><span className="w-2 h-2 rounded-full" style={{ background: ALLOC.debt }} /> Debt</span>
                      <span className="text-sm sm:text-base font-semibold text-rose-400">{formatCurrency(stats.debt)}</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Monthly pulse */}
              <div className={`${card} p-5 flex flex-col`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-100">This month</h2>
                  <Link href="/spending" className="text-xs text-indigo-400 font-medium hover:text-indigo-300 transition-colors">Details</Link>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Income</span>
                    <span className="text-sm font-semibold text-emerald-400">{formatCurrency(pulse.income)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Spending</span>
                    <span className="text-sm font-semibold text-slate-100">{formatCurrency(pulse.spending)}</span>
                  </div>
                  <div className="h-px bg-white/[0.06] my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Net saved</span>
                    <span className={cn("text-base font-bold", pulse.net >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {pulse.net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(pulse.net))}
                    </span>
                  </div>
                </div>
                {/* Savings rate */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                    <span>Savings rate</span>
                    <span className="text-slate-300 font-medium">{Math.max(0, Math.round(pulse.savingsRate))}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, pulse.savingsRate))}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Health score + next best move (decisions, not dashboards) ── */}
            {(health.indicators.length > 0 || leadRec) && (
              <Link href="/health" className={`${card} p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-4 group hover:border-white/[0.12] transition-colors`}>
                {health.indicators.length > 0 && (
                  <span className="flex items-center gap-3 shrink-0 pr-4 sm:border-r border-white/[0.06]">
                    <span className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                      <HeartPulse className="w-5 h-5 text-indigo-400" />
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-300/90">Health score</span>
                      <span className="block text-2xl font-semibold text-white leading-tight">{bs.healthScore}<span className="text-sm text-slate-500 font-normal"> / 100 · {STATUS_LABEL[statusFor(bs.healthScore)]}</span></span>
                    </span>
                  </span>
                )}
                {leadRec && (
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-300/90">Your next best move</span>
                    <span className="block text-sm font-semibold text-white truncate mt-0.5">{leadRec.title}</span>
                    <span className="block text-xs text-slate-400 truncate">{leadRec.impactLabel}{next?.targets ? ` · lifts your ${next.targets.name.toLowerCase()}` : ""}</span>
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-indigo-300 group-hover:text-indigo-200 shrink-0 ml-auto">
                  See your health <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )}

            {/* ── Financial Blind Spots ─────────────────────────────────── */}
            <div className={`${card} p-4 sm:p-5`}>
              <div className="flex items-center justify-between mb-3 gap-3">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                  <Radar className="w-4 h-4 text-indigo-400" /> Financial Blind Spots
                </h2>
                <Link href="/blindspots" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
                  {bs.active.length ? `See all ${bs.active.length}` : "Details"} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {bs.active.length === 0 ? (
                <p className="text-sm text-slate-400">No blind spots in your current data. Credo re-checks every time your accounts sync.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-[11px] text-slate-400 uppercase tracking-[0.12em]">Blind spot score</p>
                    <p className="text-3xl font-semibold text-white mt-1">{bs.score}<span className="text-sm text-slate-500 font-normal"> / 100</span></p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {bs.annualLoss > 0 ? `${formatCurrency(Math.round(bs.annualLoss))}/yr leaking` : "No ongoing losses found"}
                      {bs.penalty > 0 ? ` · −${bs.penalty} health pts` : ""}
                    </p>
                  </div>
                  {bs.active.slice(0, 3).map((f, i) => {
                    const Icon = f.severity === "critical" ? ShieldAlert : f.severity === "attention" ? AlertTriangle : Sparkles;
                    const tone = f.severity === "critical" ? "text-rose-300" : f.severity === "attention" ? "text-amber-300" : "text-emerald-300";
                    return (
                      <Link key={f.id} href="/blindspots" className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors p-3.5 flex flex-col">
                        <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]", tone)}>
                          <Icon className="w-3.5 h-3.5" /> {i === 0 ? "Fix first" : f.severity === "critical" ? "Critical" : f.severity === "attention" ? "Needs attention" : "Opportunity"}
                        </span>
                        <span className="text-xs font-semibold text-slate-100 mt-1.5">{f.title}</span>
                        {f.impact && (
                          <span className="text-[11px] text-slate-500 mt-auto pt-1.5">
                            {formatCurrency(Math.round(f.impact.amount))}{f.impact.period === "annual" ? "/yr" : " one-time"}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Insights strip (promoted, explainable) ──────────────────── */}
            {topInsights.length > 0 && (
              <div className={`${card} p-4 sm:p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-indigo-400" /> Insights for you
                  </h2>
                  <Link href="/insights" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {topInsights.map((ins) => (
                    <div key={ins.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 flex flex-col">
                      <p className="text-xs font-semibold text-slate-100">{ins.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed flex-1">{ins.body}</p>
                      <div className="mt-2">
                        <WhyExplanation explanation={ins.explanation} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Interactive trend chart ─────────────────────────────────── */}
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="text-sm font-semibold text-slate-100">
                  {chartView === "flow" ? "Income vs Spending" : "Net cashflow"}
                </h2>
                <Segmented
                  ariaLabel="Chart view"
                  value={chartView}
                  onChange={setChartView}
                  options={[{ label: "Cashflow", value: "flow" }, { label: "Net", value: "net" }]}
                />
              </div>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  {chartView === "flow" ? (
                    <BarChart data={monthly} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#171a21", color: "#f8fafc" }}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="spending" fill="#6366f1" radius={[4, 4, 0, 0]} name="Spending" />
                    </BarChart>
                  ) : (
                    <AreaChart data={monthly}>
                      <defs>
                        <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#171a21", color: "#f8fafc" }}
                        cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <Area type="monotone" dataKey="net" name="Net" stroke="#818cf8" strokeWidth={2} fill="url(#netFill)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-500 py-16 text-center">No transactions yet — they'll appear shortly after connecting.</p>
              )}
              <p className="text-[11px] text-slate-600 mt-2">Based on the last 90 days. History grows the longer your accounts stay connected.</p>
            </div>

            {/* ── Top spending (with period switch) + recent activity ─────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-sm font-semibold text-slate-100">Top spending</h2>
                  <Segmented
                    ariaLabel="Spending period"
                    value={catPeriod}
                    onChange={setCatPeriod}
                    options={[{ label: "Month", value: "month" }, { label: "30d", value: "30d" }]}
                  />
                </div>
                {topCategories.length > 0 ? (
                  <div className="space-y-3">
                    {topCategories.map((cat) => (
                      <Link key={cat.category} href="/spending" className="block group cursor-pointer">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{cat.category}</span>
                          <span className="text-slate-200 font-medium">{formatCurrency(cat.amount)} <span className="text-slate-600">· {cat.pct.toFixed(0)}%</span></span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-10 text-center">No spending recorded for this period yet.</p>
                )}
                <Link href="/budget" className="flex items-center justify-center gap-1.5 w-full mt-4 text-xs text-slate-400 hover:text-slate-100 py-2 rounded-xl hover:bg-white/[0.05] transition-colors">
                  Set up budgets <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Recent activity */}
              <div className={`${card} lg:col-span-2 overflow-hidden`}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-sm font-semibold text-slate-100">Recent activity</h2>
                  <Link href="/transactions" className="text-xs text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentTxns.map((txn, i) => (
                  <Link
                    href="/transactions"
                    key={txn.id}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer ${i < recentTxns.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.03] transition-colors`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-xs font-bold" style={{ color: categoryColor(prettyCategory(txn.category)) }}>
                      {prettyCategory(txn.category).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{txn.merchant}</p>
                      <p className="text-xs text-slate-600">{formatShortDate(txn.date)} · {acctName(txn.accountId)}{txn.pending ? " · pending" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${txn.amount > 0 ? "text-emerald-400" : "text-slate-200"}`}>
                        {txn.amount > 0 ? "+" : ""}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-slate-600">{prettyCategory(txn.category)}</p>
                    </div>
                  </Link>
                ))}
                {recentTxns.length === 0 && <p className="text-sm text-slate-500 py-10 text-center">No transactions yet.</p>}
              </div>
            </div>

            {/* ── Accounts strip ──────────────────────────────────────────── */}
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">Connected accounts</h2>
                <Link href="/accounts" className="text-xs text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {accounts.slice(0, 10).map((acct) => (
                  <Link href="/accounts" key={acct.id} className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-3.5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <p className="text-xs text-slate-500 mb-1.5 truncate">{acct.institution}</p>
                    <p className="text-xs font-medium text-slate-300 truncate">{acct.name}</p>
                    <p className={`text-sm font-semibold mt-1 ${isDebt(acct) ? "text-rose-400" : "text-slate-100"}`}>
                      {acct.balance != null ? formatCurrency(acct.balance) : "—"}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] text-slate-500 bg-white/[0.06] px-2 py-0.5 rounded-full">{acct.type}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
