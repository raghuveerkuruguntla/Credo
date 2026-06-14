"use client";

import { useUser } from "@clerk/nextjs";
import { entitlementsFor, normalizePlan, type Plan, type Entitlements } from "@/lib/entitlements";

export type { Plan };

export function usePlan(): { plan: Plan; ent: Entitlements; limits: Entitlements; isLoaded: boolean } {
  const { user, isLoaded } = useUser();
  const plan = normalizePlan(user?.publicMetadata?.plan);
  const ent = entitlementsFor(plan);
  // `limits` kept as an alias for backwards compatibility with existing callers
  return { plan, ent, limits: ent, isLoaded };
}
