"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ENTITLEMENTS, PLAN_FEATURES, PLAN_PRICING, normalizePlan, type Plan } from "@/lib/entitlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, Zap, CreditCard, Shield, Loader2, PartyPopper, ExternalLink } from "lucide-react";

function BillingContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = normalizePlan(user?.publicMetadata?.plan);
  const currentRank = ENTITLEMENTS[currentPlan].rank;
  const justUpgraded = searchParams.get("upgraded");
  const checkoutCanceled = searchParams.get("canceled");

  async function upgrade(planName: string) {
    const plan = planName.toLowerCase(); // "plus" | "pro"
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start checkout");
        setLoadingPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — could not reach the server");
      setLoadingPlan(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to open billing portal");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error — could not reach the server");
      setPortalLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-100">Billing & Plans</h1>
        <p className="text-sm text-stone-400">Manage your subscription and payment methods</p>
      </div>

      {justUpgraded && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 mb-5 flex items-center gap-3">
          <PartyPopper className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Welcome to FinPilot {justUpgraded === "pro" ? "Pro" : "Plus"}!</p>
            <p className="text-xs text-emerald-400">Your payment was successful. It may take a few seconds for your plan to update.</p>
          </div>
        </div>
      )}
      {checkoutCanceled && (
        <div className="bg-[#ffffff12] border border-[#ffffff14] rounded-xl p-4 mb-5">
          <p className="text-sm text-stone-400">Checkout canceled — no charge was made.</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Current plan */}
      <Card className="mb-6 border-orange-500/20 bg-orange-500/[0.07]">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffffff12] flex items-center justify-center">
                <Zap className={`w-5 h-5 ${currentPlan === "FREE" ? "text-stone-400" : "text-orange-400"}`} />
              </div>
              <div>
                <p className="font-semibold text-stone-100">
                  {currentPlan === "FREE" ? "Free Plan" : currentPlan === "PLUS" ? "FinPilot Plus" : "FinPilot Pro"}
                </p>
                <p className="text-sm text-stone-400">
                  {currentPlan === "FREE" ? "$0/month" : currentPlan === "PLUS" ? "$9.99/month" : "$19.99/month"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={currentPlan === "FREE" ? "muted" : "success"}>Current plan</Badge>
              {currentPlan !== "FREE" && (
                <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  Manage subscription
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(["FREE", "PLUS", "PRO"] as Plan[]).map((planKey) => {
          const ent = ENTITLEMENTS[planKey];
          const pricing = PLAN_PRICING[planKey];
          const features = PLAN_FEATURES[planKey];
          const highlighted = planKey === "PLUS";
          const isCurrent = currentPlan === planKey;
          const isUpgrade = ent.rank > currentRank;
          const isDowngrade = ent.rank < currentRank;

          return (
            <div
              key={planKey}
              className={`rounded-2xl border p-5 relative ${isCurrent ? "border-orange-500/50 shadow-lg shadow-orange-500/10 bg-[#16120f]" : highlighted ? "border-orange-500/30 bg-[#16120f]" : "border-[#ffffff14] bg-[#16120f]"}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Your plan</span>
                </div>
              )}
              {!isCurrent && highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</span>
                </div>
              )}
              <div className="mb-4">
                <p className="font-bold text-stone-100 text-lg">{ent.label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold text-stone-100">{pricing.price === 0 ? "Free" : `$${pricing.price}`}</span>
                  {pricing.price > 0 && <span className="text-stone-500 text-sm">/mo</span>}
                </div>
                <p className="text-xs text-stone-400 mt-1">{pricing.description}</p>
              </div>
              <ul className="space-y-2 mb-5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-stone-300">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${highlighted ? "text-orange-400" : "text-emerald-400"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#ffffff12] text-stone-500 cursor-default">
                  Current plan
                </button>
              ) : isUpgrade ? (
                <button
                  onClick={() => upgrade(ent.label)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${highlighted ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-stone-100 text-stone-900 hover:bg-white"} disabled:opacity-60`}
                >
                  {loadingPlan === planKey.toLowerCase() && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upgrade to {ent.label}
                </button>
              ) : isDowngrade && planKey === "FREE" ? (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-[#ffffff1f] text-stone-400 hover:bg-[#ffffff0a] transition-colors disabled:opacity-60"
                >
                  Cancel subscription
                </button>
              ) : (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-[#ffffff1f] text-stone-400 hover:bg-[#ffffff0a] transition-colors disabled:opacity-60"
                >
                  Downgrade to {ent.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment method */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          {currentPlan === "FREE" ? (
            <div className="border-2 border-dashed border-[#ffffff14] rounded-xl p-6 text-center">
              <CreditCard className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No payment method on file</p>
              <p className="text-xs text-stone-500">Payment details are collected securely by Stripe when you upgrade.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-stone-400">Payment methods, invoices, and cancellation are managed in the Stripe billing portal.</p>
              <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Open portal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security note */}
      <div className="flex items-start gap-2 text-xs text-stone-500">
        <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Payments are processed securely by Stripe. FinPilot never stores your card details. You can cancel anytime.</span>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}
