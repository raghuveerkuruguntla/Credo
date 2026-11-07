// ─────────────────────────────────────────────────────────────────────────────
// Credo Financial Health Score  (v2.0.0)
//
// One 0–100 score built from five categories. Each category is the average of
// a few transparent metrics, and each metric is scored 0–100 against a stated
// target with a linear formula shown to the user. The overall score is the
// average of the categories that have enough data.
//
//   Cash Flow & Income Stability   savings rate · income stability · spending trend
//   Debt Management                credit utilization · debt payments vs income
//   Savings & Emergency Prep.      emergency cushion
//   Spending Behavior              discretionary share · recurring cost creep
//   Obligations & Payments         bill coverage · payment incidents
//
// Rules:
//   • Pure arithmetic on connected data. The AI never sets or adjusts scores.
//   • Missing data → the metric is left out, never guessed. Too little data
//     overall → no score is shown, with the reason.
//   • Opportunities and informational findings never lower the score; only
//     the metrics above do. Marking a finding resolved doesn't change the score;
//     the score moves when the underlying data does.
//
// Pure module (no client imports) so the browser and the AI coach's server
// context compute identical numbers.
// ─────────────────────────────────────────────────────────────────────────────

export const HEALTH_VERSION = "2.0.0";

export type CategoryId = "cashflow" | "debt" | "savings" | "spending" | "obligations";
export type MetricId =
  | "savingsRate" | "incomeStability" | "spendingTrend"
  | "utilization" | "dti"
  | "cushion"
  | "discretionaryShare" | "costCreep"
  | "billCoverage" | "paymentIncidents";
export type IndicatorStatus = "strong" | "on-track" | "needs-work";

export interface HealthInputs {
  cash: number;                    // checking + savings balances
  monthlyIncome: number;           // average monthly income
  monthlyExpenses: number;         // average monthly spending (transfers excluded)
  monthlyDebtPayments: number;     // average monthly loan + card payments
  monthlyDiscretionary?: number;   // average monthly dining/entertainment/shopping/personal care/travel
  revolvingBalance: number;        // credit card balances owed
  revolvingLimit: number;          // total card limits (0 = unknown / no cards)
  historyMonths: number;           // distinct calendar months of history
  historyDays?: number;            // days between oldest transaction and today
  incomeWindows?: number[];        // income per 30-day window, newest first
  spendingWindows?: number[];      // spending per 30-day window, newest first
  // From the blind-spot detector (same engine, not recomputed):
  costCreepMonthly?: number;       // $/mo added by recurring price increases
  checkingCash?: number;           // checking balances (for bill coverage)
  billsNext30?: number | null;     // recurring bills expected in the next 30 days; null = none detected
  paymentIncidents?: number;       // overdraft / NSF / late fees, or an overdrawn account
  incomeVariation?: number | null; // paycheck variation from the detector; preferred over windows
}

export interface HealthMetric {
  id: MetricId;
  category: CategoryId;
  name: string;
  value: number;
  display: string;
  points: number;                  // 0–100
  status: IndicatorStatus;
  target: string;
  formula: string;
  meaning: string;
}

export interface HealthCategory {
  id: CategoryId;
  name: string;
  question: string;
  score: number | null;            // null = not enough data
  status: IndicatorStatus | null;
  metrics: HealthMetric[];
  summary: string;                 // one-line explanation in plain language
  missing: string | null;          // why some/all of it couldn't be scored
}

export interface HealthScore {
  score: number | null;            // null when the data is too thin to be reliable
  status: IndicatorStatus | null;
  label: string;
  standing: string;                // brief explanation of the current standing
  insufficient: string | null;     // reason no score is shown
  categories: HealthCategory[];
  weakest: HealthCategory | null;
  strongest: HealthCategory | null;
  indicators: HealthMetric[];      // all scored metrics, flattened
}

export const CATEGORY_META: Record<CategoryId, { name: string; question: string }> = {
  cashflow: { name: "Cash Flow & Income", question: "Does more come in than goes out, reliably?" },
  debt: { name: "Debt Management", question: "Is debt under control and affordable?" },
  savings: { name: "Savings & Emergency Prep", question: "Could you handle a surprise expense or lost income?" },
  spending: { name: "Spending Behavior", question: "Is spending intentional and stable?" },
  obligations: { name: "Obligations & Payments", question: "Are upcoming bills covered and paid on time?" },
};
export const CATEGORY_ORDER: CategoryId[] = ["cashflow", "debt", "savings", "spending", "obligations"];

const clamp01 = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const pct = (n: number) => `${Math.round(n)}%`;
const usd = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

export function statusFor(points: number): IndicatorStatus {
  return points >= 75 ? "strong" : points >= 50 ? "on-track" : "needs-work";
}
export const STATUS_LABEL: Record<IndicatorStatus, string> = { strong: "Strong", "on-track": "On track", "needs-work": "Needs work" };

function metric(m: Omit<HealthMetric, "status" | "points"> & { points: number }): HealthMetric {
  const points = Math.round(Math.max(0, Math.min(100, m.points)));
  return { ...m, points, status: statusFor(points) };
}

/** Coefficient of variation (std ÷ mean) of the windows that have any value. */
function cv(xs: number[]): number | null {
  const v = xs.filter((x) => x > 0);
  if (v.length < 2) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return mean > 0 ? sd / mean : null;
}

export function computeHealth(i: HealthInputs): HealthScore {
  const days = i.historyDays ?? i.historyMonths * 30;
  const m: Record<CategoryId, HealthMetric[]> = { cashflow: [], debt: [], savings: [], spending: [], obligations: [] };
  const missing: Record<CategoryId, string[]> = { cashflow: [], debt: [], savings: [], spending: [], obligations: [] };

  // ── Cash flow & income stability ──
  if (i.monthlyIncome > 0) {
    const rate = ((i.monthlyIncome - i.monthlyExpenses) / i.monthlyIncome) * 100;
    m.cashflow.push(metric({
      id: "savingsRate", category: "cashflow", name: "Savings rate", value: rate, display: pct(Math.max(0, rate)),
      points: clamp01(rate / 20) * 100, target: "20% of income",
      formula: "(Average monthly income − average monthly spending) ÷ income. Full points at 20%, zero at 0% or below.",
      meaning: "How much of each paycheck you keep.",
    }));
  } else missing.cashflow.push("no income deposits detected");

  const fromPaychecks = i.incomeVariation != null;
  const incCv = fromPaychecks ? (i.incomeVariation as number) : i.incomeWindows && days >= 60 ? cv(i.incomeWindows) : null;
  if (incCv != null) {
    m.cashflow.push(metric({
      id: "incomeStability", category: "cashflow", name: "Income stability", value: incCv,
      display: incCv <= 0.1 ? "Steady" : incCv <= 0.25 ? "Mostly steady" : "Variable",
      points: clamp01((0.5 - incCv) / 0.4) * 100, target: "Under 10% month-to-month variation",
      formula: fromPaychecks
        ? `Variation in your regular paycheck amounts, adjusted for how much of your income it makes up (${Math.round(incCv * 100)}%). Full points at 10% or less, zero at 50%.`
        : `Variation of income across 30-day periods (std ÷ average = ${Math.round(incCv * 100)}%). Full points at 10% or less, zero at 50%.`,
      meaning: "Predictable income makes every other plan easier.",
    }));
  } else if (i.monthlyIncome > 0) missing.cashflow.push("income stability needs 60+ days of history");

  const sw = i.spendingWindows ?? [];
  if (days >= 60 && sw.length >= 2 && sw.slice(1).some((x) => x > 0)) {
    const prior = sw.slice(1, 3).filter((x) => x > 0);
    const base = prior.reduce((a, b) => a + b, 0) / prior.length;
    const change = base > 0 ? ((sw[0] - base) / base) * 100 : 0;
    m.cashflow.push(metric({
      id: "spendingTrend", category: "cashflow", name: "Spending trend", value: change,
      display: `${change >= 0 ? "+" : "−"}${Math.abs(Math.round(change))}%`,
      points: clamp01((40 - change) / 40) * 100, target: "Flat or falling",
      formula: `Last 30 days (${usd(sw[0])}) vs the average of the prior period${prior.length > 1 ? "s" : ""} (${usd(base)}). Full points at 0% or lower, zero at +40%.`,
      meaning: "Sudden jumps in spending squeeze cash flow before you notice.",
    }));
  } else missing.cashflow.push("spending trend needs 60+ days of history");

  // ── Debt management ──
  if (i.revolvingLimit > 0) {
    const u = (Math.max(0, i.revolvingBalance) / i.revolvingLimit) * 100;
    m.debt.push(metric({
      id: "utilization", category: "debt", name: "Credit utilization", value: u, display: pct(u),
      points: clamp01((60 - u) / 50) * 100, target: "Under 10% of limits",
      formula: `Card balances (${usd(i.revolvingBalance)}) ÷ total limits (${usd(i.revolvingLimit)}). Full points at 10% or less, zero at 60%.`,
      meaning: "A major input to your credit score. Lower is better.",
    }));
  }
  if (i.monthlyIncome > 0) {
    const d = (Math.max(0, i.monthlyDebtPayments) / i.monthlyIncome) * 100;
    m.debt.push(metric({
      id: "dti", category: "debt", name: "Debt payments vs income", value: d, display: pct(d),
      points: clamp01((50 - d) / 30) * 100, target: "Under 20% of income",
      formula: `Average monthly loan and card payments (${usd(i.monthlyDebtPayments)}) ÷ income (${usd(i.monthlyIncome)}). Full points at 20% or less, zero at 50%.`,
      meaning: "How much of what you earn is already spoken for by debt.",
    }));
  }
  if (!m.debt.length) missing.debt.push("no income or credit cards to measure debt against");

  // ── Savings & emergency preparedness ──
  if (i.monthlyExpenses > 0) {
    const months = Math.max(0, i.cash) / i.monthlyExpenses;
    m.savings.push(metric({
      id: "cushion", category: "savings", name: "Emergency cushion", value: months, display: `${months.toFixed(1)} mo`,
      points: clamp01(months / 6) * 100, target: "6 months of spending",
      formula: `Cash in checking and savings (${usd(i.cash)}) ÷ average monthly spending (${usd(i.monthlyExpenses)}). Full points at 6 months.`,
      meaning: "How long you could cover your normal spending if your income stopped.",
    }));
  } else missing.savings.push("no spending history to measure against");

  // ── Spending behavior ──
  if (i.monthlyIncome > 0 && i.monthlyDiscretionary != null) {
    const share = (i.monthlyDiscretionary / i.monthlyIncome) * 100;
    m.spending.push(metric({
      id: "discretionaryShare", category: "spending", name: "Discretionary spending", value: share, display: `${pct(share)} of income`,
      points: clamp01((60 - share) / 30) * 100, target: "Under 30% of income",
      formula: `Dining, entertainment, shopping, personal care and travel (${usd(i.monthlyDiscretionary)}/mo) ÷ income. Full points at 30% or less, zero at 60%.`,
      meaning: "Wants vs needs: room to save comes from here.",
    }));
  }
  if (i.costCreepMonthly != null && i.monthlyExpenses > 0) {
    const share = (i.costCreepMonthly / i.monthlyExpenses) * 100;
    m.spending.push(metric({
      id: "costCreep", category: "spending", name: "Recurring cost creep", value: i.costCreepMonthly,
      display: i.costCreepMonthly > 0 ? `+${usd(i.costCreepMonthly)}/mo` : "None",
      points: clamp01((5 - share) / 5) * 100, target: "No unexplained price increases",
      formula: `Monthly amount added by recurring bills that went up (${usd(i.costCreepMonthly)}) ÷ monthly spending. Full points at 0%, zero at 5% or more.`,
      meaning: "Bills that quietly rise cost more every month until someone notices.",
    }));
  }
  if (!m.spending.length) missing.spending.push("not enough spending history");

  // ── Obligations & payments ──
  if (i.billsNext30 != null && i.billsNext30 > 0 && i.checkingCash != null) {
    const ratio = Math.max(0, i.checkingCash) / i.billsNext30;
    m.obligations.push(metric({
      id: "billCoverage", category: "obligations", name: "Upcoming bill coverage", value: ratio, display: `${ratio.toFixed(1)}×`,
      points: clamp01((ratio - 0.5) / 1.5) * 100, target: "2× your next 30 days of bills",
      formula: `Checking balance (${usd(i.checkingCash)}) ÷ recurring bills expected in the next 30 days (${usd(i.billsNext30)}). Full points at 2×, zero at 0.5×.`,
      meaning: "Whether the money for bills is already there before they're due.",
    }));
  } else missing.obligations.push("no recurring bills detected yet");
  if (i.paymentIncidents != null && days >= 30) {
    const n = i.paymentIncidents;
    m.obligations.push(metric({
      id: "paymentIncidents", category: "obligations", name: "Payment incidents", value: n, display: n === 0 ? "None" : `${n} in ${Math.round(days)} days`,
      points: n === 0 ? 100 : n === 1 ? 50 : 0, target: "No overdrafts or late fees",
      formula: "Overdraft, insufficient-funds and late fees, plus any overdrawn account, in your history. 0 = full points, 1 = half, 2 or more = zero.",
      meaning: "Each incident costs a fee and can signal cash timing problems.",
    }));
  }

  const categories: HealthCategory[] = CATEGORY_ORDER.map((id) => {
    const ms = m[id];
    const score = ms.length ? Math.round(ms.reduce((s, x) => s + x.points, 0) / ms.length) : null;
    const worst = ms.length ? [...ms].sort((a, b) => a.points - b.points)[0] : null;
    const summary = !ms.length
      ? `Not enough data yet: ${missing[id][0] ?? "nothing to measure"}.`
      : worst && worst.points < 75
        ? `${worst.name} is ${worst.display} (target: ${worst.target.toLowerCase()}).`
        : `${ms.map((x) => `${x.name.toLowerCase()} ${x.display}`).join(", ")}. On target.`;
    return {
      id, ...CATEGORY_META[id], score, status: score == null ? null : statusFor(score), metrics: ms, summary,
      missing: missing[id].length ? missing[id].join("; ") : null,
    };
  });

  const scored = categories.filter((c) => c.score != null);
  const thin = days < 21 ? "Your accounts have less than three weeks of history." : scored.length < 3 ? "We could only measure " + scored.length + " of 5 categories so far." : null;
  const score = thin ? null : Math.round(scored.reduce((s, c) => s + (c.score ?? 0), 0) / scored.length);
  const status = score == null ? null : statusFor(score);
  const weakest = scored.length ? [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] : null;
  const strongest = scored.length ? [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] : null;

  const standing = score == null
    ? `${thin} We'll show a score once there's enough to be reliable.`
    : weakest && strongest && weakest.id !== strongest.id
      ? `${STATUS_LABEL[status!]}. Strongest in ${strongest.name.toLowerCase()}; weakest in ${weakest.name.toLowerCase()}: ${weakest.summary.charAt(0).toLowerCase() + weakest.summary.slice(1)}`
      : `${STATUS_LABEL[status!]} across the areas we can measure.`;

  return {
    score, status, label: status ? STATUS_LABEL[status] : "Not enough data", standing, insufficient: thin,
    categories, weakest, strongest, indicators: categories.flatMap((c) => c.metrics),
  };
}

/** Points a metric currently costs its category, and the overall score. */
export function metricCost(h: HealthScore, id: MetricId): { category: number; overall: number } | null {
  const cat = h.categories.find((c) => c.metrics.some((x) => x.id === id));
  const mt = cat?.metrics.find((x) => x.id === id);
  if (!cat || !mt || cat.score == null) return null;
  const categoryLoss = (100 - mt.points) / cat.metrics.length;
  const n = h.categories.filter((c) => c.score != null).length || 1;
  return { category: Math.round(categoryLoss), overall: h.score == null ? 0 : Math.round(categoryLoss / n) };
}

// ── What-if: the score six months from now under a plan ─────────────────────

export interface HealthPlan { spendLess: number; extraToCards: number; months?: number }
export interface HealthProjection { inputs: HealthInputs; health: HealthScore; cardsPaidOffInMonths: number | null }

/**
 * Simple, explainable model: each month cash grows by (income − spending) and
 * shrinks by the extra card payment; card balances fall by that payment.
 * Spending cuts come out of discretionary spending first. Interest is ignored.
 */
export function projectHealth(base: HealthInputs, plan: HealthPlan): HealthProjection {
  const months = plan.months ?? 6;
  const expenses = Math.max(0, base.monthlyExpenses - plan.spendLess);
  let cash = base.cash, checking = base.checkingCash ?? 0, revolving = base.revolvingBalance;
  let paidOff: number | null = revolving <= 0 ? 0 : null;
  for (let mo = 1; mo <= months; mo++) {
    const pay = Math.min(plan.extraToCards, revolving);
    const net = base.monthlyIncome - expenses - pay;
    cash += net;
    checking += net;
    revolving -= pay;
    if (paidOff === null && revolving <= 0) paidOff = mo;
  }
  const inputs: HealthInputs = {
    ...base,
    cash: Math.max(0, cash),
    checkingCash: base.checkingCash == null ? undefined : Math.max(0, checking),
    monthlyExpenses: expenses,
    monthlyDiscretionary: base.monthlyDiscretionary == null ? undefined : Math.max(0, base.monthlyDiscretionary - plan.spendLess),
    revolvingBalance: Math.max(0, revolving),
    spendingWindows: base.spendingWindows ? [expenses, ...base.spendingWindows.slice(1)] : undefined,
  };
  return { inputs, health: computeHealth(inputs), cardsPaidOffInMonths: paidOff };
}

// ── Base inputs from account + transaction data ─────────────────────────────

export interface HealthAccount { id?: string; type: string; balance: number | null; current: number | null; available: number | null }
export interface HealthTxn { id?: string; accountId?: string; date: string; amount: number; category: string } // amount < 0 = money out

const CARD_TYPES = ["credit", "credit card"];
const DEBT_TYPES = ["credit", "loan", "mortgage", "student", "auto", "line of credit"];
const INVEST_TYPES = ["investment", "brokerage", "401k", "403b", "ira", "roth", "hsa", "retirement", "529", "pension", "mutual fund"];
const DISCRETIONARY = ["FOOD_AND_DRINK", "ENTERTAINMENT", "GENERAL_MERCHANDISE", "PERSONAL_CARE", "TRAVEL"];
const has = (list: string[], t: string) => list.some((x) => (t ?? "").toLowerCase().includes(x));

/**
 * Credit-card payments made from your own checking account move money between
 * your accounts; counting them as spending would double-count the purchases
 * already recorded on the card. A LOAN_PAYMENTS/TRANSFER outflow is treated as
 * internal when a card account receives the same amount within 4 days.
 * Returns the ids of both sides. Shared by the health score and blind spots.
 */
export function internalTransferIds(accounts: HealthAccount[], txns: HealthTxn[]): Set<string> {
  const cardIds = new Set(accounts.filter((a) => a.id && has(CARD_TYPES, a.type) && !has(["line of credit"], a.type)).map((a) => a.id as string));
  const out = new Set<string>();
  if (!cardIds.size) return out;
  const cardIn = txns.filter((t) => t.id && t.accountId && cardIds.has(t.accountId) && t.amount > 0);
  const used = new Set<string>();
  for (const t of txns) {
    if (!t.id || t.amount >= 0 || (t.accountId && cardIds.has(t.accountId))) continue;
    const c = (t.category ?? "").toUpperCase();
    if (!c.startsWith("LOAN_PAYMENTS") && !c.startsWith("TRANSFER")) continue;
    const day = new Date(t.date + "T00:00:00").getTime();
    const match = cardIn.find((p) => !used.has(p.id as string) && Math.abs(p.amount + t.amount) < 0.01 &&
      Math.abs(new Date(p.date + "T00:00:00").getTime() - day) <= 4 * 86400000);
    if (match) { used.add(match.id as string); out.add(match.id as string); out.add(t.id); }
  }
  // Payments received on a card account are never income, matched or not.
  for (const p of cardIn) out.add(p.id as string);
  return out;
}

export function healthInputsFrom(accounts: HealthAccount[], txns: HealthTxn[], now: Date = new Date()): HealthInputs {
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
  const oldest = txns.reduce((o, t) => (t.date < o ? t.date : o), now.toISOString().slice(0, 10));
  const historyDays = txns.length ? Math.max(1, (now.getTime() - new Date(oldest + "T00:00:00").getTime()) / 86400000) : 0;
  const months = Math.max(1, historyDays / 30.4);

  const internal = internalTransferIds(accounts, txns);
  let income = 0, expenses = 0, debtPay = 0, disc = 0;
  const incW = [0, 0, 0], spW = [0, 0, 0];
  for (const t of txns) {
    if (t.id && internal.has(t.id)) continue;
    const c = (t.category ?? "").toUpperCase();
    const age = (now.getTime() - new Date(t.date + "T00:00:00").getTime()) / 86400000;
    const w = age >= 0 && age < 90 ? Math.floor(age / 30) : -1;
    if (t.amount > 0) {
      // Income: paychecks and other non-transfer deposits (refunds included); never loan/card payments.
      if (!c.startsWith("TRANSFER") && !c.startsWith("LOAN_PAYMENTS")) { income += t.amount; if (w >= 0 && c === "INCOME") incW[w] += t.amount; }
    } else if (!c.startsWith("TRANSFER")) {
      expenses += -t.amount;
      if (w >= 0) spW[w] += -t.amount;
      if (c.startsWith("LOAN_PAYMENTS")) debtPay += -t.amount;
      if (DISCRETIONARY.includes(c)) disc += -t.amount;
    }
  }

  return {
    cash,
    monthlyIncome: income / months,
    monthlyExpenses: expenses / months,
    monthlyDebtPayments: debtPay / months,
    monthlyDiscretionary: disc / months,
    revolvingBalance,
    revolvingLimit,
    historyMonths: txns.length ? monthSet.size : 0,
    historyDays,
    incomeWindows: incW,
    spendingWindows: spW,
  };
}

/** Plain-text summary (with methodology) for the AI coach's context. */
export function healthSummaryText(h: HealthScore): string {
  const lines = [`FINANCIAL HEALTH SCORE (Credo formula v${HEALTH_VERSION}; pure arithmetic on connected data; overall = average of category scores; each category = average of its metrics, each metric scored 0–100 against a stated target):`];
  if (h.score == null) lines.push(`  No reliable overall score yet: ${h.insufficient}`);
  else lines.push(`  Overall: ${h.score}/100 (${h.label}). ${h.standing}`);
  for (const c of h.categories) {
    lines.push(`  ${c.name}: ${c.score == null ? `not scored (${c.missing})` : `${c.score}/100 (${STATUS_LABEL[c.status!]})`}`);
    for (const x of c.metrics) lines.push(`    - ${x.name}: ${x.display} → ${x.points}/100 (target ${x.target}). Formula: ${x.formula}`);
  }
  if (h.weakest) lines.push(`  Weakest category: ${h.weakest.name}. Improving it raises the overall score fastest.`);
  lines.push("  Note: opportunities and informational insights never lower the score; marking a finding resolved does not change the score until the underlying data changes.");
  return lines.join("\n");
}
