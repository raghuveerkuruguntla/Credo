"use client";

import { useState, useMemo } from "react";
import { useFinancialData, prettyCategory, categoryColor } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const RANGES = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "90d", label: "Last 90 days" },
  { key: "custom", label: "Custom range…" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

function iso(d: Date) { return d.toISOString().slice(0, 10); }

function rangeDates(key: RangeKey, customStart: string, customEnd: string): [string, string] {
  const now = new Date();
  const today = iso(now);
  switch (key) {
    case "this-month": return [today.slice(0, 7) + "-01", today];
    case "last-month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return [iso(first), iso(last)];
    }
    case "90d": return [iso(new Date(Date.now() - 90 * 864e5)), today];
    case "custom": return [customStart || iso(new Date(Date.now() - 90 * 864e5)), customEnd || today];
  }
}

const RADIAN = Math.PI / 180;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.06) return null;
  return (
    <text x={x} y={y} fill="#fafaf9" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function SpendingPage() {
  const { transactions, loading, hasData } = useFinancialData();
  const { ent } = usePlan();
  const [range, setRange] = useState<RangeKey>("this-month");
  const minDate = iso(new Date(Date.now() - 90 * 864e5));
  const today = iso(new Date());
  const [customStart, setCustomStart] = useState(minDate);
  const [customEnd, setCustomEnd] = useState(today);

  const [start, end] = rangeDates(range, customStart, customEnd);

  const { byCategory, weekly, totalSpent } = useMemo(() => {
    const expenses = transactions.filter((t) => t.amount < 0 && t.date >= start && t.date <= end);
    const catTotals: Record<string, number> = {};
    for (const t of expenses) {
      const c = prettyCategory(t.category);
      catTotals[c] = (catTotals[c] ?? 0) + Math.abs(t.amount);
    }
    const byCategory = Object.entries(catTotals)
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100, color: categoryColor(category) }))
      .sort((a, b) => b.amount - a.amount);

    const buckets: Record<string, number> = {};
    for (const t of expenses) {
      const d = new Date(t.date + "T00:00:00");
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = iso(weekStart);
      buckets[key] = (buckets[key] ?? 0) + Math.abs(t.amount);
    }
    const weekly = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([wk, amount]) => ({
        week: new Date(wk + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: Math.round(amount),
      }));

    const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    return { byCategory, weekly, totalSpent };
  }, [transactions, start, end]);

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Spending Analytics</h1>
          <p className="text-sm text-stone-400">
            {new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(end + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {formatCurrency(totalSpent)} spent
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="text-sm border border-[#ffffff14] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {RANGES.filter((r) => ent.advancedAnalytics || r.key === "this-month" || r.key === "last-month")
              .map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} min={minDate} max={today} onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm border border-[#ffffff14] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
              <span className="text-stone-500 text-sm">to</span>
              <input type="date" value={customEnd} min={customStart} max={today} onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm border border-[#ffffff14] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-stone-600 mb-4">Data covers the last 90 days of synced transactions. History extends the longer your accounts stay connected.</p>

      {byCategory.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-stone-500">No spending in this period.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={byCategory} dataKey="amount" cx="50%" cy="50%" innerRadius={55} outerRadius={90} labelLine={false} label={renderLabel}>
                        {byCategory.map((entry) => <Cell key={entry.category} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1815", color: "#fafaf9" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {byCategory.slice(0, 8).map((cat) => (
                      <div key={cat.category} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs text-stone-400 flex-1 truncate">{cat.category}</span>
                        <span className="text-xs font-semibold text-stone-100">{formatCurrency(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Weekly Spending {!ent.advancedAnalytics && <span className="text-xs font-normal text-orange-400">· Plus</span>}</CardTitle></CardHeader>
              <CardContent>
                {ent.advancedAnalytics ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weekly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#78716c" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#1c1815", color: "#fafaf9" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} name="Spent" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center" style={{ height: 220 }}>
                    <p className="text-sm text-stone-400 mb-1">Weekly trends & custom date ranges</p>
                    <p className="text-xs text-stone-500 mb-3">Advanced analytics is a Plus feature.</p>
                    <Link href="/billing" className="text-xs font-semibold bg-stone-100 text-stone-900 hover:bg-white px-4 py-2 rounded-full transition-colors">Upgrade to Plus</Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
            <div>
              <div className="grid grid-cols-4 gap-4 px-6 py-2 border-b border-[#ffffff0a] text-xs font-semibold text-stone-500 uppercase tracking-wide">
                <span className="col-span-2">Category</span>
                <span className="text-right">Spent</span>
                <span className="text-right">% of Total</span>
              </div>
              {byCategory.map((cat, i) => {
                const pct = (cat.amount / totalSpent) * 100;
                return (
                  <div key={cat.category} className={`grid grid-cols-4 gap-4 px-6 py-3.5 items-center hover:bg-[#ffffff0a] transition-colors ${i < byCategory.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm text-stone-100">{cat.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-right text-stone-100">{formatCurrency(cat.amount)}</span>
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 h-1.5 bg-[#ffffff12] rounded-full overflow-hidden max-w-16">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                      <span className="text-xs font-medium text-stone-400 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
