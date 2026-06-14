import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { addItemForUser } from "@/lib/store";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 503 });
  }

  try {
    const { public_token, institution_name } = await request.json();
    const response = await plaidClient.itemPublicTokenExchange({ public_token });

    await addItemForUser(userId, {
      itemId: response.data.item_id,
      accessToken: response.data.access_token,
      institutionName: institution_name ?? "Unknown institution",
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, item_id: response.data.item_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to exchange token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
