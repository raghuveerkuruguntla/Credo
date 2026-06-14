import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrisma, databaseConfigured } from "@/lib/db";
import { entitlementsFor, normalizePlan } from "@/lib/entitlements";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await currentUser();
  const plan = normalizePlan(user?.publicMetadata?.plan);
  const limit = entitlementsFor(plan).aiQuestions;
  const month = new Date().toISOString().slice(0, 7);

  let used = 0;
  if (databaseConfigured()) {
    const rec = await getPrisma().aiUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    used = rec?.count ?? 0;
  }

  return NextResponse.json({ used, limit, plan, month });
}
