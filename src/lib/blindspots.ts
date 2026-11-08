// ─────────────────────────────────────────────────────────────────────────────
// Credo Financial Blind Spot Detector  (v1.0.0)
//
// Finds money problems people don't notice: hidden spending, risks, missed
// opportunities and behaviour patterns. Every finding:
//   • comes from the user's own accounts/transactions, with the arithmetic shown
//   • says how sure we are: "verified" (it's in the data), "likely" (a strong
//     pattern or a projection) or "possible" (worth checking; we can't confirm)
//   • carries an explanation payload, like every other intelligence output
//
// Deliberately conservative to avoid false positives:
//   • duplicates need same account + same day + same merchant + same exact
//     amount, both posted (not pending), and exclude transfers/loan payments
//   • subscriptions are never called "unused"; we only see charges, not usage
//
// Server-safe: only *type* imports from client modules, so the AI coach's
// server-side context can run the same detector.
// ─────────────────────────────────────────────────────────────────────────────

import type { LiveAccount, LiveTxn } from "@/lib/useFinancialData";
import type { ExplanationPayload, SourceFact } from "@/lib/intelligence";
import type { CategoryId, MetricId } from "@/lib/health";
import { internalTransferIds } from "@/lib/health";

export const BLINDSPOT_VERSION = "1.0.0";

/** Stated assumption for the idle-cash opportunity. Shown to the user. */
export const ASSUMED_HYSA_APY = 0.04;

export type BSAccount = Pick<LiveAccount, "id" | "name" | "type" | "balance" | "current" | "available"> & { mask?: string | null };
export type BSTxn = Pick<LiveTxn, "id" | "accountId" | "date" | "merchant" | "amount" | "category" | "pending">;

export type BlindSpotGroup = "hidden-spending" | "risk" | "opportunity" | "behavior";
export type Severity = "critical" | "attention" | "opportunity";
export type Certainty = "verified" | "likely" | "possible";
export type Ease = "easy" | "medium" | "hard";
export type FindingKind = "risk" | "opportunity" | "info";

export interface Impact {
  amount: number;                 // dollars, always positive
  period: "annual" | "one-time";
  kind: "loss" | "saving";        // money you're losing vs money you could gain
}

export interface BlindSpot {
  id: string;                     // stable across visits (used for resolve/dismiss)
  group: BlindSpotGroup;
  severity: Severity;
  certainty: Certainty;
  title: string;
  summary: string;                // plain-language, with the user's numbers
  consequence: string;            // what happens if nothing changes
  impact: Impact | null;
  monthlySaving: number;          // $/mo freed up if fixed (feeds what-if); 0 if none
  actions: string[];              // specific steps; none move money automatically
  ease: Ease;
  urgencyDays: number | null;     // days until the consequence lands, if known
  category: CategoryId;           // health category this finding belongs to
  kind: FindingKind;              // risk (can lower the score) / opportunity / informational
  metric: MetricId | null;        // the score metric this finding explains, if any
  links: { href: string; label: string }[];
  explanation: ExplanationPayload;
  priority: number;               // higher = address sooner
  priorityReason: string;         // why it ranks where it does
}

export interface BlindSpotMetrics {
  costCreepMonthly: number;       // $/mo added by recurring price increases
  checkingCash: number;           // checking balances
  billsNext30: number | null;     // recurring bills expected in the next 30 days
  paymentIncidents: number;       // overdraft/NSF/late fees + overdrawn accounts
  incomeVariation: number | null; // variation (std ÷ mean) of the regular paycheck; null if none detected
}

export interface BlindSpotReport {
  findings: BlindSpot[];          // sorted by priority, highest first
  historyDays: number;
  txnCount: number;
  metrics: BlindSpotMetrics;      // handed to the health score (computed once, here)
  cannotCheck: { title: string; detail: string }[];
}

// ── helpers ─────────────────────────────────────────────────────────────────

const DAY = 86_400_000;
const money = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 });
const whole = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
const pretty = (c: string) => (c || "Other").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
const norm = (m: string) => (m ?? "").trim().toLowerCase().replace(/\s+#?\d+$/, "");
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const has = (list: string[], t: string) => list.some((x) => (t ?? "").toLowerCase().includes(x));

const DEBT_TYPES = ["credit", "loan", "mortgage", "student", "auto", "line of credit"];
const CARD_TYPES = ["credit"];
const INVEST_TYPES = ["investment", "brokerage", "401k", "403b", "ira", "roth", "hsa", "retirement", "529", "pension", "mutual fund"];
const isCard = (a: BSAccount) => has(CARD_TYPES, a.type) && !has(["line of credit"], a.type);
const isCash = (a: BSAccount) => !has(DEBT_TYPES, a.type) && !has(INVEST_TYPES, a.type);
const isChecking = (a: BSAccount) => has(["checking"], a.type);

const NOT_SPENDING = ["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS", "INCOME", "BANK_FEES"];
const DISCRETIONARY = ["FOOD_AND_DRINK", "ENTERTAINMENT", "GENERAL_MERCHANDISE", "PERSONAL_CARE", "TRAVEL"];
const SUBSCRIPTION_CATS = ["ENTERTAINMENT", "GENERAL_SERVICES", "GENERAL_MERCHANDISE", "PERSONAL_CARE"];
const BILL_CATS = ["RENT_AND_UTILITIES", "GENERAL_SERVICES"];
const cat = (t: BSTxn) => (t.category ?? "").toUpperCase();

const txnFact = (t: BSTxn): SourceFact => ({
  label: `${t.merchant} — ${money(t.amount)}`,
  detail: `${shortDate(t.date)} · ${pretty(t.category)}`,
  amount: t.amount,
  href: "/transactions",
});

// ── shared understanding ────────────────────────────────────────────────────

interface Series { key: string; merchant: string; category: string; txns: BSTxn[]; months: string[] }

/** Outflows grouped by merchant, oldest first. */
function merchantSeries(txns: BSTxn[]): Series[] {
  const g = new Map<string, BSTxn[]>();
  for (const t of txns) {
    if (t.amount >= 0 || t.pending) continue;
    const k = norm(t.merchant);
    if (!k) continue;
    (g.get(k) ?? g.set(k, []).get(k)!).push(t);
  }
  return [...g.entries()].map(([key, ts]) => {
    const sorted = ts.sort((a, b) => a.date.localeCompare(b.date));
    return {
      key,
      merchant: sorted[sorted.length - 1].merchant,
      category: cat(sorted[sorted.length - 1]),
      txns: sorted,
      months: [...new Set(sorted.map((t) => t.date.slice(0, 7)))],
    };
  });
}

/** Monthly charges: exactly one charge in each of ≥ minMonths distinct months. */
function monthlyCharges(s: Series, minMonths: number): BSTxn[] | null {
  if (s.months.length < minMonths) return null;
  const perMonth = new Map<string, BSTxn[]>();
  for (const t of s.txns) (perMonth.get(t.date.slice(0, 7)) ?? perMonth.set(t.date.slice(0, 7), []).get(t.date.slice(0, 7))!).push(t);
  if ([...perMonth.values()].some((x) => x.length !== 1)) return null;
  return s.txns;
}

/** A merchant charged monthly at a stable amount (≤ 15% spread). */
function stableRecurring(s: Series): { amount: number } | null {
  const m = monthlyCharges(s, 2);
  if (!m) return null;
  const amts = m.map((t) => Math.abs(t.amount));
  const med = median(amts);
  if (med <= 0 || Math.max(...amts) - Math.min(...amts) > Math.max(1, med * 0.15)) return null;
  return { amount: med };
}

interface Ctx {
  now: Date;
  accounts: BSAccount[];
  txns: BSTxn[];                 // posted + pending
  posted: BSTxn[];
  historyDays: number;
  series: Series[];
  cash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  income: { source: string; dates: string[]; amounts: number[]; share: number } | null;
  nextPayday: Date | null;
  payInterval: number | null;    // days
  budgets: Record<string, number>;
}

const daysAgo = (ctx: Ctx, d: string) => (ctx.now.getTime() - new Date(d + "T00:00:00").getTime()) / DAY;
const inWindow = (ctx: Ctx, t: BSTxn, k: number) => { const a = daysAgo(ctx, t.date); return a >= 30 * k && a < 30 * (k + 1); };

function buildCtx(accounts: BSAccount[], txns: BSTxn[], budgets: Record<string, number>, now: Date): Ctx {
  const posted = txns.filter((t) => !t.pending);
  const oldest = txns.reduce((m, t) => (t.date < m ? t.date : m), now.toISOString().slice(0, 10));
  const historyDays = Math.max(1, Math.round((now.getTime() - new Date(oldest + "T00:00:00").getTime()) / DAY));
  const months = Math.max(1, historyDays / 30.4);

  const internal = internalTransferIds(accounts, txns);
  let inc = 0, exp = 0;
  for (const t of posted) {
    if (internal.has(t.id)) continue;
    const c = cat(t);
    if (t.amount > 0 && c === "INCOME") inc += t.amount;
    if (t.amount < 0 && !c.startsWith("TRANSFER")) exp += -t.amount; // same definition as the health score
  }

  // Income sources: INCOME-category deposits grouped by payer.
  const bySource = new Map<string, BSTxn[]>();
  for (const t of posted) if (t.amount > 0 && cat(t) === "INCOME") (bySource.get(norm(t.merchant)) ?? bySource.set(norm(t.merchant), []).get(norm(t.merchant))!).push(t);
  let income: Ctx["income"] = null, nextPayday: Date | null = null, payInterval: number | null = null;
  if (bySource.size) {
    const total = [...bySource.values()].flat().reduce((s, t) => s + t.amount, 0);
    const [, top] = [...bySource.entries()].sort((a, b) => b[1].reduce((s, t) => s + t.amount, 0) - a[1].reduce((s, t) => s + t.amount, 0))[0];
    const dates = top.map((t) => t.date).sort();
    income = { source: top[top.length - 1].merchant, dates, amounts: top.map((t) => t.amount), share: top.reduce((s, t) => s + t.amount, 0) / total };
    if (dates.length >= 2) {
      const gaps = dates.slice(1).map((d, i) => (new Date(d).getTime() - new Date(dates[i]).getTime()) / DAY);
      payInterval = Math.round(median(gaps));
      if (payInterval >= 6 && payInterval <= 35) {
        let next = new Date(new Date(dates[dates.length - 1] + "T00:00:00").getTime() + payInterval * DAY);
        while (next < now) next = new Date(next.getTime() + payInterval * DAY);
        nextPayday = next;
      } else payInterval = null;
    }
  }

  return {
    now, accounts, txns, posted, historyDays,
    series: merchantSeries(txns),
    cash: accounts.filter(isCash).reduce((s, a) => s + (a.balance ?? 0), 0),
    monthlyIncome: inc / months,
    monthlyExpenses: exp / months,
    income, nextPayday, payInterval, budgets,
  };
}

type Draft = Omit<BlindSpot, "priority" | "priorityReason" | "category" | "kind" | "metric">;

// ─────────────────────────────────────────────────────────────────────────────
// A. HIDDEN SPENDING
// ─────────────────────────────────────────────────────────────────────────────

function duplicates(ctx: Ctx): Draft[] {
  const groups = new Map<string, BSTxn[]>();
  for (const t of ctx.posted) {
    if (t.amount > -10) continue;
    if (["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS", "INCOME"].includes(cat(t))) continue;
    if (daysAgo(ctx, t.date) > 60) continue; // disputes are usually time-limited
    const k = `${t.accountId}|${t.date}|${norm(t.merchant)}|${Math.round(t.amount * 100)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
  }
  return [...groups.entries()]
    .filter(([, ts]) => ts.length >= 2 && new Set(ts.map((t) => t.id)).size === ts.length)
    .sort((a, b) => b[1][0].date.localeCompare(a[1][0].date))
    .slice(0, 3)
    .map(([k, ts]) => {
      const t = ts[0];
      const extra = Math.abs(t.amount) * (ts.length - 1);
      const acct = ctx.accounts.find((a) => a.id === t.accountId);
      return {
        id: `dup:${k}`,
        group: "hidden-spending",
        severity: "attention",
        certainty: "likely",
        title: `Possible double charge at ${t.merchant}`,
        summary: `${t.merchant} charged ${acct?.name ?? "your account"} ${ts.length} times for exactly ${money(Math.abs(t.amount))} on ${shortDate(t.date)}. If only one was intended, you were overcharged ${money(extra)}.`,
        consequence: "Card disputes usually have a deadline (often 60 days from the statement), so an accidental charge can become permanent.",
        impact: { amount: extra, period: "one-time", kind: "loss" },
        monthlySaving: 0,
        actions: [
          "Check your receipts or order history. Two identical charges can be legitimate, like two separate orders.",
          `If it was a mistake, ask ${t.merchant} for a refund of ${money(extra)}.`,
          "If they won't refund it, dispute the extra charge with your bank or card issuer.",
        ],
        ease: "easy",
        urgencyDays: Math.max(0, 60 - Math.round(daysAgo(ctx, t.date))),
        links: [{ href: "/transactions", label: "View transactions" }],
        explanation: {
          sourceFacts: ts.map(txnFact),
          reasoningSummary: `Rule v${BLINDSPOT_VERSION}: flagged only when the same account was charged by the same merchant for the exact same amount on the same day, and both charges have posted. Transfers and loan payments are excluded.`,
          confidence: "medium",
        },
      };
    });
}

function priceIncreases(ctx: Ctx): Draft[] {
  const out: Draft[] = [];
  for (const s of ctx.series) {
    if (NOT_SPENDING.includes(s.category)) continue;
    const m = monthlyCharges(s, 3);
    if (!m) continue;
    const amts = m.map((t) => Math.abs(t.amount));
    const first = amts[0], last = amts[amts.length - 1], prev = amts[amts.length - 2];
    const rise = last - first;
    const nonDecreasing = amts.every((a, i) => i === 0 || a >= amts[i - 1] - 0.01);
    if (!nonDecreasing || rise < 2 || last < first * 1.05 || last < prev - 0.01) continue;
    const fixedRate = Math.abs(last - prev) <= 0.5; // a step change, not usage swings
    const annual = rise * 12;
    out.push({
      id: `increase:${s.key}`,
      group: "hidden-spending",
      severity: "attention",
      certainty: fixedRate ? "verified" : "likely",
      title: `${s.merchant} went up from ${money(first)} to ${money(last)}`,
      summary: `Your ${s.merchant} charge rose from ${money(first)} to ${money(last)} a month over the last ${m.length} months. If it stays there, you'll pay about ${whole(annual)} more a year.`,
      consequence: `${whole(annual)} more every year, and price increases often repeat once a promotional rate ends.`,
      impact: { amount: annual, period: "annual", kind: "loss" },
      monthlySaving: rise,
      actions: [
        `Call ${s.merchant} and ask to go back to ${money(first)}. Mention competitor prices or ask about a retention offer.`,
        "Check whether a promotional rate ended or a fee was added.",
        "If they won't budge, compare plans from other providers.",
      ],
      ease: "easy",
      urgencyDays: null,
      links: [{ href: "/forecast#whatif", label: "See the effect in what-if" }],
      explanation: {
        sourceFacts: m.map(txnFact),
        reasoningSummary: fixedRate
          ? `Rule v${BLINDSPOT_VERSION}: one charge per month for ${m.length}+ months, never decreasing, latest at least 5% and $2 above the first. The last two charges match, so this looks like a rate change. Annual impact = (${money(last)} − ${money(first)}) × 12.`
          : `Rule v${BLINDSPOT_VERSION}: one charge per month for ${m.length}+ months, rising each time. Bills tied to usage (like electricity) can vary naturally, so treat this as likely rather than certain. Annual impact = (${money(last)} − ${money(first)}) × 12.`,
        confidence: fixedRate ? "high" : "medium",
      },
    });
  }
  return out.sort((a, b) => (b.impact?.amount ?? 0) - (a.impact?.amount ?? 0)).slice(0, 3);
}

function subscriptions(ctx: Ctx, exclude: Set<string>): Draft[] {
  const subs = ctx.series
    .filter((s) => SUBSCRIPTION_CATS.includes(s.category) && !exclude.has(s.key))
    .map((s) => ({ s, r: stableRecurring(s) }))
    .filter((x): x is { s: Series; r: { amount: number } } => !!x.r && x.r.amount <= 75)
    .sort((a, b) => b.r.amount - a.r.amount);
  if (subs.length < 2) return [];
  const monthly = subs.reduce((t, x) => t + x.r.amount, 0);
  const names = subs.slice(0, 4).map((x) => x.s.merchant).join(", ") + (subs.length > 4 ? ` and ${subs.length - 4} more` : "");
  return [{
    id: "subscriptions",
    group: "hidden-spending",
    severity: "opportunity",
    certainty: "possible",
    title: `${subs.length} subscriptions cost ${whole(monthly * 12)} a year`,
    summary: `You have ${subs.length} recurring subscriptions totaling ${money(monthly)} a month (${whole(monthly * 12)} a year): ${names}. We can see the charges, not whether you use them. Worth a quick review.`,
    consequence: "Subscriptions renew automatically, so ones you've stopped using keep charging until you cancel.",
    impact: { amount: monthly * 12, period: "annual", kind: "saving" },
    monthlySaving: 0, // only the user knows which to cancel
    actions: [
      "Go through the list and ask: did I use this in the last month?",
      "Cancel or downgrade the ones you don't use. Many services have cheaper or ad-supported tiers.",
      "Look for overlap, like two streaming or storage services doing the same job.",
    ],
    ease: "easy",
    urgencyDays: null,
    links: [{ href: "/transactions", label: "View transactions" }],
    explanation: {
      sourceFacts: subs.map((x) => ({ label: `${x.s.merchant} — ${money(-x.r.amount)}/mo`, detail: `${x.s.months.length} months · ${pretty(x.s.category)}`, amount: -x.r.amount, href: "/transactions" })),
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: merchants in subscription-type categories charged once a month at a steady amount (within 15%) for 2+ months, each $75 or less. We never assume a subscription is unused; we only report what it costs.`,
      confidence: "high",
    },
  }];
}

function smallPurchases(ctx: Ctx, exclude: Set<string>): Draft[] {
  const out: Draft[] = [];
  for (const s of ctx.series) {
    if (exclude.has(s.key) || NOT_SPENDING.includes(s.category)) continue;
    const small = s.txns.filter((t) => Math.abs(t.amount) <= 20);
    if (small.length < s.txns.length * 0.8) continue;
    const last30 = small.filter((t) => daysAgo(ctx, t.date) < 30);
    if (last30.length < 6 && small.length < 12) continue;
    const monthly = small.reduce((a, t) => a + Math.abs(t.amount), 0) / Math.max(1, ctx.historyDays / 30.4);
    const annual = monthly * 12;
    if (annual < 300) continue;
    const avg = small.reduce((a, t) => a + Math.abs(t.amount), 0) / small.length;
    const perMonth = small.length / Math.max(1, ctx.historyDays / 30.4);
    out.push({
      id: `small:${s.key}`,
      group: "hidden-spending",
      severity: "opportunity",
      certainty: "verified",
      title: `Small purchases at ${s.merchant} add up to ${whole(annual)} a year`,
      summary: `You buy from ${s.merchant} about ${Math.round(perMonth)} times a month at around ${money(avg)} each. That's ${money(monthly)} a month, or ${whole(annual)} a year.`,
      consequence: `Each purchase feels small, but at this pace it's ${whole(annual)} a year.`,
      impact: { amount: annual / 2, period: "annual", kind: "saving" },
      monthlySaving: 0,
      actions: [
        `Decide on a weekly number for ${s.merchant} that feels right, for example half of today's pace (saves about ${whole(annual / 2)} a year).`,
        "Set a budget for this category so Credo can warn you as you approach it.",
      ],
      ease: "medium",
      urgencyDays: null,
      links: [{ href: "/budget", label: "Set a budget" }],
      explanation: {
        sourceFacts: small.slice(-5).reverse().map(txnFact),
        reasoningSummary: `Rule v${BLINDSPOT_VERSION}: 80%+ of this merchant's charges are $20 or less, with 6+ in the last 30 days or 12+ overall, adding up to $300+ a year. Annual = average monthly total × 12. The saving shown assumes cutting it in half.`,
        confidence: "high",
      },
    });
  }
  return out.sort((a, b) => (b.impact?.amount ?? 0) - (a.impact?.amount ?? 0)).slice(0, 2);
}

function categorySpikes(ctx: Ctx): Draft[] {
  if (ctx.historyDays < 60) return [];
  const sums: Record<string, number[]> = {};
  const recent: Record<string, BSTxn[]> = {};
  for (const t of ctx.posted) {
    const c = cat(t);
    if (t.amount >= 0 || NOT_SPENDING.includes(c) || c === "RENT_AND_UTILITIES") continue;
    for (let k = 0; k < 3; k++) if (inWindow(ctx, t, k)) (sums[c] ??= [0, 0, 0])[k] += -t.amount;
    if (inWindow(ctx, t, 0)) (recent[c] ??= []).push(t);
  }
  const priorWindows = ctx.historyDays >= 90 ? 2 : 1;
  const out: Draft[] = [];
  for (const [c, w] of Object.entries(sums)) {
    const prior = (w[1] + (priorWindows === 2 ? w[2] : 0)) / priorWindows;
    const delta = w[0] - prior;
    if (prior <= 0 || w[0] < prior * 1.4 || delta < 100) continue;
    out.push({
      id: `spike:${c}:${ctx.now.toISOString().slice(0, 7)}`,
      group: "hidden-spending",
      severity: "attention",
      certainty: "verified",
      title: `${pretty(c)} spending is up ${Math.round((w[0] / prior - 1) * 100)}%`,
      summary: `You spent ${whole(w[0])} on ${pretty(c).toLowerCase()} in the last 30 days, compared with about ${whole(prior)} in a typical month before. If that continues, it's ${whole(delta * 12)} more a year.`,
      consequence: `An extra ${whole(delta)} a month comes straight out of what you save.`,
      impact: { amount: delta * 12, period: "annual", kind: "loss" },
      monthlySaving: delta,
      actions: [
        `Look at the biggest ${pretty(c).toLowerCase()} purchases below. Was this a one-off (a trip, a gift) or a new habit?`,
        `If it's a habit, set a ${pretty(c)} budget around ${whole(prior)} a month.`,
      ],
      ease: "medium",
      urgencyDays: null,
      links: [{ href: "/spending", label: "View spending" }, { href: "/budget", label: "Set a budget" }],
      explanation: {
        sourceFacts: (recent[c] ?? []).sort((a, b) => a.amount - b.amount).slice(0, 4).map(txnFact),
        reasoningSummary: `Rule v${BLINDSPOT_VERSION}: last 30 days vs the average of the ${priorWindows === 2 ? "two" : ""} 30-day period${priorWindows === 2 ? "s" : ""} before it. Flagged at 40%+ and $100+ higher. Rent and utilities are excluded because they vary by season.`,
        confidence: "high",
      },
    });
  }
  return out.sort((a, b) => (b.impact?.amount ?? 0) - (a.impact?.amount ?? 0)).slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// B. FINANCIAL RISK WARNINGS
// ─────────────────────────────────────────────────────────────────────────────

/** Recurring bills with their next projected date. */
function upcomingBills(ctx: Ctx, horizonDays: number) {
  const horizon = new Date(ctx.now.getTime() + horizonDays * DAY);
  const out: { merchant: string; amount: number; next: Date; last: BSTxn }[] = [];
  for (const s of ctx.series) {
    if (["TRANSFER_IN", "TRANSFER_OUT", "INCOME"].includes(s.category)) continue;
    const r = stableRecurring(s);
    if (!r) continue;
    const last = s.txns[s.txns.length - 1];
    const l = new Date(last.date + "T00:00:00");
    let next = new Date(l.getFullYear(), l.getMonth() + 1, l.getDate());
    while (next < ctx.now) next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
    if (next <= horizon) out.push({ merchant: s.merchant, amount: r.amount, next, last });
  }
  return out.sort((a, b) => a.next.getTime() - b.next.getTime());
}

function lowBalance(ctx: Ctx): Draft[] {
  const checking = ctx.accounts.filter(isChecking);
  const pool = checking.length ? checking : ctx.accounts.filter(isCash);
  if (!pool.length) return [];
  const bal = pool.reduce((s, a) => s + (a.balance ?? 0), 0);
  const out: Draft[] = [];

  // Already overdrawn — verified, critical.
  const negative = pool.filter((a) => (a.available ?? a.balance ?? 0) < 0);
  if (negative.length) {
    const a = negative[0];
    const amt = a.available ?? a.balance ?? 0;
    out.push({
      id: `overdrawn:${a.id}`,
      group: "risk",
      severity: "critical",
      certainty: "verified",
      title: `${a.name} is overdrawn`,
      summary: `${a.name} shows an available balance of ${money(amt)}. Further charges may be declined or trigger overdraft fees.`,
      consequence: "Banks commonly charge an overdraft fee per transaction while you're negative.",
      impact: null,
      monthlySaving: 0,
      actions: [`Bring ${a.name} above $0 as soon as you can, by moving at least ${whole(-amt)} from another account (you do this; Credo never moves money).`, "Ask your bank to waive any fees already charged. Many will for a first occurrence."],
      ease: "easy",
      urgencyDays: 0,
      links: [{ href: "/accounts", label: "View accounts" }],
      explanation: { sourceFacts: [{ label: `${a.name}${a.mask ? ` ••${a.mask}` : ""}`, detail: "Available balance", amount: amt, href: "/accounts" }], reasoningSummary: `Rule v${BLINDSPOT_VERSION}: a checking account's available balance is below $0.`, confidence: "high" },
    });
    return out;
  }

  const horizon = ctx.nextPayday ? Math.max(1, Math.ceil((ctx.nextPayday.getTime() - ctx.now.getTime()) / DAY)) : 30;
  const bills = upcomingBills(ctx, horizon);
  if (!bills.length) return out;
  const due = bills.reduce((s, b) => s + b.amount, 0);
  const after = bal - due;
  const buffer = Math.max(200, ctx.monthlyExpenses * 0.1);
  if (after >= buffer) return out;
  const critical = after < 0;
  const until = ctx.nextPayday ? `before your next paycheck (around ${ctx.nextPayday.toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : "in the next 30 days";
  const gap = Math.ceil(buffer - after);
  out.push({
    id: `lowbalance:${bills[0].next.toISOString().slice(0, 10)}`,
    group: "risk",
    severity: critical ? "critical" : "attention",
    certainty: "likely",
    title: critical ? "Upcoming bills could overdraw your checking" : "Your checking will run low before payday",
    summary: `You have ${whole(bal)} in checking and ${bills.length} bill${bills.length > 1 ? "s" : ""} totaling ${whole(due)} due ${until}. That leaves ${money(after)}, before any day-to-day spending.`,
    consequence: critical ? "A bill could bounce or trigger overdraft fees, and a missed loan payment can hurt your credit." : `Less than ${whole(buffer)} of cushion means one unexpected expense could overdraw the account.`,
    impact: null,
    monthlySaving: 0,
    actions: [
      `Move about ${whole(gap)} into checking before ${shortDate(bills[0].next.toISOString().slice(0, 10))} (you decide and make the transfer; Credo never moves money).`,
      "Or ask a biller to move your due date to just after payday.",
      "Hold off on large non-essential purchases until your paycheck lands.",
    ],
    ease: "easy",
    urgencyDays: Math.max(0, Math.round((bills[0].next.getTime() - ctx.now.getTime()) / DAY)),
    links: [{ href: "/forecast", label: "Open forecast" }],
    explanation: {
      sourceFacts: [
        ...pool.map((a) => ({ label: a.name, detail: "Current balance", amount: a.balance ?? 0, href: "/accounts" })),
        ...bills.slice(0, 5).map((b) => ({ label: `${b.merchant} — ${money(-b.amount)}`, detail: `Expected ${b.next.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (last charged ${shortDate(b.last.date)})`, amount: -b.amount })),
      ],
      reasoningSummary: `Projection v${BLINDSPOT_VERSION}: checking balance minus recurring bills expected ${ctx.nextPayday ? `before your next paycheck, estimated from your last ${ctx.income?.dates.length} deposits every ~${ctx.payInterval} days` : "in the next 30 days (we couldn't detect a regular paycheck)"}. Flagged when less than ${whole(buffer)} would remain. Bill dates are estimated from last month's charges.`,
      confidence: "medium",
    },
  });
  return out;
}

function feesAndInterest(ctx: Ctx): Draft[] {
  const fees = ctx.posted.filter((t) => t.amount < 0 && cat(t) === "BANK_FEES");
  if (!fees.length) return [];
  const annualize = (sum: number) => sum * (365 / Math.max(30, ctx.historyDays));
  const isInterest = (t: BSTxn) => /interest|finance charge/i.test(t.merchant);
  const isOverdraft = (t: BSTxn) => /overdraft|nsf|insufficient|returned item|od fee|late fee|late charge|late payment/i.test(t.merchant);
  const out: Draft[] = [];

  const od = fees.filter(isOverdraft);
  if (od.length) {
    const sum = od.reduce((s, t) => s + -t.amount, 0);
    out.push({
      id: "fees:overdraft",
      group: "risk",
      severity: "critical",
      certainty: "verified",
      title: `You've paid ${money(sum)} in overdraft or late fees`,
      summary: `${od.length} overdraft, insufficient-funds or late fee${od.length > 1 ? "s" : ""} hit your accounts in the last ${Math.round(ctx.historyDays)} days, ${money(sum)} in total. At this pace that's ${whole(annualize(sum))} a year.`,
      consequence: "Overdrafts tend to repeat when the balance is regularly close to zero, and each one costs a fee.",
      impact: { amount: annualize(sum), period: "annual", kind: "loss" },
      monthlySaving: annualize(sum) / 12,
      actions: ["Ask your bank to refund the fees. Many will, especially the first time.", "Turn on low-balance alerts, or link savings as overdraft protection.", "Consider a bank with no overdraft fees."],
      ease: "easy",
      urgencyDays: null,
      links: [{ href: "/forecast", label: "Open forecast" }],
      explanation: { sourceFacts: od.map(txnFact), reasoningSummary: `Rule v${BLINDSPOT_VERSION}: bank-fee transactions whose description mentions overdraft, insufficient funds or a late payment. Annual = total × 365 ÷ ${Math.round(ctx.historyDays)} days of history.`, confidence: "high" },
    });
  }

  const int = fees.filter(isInterest);
  if (int.length) {
    const sum = int.reduce((s, t) => s + -t.amount, 0);
    const annual = annualize(sum);
    out.push({
      id: "fees:interest",
      group: "opportunity",
      severity: annual / 12 >= 100 ? "critical" : "attention",
      certainty: "verified",
      title: `Interest charges are costing you ${whole(annual)} a year`,
      summary: `You paid ${money(sum)} in interest in the last ${Math.round(ctx.historyDays)} days. That's about ${whole(annual / 12)} a month, or ${whole(annual)} a year, that buys nothing.`,
      consequence: "Interest compounds: unpaid interest is added to the balance, and next month you pay interest on it too.",
      impact: { amount: annual, period: "annual", kind: "loss" },
      monthlySaving: annual / 12,
      actions: [
        "Put any extra payment toward the card or loan with the highest interest rate first.",
        "Ask your card issuer for a lower rate. It works more often than people expect.",
        "If you have good credit, a 0% balance transfer can pause interest while you pay down. Watch the transfer fee.",
      ],
      ease: "medium",
      urgencyDays: 30,
      links: [{ href: "/forecast#whatif", label: "Try paying it down in what-if" }],
      explanation: { sourceFacts: int.map(txnFact), reasoningSummary: `Rule v${BLINDSPOT_VERSION}: bank-fee transactions described as interest or finance charges. Annual = total × 365 ÷ ${Math.round(ctx.historyDays)} days of history.`, confidence: "high" },
    });
  }

  const other = fees.filter((t) => !isInterest(t) && !isOverdraft(t));
  if (other.length) {
    const sum = other.reduce((s, t) => s + -t.amount, 0);
    const annual = annualize(sum);
    if (annual >= 20) out.push({
      id: "fees:other",
      group: "opportunity",
      severity: "opportunity",
      certainty: "verified",
      title: `Bank fees are costing you ${whole(annual)} a year`,
      summary: `You paid ${other.length} bank fee${other.length > 1 ? "s" : ""} (${money(sum)}) in the last ${Math.round(ctx.historyDays)} days: things like ATM, maintenance or foreign-transaction fees. That's ${whole(annual)} a year at this pace.`,
      consequence: "Most of these fees are avoidable with the right account or habits.",
      impact: { amount: annual, period: "annual", kind: "saving" },
      monthlySaving: annual / 12,
      actions: ["Ask your bank what it takes to waive the monthly fee (often a minimum balance or direct deposit).", "Use in-network ATMs, or get cash back at checkout.", "Compare no-fee checking accounts."],
      ease: "easy",
      urgencyDays: null,
      links: [{ href: "/transactions", label: "View transactions" }],
      explanation: { sourceFacts: other.map(txnFact), reasoningSummary: `Rule v${BLINDSPOT_VERSION}: bank-fee transactions that aren't interest or overdraft. Annual = total × 365 ÷ ${Math.round(ctx.historyDays)} days.`, confidence: "high" },
    });
  }
  return out;
}

function emergencyCushion(ctx: Ctx): Draft[] {
  if (ctx.monthlyExpenses <= 0) return [];
  const months = Math.max(0, ctx.cash) / ctx.monthlyExpenses;
  if (months >= 3) return [];
  const critical = months < 1;
  const target = critical ? 1 : 3;
  const gap = target * ctx.monthlyExpenses - Math.max(0, ctx.cash);
  return [{
    id: "cushion",
    group: "risk",
    severity: critical ? "critical" : "attention",
    certainty: "verified",
    title: critical ? "Less than one month of emergency savings" : `Only ${months.toFixed(1)} months of emergency savings`,
    summary: `Your checking and savings (${whole(ctx.cash)}) would cover ${months.toFixed(1)} months of your typical spending (${whole(ctx.monthlyExpenses)} a month). A common target is 3–6 months.`,
    consequence: "A job loss, medical bill or car repair could push you onto a credit card at 20%+ interest.",
    impact: null,
    monthlySaving: 0,
    actions: [
      `Set up an automatic transfer of ${whole(gap / 12)} a month to savings. That reaches ${target} month${target > 1 ? "s" : ""} of cushion in a year.`,
      "Keep the emergency fund in a separate savings account so it isn't spent by accident.",
    ],
    ease: "medium",
    urgencyDays: null,
    links: [{ href: "/forecast#whatif", label: "Model it in what-if" }],
    explanation: {
      sourceFacts: [
        { label: "Cash in checking and savings", amount: ctx.cash, href: "/accounts" },
        { label: "Average monthly spending", detail: `Over ${Math.round(ctx.historyDays)} days`, amount: -ctx.monthlyExpenses },
      ],
      reasoningSummary: `Same formula as the health score's emergency cushion: cash ÷ average monthly spending (transfers excluded). Flagged below 3 months; critical below 1.`,
      confidence: ctx.historyDays >= 60 ? "high" : "medium",
    },
  }];
}

function creditUtilization(ctx: Ctx): Draft[] {
  const cards = ctx.accounts.filter(isCard).filter((a) => a.available != null);
  if (!cards.length) return [];
  const rows = cards.map((a) => { const owed = Math.abs(a.current ?? a.balance ?? 0); const limit = owed + Math.max(0, a.available ?? 0); return { a, owed, limit, pct: limit > 0 ? (owed / limit) * 100 : 0 }; });
  const owed = rows.reduce((s, r) => s + r.owed, 0), limit = rows.reduce((s, r) => s + r.limit, 0);
  if (limit <= 0) return [];
  const pct = (owed / limit) * 100;
  const maxed = rows.filter((r) => r.pct >= 90);
  if (pct < 30 && !maxed.length) return [];
  const critical = pct >= 70 || maxed.length > 0;
  const toThirty = Math.max(0, owed - limit * 0.3);
  return [{
    id: "utilization",
    group: "risk",
    severity: critical ? "critical" : "attention",
    certainty: "verified",
    title: maxed.length ? `${maxed[0].a.name} is nearly maxed out` : `You're using ${Math.round(pct)}% of your credit`,
    summary: `You owe ${whole(owed)} across ${rows.length} card${rows.length > 1 ? "s" : ""} with ${whole(limit)} in total limits, which is ${Math.round(pct)}% utilization.${maxed.length ? ` ${maxed[0].a.name} is at ${Math.round(maxed[0].pct)}%.` : ""} Credit scoring models generally favor staying under 30%, and under 10% is best.`,
    consequence: "High utilization can lower your credit score, which raises the rates you're offered on loans and cards.",
    impact: null,
    monthlySaving: 0,
    actions: [
      toThirty > 0 ? `Paying down ${whole(toThirty)} would bring you under 30%.` : "Pay the maxed-out card down first, since per-card utilization counts too.",
      "Pay before the statement closing date; that's the balance reported to credit bureaus.",
      "Ask for a credit limit increase, but don't add new spending.",
    ],
    ease: "medium",
    urgencyDays: 30,
    links: [{ href: "/forecast#whatif", label: "Try extra payments in what-if" }],
    explanation: {
      sourceFacts: rows.map((r) => ({ label: `${r.a.name}${r.a.mask ? ` ••${r.a.mask}` : ""}`, detail: `${whole(r.owed)} of ${whole(r.limit)} (${Math.round(r.pct)}%)`, amount: -r.owed, href: "/accounts" })),
      reasoningSummary: `Same formula as the health score: card balances ÷ (balance + available credit). Flagged at 30%+, critical at 70%+ or any single card at 90%+.`,
      confidence: "high",
    },
  }];
}

function incomeConcentration(ctx: Ctx): Draft[] {
  if (!ctx.income || ctx.income.dates.length < 2 || ctx.income.share < 0.9 || ctx.monthlyExpenses <= 0) return [];
  const months = Math.max(0, ctx.cash) / ctx.monthlyExpenses;
  if (months >= 3) return []; // one job with a solid cushion is normal, not a blind spot
  return [{
    id: "income-concentration",
    group: "risk",
    severity: "attention",
    certainty: "possible",
    title: "One income source and a thin cushion",
    summary: `${Math.round(ctx.income.share * 100)}% of your income comes from ${ctx.income.source}, and your savings cover ${months.toFixed(1)} months. Having one main income is normal; the risk is the combination: if it stopped, you'd have about ${Math.round(months * 30)} days of runway.`,
    consequence: "A layoff or delayed paycheck would hit immediately.",
    impact: null,
    monthlySaving: 0,
    actions: ["Building your emergency cushion toward 3 months is the main fix.", "If it fits your life, even a small second income stream lowers this risk."],
    ease: "hard",
    urgencyDays: null,
    links: [{ href: "/health", label: "See your cushion" }],
    explanation: {
      sourceFacts: ctx.income.dates.slice(-4).map((d, i) => ({ label: `${ctx.income!.source}`, detail: shortDate(d), amount: ctx.income!.amounts[ctx.income!.amounts.length - Math.min(4, ctx.income!.dates.length) + i] })),
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: shown only when 90%+ of income-category deposits come from one payer AND savings cover under 3 months of spending.`,
      confidence: "medium",
    },
  }];
}

function growingCardDebt(ctx: Ctx): Draft[] {
  const cardIds = new Set(ctx.accounts.filter(isCard).map((a) => a.id));
  if (!cardIds.size || ctx.historyDays < 60) return [];
  const net = [0, 0, 0]; const charges = [0, 0, 0]; const pays = [0, 0, 0];
  for (const t of ctx.posted) {
    if (!cardIds.has(t.accountId)) continue;
    for (let k = 0; k < 3; k++) if (inWindow(ctx, t, k)) { if (t.amount < 0) charges[k] += -t.amount; else pays[k] += t.amount; net[k] += -t.amount; }
  }
  if (!(net[0] > 0 && net[1] > 0 && net[0] + net[1] >= 200)) return [];
  const monthly = (net[0] + net[1]) / 2;
  return [{
    id: "card-debt-growing",
    group: "risk",
    severity: "attention",
    certainty: "likely",
    title: `Card balances are growing about ${whole(monthly)} a month`,
    summary: `In each of the last two months you charged more to your cards than you paid off (${whole(charges[1])} vs ${whole(pays[1])}, then ${whole(charges[0])} vs ${whole(pays[0])}). At this pace your card debt grows by about ${whole(monthly * 12)} a year, before interest.`,
    consequence: "Growing balances raise your utilization and the interest you pay each month.",
    impact: { amount: monthly * 12, period: "annual", kind: "loss" },
    monthlySaving: 0,
    actions: ["Aim to pay at least your new charges each month so the balance stops growing.", "Move recurring bills to your debit card while you pay the cards down."],
    ease: "medium",
    urgencyDays: 30,
    links: [{ href: "/forecast#whatif", label: "Model payoff in what-if" }],
    explanation: {
      sourceFacts: [
        { label: "Last 30 days", detail: `Charges ${whole(charges[0])} · payments ${whole(pays[0])}`, amount: -net[0] },
        { label: "30–60 days ago", detail: `Charges ${whole(charges[1])} · payments ${whole(pays[1])}`, amount: -net[1] },
      ],
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: on credit-card accounts, charges exceeded payments in both of the last two 30-day periods by $200+ combined.`,
      confidence: "medium",
    },
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// C. MISSED OPPORTUNITIES
// ─────────────────────────────────────────────────────────────────────────────

function idleCash(ctx: Ctx): Draft[] {
  const checking = ctx.accounts.filter(isChecking);
  if (!checking.length || ctx.monthlyExpenses <= 0) return [];
  const bal = checking.reduce((s, a) => s + (a.balance ?? 0), 0);
  const keep = ctx.monthlyExpenses * 1.5;
  const excess = bal - keep;
  if (excess < 2000) return [];
  const yearly = excess * ASSUMED_HYSA_APY;
  return [{
    id: "idle-cash",
    group: "opportunity",
    severity: "opportunity",
    certainty: "possible",
    title: `${whole(excess)} in checking could be earning interest`,
    summary: `You keep ${whole(bal)} in checking, about ${(bal / ctx.monthlyExpenses).toFixed(1)} months of spending. Keeping 1.5 months there and moving ${whole(excess)} to a high-yield savings account at ${(ASSUMED_HYSA_APY * 100).toFixed(1)}% APY would earn about ${whole(yearly)} a year.`,
    consequence: "Money in a typical checking account earns little or nothing while prices rise.",
    impact: { amount: yearly, period: "annual", kind: "saving" },
    monthlySaving: 0,
    actions: [
      "Check what your checking account pays. If it's already high-yield, ignore this.",
      `If not, consider moving about ${whole(excess)} to a high-yield savings account (you choose and move it yourself).`,
    ],
    ease: "easy",
    urgencyDays: null,
    links: [{ href: "/accounts", label: "View accounts" }],
    explanation: {
      sourceFacts: checking.map((a) => ({ label: a.name, detail: "Checking balance", amount: a.balance ?? 0, href: "/accounts" })),
      reasoningSummary: `Estimate v${BLINDSPOT_VERSION}: excess = checking − 1.5 × monthly spending (${whole(ctx.monthlyExpenses)}). Earnings = excess × ${(ASSUMED_HYSA_APY * 100).toFixed(1)}% APY, an assumed typical high-yield rate. Actual rates vary.`,
      confidence: "low",
    },
  }];
}

function negotiableBills(ctx: Ctx, exclude: Set<string>): Draft[] {
  const bills = ctx.series
    .filter((s) => BILL_CATS.includes(s.category) && !exclude.has(s.key))
    .map((s) => ({ s, r: stableRecurring(s) }))
    .filter((x): x is { s: Series; r: { amount: number } } => !!x.r && x.r.amount >= 40 && x.r.amount <= 400)
    .sort((a, b) => b.r.amount - a.r.amount)
    .slice(0, 3);
  if (!bills.length) return [];
  const monthly = bills.reduce((t, x) => t + x.r.amount, 0);
  return [{
    id: "negotiable-bills",
    group: "opportunity",
    severity: "opportunity",
    certainty: "possible",
    title: `Bills worth a phone call: ${whole(monthly * 12)} a year`,
    summary: `${bills.map((x) => `${x.s.merchant} (${money(x.r.amount)}/mo)`).join(", ")} cost ${whole(monthly * 12)} a year together. Providers often lower rates when asked. Every $10 a month you take off one of them is $120 a year.`,
    consequence: "Fixed bills tend to creep up when nobody reviews them.",
    impact: null,
    monthlySaving: 0,
    actions: ["Call each provider and ask for current promotions or a loyalty discount.", "Compare plans with other providers in your area before calling, so you have a number to quote.", "Remove add-ons you don't use."],
    ease: "medium",
    urgencyDays: null,
    links: [{ href: "/transactions", label: "View transactions" }],
    explanation: {
      sourceFacts: bills.map((x) => ({ label: `${x.s.merchant} — ${money(-x.r.amount)}/mo`, detail: `${x.s.months.length} months · ${pretty(x.s.category)}`, amount: -x.r.amount, href: "/transactions" })),
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: steady monthly bills between $40 and $400 in utilities and services. We don't estimate a saving because we can't know what your provider will offer.`,
      confidence: "high",
    },
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// D. BEHAVIOURAL PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

const discretionary = (ctx: Ctx) => ctx.posted.filter((t) => t.amount < 0 && DISCRETIONARY.includes(cat(t)));

function paydaySpikes(ctx: Ctx): Draft[] {
  if (!ctx.income || ctx.income.dates.length < 2 || !ctx.payInterval) return [];
  const disc = discretionary(ctx);
  if (!disc.length) return [];
  const windowDays = new Set<string>();
  for (const d of ctx.income.dates) for (let i = 0; i < 3; i++) windowDays.add(new Date(new Date(d + "T00:00:00").getTime() + i * DAY).toISOString().slice(0, 10));
  let inW = 0, outW = 0;
  for (const t of disc) (windowDays.has(t.date) ? (inW += -t.amount) : (outW += -t.amount));
  const wDays = windowDays.size, oDays = Math.max(1, Math.round(ctx.historyDays) - wDays);
  const wDaily = inW / wDays, oDaily = outW / oDays;
  if (oDaily <= 0 || wDaily < oDaily * 1.8 || wDaily - oDaily < 20) return [];
  const perPayday = (wDaily - oDaily) * 3;
  const paydaysPerYear = 365 / ctx.payInterval;
  const annual = perPayday * paydaysPerYear;
  return [{
    id: "payday-spikes",
    group: "behavior",
    severity: annual >= 1000 ? "attention" : "opportunity",
    certainty: "likely",
    title: "Spending jumps right after payday",
    summary: `In the 3 days after each paycheck you spend about ${whole(wDaily)} a day on discretionary purchases, versus ${whole(oDaily)} a day otherwise. That's roughly ${whole(perPayday)} extra each payday, or ${whole(annual)} a year.`,
    consequence: "Front-loading spending makes the days before the next paycheck tight.",
    impact: { amount: annual, period: "annual", kind: "saving" },
    monthlySaving: annual / 12,
    actions: [
      "Schedule an automatic transfer to savings on payday, so the money moves before it's spent.",
      "Give yourself a 24-hour pause on non-essential purchases over $50 during payday week.",
    ],
    ease: "easy",
    urgencyDays: null,
    links: [{ href: "/spending", label: "View spending" }],
    explanation: {
      sourceFacts: [
        { label: `Paydays detected: ${ctx.income.dates.length}`, detail: `From ${ctx.income.source}, about every ${ctx.payInterval} days` },
        { label: "Payday windows (3 days each)", detail: `${whole(inW)} over ${wDays} days`, amount: -inW },
        { label: "All other days", detail: `${whole(outW)} over ${oDays} days`, amount: -outW },
      ],
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: discretionary categories (dining, entertainment, shopping, personal care, travel). Flagged when daily spend in the 3 days after payday is 1.8× the usual and at least $20/day higher. Annual = extra per payday × ${paydaysPerYear.toFixed(0)} paydays.`,
      confidence: "medium",
    },
  }];
}

function lifestyleInflation(ctx: Ctx): Draft[] {
  if (ctx.historyDays < 85) return [];
  const w = [0, 0, 0];
  for (const t of discretionary(ctx)) for (let k = 0; k < 3; k++) if (inWindow(ctx, t, k)) w[k] += -t.amount;
  const inc = [0, 0, 0];
  for (const t of ctx.posted) if (t.amount > 0 && cat(t) === "INCOME") for (let k = 0; k < 3; k++) if (inWindow(ctx, t, k)) inc[k] += t.amount;
  if (!(w[2] > 0 && w[1] > w[2] && w[0] > w[1] && w[0] >= w[2] * 1.2 && w[0] - w[2] >= 150)) return [];
  const incomeGrew = inc[2] > 0 && inc[0] / inc[2] >= w[0] / w[2];
  if (incomeGrew) return [];
  const delta = w[0] - w[2];
  return [{
    id: "lifestyle-inflation",
    group: "behavior",
    severity: "attention",
    certainty: "likely",
    title: "Discretionary spending has risen three months in a row",
    summary: `Dining, entertainment and shopping went from ${whole(w[2])} to ${whole(w[1])} to ${whole(w[0])} over the last three months, while your income didn't rise to match. If it holds, that's ${whole(delta * 12)} more a year.`,
    consequence: "Gradual increases are easy to miss and hard to reverse once they become normal.",
    impact: { amount: delta * 12, period: "annual", kind: "loss" },
    monthlySaving: delta,
    actions: [`Pick a monthly discretionary target, for example ${whole(w[2])}, where you were three months ago.`, "Set budgets for dining and shopping so you see it before month-end."],
    ease: "medium",
    urgencyDays: null,
    links: [{ href: "/budget", label: "Set budgets" }],
    explanation: {
      sourceFacts: [
        { label: "60–90 days ago", amount: -w[2] },
        { label: "30–60 days ago", amount: -w[1] },
        { label: "Last 30 days", amount: -w[0] },
      ],
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: discretionary spending rose in each of three consecutive 30-day periods, ending 20%+ and $150+ higher, while income did not rise proportionally.`,
      confidence: "medium",
    },
  }];
}

function impulsePurchases(ctx: Ctx, exclude: Set<string>): Draft[] {
  const recent = ctx.posted.filter((t) => t.amount < 0 && t.amount > -100 && cat(t) === "GENERAL_MERCHANDISE" && daysAgo(ctx, t.date) < 30 && !exclude.has(norm(t.merchant)));
  const merchants = new Set(recent.map((t) => norm(t.merchant)));
  if (recent.length < 10 || merchants.size < 3) return [];
  const sum = recent.reduce((s, t) => s + -t.amount, 0);
  return [{
    id: `impulse:${ctx.now.toISOString().slice(0, 7)}`,
    group: "behavior",
    severity: "opportunity",
    certainty: "possible",
    title: `${recent.length} small shopping purchases this month`,
    summary: `In the last 30 days you made ${recent.length} purchases under $100 at ${merchants.size} different stores, ${whole(sum)} in total (about ${whole(sum * 12)} a year at this pace). Some may be planned; frequent small buys are often impulse purchases.`,
    consequence: "Small purchases rarely feel significant one at a time.",
    impact: { amount: sum * 12 * 0.25, period: "annual", kind: "saving" },
    monthlySaving: 0,
    actions: ["Try a 48-hour wait list: add it to a list, buy it only if you still want it in two days.", "Remove saved cards from shopping apps to add a little friction."],
    ease: "medium",
    urgencyDays: null,
    links: [{ href: "/transactions", label: "View transactions" }],
    explanation: {
      sourceFacts: recent.slice(0, 6).map(txnFact),
      reasoningSummary: `Rule v${BLINDSPOT_VERSION}: 10+ general-merchandise purchases under $100 across 3+ stores in 30 days. Potential saving assumes a quarter of them could be skipped. Only you know which were planned.`,
      confidence: "low",
    },
  }];
}

function budgetConflicts(ctx: Ctx): Draft[] {
  const entries = Object.entries(ctx.budgets).filter(([, v]) => v > 0);
  if (!entries.length) return [];
  const month = ctx.now.toISOString().slice(0, 7);
  const day = ctx.now.getDate();
  const daysIn = new Date(ctx.now.getFullYear(), ctx.now.getMonth() + 1, 0).getDate();
  const spent: Record<string, BSTxn[]> = {};
  for (const t of ctx.posted) if (t.amount < 0 && t.date.startsWith(month)) (spent[pretty(t.category)] ??= []).push(t);
  const out: Draft[] = [];
  for (const [category, limit] of entries) {
    const ts = spent[category] ?? [];
    const s = ts.reduce((a, t) => a + -t.amount, 0);
    const pace = s / (day / daysIn);
    const over = s > limit;
    if (!over && !(day >= 10 && pace > limit * 1.1)) continue;
    out.push({
      id: `budget:${category}:${month}`,
      group: "behavior",
      severity: "attention",
      certainty: over ? "verified" : "likely",
      title: over ? `Over your ${category} budget by ${whole(s - limit)}` : `On pace to overspend your ${category} budget`,
      summary: over
        ? `You set ${whole(limit)} a month for ${category} and have spent ${whole(s)} so far this month.`
        : `You've spent ${whole(s)} of your ${whole(limit)} ${category} budget ${day} days into the month. At this pace you'll reach about ${whole(pace)}, which is ${whole(pace - limit)} over.`,
      consequence: "This goes against a goal you set for yourself.",
      impact: null,
      monthlySaving: Math.max(0, (over ? s : pace) - limit),
      actions: over ? [`Pause ${category.toLowerCase()} spending for the rest of the month if you can.`, "If the budget was unrealistic, adjust it so it stays useful."] : [`To stay on budget, keep ${category.toLowerCase()} spending to about ${whole(Math.max(0, limit - s) / Math.max(1, daysIn - day))} a day for the rest of the month.`],
      ease: "medium",
      urgencyDays: daysIn - day,
      links: [{ href: "/budget", label: "Open budget" }],
      explanation: {
        sourceFacts: [{ label: `${category} budget`, amount: -limit, href: "/budget" }, ...ts.sort((a, b) => a.amount - b.amount).slice(0, 4).map(txnFact)],
        reasoningSummary: over
          ? `Rule v${BLINDSPOT_VERSION}: this month's ${category} spending exceeds the budget you set.`
          : `Rule v${BLINDSPOT_VERSION}: projected month-end = spent so far ÷ (${day}/${daysIn} of the month). Flagged when that's 10%+ over budget, from day 10 onward.`,
        confidence: over ? "high" : "medium",
      },
    });
  }
  return out.sort((a, b) => b.monthlySaving - a.monthlySaving).slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIORITISATION — impact, urgency, consequences, ease. One clear "fix first".
// ─────────────────────────────────────────────────────────────────────────────

const SEV_W: Record<Severity, number> = { critical: 50, attention: 25, opportunity: 10 };
const EASE_W: Record<Ease, number> = { easy: 10, medium: 5, hard: 0 };
const CERT_W: Record<Certainty, number> = { verified: 8, likely: 4, possible: 0 };
// Future consequences: risks compound (fees, credit damage), habits are optional.
const GROUP_W: Record<BlindSpotGroup, number> = { risk: 10, "hidden-spending": 5, opportunity: 3, behavior: 0 };

function prioritize(d: Draft): Omit<BlindSpot, "category" | "kind" | "metric"> {
  const annual = d.impact ? d.impact.amount : 0;
  const impactPts = Math.min(25, Math.log10(annual + 1) * 8);
  const urgencyPts = d.urgencyDays == null ? 0 : d.urgencyDays <= 7 ? 30 : d.urgencyDays <= 30 ? 10 : 0;
  const priority = Math.round(SEV_W[d.severity] + impactPts + urgencyPts + EASE_W[d.ease] + CERT_W[d.certainty] + GROUP_W[d.group]);
  const reasons: string[] = [];
  if (d.severity === "critical") reasons.push("it's a critical risk");
  else if (d.group === "risk") reasons.push("left alone, it tends to get more expensive");
  if (d.urgencyDays != null && d.urgencyDays <= 7) reasons.push(d.urgencyDays <= 1 ? "it needs action now" : `it could hit within ${d.urgencyDays} days`);
  else if (d.urgencyDays != null && d.urgencyDays <= 30) reasons.push("it comes up again within a month");
  if (annual >= 500) reasons.push(`it's worth ${whole(annual)}${d.impact?.period === "annual" ? " a year" : ""}`);
  if (d.ease === "easy") reasons.push("it's quick to fix");
  if (d.certainty === "verified") reasons.push("it's confirmed in your data");
  const priorityReason = reasons.length ? `Ranked here because ${reasons.slice(0, 3).join(", ")}.` : "Lower urgency and impact than the items above.";
  return { ...d, priority, priorityReason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function detectBlindSpots(
  accounts: BSAccount[],
  txns: BSTxn[],
  opts: { budgets?: Record<string, number>; now?: Date } = {},
): BlindSpotReport {
  const now = opts.now ?? new Date();
  const cannotCheck = [
    { title: "Employer retirement match", detail: "We can't see your pay stubs or plan rules. Check with HR that you contribute at least enough to get the full match; it's part of your pay." },
    { title: "Whether you use your subscriptions", detail: "We only see charges, not usage, so we never label a subscription as unused." },
    { title: "Interest rates on each debt", detail: "Banks don't share APRs through account links. We use the interest charges that actually appear in your transactions." },
  ];
  if (!txns.length && !accounts.length) return { findings: [], historyDays: 0, txnCount: 0, cannotCheck, metrics: { costCreepMonthly: 0, checkingCash: 0, billsNext30: null, paymentIncidents: 0, incomeVariation: null } };

  const ctx = buildCtx(accounts, txns, opts.budgets ?? {}, now);
  const increases = priceIncreases(ctx);
  const increasedKeys = new Set(increases.map((f) => f.id.replace("increase:", "")));
  const subs = subscriptions(ctx, increasedKeys);
  const subKeys = new Set(subs.flatMap((f) => f.explanation.sourceFacts.map((x) => norm(x.label.split(" — ")[0]))));
  const smalls = smallPurchases(ctx, increasedKeys);
  const smallKeys = new Set(smalls.map((f) => f.id.replace("small:", "")));

  const drafts: Draft[] = [
    ...duplicates(ctx),
    ...increases,
    ...subs,
    ...smalls,
    ...categorySpikes(ctx),
    ...lowBalance(ctx),
    ...feesAndInterest(ctx),
    ...emergencyCushion(ctx),
    ...creditUtilization(ctx),
    ...incomeConcentration(ctx),
    ...growingCardDebt(ctx),
    ...idleCash(ctx),
    ...negotiableBills(ctx, new Set([...increasedKeys, ...subKeys])),
    ...paydaySpikes(ctx),
    ...lifestyleInflation(ctx),
    ...impulsePurchases(ctx, smallKeys),
    ...budgetConflicts(ctx),
  ].filter((d) => d.explanation.sourceFacts.length > 0 && d.explanation.reasoningSummary.trim().length > 0);

  return finalize(dedupe(drafts), ctx, cannotCheck);
}

/**
 * One problem, one card. When several detectors see the same money:
 *   • a budget conflict (the user's own goal) replaces a spike in that category
 *   • a category spike replaces "lifestyle inflation" when it explains most of it
 */
function dedupe(drafts: Draft[]): Draft[] {
  const budgetCats = new Set(drafts.filter((d) => d.id.startsWith("budget:")).map((d) => d.id.split(":")[1]));
  let out = drafts.filter((d) => !(d.id.startsWith("spike:") && budgetCats.has(pretty(d.id.split(":")[1]))));
  const discSpikeMonthly = out
    .filter((d) => d.id.startsWith("spike:") && DISCRETIONARY.includes(d.id.split(":")[1]))
    .reduce((s, d) => s + d.monthlySaving, 0);
  const life = out.find((d) => d.id === "lifestyle-inflation");
  const budgetMonthly = out.filter((d) => d.id.startsWith("budget:")).reduce((s, d) => s + d.monthlySaving, 0);
  if (life && (discSpikeMonthly + budgetMonthly) >= life.monthlySaving * 0.6) out = out.filter((d) => d !== life);
  return out;
}

// Where each finding lives in the health score. One table, so nothing is
// counted twice: a finding either explains one metric, or affects none.
const CLASSIFY: [RegExp, CategoryId, FindingKind, MetricId | null][] = [
  [/^dup:/, "spending", "risk", null],
  [/^increase:/, "spending", "risk", "costCreep"],
  [/^subscriptions$/, "spending", "opportunity", null],
  [/^small:/, "spending", "info", null],
  [/^impulse:/, "spending", "info", null],
  [/^payday-spikes$/, "spending", "info", null],
  [/^lifestyle-inflation$/, "spending", "risk", "discretionaryShare"],
  [/^budget:/, "spending", "risk", null],
  [/^negotiable-bills$/, "spending", "opportunity", null],
  [/^fees:other$/, "spending", "opportunity", null],
  [/^spike:/, "cashflow", "risk", "spendingTrend"],
  [/^income-concentration$/, "cashflow", "risk", null],
  [/^cushion$/, "savings", "risk", "cushion"],
  [/^idle-cash$/, "savings", "opportunity", null],
  [/^utilization$/, "debt", "risk", "utilization"],
  [/^fees:interest$/, "debt", "risk", null],
  [/^card-debt-growing$/, "debt", "risk", null],
  [/^lowbalance:/, "obligations", "risk", "billCoverage"],
  [/^overdrawn:/, "obligations", "risk", "paymentIncidents"],
  [/^fees:overdraft$/, "obligations", "risk", "paymentIncidents"],
];
function classify(d: Draft): Pick<BlindSpot, "category" | "kind" | "metric"> {
  const row = CLASSIFY.find(([re]) => re.test(d.id));
  return row ? { category: row[1], kind: row[2], metric: row[3] } : { category: "spending", kind: d.severity === "opportunity" ? "opportunity" : "risk", metric: null };
}

/**
 * Income stability from the paychecks themselves: with a regular paycheck
 * (3+ deposits on a steady schedule) the variation of its amounts, scaled up
 * when it makes up less of total income. Avoids calendar artefacts like
 * biweekly pay landing 2 or 3 times in a month.
 */
function paycheckVariation(ctx: Ctx): number | null {
  const inc = ctx.income;
  if (!inc || !ctx.payInterval || inc.amounts.length < 3) return null;
  const mean = inc.amounts.reduce((a, b) => a + b, 0) / inc.amounts.length;
  if (mean <= 0) return null;
  const sd = Math.sqrt(inc.amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / inc.amounts.length);
  return sd / mean + (1 - inc.share) * 0.5;
}

function finalize(drafts: Draft[], ctx: Ctx, cannotCheck: BlindSpotReport["cannotCheck"]): BlindSpotReport {
  // Measurements the health score uses — computed here once, not re-derived.
  const costCreepMonthly = drafts.filter((d) => d.id.startsWith("increase:")).reduce((s, d) => s + d.monthlySaving, 0);
  const checking = ctx.accounts.filter(isChecking);
  const checkingCash = (checking.length ? checking : ctx.accounts.filter(isCash)).reduce((s, a) => s + (a.balance ?? 0), 0);
  const bills = upcomingBills(ctx, 30);
  const feeIncidents = ctx.posted.filter((t) => t.amount < 0 && cat(t) === "BANK_FEES" && /overdraft|nsf|insufficient|returned item|od fee|late fee|late charge|late payment/i.test(t.merchant)).length;
  const overdrawn = (checking.length ? checking : ctx.accounts.filter(isCash)).filter((a) => (a.available ?? a.balance ?? 0) < 0).length;
  return {
    findings: drafts.map((d) => ({ ...prioritize(d), ...classify(d) })).sort((a, b) => b.priority - a.priority),
    historyDays: ctx.historyDays,
    txnCount: ctx.txns.length,
    cannotCheck,
    metrics: {
      costCreepMonthly,
      checkingCash,
      billsNext30: bills.length ? bills.reduce((s, b) => s + b.amount, 0) : null,
      paymentIncidents: feeIncidents + overdrawn,
      incomeVariation: paycheckVariation(ctx),
    },
  };
}

/** Coach prompt with the finding's own numbers, so answers are grounded. */
export function coachPrompt(f: BlindSpot, contribution?: string): string {
  return `Credo flagged this in my ${f.category} health category (${f.kind === "risk" ? "a risk" : f.kind === "opportunity" ? "an opportunity" : "an informational insight"}, ${f.certainty}): "${f.title}". Details: ${f.summary}${contribution ? ` ${contribution}` : ""} Explain this in simple terms, what happens if I ignore it, and the single best next step for me.`;
}

/** Compact text for the AI assistant's server-side context. */
export function blindSpotsSummaryText(findings: BlindSpot[], limit = 8): string {
  if (!findings.length) return "FINANCIAL INSIGHTS (blind spots): none detected.";
  const lines = [`FINANCIAL INSIGHTS (blind-spot detector v${BLINDSPOT_VERSION}, highest priority first; each belongs to a health category; only risks tied to a metric affect the score; the user may have resolved or dismissed some in the app):`];
  for (const f of findings.slice(0, limit)) {
    const imp = f.impact ? ` Impact: ${whole(f.impact.amount)} ${f.impact.period === "annual" ? "per year" : "one-time"} ${f.impact.kind === "loss" ? "lost" : "potential saving"}.` : "";
    lines.push(`  - [${f.category} · ${f.kind} · ${f.severity} · ${f.certainty}${f.metric ? ` · explains metric ${f.metric}` : ""}] ${f.title}. ${f.summary}${imp}`);
  }
  return lines.join("\n");
}
