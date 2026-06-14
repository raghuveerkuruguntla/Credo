"use client";

import PlaidLinkButton from "@/components/PlaidLinkButton";
import { Landmark, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading your financial data…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-stone-500">
      <Loader2 className="w-4 h-4 animate-spin" /> {label}
    </div>
  );
}

export default function EmptyState({
  title = "No accounts connected yet",
  message = "Connect your bank, credit card, or brokerage to see your real data here.",
}: { title?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
        <Landmark className="w-6 h-6 text-orange-400" />
      </div>
      <h2 className="text-base font-semibold text-stone-100 mb-1">{title}</h2>
      <p className="text-sm text-stone-500 max-w-sm mb-5">{message}</p>
      <PlaidLinkButton
        size="md"
        label="Connect your first account"
        className="bg-stone-100 text-stone-900 hover:bg-white rounded-full px-5 font-semibold shadow-[0_0_24px_rgba(249,115,22,0.15)]"
      />
    </div>
  );
}
