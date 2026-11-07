"use client";

// Ties the Priority Engine to live data and to the user's choices.
// Choices persist in this browser, like Insights and Blind Spots. A completed
// or dismissed item stays hidden unless its situation materially changes
// (its fingerprint differs); a snoozed item returns after the snooze ends.
// Completing/dismissing a blind-spot item also resolves/dismisses it in Blind
// Spots, so the health score reflects it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinancialData } from "@/lib/useFinancialData";
import { buildIntelligence } from "@/lib/intelligence";
import { useBlindSpots } from "@/lib/useBlindSpots";
import { rankPriorities, buildView, type PriorityItem, type PriorityView } from "@/lib/priorities";

const KEY = "credo.priorities.decisions.v1";
export type PriorityDecision = "completed" | "dismissed" | "snoozed";
type Stored = Record<string, { status: PriorityDecision; at: string; until?: string; fingerprint: string }>;

export const SNOOZE_DAYS = 7;

export interface PrioritiesState extends PriorityView {
  loading: boolean;
  hasData: boolean;
  healthScore: number;
  totalOpen: number;                       // all ranked items still open
  decide: (item: PriorityItem, status: PriorityDecision) => void;
  undo: () => void;
  lastDecision: { item: PriorityItem; status: PriorityDecision } | null;
}

export function usePriorities(): PrioritiesState {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const bs = useBlindSpots();
  const intel = useMemo(() => buildIntelligence(accounts, transactions), [accounts, transactions]);

  const [stored, setStored] = useState<Stored>({});
  const [lastDecision, setLast] = useState<PrioritiesState["lastDecision"]>(null);
  const [prevStored, setPrevStored] = useState<Stored | null>(null);
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (d && typeof d === "object") setStored(d);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);
  const persist = useCallback((next: Stored) => {
    setStored(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const ranked = useMemo(
    () => rankPriorities({ hasData, blindSpots: bs.active, recommendations: intel.recommendations, health: bs.baseHealth, gainFor: bs.gainFor }),
    [hasData, bs.active, intel.recommendations, bs.baseHealth, bs.gainFor],
  );

  const visible = useMemo(() => {
    const now = Date.now();
    return ranked.filter((it) => {
      const d = stored[it.id];
      if (!d) return true;
      if (d.fingerprint !== it.fingerprint) return true;              // situation changed
      if (d.status === "snoozed") return !!d.until && new Date(d.until).getTime() <= now;
      return false;
    });
  }, [ranked, stored]);

  const view = useMemo(() => buildView(hasData, ranked, visible), [hasData, ranked, visible]);

  const decide = useCallback((item: PriorityItem, status: PriorityDecision) => {
    setPrevStored(stored);
    const until = status === "snoozed" ? new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() : undefined;
    persist({ ...stored, [item.id]: { status, at: new Date().toISOString(), until, fingerprint: item.fingerprint } });
    if (item.source === "blindspot" && status !== "snoozed") {
      bs.decide(item.id.replace(/^bs:/, ""), status === "completed" ? "resolved" : "dismissed");
    }
    setLast({ item, status });
  }, [stored, persist, bs]);

  const undo = useCallback(() => {
    if (!lastDecision || !prevStored) return;
    persist(prevStored);
    if (lastDecision.item.source === "blindspot" && lastDecision.status !== "snoozed") bs.reopen(lastDecision.item.id.replace(/^bs:/, ""));
    setLast(null);
    setPrevStored(null);
  }, [lastDecision, prevStored, persist, bs]);

  return {
    ...view,
    loading: loading || bs.loading,
    hasData,
    healthScore: bs.healthScore,
    totalOpen: visible.length,
    decide,
    undo,
    lastDecision,
  };
}
