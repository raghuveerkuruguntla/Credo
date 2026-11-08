// Client-safe helpers for card and loan payments reported by the bank
// (Plaid Liabilities): which are due soon, and what to show per account.

import type { DebtObligation } from "@/lib/liabilities";
import type { LiveAccount } from "@/lib/useFinancialData";

type DebtAccount = Pick<LiveAccount, "id" | "name" | "balance" | "current"> & { mask?: string | null };

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
export function duePayments(liabilities: DebtObligation[], accounts: DebtAccount[], days = 30, now = new Date()): DuePayment[] {
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
    out.push({
      merchant: acct ? `${acct.name}${acct.mask ? ` ••${acct.mask}` : ""}` : KIND_LABEL[l.kind],
      next, category: l.overdue ? "Overdue" : KIND_LABEL[l.kind],
      amount: l.minimumPayment, fromBank: true, overdue: l.overdue,
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
