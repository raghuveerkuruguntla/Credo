import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { demoAccounts, isDemoRequest } from "@/lib/demoData";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`plaid:${userId}`, LIMITS.plaid);
  if (limited) return limited;
  if (isDemoRequest(req)) return NextResponse.json({ accounts: demoAccounts(), configured: true, demo: true });
  if (!plaidConfigured()) {
    return NextResponse.json({ accounts: [], configured: false });
  }

  try {
    const items = await getItemsForUser(userId);
    const accounts = [];

    for (const item of items) {
      const response = await plaidClient.accountsGet({ access_token: item.accessToken });
      for (const acct of response.data.accounts) {
        // For cash (depository) accounts, prefer the "available" balance so the
        // figure matches what the user sees in their bank app (current includes
        // not-yet-posted pending transactions). For credit/loan/investment,
        // "available" means something different (e.g. available credit), so we
        // keep "current".
        const current = acct.balances.current;
        const available = acct.balances.available;
        const displayBalance =
          acct.type === "depository" && available != null ? available : current;
        accounts.push({
          id: acct.account_id,
          itemId: item.itemId,
          name: acct.name,
          officialName: acct.official_name,
          institution: item.institutionName,
          type: acct.subtype ?? acct.type,
          balance: displayBalance,
          current,
          available,
          mask: acct.mask,
          currency: acct.balances.iso_currency_code,
        });
      }
    }

    return NextResponse.json({ accounts, configured: true });
  } catch (err: unknown) {
    console.error("Plaid accounts error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load your accounts right now. Please try again." }, { status: 500 });
  }
}
