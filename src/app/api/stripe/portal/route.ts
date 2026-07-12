import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`stripe:${userId}`, LIMITS.stripe);
  if (limited) return limited;
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const user = await currentUser();
  const customerId = user?.publicMetadata?.stripeCustomerId as string | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found — upgrade to a paid plan first" }, { status: 404 });
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
