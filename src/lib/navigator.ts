// Shared helper used by the Health and Forecast pages: projecting upcoming
// recurring obligations. (Choosing the next best move lives in the Priority Engine.)

import { detectRecurring, type RecurringObligation } from "@/lib/intelligence";
import type { LiveTxn } from "@/lib/useFinancialData";

export interface UpcomingObligation extends RecurringObligation {
  next: Date;
}

/**
 * Recurring charges expected within the next `days` days. Each charge's next
 * date is projected as one month after it was last seen (rolled forward if that
 * date has already passed).
 */
export function upcomingObligations(transactions: LiveTxn[], days = 30, now = new Date()): UpcomingObligation[] {
  const horizon = new Date(now.getTime() + days * 86400000);
  return detectRecurring(transactions)
    .map((r) => {
      const last = new Date(r.sample[0].date + "T00:00:00");
      let next = new Date(last.getFullYear(), last.getMonth() + 1, last.getDate());
      while (next < now) next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate());
      return { ...r, next };
    })
    .filter((r) => r.next <= horizon)
    .sort((a, b) => a.next.getTime() - b.next.getTime());
}
