import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidConfigured } from "@/lib/plaid";
import { getItemsForUser } from "@/lib/store";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { fetchLiabilities } from "@/lib/liabilities";
import { demoLiabilities, isDemoRequest } from "@/lib/demoData";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const limited = await enforceRateLimit(`plaid:${userId}`, LIMITS.plaid);
  if (limited) return limited;
  if (isDemoRequest(req)) return NextResponse.json({ liabilities: demoLiabilities() });
  if (!plaidConfigured()) return NextResponse.json({ liabilities: [] });
  try {
    const items = await getItemsForUser(userId);
    return NextResponse.json({ liabilities: await fetchLiabilities(items) });
  } catch (err: unknown) {
    console.error("Plaid liabilities error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ liabilities: [] });
  }
}
