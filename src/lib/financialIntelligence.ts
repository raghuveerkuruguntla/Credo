// ─────────────────────────────────────────────────────────────────────────────
// Credo Financial Intelligence Engine
//
//   Connected data ──▶ [ health scoring + blind-spot detection + forecasting ]
//                          │                         │
//                  Financial Health            Financial Insights
//                  "How am I doing?"           "What am I missing?"
//                          └────────────┬────────────┘
//                              Priority Engine  ──▶  AI Coach
//
// One pass over the user's accounts and transactions. The blind-spot detector
// runs once and hands its measurements (bills due, cost creep, payment
// incidents) to the health score, so nothing is calculated twice and every
// finding can say exactly how it affects the score. Pure: used by the browser
// and by the AI coach's server-side context alike.
// ─────────────────────────────────────────────────────────────────────────────

import { computeHealth, healthInputsFrom, metricCost, healthSummaryText, type HealthScore, type HealthInputs, type HealthCategory } from "@/lib/health";
import { duePayments, monthlyMinimums } from "@/lib/obligations";
import type { DebtObligation } from "@/lib/liabilities";
import { detectBlindSpots, blindSpotsSummaryText, type BlindSpot, type BlindSpotReport, type BSAccount, type BSTxn } from "@/lib/blindspots";

export interface FinancialIntelligence {
  health: HealthScore;
  inputs: HealthInputs;
  report: BlindSpotReport;
}


export function analyzeFinances(
  accounts: BSAccount[],
  txns: BSTxn[],
  opts: { budgets?: Record<string, number>; now?: Date; debts?: DebtObligation[] } = {},
): FinancialIntelligence {
  const now = opts.now ?? new Date();
  const report = detectBlindSpots(accounts, txns, { budgets: opts.budgets, now });
  const inputs: HealthInputs = { ...healthInputsFrom(accounts, txns, now), ...report.metrics };
  // When the bank reports card and loan terms, use the real minimum payments:
  // debt payments are at least the minimums, and payments due in the next 30
  // days count toward the bills cash has to cover.
  if (opts.debts?.length) {
    inputs.monthlyDebtPayments = Math.max(inputs.monthlyDebtPayments, monthlyMinimums(opts.debts));
    const due = duePayments(opts.debts, accounts, 30, now).reduce((s, p) => s + p.amount, 0);
    if (due > 0) inputs.billsNext30 = (inputs.billsNext30 ?? 0) + due;
  }
  return { health: computeHealth(inputs), inputs, report };
}

/**
 * How a finding contributes to the score, from the scoring model itself.
 * Only risks tied to a metric count; opportunities and informational insights
 * never lower the score. Returns null when there's no measurable contribution.
 */
export function contributionOf(health: HealthScore, f: BlindSpot): { category: number; overall: number; text: string } | null {
  if (f.kind !== "risk" || !f.metric) return null;
  const cost = metricCost(health, f.metric);
  if (!cost || cost.category <= 0) return null;
  const cat = health.categories.find((c) => c.id === f.category) as HealthCategory | undefined;
  const mt = cat?.metrics.find((m) => m.id === f.metric);
  return {
    ...cost,
    text: `${mt?.name ?? "This"} (${mt?.display}) currently costs your ${cat?.name ?? "category"} score ${cost.category} points${cost.overall > 0 ? `, about ${cost.overall} of your overall score` : ""}.`,
  };
}

/** Findings grouped under their health category, in priority order. */
export function findingsByCategory(findings: BlindSpot[]): Record<string, BlindSpot[]> {
  const out: Record<string, BlindSpot[]> = {};
  for (const f of findings) (out[f.category] ??= []).push(f);
  return out;
}

/** Everything the AI coach needs to explain the score and the findings. */
export function intelligenceSummaryText(fi: FinancialIntelligence): string {
  const lines = [healthSummaryText(fi.health), "", blindSpotsSummaryText(fi.report.findings)];
  const contribs = fi.report.findings
    .map((f) => ({ f, c: contributionOf(fi.health, f) }))
    .filter((x) => x.c)
    .slice(0, 6);
  if (contribs.length) {
    lines.push("", "WHAT IS LOWERING THE SCORE (from the scoring model):");
    for (const { f, c } of contribs) lines.push(`  - ${f.title}: ${c!.text}`);
  }
  return lines.join("\n");
}
