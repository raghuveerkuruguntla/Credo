// ─────────────────────────────────────────────────────────────────────────────
// Credo Financial Health Score
//
// A 0–100 score built from four indicators, each scored 0–100 against a stated
// target and averaged. Indicators with no data (e.g. no credit cards) are left
// out of the average rather than guessed.
//
// Kept free of client-only imports so it can run both in the browser (Health
// page) and on the server (AI assistant context). Deterministic and versioned,
// like the intelligence engine: the same inputs always give the same score.
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_VERSION = "1.0.0";

export interface HealthInputs {
  cash: number;               // checking + savings balances
  monthlyIncome: number;      // average monthly inflows
  monthlyExpenses: number;    // average monthly outflows
  monthlyDebtPayments: number;// average monthly loan + card payments
  revolvingBalance: number;   // credit card balances owed
  revolvingLimit: number;     // total credit card limits (0 = unknown / none)
  historyMonths: number;      // months of history the averages come from
}

export type IndicatorId = "cushion" | "dti" | "utilization" | "savingsRate";
export type IndicatorStatus = "strong" | "on-track" | "needs-work";

export interface HealthIndicator {
  id: IndicatorId;
  name: string;
  value: number;              // raw value (months or %)
  display: string;            // formatted value
  points: number;             // 0–100
  status: IndicatorStatus;
  target: string;
  formula: string;            // how it is computed, in plain language
  meaning: string;            // why it matters
}

export interface HealthScore {
  score: number;              // 0–100, average of available indicators
  status: IndicatorStatus;
  label: string;
  indicators: HealthIndicator[];
  weakest: HealthIndicator | null;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

export function statusFor(points: number): IndicatorStatus {
  return points >= 75 ? "strong" : points >= 50 ? "on-track" : "needs-work";
}

export const STATUS_LABEL: Record<IndicatorStatus, string> = {
  strong: "Strong",
  "on-track": "On track",
  "needs-work": "Needs work",
};

/** Score each indicator against its target. Linear between the stated bounds. */
export function computeHealth(i: HealthInputs): HealthScore {
  const out: HealthIndicator[] = [];

  if (i.monthlyExpenses > 0) {
    const months = Math.max(0, i.cash) / i.monthlyExpenses;
    const points = Math.round(clamp01(months / 6) * 100);
    out.push({
      id: "cushion",
      name: "Emergency cushion",
      value: months,
      display: `${months.toFixed(1)} mo`,
      points,
      status: statusFor(points),
      target: "6 months of spending",
      formula: "Cash in checking and savings ÷ average monthly spending. Full points at 6 months.",
      meaning: "How long you could cover your normal spending if your income stopped.",
    });
  }

  if (i.monthlyIncome > 0) {
    const pct = (Math.max(0, i.monthlyDebtPayments) / i.monthlyIncome) * 100;
    const points = Math.round(clamp01((50 - pct) / 30) * 100);
    out.push({
      id: "dti",
      name: "Debt payments",
      value: pct,
      display: `${pct.toFixed(0)}%`,
      points,
      status: statusFor(points),
      target: "Under 20% of income",
      formula: "Average monthly loan and card payments ÷ average monthly income. Full points at 20% or less, zero at 50%.",
      meaning: "How much of what you earn is already spoken for by debt.",
    });
  }

  if (i.revolvingLimit > 0) {
    const pct = (Math.max(0, i.revolvingBalance) / i.revolvingLimit) * 100;
    const points = Math.round(clamp01((60 - pct) / 50) * 100);
    out.push({
      id: "utilization",
      name: "Credit utilization",
      value: pct,
      display: `${pct.toFixed(0)}%`,
      points,
      status: statusFor(points),
      target: "Under 10% of limits",
      formula: "Credit card balances ÷ total credit card limits. Full points at 10% or less, zero at 60%.",
      meaning: "A major input to your credit score. Lower is better.",
    });
  }

  if (i.monthlyIncome > 0) {
    const pct = ((i.monthlyIncome - i.monthlyExpenses) / i.monthlyIncome) * 100;
    const points = Math.round(clamp01(pct / 20) * 100);
    out.push({
      id: "savingsRate",
      name: "Savings rate",
      value: pct,
      display: `${Math.max(0, pct).toFixed(0)}%`,
      points,
      status: statusFor(points),
      target: "20% of income",
      formula: "(Average monthly income − average monthly spending) ÷ income. Full points at 20%.",
      meaning: "How much of each paycheck you keep for your future self.",
    });
  }

  const score = out.length ? Math.round(out.reduce((s, x) => s + x.points, 0) / out.length) : 0;
  const status = statusFor(score);
  const weakest = out.length ? [...out].sort((a, b) => a.points - b.points)[0] : null;
  return { score, status, label: STATUS_LABEL[status], indicators: out, weakest };
}

// ── What-if: the score six months from now under a plan ─────────────────────

export interface HealthPlan {
  spendLess: number;          // $/mo cut from spending
  extraToCards: number;       // $/mo sent to card balances
  months?: number;            // horizon, default 6
}

export interface HealthProjection {
  inputs: HealthInputs;
  health: HealthScore;
  cardsPaidOffInMonths: number | null; // null = not within the horizon
}

/**
 * Simple, explainable model: each month cash grows by (income − spending) and
 * shrinks by the extra card payment; card balances fall by that payment.
 * Interest is ignored, so payoff times are slightly optimistic.
 */
export function projectHealth(base: HealthInputs, plan: HealthPlan): HealthProjection {
  const months = plan.months ?? 6;
  const expenses = Math.max(0, base.monthlyExpenses - plan.spendLess);
  let cash = base.cash;
  let revolving = base.revolvingBalance;
  let paidOff: number | null = revolving <= 0 ? 0 : null;
  for (let m = 1; m <= months; m++) {
    const pay = Math.min(plan.extraToCards, revolving);
    cash += base.monthlyIncome - expenses - pay;
    revolving -= pay;
    if (paidOff === null && revolving <= 0) paidOff = m;
  }
  const inputs: HealthInputs = {
    ...base,
    cash: Math.max(0, cash),
    monthlyExpenses: expenses,
    revolvingBalance: Math.max(0, revolving),
  };
  return { inputs, health: computeHealth(inputs), cardsPaidOffInMonths: paidOff };
}

// ── Building inputs from account + transaction data ─────────────────────────

export interface HealthAccount { type: string; balance: number | null; current: number | null; available: number | null }
export interface HealthTxn { date: string; amount: number; category: string } // amount < 0 = money out

const CARD_TYPES = ["credit", "credit card"];
const DEBT_TYPES = ["credit", "loan", "mortgage", "student", "auto", "line of credit"];
const INVEST_TYPES = ["investment", "brokerage", "401k", "403b", "ira", "roth", "hsa", "retirement", "529", "pension", "mutual fund"];

const has = (list: string[], t: string) => list.some((x) => (t ?? "").toLowerCase().includes(x));

export function healthInputsFrom(accounts: HealthAccount[], txns: HealthTxn[]): HealthInputs {
  const cash = accounts
    .filter((a) => !has(DEBT_TYPES, a.type) && !has(INVEST_TYPES, a.type))
    .reduce((s, a) => s + (a.balance ?? 0), 0);

  // Card limit ≈ balance owed + available credit (Plaid's "available" on a card).
  let revolvingBalance = 0, revolvingLimit = 0;
  for (const a of accounts.filter((x) => has(CARD_TYPES, x.type))) {
    const owed = Math.abs(a.current ?? a.balance ?? 0);
    revolvingBalance += owed;
    if (a.available != null) revolvingLimit += owed + Math.max(0, a.available);
  }

  const monthSet = new Set(txns.map((t) => t.date.slice(0, 7)));
  const months = Math.max(1, monthSet.size);
  let income = 0, expenses = 0, debtPay = 0;
  for (const t of txns) {
    if (t.amount > 0) income += t.amount;
    else {
      expenses += -t.amount;
      if ((t.category ?? "").toUpperCase().startsWith("LOAN_PAYMENTS")) debtPay += -t.amount;
    }
  }

  return {
    cash,
    monthlyIncome: income / months,
    monthlyExpenses: expenses / months,
    monthlyDebtPayments: debtPay / months,
    revolvingBalance,
    revolvingLimit,
    historyMonths: txns.length ? monthSet.size : 0,
  };
}

/** Plain-text summary for the AI assistant's context. */
export function healthSummaryText(h: HealthScore): string {
  if (!h.indicators.length) return "";
  const lines = [
    `FINANCIAL HEALTH SCORE (Credo formula v${HEALTH_VERSION}): ${h.score}/100 — ${h.label}`,
    ...h.indicators.map((x) => `  - ${x.name}: ${x.display} → ${x.points}/100 (${STATUS_LABEL[x.status]}; target ${x.target}). ${x.formula}`),
  ];
  if (h.weakest) lines.push(`  Weakest indicator: ${h.weakest.name}. Improving it raises the score fastest.`);
  return lines.join("\n");
}
