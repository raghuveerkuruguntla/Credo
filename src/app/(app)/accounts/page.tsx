"use client";

import { useState, useMemo } from "react";
import { useFinancialData, refreshFinancialData, signedBalance, isDebt } from "@/lib/useFinancialData";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { RefreshCw, Link2, Eye, EyeOff, Building2, ChevronDown, Trash2, Loader2 } from "lucide-react";

export default function AccountsPage() {
  const { accounts, loading, hasData } = useFinancialData();
  // Balances hidden by default for privacy — click to reveal
  const [showBalances, setShowBalances] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleInst = (inst: string) => setExpanded((p) => ({ ...p, [inst]: !p[inst] }));
  const masked = "••••••";
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function disconnect(itemId: string, institution: string) {
    if (!confirm(`Disconnect ${institution}? This removes its accounts and revokes FinPilot's access. You can reconnect anytime.`)) return;
    setDisconnecting(itemId);
    try {
      const res = await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Failed to disconnect");
        setDisconnecting(null);
        return;
      }
      refreshFinancialData();
      window.location.reload();
    } catch {
      alert("Network error — could not disconnect");
      setDisconnecting(null);
    }
  }

  const { totalAssets, totalDebt, netWorth, institutions } = useMemo(() => {
    const totalAssets = accounts.filter((a) => !isDebt(a)).reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalDebt = accounts.filter(isDebt).reduce((s, a) => s + Math.abs(a.balance ?? 0), 0);
    const netWorth = accounts.reduce((s, a) => s + signedBalance(a), 0);
    const institutions = Array.from(new Set(accounts.map((a) => a.institution)));
    return { totalAssets, totalDebt, netWorth, institutions };
  }, [accounts]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Accounts</h1>
          <p className="text-sm text-stone-400">
            {accounts.length} connected account{accounts.length !== 1 ? "s" : ""} via Plaid
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowBalances(!showBalances)}>
            {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showBalances ? "Hide" : "Show"} balances
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { refreshFinancialData(); window.location.reload(); }}>
            <RefreshCw className="w-4 h-4" /> Sync
          </Button>
          <PlaidLinkButton size="sm" label="Add account" />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Assets", value: totalAssets, color: "text-emerald-400" },
              { label: "Total Liabilities", value: totalDebt, color: "text-red-400" },
              { label: "Net Worth", value: netWorth, color: "text-stone-100" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>
                    {showBalances ? formatCurrency(s.value) : masked}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Institutions */}
          <div className="space-y-4">
            {institutions.map((inst) => {
              const accts = accounts.filter((a) => a.institution === inst);
              const instTotal = accts.reduce((s, a) => s + signedBalance(a), 0);
              return (
                <Card key={inst}>
                  <button onClick={() => toggleInst(inst)} className="w-full text-left">
                    <CardHeader className="flex-row items-center justify-between pb-3 cursor-pointer hover:bg-[#ffffff08] rounded-t-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                          {inst[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-100">{inst}</p>
                          <p className="text-xs text-stone-500">{accts.length} account{accts.length > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-stone-100">
                            {showBalances ? formatCurrency(instTotal) : masked}
                          </p>
                          <p className="text-xs text-stone-500">Total</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${expanded[inst] ? "rotate-180" : ""}`} />
                      </div>
                    </CardHeader>
                  </button>
                  {expanded[inst] && (
                    <div className="border-t border-[#ffffff0a]">
                      {accts.map((acct, i) => (
                        <div key={acct.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-[#ffffff0a] transition-colors ${i < accts.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                          <Building2 className="w-5 h-5 text-stone-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-stone-100">{acct.name}</p>
                            <p className="text-xs text-stone-500">{acct.mask ? `····${acct.mask}` : "—"}{acct.officialName ? ` · ${acct.officialName}` : ""}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDebt(acct) ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                            {acct.type}
                          </span>
                          <p className={`text-sm font-bold w-28 text-right ${isDebt(acct) ? "text-red-400" : "text-stone-100"}`}>
                            {showBalances ? (acct.balance != null ? formatCurrency(acct.balance) : "—") : masked}
                          </p>
                        </div>
                      ))}
                      <div className="px-6 py-3 flex justify-end border-t border-[#ffffff0a]">
                        <button
                          onClick={() => disconnect(accts[0].itemId, inst)}
                          disabled={disconnecting === accts[0].itemId}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {disconnecting === accts[0].itemId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Disconnect {inst}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Add institution CTA */}
          <div className="mt-4 border-2 border-dashed border-[#ffffff14] rounded-xl p-8 text-center">
            <div className="w-10 h-10 bg-[#ffffff12] rounded-xl flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-5 h-5 text-stone-500" />
            </div>
            <p className="text-sm font-medium text-stone-300 mb-1">Connect another institution</p>
            <p className="text-xs text-stone-500 mb-3">Link your bank, credit union, or brokerage via Plaid</p>
            <PlaidLinkButton size="sm" variant="outline" label="Connect with Plaid" />
          </div>
        </>
      )}
    </div>
  );
}
