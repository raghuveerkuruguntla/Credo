import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/base-url";

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

  const origin = getBaseUrl(request);

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe portal error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't open the billing portal. Please try again." }, { status: 500 });
  }
}
