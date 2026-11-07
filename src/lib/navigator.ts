// Shared "navigator" helpers used by the Health, Dashboard and Forecast pages:
// picking the single next best move, and projecting upcoming obligations.

import { detectRecurring, type Recommendation, type RecurringObligation } from "@/lib/intelligence";
import type { LiveTxn } from "@/lib/useFinancialData";
import type { HealthIndicator, IndicatorId } from "@/lib/health";

// Which recommendation lifts which health indicator fastest, in priority order.
const MOVES_FOR: Record<IndicatorId, string[]> = {
  utilization: ["rec_debt", "rec_trim", "rec_subs"],
  dti: ["rec_debt", "rec_trim", "rec_subs"],
  cushion: ["rec_savings", "rec_trim", "rec_subs"],
  savingsRate: ["rec_savings", "rec_trim", "rec_subs"],
};

export interface NextMove {
  move: Recommendation;
  /** The indicator this move improves, or null when it is simply the top-ranked move. */
  targets: HealthIndicator | null;
}

/** The recommendation that best improves the weakest indicator; else the top-ranked one. */
export function pickNextMove(recs: Recommendation[], weakest: HealthIndicator | null): NextMove | undefined {
  if (weakest) {
    for (const id of MOVES_FOR[weakest.id]) {
      const r = recs.find((x) => x.id === id);
      if (r) return { move: r, targets: weakest };
    }
  }
  return recs[0] ? { move: recs[0], targets: null } : undefined;
}

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
