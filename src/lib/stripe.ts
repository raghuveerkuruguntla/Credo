import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Lazy init so the app builds/runs without a Stripe key configured.
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { typescript: true });
  }
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Plan definitions used to create Checkout sessions with inline prices,
// so no products need to be pre-created in the Stripe dashboard.
export const PLANS = {
  plus: { name: "FinPilot Plus", amount: 999, interval: "month" as const },
  pro: { name: "FinPilot Pro", amount: 1999, interval: "month" as const },
};

export type PlanKey = keyof typeof PLANS;
