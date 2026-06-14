import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, stripeConfigured, PLANS, PlanKey } from "@/lib/stripe";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local." },
      { status: 503 }
    );
  }

  const { plan } = (await request.json()) as { plan: PlanKey };
  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const existingCustomerId = user?.publicMetadata?.stripeCustomerId as string | undefined;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      ...(existingCustomerId ? { customer: existingCustomerId } : { customer_email: email }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PLANS[plan].amount,
            recurring: { interval: PLANS[plan].interval },
            product_data: { name: PLANS[plan].name },
          },
        },
      ],
      metadata: { clerkUserId: userId, plan },
      subscription_data: { metadata: { clerkUserId: userId, plan } },
      success_url: `${origin}/billing?upgraded=${plan}`,
      cancel_url: `${origin}/billing?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    // Log full details so Vercel runtime logs show the real cause
    const e = err as { type?: string; code?: string; statusCode?: number; message?: string };
    console.error("Stripe checkout error:", {
      type: e?.type,
      code: e?.code,
      statusCode: e?.statusCode,
      message: e?.message,
    });
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
