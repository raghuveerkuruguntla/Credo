// ─────────────────────────────────────────────────────────────────────────────
// Credo Intelligence Engine
//
// Implements the three-layer intelligence model from spec volume
// `006 — AI Intelligence`:
//
//   Understanding  →  Reasoning  →  Explanation
//
// Raw transactions are never reasoned over directly. They are first turned into
// structured behavioural signal (the Understanding layer), which the Reasoning
// layer consumes to produce insights (C3), recommendations (C5) and goal
// progress (C6). Every object that reaches a user carries an ExplanationPayload
// (source facts + reasoning summary + confidence) — this is enforced as a
// SYSTEM INVARIANT (SR3), not a rendering nicety: an output without a valid
// payload is rejected before it is returned.
//
// The logic here is deterministic and re-computable from the same inputs
// (per SR3 / ADR-001 deterministic-core boundary) — no model calls live here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type LiveAccount,
  type LiveTxn,
  isDebt,
  isInvestment,
  prettyCategory,
  monthlyAverages,
  signedBalance,
} from "@/lib/useFinancialData";

// Versioned so a user's numbers are independently auditable and reproducible
// (SR5 requires goal progress to come from a defined, versioned formula).
export const INTELLIGENCE_VERSION = "1.0.0";

// ── Explanation payload contract (spec 006 → Explanation Layer) ──────────────

export type Confidence = "high" | "medium" | "low";

export interface SourceFact {
  label: string;        // e.g. "Netflix — $15.99 on Jun 10"
  detail?: string;      // optional secondary line
  amount?: number;      // optional monetary value, negative = outflow
  href?: string;        // optional drill-down target
}

/** The minimum contract from `006 — AI Intelligence` → Explanation Layer. */
export interface ExplanationPayload {
  sourceFacts: SourceFact[];  // the transactions/facts the output is based on
  reasoningSummary: string;   // plain-language summary of the logic applied
  confidence: Confidence;     // stated confidence / uncertainty indicator
}

interface Explained {
  explanation: ExplanationPayload;
}

export type InsightTone = "positive" | "warning" | "neutral";

export interface Insight extends Explained {
  id: string;
  kind: "insight";
  tone: InsightTone;
  title: string;
  body: string;
  materiality: number;        // ranking score — insights are ranked, not a feed (C3)
}

export type RecommendationAction =
  | { type: "adjustable"; unit: "$"; amount: number; min: number; max: number; step: number }
  | { type: "simple"; ctaLabel: string };

export interface Recommendation extends Explained {
  id: string;
  kind: "recommendation";
  title: string;              // a specific action ("Move $200 to savings this week")
  body: string;
  impactLabel: string;        // the stated payoff of acting
  category?: string;
  action: RecommendationAction;
  materiality: number;
}

export interface Goal extends Explained {
  id: string;
  title: string;
  current: number;
  target: number;
  /** 0–100, from a versioned, auditable formula (SR5). */
  progress: number;
  unit: "currency" | "percent";
  fromRecommendation?: string; // links a goal back to the rec that produced it (C6)
}

// ── Explanation-layer invariant enforcement ─────────────────────────────────

function validPayload(p: ExplanationPayload | undefined): boolean {
  return (
    !!p &&
    Array.isArray(p.sourceFacts) &&
    p.sourceFacts.length > 0 &&
    typeof p.reasoningSummary === "string" &&
    p.reasoningSummary.trim().length > 0 &&
    (p.confidence === "high" || p.confidence === "medium" || p.confidence === "low")
  );
}

/**
 * The system invariant from spec 006: "An output without a valid explanation
 * payload is rejected before it reaches a user." Anything missing a payload is
 * dropped here rather than rendered unexplained.
 */
export function enforceExplained<T extends Explained>(items: T[]): T[] {
  return items.filter((item) => {
    const ok = validPayload(item.explanation);
    if (!ok && process.env.NODE_ENV !== "production") {
      console.warn("[intelligence] dropped output missing explanation payload", item);
    }
    return ok;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UNDERSTANDING LAYER
// Turn raw transactions into structured behavioural signal.
// ─────────────────────────────────────────────────────────────────────────────

export interface RecurringObligation {
  merchant: string;
  category: string;
  amount: number;             // typical monthly amount (positive = cost)
  occurrences: number;
  months: number;
  sample: LiveTxn[];
}

const money = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const normMerchant = (m: string) => m.trim().toLowerCase().replace(/\s+#?\d+$/, "");

/**
 * Detect recurring obligations (subscriptions, fixed costs) — capability C2.
 * Bounded by occurrences, not a full year of history: a merchant charged in ≥2
 * distinct months with a stable amount qualifies.
 */
export function detectRecurring(transactions: LiveTxn[]): RecurringObligation[] {
  const groups = new Map<string, LiveTxn[]>();
  for (const t of transactions) {
    if (t.amount >= 0) continue; // only outflows are obligations
    const key = normMerchant(t.merchant);
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }

  const out: RecurringObligation[] = [];
  for (const txns of groups.values()) {
    const months = new Set(txns.map((t) => t.date.slice(0, 7)));
    if (months.size < 2) continue; // needs to repeat across months

    const amounts = txns.map((t) => Math.abs(t.amount));
    const med = median(amounts);
    if (med <= 0) continue;

    // Amounts must be reasonably stable to count as a fixed obligation.
    const spread = Math.max(...amounts) - Math.min(...amounts);
    if (spread > Math.max(5, med * 0.25)) continue;

    const sample = [...txns].sort((a, b) => b.date.localeCompare(a.date));
    out.push({
      merchant: sample[0].merchant,
      category: prettyCategory(sample[0].category),
      amount: Math.round(med * 100) / 100,
      occurrences: txns.length,
      months: months.size,
      sample: sample.slice(0, 4),
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

interface CategoryTrend {
  category: string;
  thisMonth: number;
  priorAvg: number;
  deltaPct: number;         // vs prior-month average
  sample: LiveTxn[];
}

/** Per-category spend this month vs the trailing average of prior months. */
function categoryTrends(transactions: LiveTxn[], thisMonth: string): CategoryTrend[] {
  const cur: Record<string, number> = {};
  const priorTotals: Record<string, number> = {};
  const priorMonths = new Set<string>();
  const samples: Record<string, LiveTxn[]> = {};

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const cat = prettyCategory(t.category);
    const amt = Math.abs(t.amount);
    if (t.date.startsWith(thisMonth)) {
      cur[cat] = (cur[cat] ?? 0) + amt;
      (samples[cat] ??= []).push(t);
    } else {
      priorTotals[cat] = (priorTotals[cat] ?? 0) + amt;
      priorMonths.add(t.date.slice(0, 7));
    }
  }

  const nPrior = Math.max(1, priorMonths.size);
  const cats = new Set([...Object.keys(cur), ...Object.keys(priorTotals)]);
  const trends: CategoryTrend[] = [];
  for (const category of cats) {
    const thisM = cur[category] ?? 0;
    const priorAvg = (priorTotals[category] ?? 0) / nPrior;
    const deltaPct = priorAvg > 0 ? ((thisM - priorAvg) / priorAvg) * 100 : 0;
    trends.push({
      category,
      thisMonth: thisM,
      priorAvg,
      deltaPct,
      sample: (samples[category] ?? []).sort((a, b) => a.amount - b.amount).slice(0, 4),
    });
  }
  return trends;
}

export interface UnderstandingModel {
  income: number;             // avg monthly
  expenses: number;           // avg monthly
  byCategory: Record<string, number>;
  months: number;
  recurring: RecurringObligation[];
  trends: CategoryTrend[];
  thisMonth: string;
  cash: number;
  debt: number;
  netWorth: number;
  savingsRate: number;        // this-month net / income, %
}

export function buildUnderstanding(
  accounts: LiveAccount[],
  transactions: LiveTxn[]
): UnderstandingModel {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const avg = monthlyAverages(transactions);

  let mIncome = 0;
  let mSpend = 0;
  for (const t of transactions) {
    if (!t.date.startsWith(thisMonth)) continue;
    if (t.amount > 0) mIncome += t.amount;
    else mSpend += Math.abs(t.amount);
  }
  const savingsRate = mIncome > 0 ? ((mIncome - mSpend) / mIncome) * 100 : 0;

  const cash = accounts
    .filter((a) => !isDebt(a) && !isInvestment(a))
    .reduce((s, a) => s + (a.balance ?? 0), 0);
  const debt = accounts.filter(isDebt).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
  const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);

  return {
    income: avg.income,
    expenses: avg.expenses,
    byCategory: avg.byCategory,
    months: avg.months,
    recurring: detectRecurring(transactions),
    trends: categoryTrends(transactions, thisMonth),
    thisMonth,
    cash,
    debt,
    netWorth,
    savingsRate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REASONING LAYER
// Consume the understanding model → insights (C3) & recommendations (C5).
// Every output is built together with its explanation payload — never bolted on.
// ─────────────────────────────────────────────────────────────────────────────

const txnFact = (t: LiveTxn): SourceFact => ({
  label: `${t.merchant} — ${money(t.amount)}`,
  detail: `${shortDate(t.date)} · ${prettyCategory(t.category)}`,
  amount: t.amount,
  href: "/transactions",
});

const confidenceFromMonths = (months: number): Confidence =>
  months >= 3 ? "high" : months >= 2 ? "medium" : "low";

function buildInsights(m: UnderstandingModel): Insight[] {
  const out: Insight[] = [];

  // Spending trend on the most-changed material category.
  const spike = [...m.trends]
    .filter((t) => t.priorAvg > 20 && t.thisMonth > 0)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
  if (spike && Math.abs(spike.deltaPct) >= 15) {
    const up = spike.deltaPct > 0;
    out.push({
      id: "ins_trend",
      kind: "insight",
      tone: up ? "warning" : "positive",
      title: `${spike.category} spending ${up ? "up" : "down"} ${Math.abs(spike.deltaPct).toFixed(0)}%`,
      body: `You've spent ${money(spike.thisMonth)} on ${spike.category.toLowerCase()} so far this month, versus a ${money(spike.priorAvg)} monthly average.`,
      materiality: Math.abs(spike.thisMonth - spike.priorAvg),
      explanation: {
        sourceFacts: spike.sample.map(txnFact),
        reasoningSummary: `Compared this month's ${spike.category.toLowerCase()} total against the average of the ${Math.max(1, m.months - 1)} prior month(s) in your connected history.`,
        confidence: confidenceFromMonths(m.months),
      },
    });
  }

  // Savings rate.
  if (m.income > 0) {
    const positive = m.savingsRate >= 15;
    out.push({
      id: "ins_savings",
      kind: "insight",
      tone: positive ? "positive" : "warning",
      title: positive
        ? `You're saving ${m.savingsRate.toFixed(0)}% of income`
        : `Savings rate is ${Math.max(0, m.savingsRate).toFixed(0)}%`,
      body: positive
        ? `At this month's pace you're keeping ${m.savingsRate.toFixed(0)}% of what you earn — above the 15% guideline.`
        : `You're keeping ${Math.max(0, m.savingsRate).toFixed(0)}% of income this month. A common target is 15–20%.`,
      materiality: Math.abs(m.income - m.expenses),
      explanation: {
        sourceFacts: [
          { label: `Income this month`, detail: "Sum of inflows", amount: undefined },
          { label: `Spending this month`, detail: "Sum of outflows", amount: undefined },
        ],
        reasoningSummary: `Savings rate = (income − spending) ÷ income for ${m.thisMonth}, from your connected transactions.`,
        confidence: "high",
      },
    });
  }

  // Recurring obligations total.
  if (m.recurring.length > 0) {
    const total = m.recurring.reduce((s, r) => s + r.amount, 0);
    out.push({
      id: "ins_recurring",
      kind: "insight",
      tone: "neutral",
      title: `${m.recurring.length} recurring charge${m.recurring.length > 1 ? "s" : ""} detected`,
      body: `${m.recurring.slice(0, 3).map((r) => r.merchant).join(", ")}${m.recurring.length > 3 ? " and more" : ""} total about ${money(total)}/month.`,
      materiality: total,
      explanation: {
        sourceFacts: m.recurring.slice(0, 4).map((r) => ({
          label: `${r.merchant} — ${money(r.amount)}/mo`,
          detail: `Seen in ${r.months} months · ${r.category}`,
          amount: -r.amount,
          href: "/transactions",
        })),
        reasoningSummary: `Detected merchants charged in ≥2 distinct months with a stable amount (spread within 25% of the median charge).`,
        confidence: confidenceFromMonths(m.months + 1),
      },
    });
  }

  return out.sort((a, b) => b.materiality - a.materiality);
}

function buildRecommendations(m: UnderstandingModel): Recommendation[] {
  const out: Recommendation[] = [];

  // 1. Trim the most-overspent category (a specific, adjustable action — C5).
  const over = [...m.trends]
    .filter((t) => t.priorAvg > 20 && t.thisMonth - t.priorAvg > 15)
    .sort((a, b) => b.thisMonth - b.priorAvg - (a.thisMonth - a.priorAvg))[0];
  if (over) {
    const overspend = Math.round(over.thisMonth - over.priorAvg);
    out.push({
      id: "rec_trim",
      kind: "recommendation",
      title: `Trim ${over.category} by ${money(overspend)} this month`,
      body: `You're pacing ${money(over.thisMonth)} on ${over.category.toLowerCase()}, ${money(overspend)} above your ${money(over.priorAvg)} norm. Pulling it back to your average keeps you on plan.`,
      impactLabel: `Frees up ~${money(overspend)}/mo`,
      category: over.category,
      action: { type: "adjustable", unit: "$", amount: overspend, min: 0, max: Math.max(overspend * 2, over.thisMonth), step: 5 },
      materiality: overspend,
      explanation: {
        sourceFacts: over.sample.map(txnFact),
        reasoningSummary: `Target = this month's ${over.category.toLowerCase()} spend minus your prior-month average. Uncertainty comes from the month being partial.`,
        confidence: confidenceFromMonths(m.months),
      },
    });
  }

  // 2. Review recurring subscriptions (a simple accept/dismiss action — C5).
  const subs = m.recurring.filter(
    (r) => /subscription|entertain|stream|music|news|cloud|member/i.test(r.category) || r.amount <= 40
  );
  if (subs.length >= 2) {
    const total = subs.reduce((s, r) => s + r.amount, 0);
    out.push({
      id: "rec_subs",
      kind: "recommendation",
      title: `Review ${subs.length} subscriptions worth ${money(total)}/mo`,
      body: `Cancelling the ones you no longer use would recover up to ${money(total)} every month — ${money(total * 12)} a year.`,
      impactLabel: `Up to ${money(total * 12)}/yr`,
      action: { type: "simple", ctaLabel: "Review subscriptions" },
      materiality: total * 12,
      explanation: {
        sourceFacts: subs.slice(0, 5).map((r) => ({
          label: `${r.merchant} — ${money(r.amount)}/mo`,
          detail: `${r.months} months · ${r.category}`,
          amount: -r.amount,
          href: "/transactions",
        })),
        reasoningSummary: `Recurring charges classified as discretionary subscriptions, summed to a monthly and annual figure.`,
        confidence: "medium",
      },
    });
  }

  // 3. Grow savings to hit a 20% rate (adjustable — C5, feeds a goal in C6).
  if (m.income > 0 && m.savingsRate < 20) {
    const targetNet = m.income * 0.2;
    const currentNet = m.income - m.expenses;
    const gap = Math.max(0, Math.round(targetNet - currentNet));
    if (gap > 0) {
      out.push({
        id: "rec_savings",
        kind: "recommendation",
        title: `Move ${money(gap)} to savings to reach a 20% rate`,
        body: `You're saving about ${Math.max(0, m.savingsRate).toFixed(0)}% right now. Setting aside ${money(gap)} more each month gets you to 20%.`,
        impactLabel: `${money(gap * 12)} saved per year`,
        action: { type: "adjustable", unit: "$", amount: gap, min: 0, max: Math.max(gap * 2, Math.round(m.income * 0.3)), step: 10 },
        materiality: gap * 12,
        explanation: {
          sourceFacts: [
            { label: `Avg monthly income`, detail: `${m.months}-month average`, amount: m.income },
            { label: `Avg monthly spending`, detail: `${m.months}-month average`, amount: -m.expenses },
          ],
          reasoningSummary: `Gap = 20% of average income − current average monthly net. Based on ${m.months} month(s) of history.`,
          confidence: confidenceFromMonths(m.months),
        },
      });
    }
  }

  // 4. Pay down revolving debt (adjustable — C5).
  if (m.debt > 0) {
    const suggested = Math.min(m.debt, Math.max(50, Math.round((m.income - m.expenses) * 0.5)));
    if (suggested > 0) {
      out.push({
        id: "rec_debt",
        kind: "recommendation",
        title: `Put ${money(suggested)} toward your ${money(m.debt)} balance`,
        body: `Carrying a balance costs interest every month. Directing ${money(suggested)} of your surplus at it shrinks the principal faster.`,
        impactLabel: `Cuts ${money(m.debt)} debt faster`,
        action: { type: "adjustable", unit: "$", amount: suggested, min: 0, max: Math.round(m.debt), step: 25 },
        materiality: suggested,
        explanation: {
          sourceFacts: [
            { label: `Total revolving balance`, detail: "Across credit accounts", amount: -m.debt, href: "/accounts" },
            { label: `Estimated monthly surplus`, detail: "Income − spending", amount: m.income - m.expenses },
          ],
          reasoningSummary: `Suggested payment = half of your estimated monthly surplus, capped at the outstanding balance.`,
          confidence: "medium",
        },
      });
    }
  }

  return out.sort((a, b) => b.materiality - a.materiality);
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL & ACTION TRACKING (C6 / SR5)
// Progress computed from a defined, versioned formula so it's auditable.
// ─────────────────────────────────────────────────────────────────────────────

function buildGoals(m: UnderstandingModel): Goal[] {
  const goals: Goal[] = [];

  // Emergency fund = 3 months of average spending.
  if (m.expenses > 0) {
    const target = Math.round(m.expenses * 3);
    const current = Math.round(m.cash);
    goals.push({
      id: "goal_emergency",
      title: "Emergency fund (3 months of spending)",
      current,
      target,
      progress: Math.min(100, Math.round((current / target) * 100)),
      unit: "currency",
      explanation: {
        sourceFacts: [
          { label: `Cash on hand`, detail: "Checking + savings balances", amount: current, href: "/accounts" },
          { label: `Avg monthly spending`, detail: `${m.months}-month average`, amount: -m.expenses },
        ],
        reasoningSummary: `Formula v${INTELLIGENCE_VERSION}: progress = cash ÷ (3 × average monthly spending), capped at 100%.`,
        confidence: "high",
      },
    });
  }

  // Savings-rate goal of 20%.
  if (m.income > 0) {
    goals.push({
      id: "goal_savings_rate",
      title: "Reach a 20% savings rate",
      current: Math.max(0, Math.round(m.savingsRate)),
      target: 20,
      progress: Math.min(100, Math.round((Math.max(0, m.savingsRate) / 20) * 100)),
      unit: "percent",
      fromRecommendation: "rec_savings",
      explanation: {
        sourceFacts: [
          { label: `This month's savings rate`, detail: "(income − spending) ÷ income", amount: undefined },
        ],
        reasoningSummary: `Formula v${INTELLIGENCE_VERSION}: progress = current savings rate ÷ 20% target, capped at 100%.`,
        confidence: "high",
      },
    });
  }

  return goals;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export interface Intelligence {
  understanding: UnderstandingModel;
  insights: Insight[];
  recommendations: Recommendation[];
  goals: Goal[];
}

export function buildIntelligence(
  accounts: LiveAccount[],
  transactions: LiveTxn[]
): Intelligence {
  const understanding = buildUnderstanding(accounts, transactions);
  return {
    understanding,
    // The Explanation layer gates every output before it is returned (SR3).
    insights: enforceExplained(buildInsights(understanding)),
    recommendations: enforceExplained(buildRecommendations(understanding)),
    goals: enforceExplained(buildGoals(understanding)),
  };
}
