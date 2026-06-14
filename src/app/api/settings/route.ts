import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
