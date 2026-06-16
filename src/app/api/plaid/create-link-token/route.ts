import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { entitlementsFor } from "@/lib/entitlements";
import { CountryCode, Products } from "plaid";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to .env.local." },
      { status: 503 }
    );
  }

  // Enforce the per-plan institution limit
  const user = await currentUser();
  const ent = entitlementsFor(user?.publicMetadata?.plan);
  if (ent.maxInstitutions !== null) {
    const existing = await getItemsForUser(userId);
    if (existing.length >= ent.maxInstitutions) {
      return NextResponse.json(
        {
          error: `Your ${ent.label} plan allows up to ${ent.maxInstitutions} connected institution${ent.maxInstitutions === 1 ? "" : "s"}. Upgrade to connect more.`,
          limitReached: true,
        },
        { status: 403 }
      );
    }
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Finza",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
