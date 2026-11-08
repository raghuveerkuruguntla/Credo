import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { demoTransactions, isDemoRequest } from "@/lib/demoData";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`plaid:${userId}`, LIMITS.plaid);
  if (limited) return limited;
  if (isDemoRequest(req)) return NextResponse.json({ transactions: demoTransactions(new Date(), 90), configured: true, demo: true });
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
    console.error("Plaid transactions error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load your transactions right now. Please try again." }, { status: 500 });
  }
}
