"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useFinancialData, prettyCategory, categoryColor, monthlyAverages } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { Zap, Loader2, Sparkles, X, Info, Plus, Pencil, Wallet, Trash2 } from "lucide-react";

type Budget = Record<string, number>;

export default function BudgetPage() {
  const { user } = useUser();
  const { transactions, loading, hasData } = useFinancialData();
  const { ent } = usePlan();

  const savedBudget = (user?.publicMetadata?.budget as Budget | undefined) ?? {};
  const hasBudget = Object.keys(savedBudget).length > 0;

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState("");
  const [newAmt, setNewAmt] = useState("");
  const [saving, setSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Spending this month + average per category, from real transactions
  const { income, avgByCategory, spentByCategory, thisMonthSpend } = useMemo(() => {
    const avg = monthlyAverages(transactions);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const spent: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0 && t.date.startsWith(thisMonth)) {
        const c = prettyCategory(t.category);
        spent[c] = (spent[c] ?? 0) + Math.abs(t.amount);
      }
    }
    const avgByCategory: Record<string, number> = {};
    for (const [c, v] of Object.entries(avg.byCategory)) avgByCategory[prettyCategory(c)] = v;
    return {
      income: avg.income,
      avgByCategory,
      spentByCategory: spent,
      thisMonthSpend: Object.values(spent).reduce((s, v) => s + v, 0),
    };
  }, [transactions]);

  // Categories suggested when creating a budget = the user's actual spending categories
  const suggestedCategories = useMemo(
    () => Array.from(new Set([...Object.keys(avgByCategory), ...Object.keys(spentByCategory)])).sort(),
    [avgByCategory, spentByCategory]
  );

  function startCreate() {
    // Seed rows from the user's spending categories, amounts left blank
    const seed: Record<string, string> = {};
    for (const c of suggestedCategories) seed[c] = "";
    setDraft(seed);
    setMode("edit");
  }

  function startEdit() {
    const seed: Record<string, string> = {};
    for (const [c, v] of Object.entries(savedBudget)) seed[c] = String(v);
    setDraft(seed);
    setMode("edit");
  }

  function setAmount(cat: string, val: string) {
    setDraft((d) => ({ ...d, [cat]: val }));
  }
  function removeRow(cat: string) {
    setDraft((d) => {
      const next = { ...d };
      delete next[cat];
      return next;
    });
  }
  function addRow() {
    const name = newCat.trim();
    if (!name) return;
    setDraft((d) => ({ ...d, [name]: newAmt || "" }));
    setNewCat("");
    setNewAmt("");
  }

  async function saveBudget() {
    setSaving(true);
    const budget: Budget = {};
    for (const [c, v] of Object.entries(draft)) {
      const n = parseFloat(v);
      if (c.trim() && !isNaN(n) && n >= 0) budget[c.trim()] = n;
    }
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget }),
      });
      if (res.ok) {
        await user?.reload();
        setMode("view");
      }
    } finally {
      setSaving(false);
    }
  }

  async function getAiSuggestions() {
    setAiLoading(true);
    setAiError(null);
    const summary = Object.entries(avgByCategory)
      .map(([c, v]) => `${c}: averaging ${formatCurrency(v)}/mo`)
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

  const draftTotal = Object.values(draft).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  // ── EDIT / CREATE MODE ───────────────────────────────────────────
  if (mode === "edit") {
    const remaining = suggestedCategories.filter((c) => !(c in draft));
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-stone-100">{hasBudget ? "Edit budget" : "Create your budget"}</h1>
            <p className="text-sm text-stone-400">Set a monthly limit for each category{income > 0 ? ` · ${formatCurrency(income)}/mo income` : ""}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Monthly limits</CardTitle>
            <span className="text-sm text-stone-400">Total: <span className="font-semibold text-stone-100">{formatCurrency(draftTotal)}</span></span>
          </CardHeader>
          <div>
            {Object.keys(draft).length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-stone-500">Add a category below to start.</div>
            )}
            {Object.keys(draft).map((cat, i, arr) => (
              <div key={cat} className={`flex items-center gap-3 px-6 py-3 ${i < arr.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: categoryColor(cat) }} />
                <span className="text-sm text-stone-200 flex-1">{cat}</span>
                {avgByCategory[cat] != null && (
                  <span className="text-xs text-stone-600">avg {formatCurrency(avgByCategory[cat])}</span>
                )}
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
                  <input
                    type="number" min="0" inputMode="decimal"
                    value={draft[cat]}
                    onChange={(e) => setAmount(cat, e.target.value)}
                    placeholder={avgByCategory[cat] != null ? Math.round(avgByCategory[cat]).toString() : "0"}
                    className="w-28 pl-6 pr-2 py-1.5 text-sm border border-[#ffffff14] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  />
                </div>
                <button onClick={() => removeRow(cat)} className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add category */}
          <div className="px-6 py-4 border-t border-[#ffffff0a] flex items-center gap-2">
            {remaining.length > 0 ? (
              <select
                value=""
                onChange={(e) => { if (e.target.value) setDraft((d) => ({ ...d, [e.target.value]: "" })); }}
                className="text-sm border border-[#ffffff14] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                <option value="">+ Add from your categories…</option>
                {remaining.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : null}
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)}
                placeholder="Custom category"
                className="flex-1 min-w-0 text-sm border border-[#ffffff14] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              <input
                type="number" min="0" value={newAmt} onChange={(e) => setNewAmt(e.target.value)}
                placeholder="$"
                className="w-20 text-sm border border-[#ffffff14] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              <Button variant="outline" size="sm" onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add</Button>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-2 mt-4">
          {hasBudget && <Button variant="ghost" size="sm" onClick={() => setMode("view")}>Cancel</Button>}
          <Button size="sm" onClick={saveBudget} disabled={saving || Object.keys(draft).length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save budget"}
          </Button>
        </div>
      </div>
    );
  }

  // ── EMPTY STATE (no budget yet) ──────────────────────────────────
  if (!hasBudget) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl">
        <h1 className="text-xl font-bold text-stone-100 mb-1">Budget</h1>
        <p className="text-sm text-stone-400 mb-8">Plan your monthly spending by category.</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-orange-400" />
          </div>
          <h2 className="text-base font-semibold text-stone-100 mb-1">You don&apos;t have a budget yet</h2>
          <p className="text-sm text-stone-500 max-w-sm mb-5">
            Create a monthly budget to track your spending against limits you set. We&apos;ll show your real spending next to each category.
          </p>
          <Button onClick={startCreate} className="rounded-full px-5">
            <Plus className="w-4 h-4" /> Create a budget
          </Button>
        </div>
      </div>
    );
  }

  // ── VIEW MODE (budget exists) ────────────────────────────────────
  const budgetRows = Object.entries(savedBudget)
    .map(([category, limit]) => ({ category, limit, spent: spentByCategory[category] ?? 0, color: categoryColor(category) }))
    .sort((a, b) => b.limit - a.limit);
  const totalBudget = budgetRows.reduce((s, r) => s + r.limit, 0);

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Budget</h1>
          <p className="text-sm text-stone-400">Your monthly plan · spending shown for {new Date().toLocaleDateString("en-US", { month: "long" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {ent.aiBudgetSuggestions ? (
            <Button variant="outline" size="sm" onClick={getAiSuggestions} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              AI Suggestions
            </Button>
          ) : (
            <Link href="/billing">
              <Button variant="outline" size="sm"><Zap className="w-4 h-4" /> AI Suggestions (Plus)</Button>
            </Link>
          )}
          <Button size="sm" onClick={startEdit}><Pencil className="w-4 h-4" /> Edit budget</Button>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-5"><p className="text-sm text-red-300">{aiError}</p></div>
      )}
      {aiSuggestions && (
        <Card className="mb-6 border-orange-500/30">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-400" /> AI Budget Suggestions</CardTitle>
            <button onClick={() => setAiSuggestions(null)} className="p-1 text-stone-500 hover:text-stone-300 hover:bg-[#ffffff12] rounded-md transition-colors"><X className="w-4 h-4" /></button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-stone-300 whitespace-pre-wrap leading-relaxed">
              {aiSuggestions.split("**").map((part, i) => i % 2 === 1 ? <strong key={i} className="text-stone-100">{part}</strong> : <span key={i}>{part}</span>)}
            </div>
            <div className="mt-4 flex items-start gap-2 bg-[#ffffff08] border border-[#ffffff0f] rounded-lg p-3">
              <Info className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-stone-500 leading-relaxed">
                <strong className="text-stone-400">Disclaimer:</strong> These suggestions are AI-generated for informational and educational purposes only and are based on general budgeting guidelines. They are <strong className="text-stone-400">not financial, investment, tax, or legal advice</strong>. FinPilot is not a licensed financial advisor. You are solely responsible for your own financial choices.
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
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Spent vs Budget</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-stone-100">{formatCurrency(thisMonthSpend)}</span>
                <span className="text-stone-500 text-lg">of {formatCurrency(totalBudget)}</span>
              </div>
            </div>
            <Badge variant={thisMonthSpend > totalBudget ? "danger" : thisMonthSpend > totalBudget * 0.9 ? "warning" : "success"}>
              {totalBudget > 0 ? Math.round((thisMonthSpend / totalBudget) * 100) : 0}% used
            </Badge>
          </div>
          <div className="h-3 bg-[#ffffff12] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${totalBudget > 0 ? Math.min((thisMonthSpend / totalBudget) * 100, 100) : 0}%`, background: thisMonthSpend > totalBudget ? "#ef4444" : "#f97316" }} />
          </div>
          <p className="text-xs text-stone-500 mt-2">{formatCurrency(Math.max(totalBudget - thisMonthSpend, 0))} remaining this month</p>
        </CardContent>
      </Card>

      {/* Per-category budget vs actual */}
      <Card>
        <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
        <div>
          {budgetRows.map((row, i) => {
            const pct = row.limit > 0 ? (row.spent / row.limit) * 100 : 0;
            const over = row.spent > row.limit;
            return (
              <div key={row.category} className={`px-6 py-4 ${i < budgetRows.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.color }} />
                  <span className="text-sm font-medium text-stone-100 flex-1">{row.category}</span>
                  <span className="text-sm text-stone-300">
                    <span className={over ? "text-red-400 font-semibold" : ""}>{formatCurrency(row.spent)}</span>
                    <span className="text-stone-600"> / {formatCurrency(row.limit)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[#ffffff12] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: over ? "#ef4444" : row.color }} />
                  </div>
                  <span className={`text-xs w-10 text-right ${over ? "text-red-400" : "text-stone-500"}`}>{Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
