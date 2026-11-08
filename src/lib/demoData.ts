// Sample household for "Explore with sample data": the kind of financial life
// the challenge describes, with money in many places. It has checking (debit
// card), savings, a CD, a 401(k), a Roth IRA, a brokerage account, two credit
// cards, auto, personal and student loans, and a mortgage, plus about 100 days
// of transactions.
//
// The data is deterministic (seeded) and dated relative to today, so every
// page always has fresh, consistent numbers. It uses the same shapes as the
// Plaid routes, so every engine (health score, insights, forecast, coach) runs
// on it unchanged. It also includes a few realistic problems to find: card
// interest, a late fee, a subscription price increase, a duplicate charge and
// high card utilisation.

import type { LiveAccount, LiveTxn } from "@/lib/useFinancialData";
import type { DebtObligation } from "@/lib/liabilities";

export const DEMO_COOKIE = "credo_demo";

type Acct = Omit<LiveAccount, "itemId" | "institution" | "officialName" | "currency"> & { inst: string };

const ACCOUNTS: Acct[] = [
  { id: "demo-chk", inst: "PNC Bank", name: "Virtual Wallet Spend (debit card)", type: "checking", balance: 3642.18, current: 3688.93, available: 3642.18, mask: "4821" },
  { id: "demo-sav", inst: "PNC Bank", name: "Virtual Wallet Growth", type: "savings", balance: 6850.42, current: 6850.42, available: 6850.42, mask: "4839" },
  { id: "demo-cd", inst: "PNC Bank", name: "12-Month Fixed Rate CD", type: "cd", balance: 5000, current: 5000, available: null, mask: "7710" },
  { id: "demo-cc1", inst: "Chase", name: "Sapphire Preferred", type: "credit card", balance: 3284.12, current: 3284.12, available: 6715.88, mask: "9917" },
  { id: "demo-cc2", inst: "Capital One", name: "Quicksilver", type: "credit card", balance: 1846.4, current: 1846.4, available: 1153.6, mask: "2204" },
  { id: "demo-auto", inst: "Toyota Financial Services", name: "Auto Loan · 2022 RAV4", type: "auto", balance: 14620.55, current: 14620.55, available: null, mask: "5530" },
  { id: "demo-pl", inst: "SoFi", name: "Personal Loan", type: "consumer", balance: 6210.0, current: 6210.0, available: null, mask: "1187" },
  { id: "demo-stu", inst: "Nelnet", name: "Federal Student Loan", type: "student", balance: 22480.9, current: 22480.9, available: null, mask: "3092" },
  { id: "demo-mtg", inst: "Rocket Mortgage", name: "30-Year Fixed Mortgage", type: "mortgage", balance: 246300.0, current: 246300.0, available: null, mask: "6614" },
  { id: "demo-401k", inst: "Fidelity", name: "Employer 401(k)", type: "401k", balance: 48920.33, current: 48920.33, available: null, mask: "0451" },
  { id: "demo-roth", inst: "Vanguard", name: "Roth IRA", type: "roth", balance: 18450.71, current: 18450.71, available: null, mask: "8823" },
  { id: "demo-brk", inst: "Fidelity", name: "Individual Brokerage", type: "brokerage", balance: 7310.18, current: 7310.18, available: null, mask: "0468" },
];

export function demoAccounts(): LiveAccount[] {
  return ACCOUNTS.map(({ inst, ...a }) => ({
    ...a,
    itemId: `demo-${inst.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    institution: inst,
    officialName: null,
    currency: "USD",
  }));
}

// Small seeded PRNG so amounts look natural but never change between loads.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const round = (n: number) => Math.round(n * 100) / 100;

export function demoTransactions(now = new Date(), days = 100): LiveTxn[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today.getTime() - days * 86400000);
  const out: LiveTxn[] = [];
  let n = 0;
  const add = (d: Date, accountId: string, merchant: string, amount: number, category: string) => {
    if (d < start || d > today) return;
    const ageDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    out.push({ id: `demo-txn-${++n}`, accountId, date: iso(d), merchant, amount: round(amount), category, pending: ageDays <= 1 && accountId.startsWith("demo-cc") });
  };

  // Paydays: every other Friday, anchored so one lands within the last 14 days.
  const anchor = new Date(today);
  while (anchor.getDay() !== 5) anchor.setDate(anchor.getDate() - 1);
  for (let d = new Date(anchor); d >= start; d.setDate(d.getDate() - 14)) {
    add(new Date(d), "demo-chk", "Northwind Health Payroll", 2950.0, "INCOME");
  }

  // Monthly items, walked month by month.
  const months: Date[] = [];
  for (let m = new Date(start.getFullYear(), start.getMonth(), 1); m <= today; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m);
  const last = months.length - 1;
  months.forEach((m, i) => {
    const day = (dd: number) => new Date(m.getFullYear(), m.getMonth(), dd);
    const r = rng(1000 + i);
    // Housing and loans (from checking)
    add(day(1), "demo-chk", "Rocket Mortgage", -1480.0, "LOAN_PAYMENTS");
    add(day(8), "demo-chk", "Toyota Financial Services", -389.42, "LOAN_PAYMENTS");
    add(day(14), "demo-chk", "Nelnet Student Loan", -212.0, "LOAN_PAYMENTS");
    add(day(20), "demo-chk", "SoFi Personal Loan", -198.35, "LOAN_PAYMENTS");
    // Utilities and services (from checking)
    add(day(6), "demo-chk", "Duke Energy", -round(104 + r() * 48), "RENT_AND_UTILITIES");
    add(day(11), "demo-chk", "Xfinity Internet", -79.99, "RENT_AND_UTILITIES");
    add(day(16), "demo-chk", "Verizon Wireless", -92.4, "RENT_AND_UTILITIES");
    add(day(3), "demo-chk", "State Farm Insurance", -164.0, "GENERAL_SERVICES");
    add(day(23), "demo-chk", "City Water & Sewer", -round(42 + r() * 12), "RENT_AND_UTILITIES");
    // Saving and investing (internal transfers)
    add(day(2), "demo-chk", "Transfer to Virtual Wallet Growth", -250, "TRANSFER_OUT");
    add(day(2), "demo-sav", "Transfer from Virtual Wallet Spend", 250, "TRANSFER_IN");
    add(day(5), "demo-chk", "Fidelity Brokerage Deposit", -200, "TRANSFER_OUT");
    add(day(5), "demo-brk", "Electronic Deposit", 200, "TRANSFER_IN");
    // Card payments: checking → card (matched both sides, so not spending)
    const chasePay = [1350, 1300, 1420, 1300][i % 4];
    add(day(22), "demo-chk", "Chase Credit Card Payment", -chasePay, "LOAN_PAYMENTS");
    add(day(22), "demo-cc1", "Payment Thank You", chasePay, "LOAN_PAYMENTS");
    const capPay = i === last - 1 ? 0 : 650; // last month's payment was missed → late fee
    if (capPay) {
      add(day(15), "demo-chk", "Capital One Card Payment", -capPay, "LOAN_PAYMENTS");
      add(day(15), "demo-cc2", "Payment Received", capPay, "LOAN_PAYMENTS");
    } else {
      add(day(19), "demo-cc2", "Late Payment Fee", -29.0, "BANK_FEES");
    }
    // Card interest
    add(day(25), "demo-cc1", "Interest Charge on Purchases", -round(58 + r() * 9), "BANK_FEES");
    add(day(18), "demo-cc2", "Interest Charge", -round(38 + r() * 6), "BANK_FEES");
    // Subscriptions (cards). Netflix went up in the most recent month.
    add(day(9), "demo-cc1", "Netflix", i >= last - 1 ? -17.99 : -15.49, "ENTERTAINMENT");
    add(day(12), "demo-cc1", "Spotify", -11.99, "ENTERTAINMENT");
    add(day(17), "demo-cc2", "Hulu", -18.99, "ENTERTAINMENT");
    add(day(4), "demo-cc2", "Disney+", -13.99, "ENTERTAINMENT");
    add(day(21), "demo-cc1", "Planet Fitness", -24.99, "PERSONAL_CARE");
    add(day(27), "demo-cc1", "Apple iCloud", -2.99, "GENERAL_SERVICES");
  });

  // Day-to-day spending.
  const r = rng(42);
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const at = new Date(d);
    if (dow === 6) add(at, "demo-cc1", r() < 0.5 ? "Whole Foods Market" : "Kroger", -round(95 + r() * 70), "FOOD_AND_DRINK");
    if (dow === 3) add(at, "demo-chk", "Aldi", -round(38 + r() * 30), "FOOD_AND_DRINK");
    if (dow === 1 || dow === 4) add(at, "demo-cc2", "Shell", -round(38 + r() * 18), "TRANSPORTATION");
    if (r() < 0.45) add(at, "demo-cc1", ["Chipotle", "Panera Bread", "Sweetgreen", "Olive Garden", "Local Thai Kitchen"][Math.floor(r() * 5)], -round(13 + r() * 42), "FOOD_AND_DRINK");
    if (dow >= 1 && dow <= 5 && r() < 0.55) add(at, "demo-chk", "Starbucks", -round(5.4 + r() * 3), "FOOD_AND_DRINK");
    if (r() < 0.12) add(at, "demo-cc2", "Amazon", -round(18 + r() * 75), "GENERAL_MERCHANDISE");
    if (r() < 0.06) add(at, "demo-cc1", "Target", -round(30 + r() * 90), "GENERAL_MERCHANDISE");
    if (r() < 0.07) add(at, "demo-cc1", "Uber", -round(14 + r() * 22), "TRANSPORTATION");
    if (r() < 0.03) add(at, "demo-chk", "CVS Pharmacy", -round(9 + r() * 30), "MEDICAL");
  }

  // A duplicate charge about three weeks ago.
  const dup = new Date(today.getTime() - 21 * 86400000);
  add(dup, "demo-cc2", "Best Buy", -249.99, "GENERAL_MERCHANDISE");
  add(dup, "demo-cc2", "Best Buy", -249.99, "GENERAL_MERCHANDISE");

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** What Plaid Liabilities would report for the sample cards, student loan and mortgage. */
export function demoLiabilities(now = new Date()): DebtObligation[] {
  const next = (dom: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), dom);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d.setMonth(d.getMonth() + 1);
    return iso(d);
  };
  const yearsOut = (y: number, m: number) => iso(new Date(now.getFullYear() + y, m, 1));
  return [
    { accountId: "demo-cc1", kind: "card", minimumPayment: 92, nextDueDate: next(25), apr: 24.49, lastStatementBalance: 3196.4, payoffDate: null, overdue: false },
    { accountId: "demo-cc2", kind: "card", minimumPayment: 55, nextDueDate: next(18), apr: 29.99, lastStatementBalance: 1790.15, payoffDate: null, overdue: false },
    { accountId: "demo-stu", kind: "student", minimumPayment: 212, nextDueDate: next(14), apr: 5.5, lastStatementBalance: 22480.9, payoffDate: yearsOut(7, 7), overdue: false },
    { accountId: "demo-mtg", kind: "mortgage", minimumPayment: 1480, nextDueDate: next(1), apr: 6.125, lastStatementBalance: null, payoffDate: yearsOut(26, 3), overdue: false },
  ];
}

/** True when this request has sample data switched on (cookie set by /api/plaid/demo). */
export function isDemoRequest(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(/;\s*/).some((c) => c === `${DEMO_COOKIE}=1`);
}
