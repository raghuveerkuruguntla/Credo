// Server-side: card and loan details from Plaid Liabilities (next due date,
// minimum payment, APR, payoff/maturity date). Items linked before Liabilities
// was requested, or institutions that don't support it, simply return nothing.

import { plaidClient } from "@/lib/plaid";
import type { PlaidItem } from "@/lib/store";

export interface DebtObligation {
  accountId: string;
  kind: "card" | "student" | "mortgage";
  minimumPayment: number | null;
  nextDueDate: string | null;     // YYYY-MM-DD
  apr: number | null;             // percent, e.g. 24.99
  lastStatementBalance: number | null;
  payoffDate: string | null;      // student: expected payoff, mortgage: maturity
  overdue: boolean;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export async function fetchLiabilities(items: PlaidItem[]): Promise<DebtObligation[]> {
  const out: DebtObligation[] = [];
  await Promise.all(items.map(async (item) => {
    try {
      const { data } = await plaidClient.liabilitiesGet({ access_token: item.accessToken });
      const l = data.liabilities;
      for (const c of l.credit ?? []) {
        if (!c.account_id) continue;
        const purchase = (c.aprs ?? []).find((a) => a.apr_type === "purchase_apr") ?? (c.aprs ?? [])[0];
        out.push({
          accountId: c.account_id, kind: "card",
          minimumPayment: num(c.minimum_payment_amount), nextDueDate: str(c.next_payment_due_date),
          apr: num(purchase?.apr_percentage), lastStatementBalance: num(c.last_statement_balance),
          payoffDate: null, overdue: Boolean(c.is_overdue),
        });
      }
      for (const s of l.student ?? []) {
        if (!s.account_id) continue;
        out.push({
          accountId: s.account_id, kind: "student",
          minimumPayment: num(s.minimum_payment_amount), nextDueDate: str(s.next_payment_due_date),
          apr: num(s.interest_rate_percentage), lastStatementBalance: num(s.last_statement_balance),
          payoffDate: str(s.expected_payoff_date), overdue: Boolean(s.is_overdue),
        });
      }
      for (const m of l.mortgage ?? []) {
        if (!m.account_id) continue;
        out.push({
          accountId: m.account_id, kind: "mortgage",
          minimumPayment: num(m.next_monthly_payment), nextDueDate: str(m.next_payment_due_date),
          apr: num(m.interest_rate?.percentage), lastStatementBalance: null,
          payoffDate: str(m.maturity_date), overdue: (num(m.past_due_amount) ?? 0) > 0,
        });
      }
    } catch {
      // Not consented / not supported for this item: skip quietly.
    }
  }));
  return out;
}
