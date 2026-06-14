"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Plus, Loader2 } from "lucide-react";

interface PlaidLinkButtonProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  label?: string;
  className?: string;
}

export default function PlaidLinkButton({ size = "sm", variant = "primary", label = "Connect Account", className }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to initialize Plaid");
        setLoading(false);
        return;
      }
      setLinkToken(data.link_token);
    } catch {
      setError("Network error — could not reach the server");
      setLoading(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token,
          institution_name: metadata.institution?.name,
        }),
      });
      setLinkToken(null);
      setLoading(false);
      router.refresh();
    },
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  // Open Plaid Link as soon as the token arrives and the SDK is ready
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button size={size} variant={variant} className={className} onClick={fetchLinkToken} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {label}
      </Button>
      {error && <p className="text-xs text-red-500 max-w-60 text-right">{error}</p>}
    </div>
  );
}
