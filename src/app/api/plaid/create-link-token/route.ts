import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { CountryCode, Products } from "plaid";

const MAX_INSTITUTIONS = 10;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`plaid:${userId}`, LIMITS.plaid);
  if (limited) return limited;
  if (!plaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local." },
      { status: 503 }
    );
  }

  // Everyone gets every feature; this is only an abuse/cost safeguard, not a plan limit.
  const existing = await getItemsForUser(userId);
  if (existing.length >= MAX_INSTITUTIONS) {
    return NextResponse.json(
      { error: `You can connect up to ${MAX_INSTITUTIONS} institutions. Remove one in Accounts to add another.`, limitReached: true },
      { status: 403 }
    );
  }

  try {
    const base = {
      user: { client_user_id: userId },
      client_name: "Credo",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    };
    // Ask for Liabilities (card/loan due dates, minimums, APRs, payoff dates)
    // when the institution supports it. If the Plaid account doesn't have the
    // product enabled, fall back to Transactions only.
    let response;
    try {
      response = await plaidClient.linkTokenCreate({ ...base, optional_products: [Products.Liabilities] });
    } catch {
      response = await plaidClient.linkTokenCreate(base);
    }
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    console.error("Plaid create-link-token error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't start the bank connection. Please try again." }, { status: 500 });
  }
}
