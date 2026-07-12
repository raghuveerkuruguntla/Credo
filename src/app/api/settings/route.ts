import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`write:${userId}`, { limit: 30, windowSec: 60 });
  if (limited) return limited;

  const { preferences } = (await request.json()) as { preferences?: Record<string, unknown> };
  if (!preferences || typeof preferences !== "object") {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  const user = await currentUser();
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user?.publicMetadata,
      preferences,
    },
  });

  return NextResponse.json({ success: true });
}
