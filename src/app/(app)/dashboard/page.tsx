"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { useFinancialData, refreshFinancialData, signedBalance, isInvestment, isDebt, prettyCategory, categoryColor, monthlyAverages } from "@/lib/useFinancialData";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import {
  TrendingUp, TrendingDown, RefreshCw, Bell, ArrowRight, Lightbulb, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const card = "bg-gradient-to-b from-[#1c1815] to-[#141110] border border-white/[0.06] rounded-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]";
const cardHover = "hover:border-white/[0.12] transition-colors";

function StatCard({ label, value, sub, trend, trendValue, accent }: {
  label: string; value: string; sub: React.ReactNode; trend?: "up" | "down";
  trendValue?: string; accent?: boolean;
}) {
  return (
    <div className={`${card} ${cardHover} p-5 relative overflow-hidden`}>
      {accent && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />}
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] text-stone-400 font-medium uppercase tracking-[0.14em]">{label}</p>
        {trend && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
      <p className="text-[26px] font-semibold text-stone-50 tracking-tight">{value}</p>
      <p className="text-xs text-stone-500 mt-1">{sub}</p>
    </div>
  );
}

const monthLabel = (ym: string) => {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[Number(ym.slice(5)) - 1];
};

export default function DashboardPage() {
  const { user } = useUser();
  const { accounts, transactions, loading, hasData } = useFinancialData();

  const stats = useMemo(() => {
    const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);
    const cashAccts = accounts.filter((a) => !isDebt(a) && !isInvestment(a));
    const cash = cashAccts.reduce((s, a) => s + (a.balance ?? 0), 0); // available
    const cashCurrent = cashAccts.reduce((s, a) => s + (a.current ?? a.balance ?? 0), 0);
    const debt = accounts.filter(isDebt).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
    const investments = accounts.filter(isInvestment).reduce((s, a) => s + (a.balance ?? 0), 0);
    return { netWorth, cash, cashCurrent, debt, investments };
  }, [accounts]);

  // Income vs spending by month (from the available 90-day window)
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
      .map(([ym, v]) => ({ month: monthLabel(ym), income: Math.round(v.income), spending: Math.round(v.spending) }));
  }, [transactions]);

  // Top spending categories this month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const topCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0 && t.date.startsWith(thisMonth)) {
        const c = prettyCategory(t.category);
        totals[c] = (totals[c] ?? 0) + Math.abs(t.amount);
      }
    }
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([category, amount]) => ({ category, amount, color: categoryColor(category) }));
  }, [transactions, thisMonth]);
  const maxCat = topCategories[0]?.amount ?? 1;

  // Simple rule-based insights from real data
  const insights = useMemo(() => {
    const out: { title: string; body: string }[] = [];
    const avg = monthlyAverages(transactions);
    if (topCategories[0]) {
      out.push({
        title: `${topCategories[0].category} is your top category`,
        body: `You've spent ${formatCurrency(topCategories[0].amount)} on ${topCategories[0].category.toLowerCase()} this month.`,
      });
    }
    if (avg.income > 0 && avg.expenses > 0) {
      const rate = ((avg.income - avg.expenses) / avg.income) * 100;
      out.push({
        title: rate >= 0 ? `You keep ~${rate.toFixed(0)}% of your income` : "Spending exceeds income",
        body: rate >= 0
          ? `Avg monthly income ${formatCurrency(avg.income)} vs spending ${formatCurrency(avg.expenses)}.`
          : `You're spending ${formatCurrency(avg.expenses - avg.income)}/mo more than you bring in.`,
      });
    }
    const big = transactions.filter((t) => t.amount < 0).sort((a, b) => a.amount - b.amount)[0];
    if (big) {
      out.push({
        title: "Largest recent transaction",
        body: `${big.merchant} — ${formatCurrency(Math.abs(big.amount))} on ${formatShortDate(big.date)}.`,
      });
    }
    return out;
  }, [transactions, topCategories]);

  const recentTxns = transactions.slice(0, 6);
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";

  return (
    <div className="relative">
      <div className="absolute top-0 left-1/3 w-[600px] h-[280px] bg-orange-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold text-stone-50 tracking-tight">
              Good morning{user?.firstName ? `, ${user.firstName}` : ""} 👋
            </h1>
            <p className="text-sm text-stone-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refreshFinancialData(); window.location.reload(); }}
              className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button className="p-2 text-stone-400 hover:text-stone-100 rounded-xl hover:bg-white/[0.06] transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <PlaidLinkButton
              size="sm"
              label="Connect Account"
              className="bg-stone-100 text-stone-900 hover:bg-white rounded-full px-4 py-2 font-semibold shadow-[0_0_24px_rgba(249,115,22,0.15)]"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : !hasData ? (
          <EmptyState
            title="Welcome to FinPilot"
            message="Your dashboard is empty because no accounts are connected yet. Connect your bank to see your net worth, spending, and personalized AI insights."
          />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4 mb-5">
              <StatCard label="Net Worth" value={formatCurrency(stats.netWorth)} sub={`Across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`} accent />
              <StatCard
                label="Cash Balance"
                value={formatCurrency(stats.cash)}
                sub={
                  <span>
                    <span className="text-stone-400">{formatCurrency(stats.cashCurrent)}</span>
                    <span className="text-stone-600"> current balance</span>
                  </span>
                }
              />
              <StatCard label="Debt" value={formatCurrency(stats.debt)} sub="Credit cards & loans" />
              <StatCard label="Investments" value={formatCurrency(stats.investments)} sub="Brokerage & retirement" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Income vs spending chart */}
              <div className={`${card} col-span-2 p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-stone-100">Income vs Spending</h2>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Income</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> Spending</span>
                  </div>
                </div>
                {monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height={185}>
                    <BarChart data={monthly} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1815", color: "#fafaf9" }}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="spending" fill="#f97316" radius={[4, 4, 0, 0]} name="Spending" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-stone-500 py-16 text-center">No transactions yet — they'll appear shortly after connecting.</p>
                )}
                <p className="text-[11px] text-stone-600 mt-2 flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Based on the last 90 days of transactions. History grows the longer your accounts stay connected.
                </p>
              </div>

              {/* Top categories this month */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-stone-100">Top Spending This Month</h2>
                  <Link href="/spending" className="text-xs text-orange-400 font-medium hover:text-orange-300 transition-colors">Details</Link>
                </div>
                {topCategories.length > 0 ? (
                  <div className="space-y-3">
                    {topCategories.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs text-stone-400 mb-1">
                          <span>{cat.category}</span>
                          <span className="text-stone-200 font-medium">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(cat.amount / maxCat) * 100}%`, background: cat.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500 py-10 text-center">No spending recorded this month yet.</p>
                )}
                <Link href="/budget" className="flex items-center justify-center gap-1.5 w-full mt-4 text-xs text-stone-400 hover:text-stone-100 py-2 rounded-xl hover:bg-white/[0.05] transition-colors">
                  Set up budgets <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Recent Transactions */}
              <div className={`${card} col-span-2 overflow-hidden`}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-sm font-semibold text-stone-100">Recent Transactions</h2>
                  <Link href="/transactions" className="text-xs text-orange-400 font-medium hover:text-orange-300 flex items-center gap-1 transition-colors">
                    View all <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentTxns.map((txn, i) => (
                  <div key={txn.id} className={`flex items-center gap-3 px-5 py-3 ${i < recentTxns.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.03] transition-colors`}>
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.05] flex items-center justify-center text-xs font-bold" style={{ color: categoryColor(prettyCategory(txn.category)) }}>
                      {prettyCategory(txn.category).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-200 truncate">{txn.merchant}</p>
                      <p className="text-xs text-stone-600">{formatShortDate(txn.date)} · {acctName(txn.accountId)}{txn.pending ? " · pending" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${txn.amount > 0 ? "text-emerald-400" : "text-stone-200"}`}>
                        {txn.amount > 0 ? "+" : ""}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-stone-600">{prettyCategory(txn.category)}</p>
                    </div>
                  </div>
                ))}
                {recentTxns.length === 0 && <p className="text-sm text-stone-500 py-10 text-center">No transactions yet.</p>}
              </div>

              {/* Insights */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-orange-400" /> Insights
                  </h2>
                  <Link href="/ai" className="text-xs text-orange-400 font-medium hover:text-orange-300 transition-colors">Ask AI</Link>
                </div>
                <div className="space-y-2.5">
                  {insights.map((ins) => (
                    <div key={ins.title} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-xs font-semibold text-stone-200">{ins.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{ins.body}</p>
                    </div>
                  ))}
                  {insights.length === 0 && <p className="text-sm text-stone-500 py-6 text-center">Insights appear once transactions arrive.</p>}
                </div>
                <Link href="/ai" className="flex items-center justify-center gap-1.5 w-full mt-4 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-white py-2.5 rounded-full transition-colors">
                  Chat with AI Assistant <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Accounts overview */}
            <div className={`${card} mt-4 p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-stone-100">Connected Accounts</h2>
                <Link href="/accounts" className="text-xs text-orange-400 font-medium hover:text-orange-300 flex items-center gap-1 transition-colors">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {accounts.slice(0, 10).map((acct) => (
                  <div key={acct.id} className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-3.5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors">
                    <p className="text-xs text-stone-500 mb-1.5">{acct.institution}</p>
                    <p className="text-xs font-medium text-stone-300 truncate">{acct.name}</p>
                    <p className={`text-sm font-semibold mt-1 ${isDebt(acct) ? "text-red-400" : "text-stone-100"}`}>
                      {acct.balance != null ? formatCurrency(acct.balance) : "—"}
                    </p>
                    <span className="inline-block mt-1.5 text-[10px] text-stone-500 bg-white/[0.06] px-2 py-0.5 rounded-full">{acct.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
