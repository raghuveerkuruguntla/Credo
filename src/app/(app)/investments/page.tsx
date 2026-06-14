"use client";

import { useState, useMemo } from "react";
import { useFinancialData, isInvestment } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import LockedFeature from "@/components/LockedFeature";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, EyeOff, Info } from "lucide-react";

const COLORS = ["#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b"];

export default function InvestmentsPage() {
  const { accounts, loading, hasData } = useFinancialData();
  const { ent, isLoaded } = usePlan();
  const [show, setShow] = useState(false);
  const masked = "••••••";

  const investments = useMemo(() => accounts.filter(isInvestment), [accounts]);
  const totalValue = investments.reduce((s, a) => s + (a.balance ?? 0), 0);
  const allocation = investments.map((a, i) => ({
    name: a.name,
    value: a.balance ?? 0,
    color: COLORS[i % COLORS.length],
  }));

  if (loading || !isLoaded) return <div className="p-6"><LoadingState /></div>;
  if (!ent.investmentAnalytics) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-stone-100 mb-1">Investments</h1>
        <LockedFeature
          feature="Investment analytics"
          requiredPlan="PRO"
          description="Track your portfolio, allocation, and investment accounts. Available on Pro."
        />
      </div>
    );
  }
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  if (investments.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-bold text-stone-100 mb-1">Investments</h1>
        <p className="text-sm text-stone-400 mb-6">Brokerage & retirement accounts</p>
        <Card><CardContent className="py-16 text-center">
          <p className="text-sm text-stone-400 mb-1">No investment accounts connected</p>
          <p className="text-xs text-stone-500">Connect a brokerage or retirement account to track your portfolio here.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Investments</h1>
          <p className="text-sm text-stone-400">{investments.length} investment account{investments.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShow(!show)}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? "Hide" : "Show"} balances
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Portfolio Value</p>
            <p className="text-2xl font-bold text-stone-100">{show ? formatCurrency(totalValue) : masked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Accounts</p>
            <p className="text-2xl font-bold text-stone-100">{investments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Largest Holding</p>
            <p className="text-2xl font-bold text-orange-400">
              {totalValue > 0 ? `${Math.round((Math.max(...investments.map((a) => a.balance ?? 0)) / totalValue) * 100)}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={allocation} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {allocation.map((a) => <Cell key={a.name} fill={a.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1815", color: "#fafaf9" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {allocation.map((a) => (
                <div key={a.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="text-xs text-stone-400 flex-1 truncate">{a.name}</span>
                  <span className="text-xs font-semibold text-stone-100">{totalValue > 0 ? `${Math.round(((a.value) / totalValue) * 100)}%` : "—"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Investment Accounts</CardTitle></CardHeader>
          <div>
            {investments.map((acct, i) => (
              <div key={acct.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-[#ffffff0a] transition-colors ${i < investments.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: COLORS[i % COLORS.length] }}>
                  {acct.institution[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-100">{acct.name}</p>
                  <p className="text-xs text-stone-500">{acct.institution} · {acct.type}</p>
                </div>
                <p className="text-sm font-bold text-stone-100">{show ? formatCurrency(acct.balance ?? 0) : masked}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-stone-400">
          Showing account-level balances. Individual holdings, cost basis, and gain/loss require Plaid&apos;s Investments product, which can be enabled once you have Plaid production access.
        </p>
      </div>
    </div>
  );
}
