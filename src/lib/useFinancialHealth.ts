"use client";

// Client side of the Financial Intelligence Engine. One hook gives every page
// the same health score, insights and history:
//   • data: connected accounts + transactions (useFinancialData) and the
//     user's budgets (Clerk profile)
//   • decisions: findings the user resolved or dismissed (this browser)
//   • history: one score snapshot per day (this browser), so improvement is
//     visible over time; a resolved finding is "confirmed" once it no longer
//     appears in the data, never just because it was clicked.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { useFinancialData, useLiabilities } from "@/lib/useFinancialData";
import { analyzeFinances, contributionOf, type FinancialIntelligence } from "@/lib/financialIntelligence";
import type { BlindSpot, FindingKind } from "@/lib/blindspots";
import type { CategoryId, HealthScore, HealthInputs } from "@/lib/health";

const DECISIONS_KEY = "credo.insights.decisions.v1";
const LEGACY_DECISIONS_KEY = "credo.blindspots.decisions.v1";
const HISTORY_KEY = "credo.health.history.v1";

export type DecisionStatus = "resolved" | "dismissed";
type Decision = { status: DecisionStatus; at: string; title: string; category?: CategoryId; impact?: string | null };
type Decisions = Record<string, Decision>;
export interface ScoreSnapshot { d: string; s: number; c: Partial<Record<CategoryId, number | null>> }

export interface ResolvedEntry { id: string; title: string; status: DecisionStatus; at: string; category?: CategoryId; impact?: string | null; confirmed: boolean }

export interface FinancialHealthState {
  loading: boolean;
  hasData: boolean;
  fi: FinancialIntelligence;
  health: HealthScore;
  inputs: HealthInputs;
  active: BlindSpot[];               // open findings, priority order
  closed: (BlindSpot & { decision: DecisionStatus; decidedAt: string })[];
  resolvedLog: ResolvedEntry[];      // everything resolved/dismissed, newest first
  counts: Record<FindingKind, number>;
  meaningful: number;                // open risks + opportunities (info excluded)
  decide: (f: BlindSpot, status: DecisionStatus) => void;
  reopen: (id: string) => void;
  contribution: (f: BlindSpot) => ReturnType<typeof contributionOf>;
  fixableMonthly: number;            // $/mo freed by findings with a measurable saving
  annualLoss: number;
  annualOpportunity: number;
  history: ScoreSnapshot[];
}

const readJSON = <T,>(k: string, fallback: T): T => {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return v ?? fallback; } catch { return fallback; }
};
// Decisions live in one shared store so every component on the page (the
// Health page, the Next Best Move card, the dashboard) stays in sync.
const EMPTY: Decisions = {};
const listeners = new Set<() => void>();
let decisionsCache: Decisions | null = null;
function getDecisions(): Decisions {
  if (typeof window === "undefined") return EMPTY;
  if (decisionsCache === null) {
    const current = readJSON<Decisions>(DECISIONS_KEY, {});
    // Carry over choices made on the earlier Blind Spots page.
    const legacy = readJSON<Record<string, { status: DecisionStatus; at: string }>>(LEGACY_DECISIONS_KEY, {});
    decisionsCache = { ...Object.fromEntries(Object.entries(legacy).map(([k, v]) => [k, { ...v, title: k }])), ...current };
  }
  return decisionsCache;
}
function setDecisions(next: Decisions) {
  decisionsCache = next;
  try { localStorage.setItem(DECISIONS_KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

const impactLabel = (f: BlindSpot) => (f.impact ? `$${Math.round(f.impact.amount).toLocaleString("en-US")}${f.impact.period === "annual" ? "/yr" : " one-time"}` : null);

export function useFinancialHealth(): FinancialHealthState {
  const { accounts, transactions, loading: dataLoading, hasData } = useFinancialData();
  const { liabilities, loading: debtsLoading } = useLiabilities();
  const loading = dataLoading || (hasData && debtsLoading);
  const { user } = useUser();
  const budgets = useMemo(
    () => ((user?.publicMetadata?.budget as Record<string, number> | undefined) ?? {}),
    [user?.publicMetadata?.budget],
  );

  const decisions = useSyncExternalStore(subscribe, getDecisions, () => EMPTY);
  const [history, setHistory] = useState<ScoreSnapshot[]>([]);
  useEffect(() => { setHistory(readJSON<ScoreSnapshot[]>(HISTORY_KEY, [])); }, []);

  const fi = useMemo(() => analyzeFinances(accounts, transactions, { budgets, debts: liabilities }), [accounts, transactions, budgets, liabilities]);
  const { health, inputs, report } = fi;

  const decide = useCallback((f: BlindSpot, status: DecisionStatus) => {
    setDecisions({ ...getDecisions(), [f.id]: { status, at: new Date().toISOString(), title: f.title, category: f.category, impact: impactLabel(f) } });
  }, []);
  const reopen = useCallback((id: string) => {
    const next = { ...getDecisions() };
    delete next[id];
    setDecisions(next);
  }, []);

  const active = useMemo(() => report.findings.filter((f) => !decisions[f.id]), [report, decisions]);
  const closed = useMemo(
    () => report.findings.filter((f) => decisions[f.id]).map((f) => ({ ...f, decision: decisions[f.id].status, decidedAt: decisions[f.id].at })),
    [report, decisions],
  );
  const resolvedLog = useMemo<ResolvedEntry[]>(() => {
    const present = new Set(report.findings.map((f) => f.id));
    return Object.entries(decisions)
      .map(([id, d]) => ({ id, title: d.title, status: d.status, at: d.at, category: d.category, impact: d.impact, confirmed: !present.has(id) }))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [decisions, report]);

  // One snapshot per day, only when the score is reliable.
  useEffect(() => {
    if (loading || !hasData || health.score == null) return;
    const d = new Date().toISOString().slice(0, 10);
    const snap: ScoreSnapshot = { d, s: health.score, c: Object.fromEntries(health.categories.map((c) => [c.id, c.score])) };
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.d === d && last.s === snap.s && JSON.stringify(last.c) === JSON.stringify(snap.c)) return prev;
      const next = [...prev.filter((x) => x.d !== d), snap].slice(-365);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [loading, hasData, health]);

  const contribution = useCallback((f: BlindSpot) => contributionOf(health, f), [health]);
  const counts = { risk: 0, opportunity: 0, info: 0 } as Record<FindingKind, number>;
  for (const f of active) counts[f.kind]++;

  return {
    loading, hasData, fi, health, inputs, active, closed, resolvedLog, counts,
    meaningful: counts.risk + counts.opportunity,
    decide, reopen, contribution,
    fixableMonthly: active.reduce((s, f) => s + f.monthlySaving, 0),
    annualLoss: active.filter((f) => f.impact?.kind === "loss" && f.impact.period === "annual").reduce((s, f) => s + (f.impact?.amount ?? 0), 0),
    annualOpportunity: active.filter((f) => f.impact?.kind === "saving" && f.impact.period === "annual").reduce((s, f) => s + (f.impact?.amount ?? 0), 0),
    history,
  };
}
