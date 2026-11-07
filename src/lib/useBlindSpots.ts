"use client";

// Client hook that ties the Blind Spot Detector to the rest of Credo: the same
// connected-account data (useFinancialData), the user's budgets (Clerk profile),
// their resolve/dismiss decisions (this browser), and the Financial Health
// Score — unresolved blind spots lower it, resolving them raises it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useFinancialData } from "@/lib/useFinancialData";
import { computeHealth, healthInputsFrom, projectHealth, type HealthScore, type HealthInputs } from "@/lib/health";
import {
  detectBlindSpots, blindSpotScore, healthPenalty,
  type BlindSpot, type BlindSpotReport,
} from "@/lib/blindspots";

const KEY = "credo.blindspots.decisions.v1";

export type DecisionStatus = "resolved" | "dismissed";
export type Decisions = Record<string, { status: DecisionStatus; at: string }>;

export interface BlindSpotsState {
  loading: boolean;
  hasData: boolean;
  report: BlindSpotReport;
  active: BlindSpot[];                 // not resolved or dismissed, priority order
  closed: (BlindSpot & { decision: DecisionStatus; decidedAt: string })[];
  decide: (id: string, status: DecisionStatus) => void;
  reopen: (id: string) => void;
  score: number;                       // blind-spot score, 100 = clear
  penalty: number;                     // points off the health score
  baseHealth: HealthScore;             // four indicators only
  healthScore: number;                 // base − penalty, what the user sees
  healthInputs: HealthInputs;
  /** Estimated health-score points regained by resolving this finding. */
  gainFor: (f: BlindSpot) => number;
  /** Monthly $ freed up if every active finding with a measurable saving is fixed. */
  fixableMonthly: number;
  annualLoss: number;                  // money leaking each year (active, annual)
  annualOpportunity: number;           // money that could be gained each year
}

export function useBlindSpots(): BlindSpotsState {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const { user } = useUser();
  const budgets = useMemo(
    () => ((user?.publicMetadata?.budget as Record<string, number> | undefined) ?? {}),
    [user?.publicMetadata?.budget],
  );

  const [decisions, setDecisions] = useState<Decisions>({});
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (d && typeof d === "object") setDecisions(d);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);
  const persist = useCallback((next: Decisions) => {
    setDecisions(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);
  const decide = useCallback((id: string, status: DecisionStatus) => {
    persist({ ...decisions, [id]: { status, at: new Date().toISOString() } });
  }, [decisions, persist]);
  const reopen = useCallback((id: string) => {
    const next = { ...decisions };
    delete next[id];
    persist(next);
  }, [decisions, persist]);

  const report = useMemo(() => detectBlindSpots(accounts, transactions, { budgets }), [accounts, transactions, budgets]);
  const active = useMemo(() => report.findings.filter((f) => !decisions[f.id]), [report, decisions]);
  const closed = useMemo(
    () => report.findings.filter((f) => decisions[f.id]).map((f) => ({ ...f, decision: decisions[f.id].status, decidedAt: decisions[f.id].at })),
    [report, decisions],
  );

  const healthInputs = useMemo(() => healthInputsFrom(accounts, transactions), [accounts, transactions]);
  const baseHealth = useMemo(() => computeHealth(healthInputs), [healthInputs]);
  const penalty = healthPenalty(active);
  const healthScore = Math.max(0, baseHealth.score - penalty);

  const gainFor = useCallback((f: BlindSpot) => {
    const without = active.filter((x) => x.id !== f.id);
    const penaltyGain = penalty - healthPenalty(without);
    let behaviourGain = 0;
    if (f.monthlySaving > 0) {
      const base = projectHealth(healthInputs, { spendLess: 0, extraToCards: 0 }).health.score;
      const fixed = projectHealth(healthInputs, { spendLess: f.monthlySaving, extraToCards: 0 }).health.score;
      behaviourGain = Math.max(0, fixed - base);
    }
    return penaltyGain + behaviourGain;
  }, [active, penalty, healthInputs]);

  const fixableMonthly = active.reduce((s, f) => s + f.monthlySaving, 0);
  const annualLoss = active.filter((f) => f.impact?.kind === "loss" && f.impact.period === "annual").reduce((s, f) => s + (f.impact?.amount ?? 0), 0);
  const annualOpportunity = active.filter((f) => f.impact?.kind === "saving" && f.impact.period === "annual").reduce((s, f) => s + (f.impact?.amount ?? 0), 0);

  return {
    loading, hasData, report, active, closed, decide, reopen,
    score: blindSpotScore(active), penalty, baseHealth, healthScore, healthInputs,
    gainFor, fixableMonthly, annualLoss, annualOpportunity,
  };
}
