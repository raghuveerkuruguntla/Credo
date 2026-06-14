"use client";

import { useEffect, useState } from "react";

export interface LiveAccount {
  id: string;
  itemId: string;
  name: string;
  officialName?: string | null;
  institution: string;
  type: string;
  balance: number | null;   // display balance (available for cash, current otherwise)
  current: number | null;
  available: number | null;
  mask: string | null;
  currency: string | null;
}

export interface LiveTxn {
  id: string;
  accountId: string;
  date: string;
  merchant: string;
  amount: number; // negative = money out, positive = money in
  category: string; // Plaid primary category, e.g. "FOOD_AND_DRINK"
  pending: boolean;
}

interface DataBundle { accounts: LiveAccount[]; transactions: LiveTxn[] }

// Module-level cache so navigating between pages doesn't refetch.
let cache: DataBundle | null = null;
let inflight: Promise<DataBundle> | null = null;

async function fetchAll(): Promise<DataBundle> {
  const [a, t] = await Promise.all([
    fetch("/api/plaid/accounts").then((r) => r.json()),
    fetch("/api/plaid/transactions").then((r) => r.json()),
  ]);
  return { accounts: a.accounts ?? [], transactions: t.transactions ?? [] };
}

export function refreshFinancialData() {
  cache = null;
  inflight = null;
}

export function useFinancialData() {
  const [data, setData] = useState<DataBundle | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) { setData(cache); setLoading(false); return; }
    inflight = inflight ?? fetchAll();
    inflight
      .then((d) => { cache = d; setData(d); })
      .catch(() => setError("Could not load your financial data"))
      .finally(() => setLoading(false));
  }, []);

  const accounts = data?.accounts ?? [];
  const transactions = data?.transactions ?? [];
  return { accounts, transactions, loading, error, hasData: accounts.length > 0 };
}

// ── Helpers ─────────────────────────────────────────────────────────

const INVESTMENT_TYPES = ["investment", "brokerage", "401k", "403b", "ira", "roth", "hsa", "retirement", "529", "pension", "mutual fund"];
const DEBT_TYPES = ["credit", "credit card", "loan", "mortgage", "student", "auto", "line of credit"];

export function isInvestment(a: LiveAccount): boolean {
  return INVESTMENT_TYPES.some((t) => (a.type ?? "").toLowerCase().includes(t));
}

export function isDebt(a: LiveAccount): boolean {
  return DEBT_TYPES.some((t) => (a.type ?? "").toLowerCase().includes(t));
}

// Net-worth-signed balance: debts count negative.
export function signedBalance(a: LiveAccount): number {
  const bal = a.balance ?? 0;
  return isDebt(a) ? -Math.abs(bal) : bal;
}

export function prettyCategory(c: string): string {
  if (!c) return "Other";
  return c
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const PALETTE = ["#f97316", "#10b981", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#6366f1", "#ef4444", "#84cc16", "#14b8a6", "#a855f7", "#fb7185"];

export function categoryColor(cat: string): string {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Average monthly income/expenses from the available transaction window.
export function monthlyAverages(transactions: LiveTxn[]): { income: number; expenses: number; byCategory: Record<string, number>; months: number } {
  if (transactions.length === 0) return { income: 0, expenses: 0, byCategory: {}, months: 0 };
  const monthsSet = new Set(transactions.map((t) => t.date.slice(0, 7)));
  const months = Math.max(1, monthsSet.size);
  let income = 0, expenses = 0;
  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.amount > 0) income += t.amount;
    else {
      expenses += Math.abs(t.amount);
      const cat = prettyCategory(t.category);
      byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
    }
  }
  for (const k of Object.keys(byCategory)) byCategory[k] = Math.round((byCategory[k] / months) * 100) / 100;
  return {
    income: Math.round((income / months) * 100) / 100,
    expenses: Math.round((expenses / months) * 100) / 100,
    byCategory,
    months,
  };
}
