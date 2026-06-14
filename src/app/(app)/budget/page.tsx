"use client";

import { useState, useMemo } from "react";
import { useFinancialData, prettyCategory, categoryColor, monthlyAverages } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { AlertTriangle, Zap, Loader2, Sparkles, X, Info } from "lucide-react";

export default function BudgetPage() {
  const { transactions, loading, hasData } = useFinancialData();
  const { ent } = usePlan();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const { income, byCategory, thisMonthSpend } = useMemo(() => {
    const avg = monthlyAverages(transactions);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const spend: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0 && t.date.startsWith(thisMonth)) {
        const c = prettyCategory(t.category);
        spend[c] = (spend[c] ?? 0) + Math.abs(t.amount);
      }
    }
    const byCategory = Object.entries(avg.byCategory)
      .map(([category, avgSpend]) => ({
        category,
        avgSpend,
        spent: spend[category] ?? 0,
        color: categoryColor(category),
      }))
      .sort((a, b) => b.avgSpend - a.avgSpend);
    return { income: avg.income, byCategory, thisMonthSpend: Object.values(spend).reduce((s, v) => s + v, 0) };
  }, [transactions]);

  async function getAiSuggestions() {
    setAiLoading(true);
    setAiError(null);
    const summary = byCategory
      .map((c) => `${c.category}: averaging ${formatCurrency(c.avgSpend)}/mo`)
      .join("; ");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `My average monthly take-home income is approximately ${formatCurrency(income)}. My average monthly spending by category is: ${summary}.

Please: (1) identify the specific categories where my budgeting should be improved and explain why, comparing against common guidelines like the 50/30/20 rule; (2) at the end, give a clear recommended monthly budget amount for EACH category based on established personal-finance best practices for my income level. Format the recommended budget as a simple list. Keep it concise.`,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) setAiError(data.error ?? "Failed to get AI suggestions");
      else setAiSuggestions(data.reply);
    } catch {
      setAiError("Network error — could not reach the server");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  const maxAvg = byCategory[0]?.avgSpend ?? 1;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Budget</h1>
          <p className="text-sm text-stone-400">
            Based on your last 90 days · {formatCurrency(income)}/mo avg income
          </p>
        </div>
        {ent.aiBudgetSuggestions ? (
          <Button variant="outline" size="sm" onClick={getAiSuggestions} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            AI Budget Suggestions
          </Button>
        ) : (
          <Link href="/billing">
            <Button variant="outline" size="sm">
              <Zap className="w-4 h-4" /> AI Suggestions (Plus)
            </Button>
          </Link>
        )}
      </div>

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-300">{aiError}</p>
        </div>
      )}

      {aiSuggestions && (
        <Card className="mb-6 border-orange-500/30">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" /> AI Budget Suggestions
            </CardTitle>
            <button onClick={() => setAiSuggestions(null)} className="p-1 text-stone-500 hover:text-stone-300 hover:bg-[#ffffff12] rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">
              {aiSuggestions.split("**").map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-stone-100">{part}</strong> : <span key={i}>{part}</span>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 bg-[#ffffff08] border border-[#ffffff0f] rounded-lg p-3">
              <Info className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-stone-500 leading-relaxed">
                <strong className="text-stone-400">Disclaimer:</strong> These suggestions are AI-generated for informational and educational purposes only and are based on general budgeting guidelines. They are <strong className="text-stone-400">not financial, investment, tax, or legal advice</strong>, and should not be relied upon as such. FinPilot is not a licensed financial advisor. Consult a qualified professional before making financial decisions. You are solely responsible for your own financial choices.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall */}
      <Card className="mb-6">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Spent This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-stone-100">{formatCurrency(thisMonthSpend)}</span>
                {income > 0 && <span className="text-stone-500 text-lg">of {formatCurrency(income)} income</span>}
              </div>
            </div>
            {income > 0 && (
              <Badge variant={thisMonthSpend > income ? "danger" : thisMonthSpend > income * 0.9 ? "warning" : "success"}>
                {Math.round((thisMonthSpend / income) * 100)}% of income
              </Badge>
            )}
          </div>
          {income > 0 && (
            <div className="h-3 bg-[#ffffff12] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((thisMonthSpend / income) * 100, 100)}%`, background: thisMonthSpend > income ? "#ef4444" : "#f97316" }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-category averages */}
      <Card>
        <CardHeader><CardTitle>Average Monthly Spending by Category</CardTitle></CardHeader>
        <div>
          {byCategory.map((cat, i) => (
            <div key={cat.category} className={`flex items-center gap-4 px-6 py-4 hover:bg-[#ffffff0a] transition-colors ${i < byCategory.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-100">{cat.category}</span>
                  <span className="text-sm text-stone-300">{formatCurrency(cat.avgSpend)}<span className="text-stone-600">/mo avg</span></span>
                </div>
                <div className="h-1.5 bg-[#ffffff12] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(cat.avgSpend / maxAvg) * 100}%`, background: cat.color }} />
                </div>
              </div>
            </div>
          ))}
          {byCategory.length === 0 && <div className="px-6 py-10 text-center text-sm text-stone-500">No spending data yet.</div>}
        </div>
      </Card>

      <p className="text-xs text-stone-600 mt-4 flex items-center gap-1.5">
        <Info className="w-3 h-3" /> Click &quot;AI Budget Suggestions&quot; for personalized recommended budgets based on your income and spending.
      </p>
    </div>
  );
}
