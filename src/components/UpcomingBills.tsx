"use client";

// "Coming up" card: recurring obligations expected in the next N days, their
// total, and the cash left after paying them. Shared by Health and Forecast.

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { upcomingObligations } from "@/lib/navigator";
import type { LiveTxn } from "@/lib/useFinancialData";

export default function UpcomingBills({
  transactions, cash, days = 30, className, forecastLink = false,
}: {
  transactions: LiveTxn[];
  cash: number;
  days?: number;
  className?: string;
  forecastLink?: boolean;
}) {
  const upcoming = useMemo(() => upcomingObligations(transactions, days), [transactions, days]);
  const total = upcoming.reduce((s, r) => s + r.amount, 0);
  const after = cash - total;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Coming up in the next {days} days</CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-400">No recurring bills detected yet. They appear once a charge repeats across two months.</p>
        ) : (
          <>
            <ul className="divide-y divide-white/[0.05]">
              {upcoming.slice(0, 8).map((r, idx) => (
                <li key={`${r.merchant}-${idx}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200 truncate">{r.merchant}</p>
                    <p className="text-xs text-stone-500">{r.next.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {r.category}</p>
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
              Dates are projected from each bill&apos;s last charge.
              {forecastLink && <> <Link href="/forecast" className="text-indigo-300 hover:text-indigo-200">Full forecast</Link></>}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
