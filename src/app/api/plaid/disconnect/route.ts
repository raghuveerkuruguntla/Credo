import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient, plaidConfigured } from "@/lib/plaid";
import { getItemsForUser, removeItemForUser } from "@/lib/store";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { itemId } = (await request.json()) as { itemId?: string };
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  // Verify the item belongs to this user before doing anything
  const items = await getItemsForUser(userId);
  const item = items.find((i) => i.itemId === itemId);
  if (!item) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Revoke the access token at Plaid (best-effort), then delete our record
  if (plaidConfigured()) {
    try {
      await plaidClient.itemRemove({ access_token: item.accessToken });
    } catch (err) {
      console.error("Plaid itemRemove failed (removing local record anyway):", err);
    }
  }

  await removeItemForUser(userId, itemId);
  return NextResponse.json({ success: true });
}
