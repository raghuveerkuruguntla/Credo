import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { enforceRateLimit } from "@/lib/rate-limit";

// Saves the user's monthly budget (category -> limit) to their profile.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`write:${userId}`, { limit: 30, windowSec: 60 });
  if (limited) return limited;

  const { budget } = (await request.json()) as { budget?: Record<string, unknown> };
  if (budget == null || typeof budget !== "object") {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }

  // Sanitize: keep non-empty category names with non-negative numeric limits
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(budget)) {
    const name = k.trim();
    const n = Number(v);
    if (name && Number.isFinite(n) && n >= 0) {
      clean[name] = Math.round(n * 100) / 100;
    }
  }

  const user = await currentUser();
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { ...user?.publicMetadata, budget: clean },
  });

  return NextResponse.json({ success: true, budget: clean });
}
