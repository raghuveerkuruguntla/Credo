"use client";

import { useState, useMemo } from "react";
import { useFinancialData, prettyCategory, categoryColor } from "@/lib/useFinancialData";
import { usePlan } from "@/lib/usePlan";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import { Search, Download, ChevronDown, ChevronLeft, ChevronRight, X, Eye, EyeOff } from "lucide-react";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const { ent } = usePlan();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAccount, setSelectedAccount] = useState("All");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [hideAmounts, setHideAmounts] = useState(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(transactions.map((t) => prettyCategory(t.category)))).sort()],
    [transactions]
  );

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchSearch = search === "" || t.merchant.toLowerCase().includes(search.toLowerCase());
        const matchCat = selectedCategory === "All" || prettyCategory(t.category) === selectedCategory;
        const matchAcct = selectedAccount === "All" || t.accountId === selectedAccount;
        return matchSearch && matchCat && matchAcct;
      })
      .sort((a, b) => {
        const diff = b.date.localeCompare(a.date);
        return sortDir === "desc" ? diff : -diff;
      });
  }, [transactions, search, selectedCategory, selectedAccount, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageTxns = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const totalIncome = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const masked = "••••";
  const showAmount = (v: string) => (hideAmounts ? masked : v);
  const acctName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  function exportCsv() {
    const rows = [["Date", "Merchant", "Category", "Account", "Amount"]];
    for (const t of filtered) {
      rows.push([t.date, t.merchant, prettyCategory(t.category), acctName(t.accountId), String(t.amount)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `finpilot-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageNumbers = useMemo(() => {
    const pages = new Set<number>([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [safePage, totalPages]);

  if (loading) return <div className="p-6"><LoadingState /></div>;
  if (!hasData) return <div className="p-6"><EmptyState /></div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-100">Transactions</h1>
          <p className="text-sm text-stone-400">{filtered.length} transactions · Last 90 days</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHideAmounts(!hideAmounts)}>
            {hideAmounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {hideAmounts ? "Show" : "Hide"} amounts
          </Button>
          {ent.dataExport ? (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          ) : (
            <Link href="/billing">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" /> Export CSV (Pro)
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Money In", value: formatCurrency(totalIncome), color: "text-emerald-400" },
          { label: "Money Out", value: formatCurrency(totalExpenses), color: "text-red-400" },
          { label: "Net", value: formatCurrency(totalIncome - totalExpenses), color: totalIncome - totalExpenses >= 0 ? "text-emerald-400" : "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#16120f] border border-[#ffffff0f] rounded-xl p-4">
            <p className="text-xs text-stone-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{showAmount(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <div className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search merchants..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#ffffff14] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="text-sm border border-[#ffffff14] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            value={selectedAccount}
            onChange={(e) => { setSelectedAccount(e.target.value); setPage(1); }}
            className="text-sm border border-[#ffffff14] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="All">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {(search || selectedCategory !== "All" || selectedAccount !== "All") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSelectedCategory("All"); setSelectedAccount("All"); setPage(1); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#ffffff0f]">
                <th className="text-left text-xs font-semibold text-stone-500 px-6 py-3 uppercase tracking-wide">
                  <button className="flex items-center gap-1 hover:text-stone-300" onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}>
                    Date <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
                  </button>
                </th>
                <th className="text-left text-xs font-semibold text-stone-500 px-4 py-3 uppercase tracking-wide">Merchant</th>
                <th className="text-left text-xs font-semibold text-stone-500 px-4 py-3 uppercase tracking-wide">Category</th>
                <th className="text-left text-xs font-semibold text-stone-500 px-4 py-3 uppercase tracking-wide">Account</th>
                <th className="text-right text-xs font-semibold text-stone-500 px-6 py-3 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageTxns.map((txn, i) => (
                <tr key={txn.id} className={`hover:bg-[#ffffff0a] transition-colors ${i < pageTxns.length - 1 ? "border-b border-[#ffffff0a]" : ""}`}>
                  <td className="px-6 py-3.5 text-sm text-stone-400 whitespace-nowrap">{formatDate(txn.date)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#ffffff0d] flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ color: categoryColor(prettyCategory(txn.category)) }}>
                        {prettyCategory(txn.category).slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium text-stone-100">{txn.merchant}{txn.pending && <span className="text-xs text-stone-500 ml-1.5">(pending)</span>}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-[#ffffff12] text-stone-400 px-2 py-1 rounded-full whitespace-nowrap">
                      {prettyCategory(txn.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-stone-400 whitespace-nowrap">{acctName(txn.accountId)}</td>
                  <td className={`px-6 py-3.5 text-sm font-semibold text-right whitespace-nowrap ${txn.amount > 0 ? "text-emerald-400" : "text-stone-100"}`}>
                    {hideAmounts ? masked : `${txn.amount > 0 ? "+" : ""}${formatCurrency(txn.amount)}`}
                  </td>
                </tr>
              ))}
              {pageTxns.length === 0 && (
                <tr><td colSpan={5} className="text-center text-stone-500 py-12 text-sm">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#ffffff0f]">
          <p className="text-xs text-stone-500">
            Showing {filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage <= 1}
              className="p-1.5 rounded-md text-stone-400 hover:bg-[#ffffff12] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((p, i) => (
              <span key={p} className="flex items-center">
                {i > 0 && pageNumbers[i - 1] !== p - 1 && <span className="px-1 text-xs text-stone-600">…</span>}
                <button
                  onClick={() => setPage(p)}
                  className={`min-w-7 h-7 text-xs font-medium rounded-md transition-colors ${p === safePage ? "bg-orange-500 text-white" : "text-stone-400 hover:bg-[#ffffff12]"}`}
                >
                  {p}
                </button>
              </span>
            ))}
            <button
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-md text-stone-400 hover:bg-[#ffffff12] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
