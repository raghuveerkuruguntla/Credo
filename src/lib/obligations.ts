// Client-safe helpers for card and loan payments reported by the bank
// (Plaid Liabilities): which are due soon, and what to show per account.

import type { DebtObligation } from "@/lib/liabilities";
import type { LiveAccount, LiveTxn } from "@/lib/useFinancialData";

type DebtAccount = Pick<LiveAccount, "id" | "name" | "balance" | "current"> & { mask?: string | null };
type PayTxn = Pick<LiveTxn, "id" | "accountId" | "date" | "merchant" | "amount" | "category">;

const payee = (m: string) => m.toLowerCase().replace(/[^a-z]+/g, " ").trim();

export interface CardPaymentHabit { payees: Set<string>; typical: number; months: number }

/**
 * How the user actually pays each card: payments out of another account that
 * match a payment received on the card (same amount, within 4 days). Gives the
 * payee names used (so the repeating charge isn't listed twice) and the typical
 * amount paid.
 */
export function cardPaymentHabits(txns: PayTxn[], cardIds: Set<string>): Map<string, CardPaymentHabit> {
  const out = new Map<string, CardPaymentHabit>();
  const received = txns.filter((t) => cardIds.has(t.accountId) && t.amount > 0);
  const used = new Set<string>();
  const amounts = new Map<string, number[]>();
  const months = new Map<string, Set<string>>();
  for (const t of txns) {
    if (t.amount >= 0 || cardIds.has(t.accountId)) continue;
    const c = (t.category ?? "").toUpperCase();
    if (!c.startsWith("LOAN_PAYMENTS") && !c.startsWith("TRANSFER")) continue;
    const day = new Date(t.date + "T00:00:00").getTime();
    const p = received.find((r) => !used.has(r.id) && Math.abs(r.amount + t.amount) < 0.01 && Math.abs(new Date(r.date + "T00:00:00").getTime() - day) <= 4 * 86400000);
    if (!p) continue;
    used.add(p.id);
    const h = out.get(p.accountId) ?? { payees: new Set<string>(), typical: 0, months: 0 };
    h.payees.add(payee(t.merchant));
    out.set(p.accountId, h);
    (amounts.get(p.accountId) ?? amounts.set(p.accountId, []).get(p.accountId)!).push(-t.amount);
    (months.get(p.accountId) ?? months.set(p.accountId, new Set()).get(p.accountId)!).add(t.date.slice(0, 7));
  }
  for (const [id, h] of out) {
    const a = (amounts.get(id) ?? []).sort((x, y) => x - y);
    h.typical = a.length ? a[Math.floor(a.length / 2)] : 0;
    h.months = months.get(id)?.size ?? 0;
  }
  return out;
}

/** True if this charge is a card payment the bank already reports a due date for. */
export function isReportedCardPayment(merchant: string, habits: Map<string, CardPaymentHabit>, liabilities: DebtObligation[]): boolean {
  const name = payee(merchant);
  return liabilities.some((l) => l.kind === "card" && habits.get(l.accountId)?.payees.has(name));
}

/** Sum of monthly minimum payments the bank reports across cards and loans. */
export function monthlyMinimums(liabilities: DebtObligation[]): number {
  return liabilities.reduce((s, l) => s + (l.minimumPayment && l.minimumPayment > 0 ? l.minimumPayment : 0), 0);
}

export interface DuePayment {
  merchant: string;
  next: Date;
  category: string;
  amount: number;
  fromBank: true;
  overdue: boolean;
}

const KIND_LABEL: Record<DebtObligation["kind"], string> = {
  card: "Card minimum payment",
  student: "Student loan payment",
  mortgage: "Mortgage payment",
};

function parseDay(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

/** Card and loan payments due within `days`. */
export function duePayments(liabilities: DebtObligation[], accounts: DebtAccount[], days = 30, now = new Date(), habits?: Map<string, CardPaymentHabit>): DuePayment[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(today.getTime() + days * 86400000);
  const names = new Map(accounts.map((a) => [a.id, a]));
  const out: DuePayment[] = [];
  for (const l of liabilities) {
    if (!l.nextDueDate || !l.minimumPayment || l.minimumPayment <= 0) continue;
    const acct = names.get(l.accountId);
    if (acct && (acct.current ?? acct.balance ?? 0) <= 0 && l.kind === "card") continue; // nothing owed
    const next = nextDue(l, today)!;
    if (next > horizon) continue;
    // A card the user regularly pays more than the minimum on shows the usual
    // payment, with the minimum noted.
    const usual = l.kind === "card" ? habits?.get(l.accountId) : undefined;
    const paysMore = usual && usual.months >= 2 && usual.typical > l.minimumPayment;
    out.push({
      merchant: acct ? `${acct.name}${acct.mask ? ` ••${acct.mask}` : ""}` : KIND_LABEL[l.kind],
      next,
      category: l.overdue ? "Overdue" : paysMore ? `Card payment you usually make · min $${Math.round(l.minimumPayment)}` : KIND_LABEL[l.kind],
      amount: paysMore ? usual!.typical : l.minimumPayment, fromBank: true, overdue: l.overdue,
    });
  }
  return out;
}

/** Next due date; a past date (when not overdue) rolls forward a month at a time. */
export function nextDue(l: DebtObligation, now = new Date()): Date | null {
  if (!l.nextDueDate) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = parseDay(l.nextDueDate);
  if (!l.overdue) while (next < today) next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
  return next;
}

export function shortDate(d: string | null): string | null {
  if (!d) return null;
  return parseDay(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** One-line summary of an account's terms, e.g. "Min $35 due Nov 20 · 24.99% APR". */
export function debtTermsLine(l: DebtObligation | undefined): string | null {
  if (!l) return null;
  const parts: string[] = [];
  if (l.overdue) parts.push("Overdue");
  const due = nextDue(l);
  if (l.minimumPayment != null && due) parts.push(`${l.kind === "card" ? "Min " : ""}$${Math.round(l.minimumPayment).toLocaleString()} due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  if (l.apr != null) parts.push(`${l.apr.toFixed(2)}% ${l.kind === "card" ? "APR" : "rate"}`);
  if (l.payoffDate) parts.push(`${l.kind === "mortgage" ? "Matures" : "Paid off by"} ${shortDate(l.payoffDate)}`);
  return parts.length ? parts.join(" · ") : null;
}
