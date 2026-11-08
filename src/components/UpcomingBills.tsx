"use client";

// "Coming up" card: recurring obligations expected in the next N days, their
// total, and the cash left after paying them. Shared by Health and Forecast.

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { upcomingObligations } from "@/lib/navigator";
import { useFinancialData, useLiabilities, type LiveTxn } from "@/lib/useFinancialData";
import { duePayments } from "@/lib/obligations";

export default function UpcomingBills({
  transactions, cash, days = 30, className, forecastLink = false,
}: {
  transactions: LiveTxn[];
  cash: number;
  days?: number;
  className?: string;
  forecastLink?: boolean;
}) {
  const { accounts } = useFinancialData();
  const { liabilities } = useLiabilities();
  // Bills detected from repeating charges, plus card and loan payments the bank
  // reports directly. When the bank reports them, repeating "loan payment"
  // charges are dropped so they aren't counted twice.
  const upcoming = useMemo(() => {
    const debts = duePayments(liabilities, accounts, days);
    const bills = upcomingObligations(transactions, days)
      .filter((r) => !(debts.length > 0 && r.sample[0]?.category === "LOAN_PAYMENTS"))
      .map((r) => ({ merchant: r.merchant, next: r.next, category: r.category, amount: r.amount, fromBank: false }));
    return [...bills, ...debts].sort((a, b) => a.next.getTime() - b.next.getTime());
  }, [transactions, days, liabilities, accounts]);
  const total = upcoming.reduce((s, r) => s + r.amount, 0);
  const after = cash - total;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Coming up in the next {days} days</CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-400">No bills or payments due yet. Bills appear once a charge repeats across two months; card and loan payments appear when your bank shares due dates.</p>
        ) : (
          <>
            <ul className="divide-y divide-white/[0.05]">
              {upcoming.slice(0, 8).map((r, idx) => (
                <li key={`${r.merchant}-${idx}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200 truncate">{r.merchant}</p>
                    <p className="text-xs text-stone-500">{r.next.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {r.category}{r.fromBank && <span className="text-indigo-300"> · from your bank</span>}</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-200 shrink-0">{formatCurrency(-r.amount)}</span>
                </li>
              ))}
            </ul>
            {upcoming.length > 8 && <p className="text-xs text-stone-500 mt-2">+{upcoming.length - 8} more</p>}
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-stone-400">Total due</span><span className="text-stone-100 font-semibold">{formatCurrency(-total)}</span></div>
              <div className="flex justify-between">
                <span className="text-stone-400">Cash after these bills</span>
                <span className={cn("font-semibold", after < 0 ? "text-amber-300" : "text-emerald-300")}>{formatCurrency(after)}</span>
              </div>
              {after < 0 && <p className="text-xs text-amber-300">Your cash doesn&apos;t cover these bills. Plan a transfer or income before the first due date.</p>}
            </div>
            <p className="text-[11px] text-stone-500 mt-3">
              Bill dates are projected from each bill&apos;s last charge; card and loan due dates and minimums come from your bank when available.
              {forecastLink && <> <Link href="/forecast" className="text-indigo-300 hover:text-indigo-200">Full forecast</Link></>}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
