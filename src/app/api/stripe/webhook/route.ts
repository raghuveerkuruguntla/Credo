import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getStripe, stripeConfigured } from "@/lib/stripe";

async function setUserPlan(clerkUserId: string, plan: string, stripeCustomerId?: string) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      plan,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
  });
}

export async function POST(request: Request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Trim to guard against a trailing newline/space pasted into the env var
    const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const clerkUserId = session.metadata?.clerkUserId;
        const plan = session.metadata?.plan;
        if (clerkUserId && plan) {
          await setUserPlan(clerkUserId, plan.toUpperCase(), session.customer as string);
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const clerkUserId = sub.metadata?.clerkUserId;
        const plan = sub.metadata?.plan;
        if (clerkUserId && plan) {
          const active = sub.status === "active" || sub.status === "trialing";
          await setUserPlan(clerkUserId, active ? plan.toUpperCase() : "FREE");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const clerkUserId = sub.metadata?.clerkUserId;
        if (clerkUserId) {
          await setUserPlan(clerkUserId, "FREE");
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handling failed:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
