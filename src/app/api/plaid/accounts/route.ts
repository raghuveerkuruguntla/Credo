import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ accounts: [], configured: false });
  }

  try {
    const items = await getItemsForUser(userId);
    const accounts = [];

    for (const item of items) {
      const response = await plaidClient.accountsGet({ access_token: item.accessToken });
      for (const acct of response.data.accounts) {
        accounts.push({
          id: acct.account_id,
          itemId: item.itemId,
          name: acct.name,
          officialName: acct.official_name,
          institution: item.institutionName,
          type: acct.subtype ?? acct.type,
          balance: acct.balances.current,
          available: acct.balances.available,
          mask: acct.mask,
          currency: acct.balances.iso_currency_code,
        });
      }
    }

    return NextResponse.json({ accounts, configured: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
