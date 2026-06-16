"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { Plan } from "@/lib/entitlements";

export default function LockedFeature({
  feature,
  requiredPlan,
  description,
}: {
  feature: string;
  requiredPlan: Exclude<Plan, "FREE">;
  description?: string;
}) {
  const planLabel = requiredPlan === "PRO" ? "Pro" : "Plus";
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-orange-400" />
      </div>
      <h2 className="text-base font-semibold text-stone-100 mb-1">{feature} is a {planLabel} feature</h2>
      <p className="text-sm text-stone-500 max-w-sm mb-5">
        {description ?? `Upgrade to Finza ${planLabel} to unlock ${feature.toLowerCase()}.`}
      </p>
      <Link
        href="/billing"
        className="bg-stone-100 text-stone-900 hover:bg-white rounded-full px-5 py-2.5 text-sm font-semibold transition-colors shadow-[0_0_24px_rgba(99,102,241,0.15)]"
      >
        Upgrade to {planLabel}
      </Link>
    </div>
  );
}
