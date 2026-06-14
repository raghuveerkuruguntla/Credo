"use client";

import { useState, useMemo } from "react";
import { useFinancialData, signedBalance, isDebt } from "@/lib/useFinancialData";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { Eye, EyeOff } from "lucide-react";

export default function NetWorthPage() {
  const { accounts, loading, hasData } = useFinancialData();
  const [show, setShow] = useState(false);
  const masked = "••••••";

  const { assets, liabilities, totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    const assets = accounts.filter((a) => !isDebt(a));
    const liabilities = accounts.filter(isDebt);
    const totalAssets = assets.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
    const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);
    return { assets, liabilities, totalAssets, totalLiabilities, netWorth };
  }, [accounts]);

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  const val = (n: number) => (show ? formatCurrency(n) : masked);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Net Worth</h1>
          <p className="text-sm text-stone-400">Assets minus liabilities across {accounts.length} accounts</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShow(!show)}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? "Hide" : "Show"} balances
        </Button>
      </div>

      {/* Hero */}
      <Card className="mb-6 bg-gradient-to-br from-orange-600 to-orange-800 border-0">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-orange-100/80 text-sm mb-2 uppercase tracking-wide">Total Net Worth</p>
          <p className="text-5xl font-bold mb-2 text-white">{val(netWorth)}</p>
          <p className="text-orange-100/80 text-sm">
            {val(totalAssets)} assets − {val(totalLiabilities)} liabilities
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Assets</CardTitle>
            <span className="text-sm font-bold text-emerald-400">{val(totalAssets)}</span>
          </CardHeader>
          <div>
            {assets.map((acct, i) => (
              <div key={acct.id} className={`flex items-center gap-3 px-6 py-3.5 hover:bg-[#ffffff0a] transition-colors ${i < assets.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  {acct.institution[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-100">{acct.name}</p>
                  <p className="text-xs text-stone-500">{acct.institution} · {acct.type}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">{show ? formatCurrency(acct.balance ?? 0) : masked}</p>
              </div>
            ))}
            {assets.length === 0 && <div className="px-6 py-8 text-center text-sm text-stone-500">No asset accounts.</div>}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Liabilities</CardTitle>
            <span className="text-sm font-bold text-red-400">{val(totalLiabilities)}</span>
          </CardHeader>
          <div>
            {liabilities.map((acct, i) => (
              <div key={acct.id} className={`flex items-center gap-3 px-6 py-3.5 hover:bg-[#ffffff0a] transition-colors ${i < liabilities.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-red-500/80 flex items-center justify-center text-white text-xs font-bold">
                  {acct.institution[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-100">{acct.name}</p>
                  <p className="text-xs text-stone-500">{acct.institution} · {acct.type}</p>
                </div>
                <p className="text-sm font-bold text-red-400">{show ? formatCurrency(Math.abs(acct.balance ?? 0)) : masked}</p>
              </div>
            ))}
            {liabilities.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-stone-500">No liabilities — great work! 🎉</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
