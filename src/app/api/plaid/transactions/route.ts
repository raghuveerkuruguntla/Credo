import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`plaid:${userId}`, LIMITS.plaid);
  if (limited) return limited;
  if (!plaidConfigured()) {
    return NextResponse.json({ transactions: [], configured: false });
  }

  try {
    const items = await getItemsForUser(userId);
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const transactions = [];

    for (const item of items) {
      const response = await plaidClient.transactionsGet({
        access_token: item.accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 250 },
      });
      for (const txn of response.data.transactions) {
        transactions.push({
          id: txn.transaction_id,
          accountId: txn.account_id,
          date: txn.date,
          merchant: txn.merchant_name ?? txn.name,
          amount: -txn.amount, // Plaid: positive = money out; flip to app convention
          category: txn.personal_finance_category?.primary ?? "Other",
          pending: txn.pending,
          currency: txn.iso_currency_code,
        });
      }
    }

    transactions.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ transactions, configured: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
