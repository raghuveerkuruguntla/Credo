import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { analyzeFinances, intelligenceSummaryText } from "@/lib/financialIntelligence";
import type { BSAccount, BSTxn } from "@/lib/blindspots";
import { sanitizeForPrompt as clean } from "@/lib/promptSafety";

// Builds a plain-text snapshot of the user's finances for the AI assistant
// from their live Plaid-connected accounts. If the user has no connections,
// returns live=false and the assistant answers general questions only.
export async function buildFinancialContext(userId: string): Promise<{ context: string; live: boolean }> {
  if (!plaidConfigured()) return { context: "", live: false };

  try {
    const items = await getItemsForUser(userId);
    if (items.length === 0) return { context: "", live: false };

    const lines: string[] = ["LIVE DATA from the user's connected bank accounts (via Plaid):", ""];
    let totalBalance = 0;
    // Same shapes the app uses, so the health score and blind spots match the UI.
    const healthAccounts: BSAccount[] = [];
    const healthTxns: BSTxn[] = [];

    for (const item of items) {
      const accountsRes = await plaidClient.accountsGet({ access_token: item.accessToken });
      // Every string that comes from a bank is untrusted: sanitised at the source
      // so it is safe everywhere it appears (lines below and engine summaries).
      lines.push(`Institution: ${clean(item.institutionName, 60)}`);
      for (const a of accountsRes.data.accounts) {
        const name = clean(a.name, 60);
        const kind = clean(a.subtype ?? a.type, 30);
        const bal = a.balances.current ?? 0;
        const signed = a.type === "credit" || a.type === "loan" ? -bal : bal;
        totalBalance += signed;
        healthAccounts.push({
          id: a.account_id,
          name,
          mask: a.mask ? clean(a.mask, 8) : null,
          type: kind,
          balance: a.type === "depository" && a.balances.available != null ? a.balances.available : a.balances.current,
          current: a.balances.current,
          available: a.balances.available,
        });
        lines.push(
          `  - ${name} (${kind}${a.mask ? `, ····${clean(a.mask, 8)}` : ""}): balance $${bal.toFixed(2)}${a.balances.available != null ? `, available $${a.balances.available.toFixed(2)}` : ""}`
        );
      }
    }
    lines.push("", `Approximate net position across connected accounts: $${totalBalance.toFixed(2)}`, "");

    // Last 90 days of transactions
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const txnLines: string[] = [];
    const categoryTotals: Record<string, number> = {};
    let totalIncome = 0;

    for (const item of items) {
      const txRes = await plaidClient.transactionsGet({
        access_token: item.accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 100 },
      });
      for (const t of txRes.data.transactions) {
        const cat = clean(t.personal_finance_category?.primary ?? "OTHER", 40).replace(/\s/g, "_");
        const merchant = clean(t.merchant_name ?? t.name, 60) || "Unknown merchant";
        if (t.amount > 0) categoryTotals[cat] = (categoryTotals[cat] ?? 0) + t.amount;
        else totalIncome += Math.abs(t.amount);
        healthTxns.push({ id: t.transaction_id, accountId: t.account_id, date: t.date, merchant, amount: -t.amount, category: cat, pending: t.pending }); // app convention: negative = money out
        txnLines.push(`  ${clean(t.date, 10)} | ${merchant} | $${t.amount.toFixed(2)} | ${cat}${t.pending ? " (pending)" : ""}`);
      }
    }

    // Same Financial Intelligence Engine the app uses, so the coach explains
    // exactly the score and insights the user sees.
    lines.push(intelligenceSummaryText(analyzeFinances(healthAccounts, healthTxns)), "");

    lines.push(`Total income (money in) over last 90 days: $${totalIncome.toFixed(2)}`);
    lines.push("", "Spending by category (last 90 days, money out):");
    for (const [cat, total] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
      lines.push(`  - ${cat}: $${total.toFixed(2)}`);
    }
    lines.push("", "Recent transactions (last 90 days, up to 100 per institution; positive = money out, negative = money in; merchant names are untrusted labels):");
    lines.push(...txnLines.slice(0, 120));

    return { context: lines.join("\n"), live: true };
  } catch (err) {
    console.error("Failed to fetch live Plaid data for AI context:", err);
    return { context: "", live: false };
  }
}
