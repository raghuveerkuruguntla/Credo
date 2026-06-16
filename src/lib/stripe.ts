import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Trim to defend against trailing spaces/newlines pasted into env vars — a
// stray newline in the key breaks the Authorization header and surfaces as a
// "connection to Stripe" error rather than an auth error.
function secretKey(): string {
  return (process.env.STRIPE_SECRET_KEY ?? "").trim();
}

// Lazy init so the app builds/runs without a Stripe key configured.
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(secretKey(), {
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 20000,
    });
  }
  return _stripe;
}

export function stripeConfigured(): boolean {
  return secretKey().startsWith("sk_");
}

// Plan definitions used to create Checkout sessions with inline prices,
// so no products need to be pre-created in the Stripe dashboard.
export const PLANS = {
  plus: { name: "Finza Plus", amount: 999, interval: "month" as const },
  pro: { name: "Finza Pro", amount: 1999, interval: "month" as const },
};

export type PlanKey = keyof typeof PLANS;
