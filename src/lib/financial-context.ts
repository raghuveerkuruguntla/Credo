import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { computeHealth, healthInputsFrom, healthSummaryText, type HealthAccount, type HealthTxn } from "@/lib/health";

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
    const healthAccounts: HealthAccount[] = [];
    const healthTxns: HealthTxn[] = [];

    for (const item of items) {
      const accountsRes = await plaidClient.accountsGet({ access_token: item.accessToken });
      lines.push(`Institution: ${item.institutionName}`);
      for (const a of accountsRes.data.accounts) {
        const bal = a.balances.current ?? 0;
        const signed = a.type === "credit" || a.type === "loan" ? -bal : bal;
        totalBalance += signed;
        healthAccounts.push({
          type: a.subtype ?? a.type,
          balance: a.type === "depository" && a.balances.available != null ? a.balances.available : a.balances.current,
          current: a.balances.current,
          available: a.balances.available,
        });
        lines.push(
          `  - ${a.name} (${a.subtype ?? a.type}${a.mask ? `, ····${a.mask}` : ""}): balance $${bal.toFixed(2)}${a.balances.available != null ? `, available $${a.balances.available.toFixed(2)}` : ""}`
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
        const cat = t.personal_finance_category?.primary ?? "OTHER";
        if (t.amount > 0) categoryTotals[cat] = (categoryTotals[cat] ?? 0) + t.amount;
        else totalIncome += Math.abs(t.amount);
        healthTxns.push({ date: t.date, amount: -t.amount, category: cat }); // app convention: negative = money out
        txnLines.push(`  ${t.date} | ${t.merchant_name ?? t.name} | $${t.amount.toFixed(2)} | ${cat}${t.pending ? " (pending)" : ""}`);
      }
    }

    const healthText = healthSummaryText(computeHealth(healthInputsFrom(healthAccounts, healthTxns)));
    if (healthText) lines.push(healthText, "");

    lines.push(`Total income (money in) over last 90 days: $${totalIncome.toFixed(2)}`);
    lines.push("", "Spending by category (last 90 days, money out):");
    for (const [cat, total] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
      lines.push(`  - ${cat}: $${total.toFixed(2)}`);
    }
    lines.push("", "Recent transactions (last 90 days, up to 100 per institution; positive = money out, negative = money in):");
    lines.push(...txnLines.slice(0, 120));

    return { context: lines.join("\n"), live: true };
  } catch (err) {
    console.error("Failed to fetch live Plaid data for AI context:", err);
    return { context: "", live: false };
  }
}
