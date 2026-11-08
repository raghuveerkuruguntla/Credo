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
import { duePayments, monthlyMinimums, cardPaymentHabits } from "@/lib/obligations";
import type { DebtObligation } from "@/lib/liabilities";
import { detectBlindSpots, blindSpotsSummaryText, type BlindSpot, type BlindSpotReport, type BSAccount, type BSTxn } from "@/lib/blindspots";

export interface FinancialIntelligence {
  health: HealthScore;
  inputs: HealthInputs;
  report: BlindSpotReport;
}


/** Typical amounts of loan payments that repeat across at least two months. */
function repeatingLoanPayments(txns: BSTxn[]): number[] {
  const byPayee = new Map<string, BSTxn[]>();
  for (const t of txns) {
    if (t.amount >= 0 || !(t.category ?? "").toUpperCase().startsWith("LOAN_PAYMENTS")) continue;
    const k = t.merchant.toLowerCase().replace(/[^a-z]+/g, " ").trim();
    (byPayee.get(k) ?? byPayee.set(k, []).get(k)!).push(t);
  }
  const out: number[] = [];
  for (const list of byPayee.values()) {
    if (new Set(list.map((t) => t.date.slice(0, 7))).size < 2) continue;
    const amts = list.map((t) => -t.amount).sort((a, b) => a - b);
    out.push(amts[Math.floor(amts.length / 2)]);
  }
  return out;
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
    // Skip payments already counted as a repeating bill (same amount within 5%).
    const repeating = repeatingLoanPayments(txns);
    // Cards the user already pays regularly are in the repeating bills; only
    // add the bank's due payments that aren't.
    const cardIds = new Set(opts.debts.filter((l) => l.kind === "card").map((l) => l.accountId));
    const habits = cardPaymentHabits(txns, cardIds);
    const due = duePayments(opts.debts.filter((l) => !(l.kind === "card" && (habits.get(l.accountId)?.months ?? 0) >= 2)), accounts, 30, now)
      .filter((p) => !repeating.some((v) => Math.abs(v - p.amount) <= p.amount * 0.05))
      .reduce((s, p) => s + p.amount, 0);
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
