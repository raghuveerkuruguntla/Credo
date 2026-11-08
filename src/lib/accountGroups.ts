// Groups connected accounts by the kinds of products people actually hold:
// the "many places" money lives (checking, savings, CDs, retirement,
// investments, credit cards, loans, mortgages). Uses Plaid's account type /
// subtype, which LiveAccount.type carries.

import type { LiveAccount } from "@/lib/useFinancialData";

export type AccountGroupId = "cash" | "savings" | "cds" | "retirement" | "investments" | "cards" | "loans" | "mortgages" | "other";

export interface AccountGroupMeta { id: AccountGroupId; label: string; liability: boolean; hint: string }

export const ACCOUNT_GROUPS: AccountGroupMeta[] = [
  { id: "cash", label: "Checking", liability: false, hint: "Everyday spending accounts" },
  { id: "savings", label: "Savings", liability: false, hint: "Savings and money market" },
  { id: "cds", label: "CDs", liability: false, hint: "Certificates of deposit" },
  { id: "retirement", label: "Retirement", liability: false, hint: "IRAs, Roth IRAs, 401(k)s" },
  { id: "investments", label: "Investments", liability: false, hint: "Brokerage, HSA, 529" },
  { id: "cards", label: "Credit cards", liability: true, hint: "Revolving credit" },
  { id: "loans", label: "Loans", liability: true, hint: "Auto, personal, student" },
  { id: "mortgages", label: "Mortgages", liability: true, hint: "Home loans and HELOCs" },
  { id: "other", label: "Other", liability: false, hint: "Accounts we couldn't classify" },
];

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

export function groupOf(a: Pick<LiveAccount, "type">): AccountGroupId {
  const t = (a.type ?? "").toLowerCase();
  if (has(t, ["mortgage", "home equity", "heloc"])) return "mortgages";
  if (has(t, ["credit card", "credit"]) && !has(t, ["line of credit"])) return "cards";
  if (has(t, ["auto", "student", "personal", "loan", "line of credit", "consumer", "commercial"])) return "loans";
  if (t === "cd" || has(t, ["certificate"])) return "cds";
  if (has(t, ["ira", "roth", "401", "403", "457", "pension", "retirement", "keogh", "sep", "simple", "tsp"])) return "retirement";
  if (has(t, ["brokerage", "investment", "hsa", "529", "mutual fund", "stock", "crypto", "education"])) return "investments";
  if (has(t, ["savings", "money market"])) return "savings";
  if (has(t, ["checking", "cash management", "prepaid", "paypal", "depository"])) return "cash";
  return "other";
}

export interface AccountGroup extends AccountGroupMeta { accounts: LiveAccount[]; total: number }

/** Connected accounts grouped by type (empty groups included, so gaps are visible). */
export function groupAccounts(accounts: LiveAccount[]): AccountGroup[] {
  return ACCOUNT_GROUPS.map((g) => {
    const accts = accounts.filter((a) => groupOf(a) === g.id);
    return { ...g, accounts: accts, total: accts.reduce((s, a) => s + Math.abs(a.balance ?? 0), 0) };
  }).filter((g) => g.id !== "other" || g.accounts.length > 0);
}
