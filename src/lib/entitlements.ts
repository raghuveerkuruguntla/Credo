// Central source of truth for what each plan can do.
// Imported by both client components (via usePlan) and server routes.
// IMPORTANT: distinguishes `null` (unlimited) from a numeric cap — never use
// `?? fallback` on these values, since `null ?? n` would wrongly yield n.

export type Plan = "FREE" | "PLUS" | "PRO";

export interface Entitlements {
  label: string;
  rank: number; // for upgrade/downgrade comparison
  aiQuestions: number | null;      // null = unlimited
  maxInstitutions: number | null;  // null = unlimited
  advancedAnalytics: boolean;      // weekly trends + custom date ranges (Spending)
  customDateRange: boolean;        // custom date range picker (Spending)
  forecasting: boolean;            // what-if forecast tool
  investmentAnalytics: boolean;    // investments page
  aiBudgetSuggestions: boolean;    // AI budget recommendations
  dataExport: boolean;             // CSV / PDF export
  prioritySupport: boolean;
}

export const ENTITLEMENTS: Record<Plan, Entitlements> = {
  FREE: {
    label: "Free",
    rank: 0,
    aiQuestions: 10,
    maxInstitutions: 2,
    advancedAnalytics: false,
    customDateRange: false,
    forecasting: false,
    investmentAnalytics: false,
    aiBudgetSuggestions: false,
    dataExport: false,
    prioritySupport: false,
  },
  PLUS: {
    label: "Plus",
    rank: 1,
    aiQuestions: 50,
    maxInstitutions: 5,
    advancedAnalytics: true,
    customDateRange: true,
    forecasting: true,
    investmentAnalytics: false,
    aiBudgetSuggestions: true,
    dataExport: false,
    prioritySupport: false,
  },
  PRO: {
    label: "Pro",
    rank: 2,
    aiQuestions: null,
    maxInstitutions: null,
    advancedAnalytics: true,
    customDateRange: true,
    forecasting: true,
    investmentAnalytics: true,
    aiBudgetSuggestions: true,
    dataExport: true,
    prioritySupport: true,
  },
};

export function normalizePlan(raw: unknown): Plan {
  const p = String(raw ?? "FREE").toUpperCase();
  return p === "PRO" ? "PRO" : p === "PLUS" ? "PLUS" : "FREE";
}

export function entitlementsFor(raw: unknown): Entitlements {
  return ENTITLEMENTS[normalizePlan(raw)];
}

// Human-readable feature lists shown on the pricing/billing UI.
// Kept in sync with the entitlements above.
export const PLAN_FEATURES: Record<Plan, string[]> = {
  FREE: [
    "Connect up to 2 institutions",
    "Dashboard & net worth",
    "Transaction history",
    "This / last month spending",
    "10 AI questions per month",
  ],
  PLUS: [
    "Connect up to 5 institutions",
    "Advanced spending analytics",
    "Custom date ranges",
    "Financial forecasting",
    "AI budget suggestions",
    "50 AI questions per month",
  ],
  PRO: [
    "Unlimited institutions",
    "Everything in Plus",
    "Investment analytics",
    "Data export (CSV)",
    "Unlimited AI questions",
    "Priority support",
  ],
};

export const PLAN_PRICING: Record<Plan, { price: number; description: string }> = {
  FREE: { price: 0, description: "Get started with the essentials — free forever." },
  PLUS: { price: 9.99, description: "Smarter analytics, forecasting, and more AI." },
  PRO: { price: 19.99, description: "The complete Finza experience." },
};
