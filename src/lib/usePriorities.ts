"use client";

// Ties the Priority Engine to live data and to the user's choices.
// Choices persist in this browser, like Insights and Blind Spots. A completed
// or dismissed item stays hidden unless its situation materially changes
// (its fingerprint differs); a snoozed item returns after the snooze ends.
// Completing/dismissing an insight-based item also resolves/dismisses that
// finding in Financial Health & Insights (the score itself only changes when
// the underlying data does).

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinancialData } from "@/lib/useFinancialData";
import { buildIntelligence } from "@/lib/intelligence";
import { useFinancialHealth } from "@/lib/useFinancialHealth";
import { rankPriorities, buildView, type PriorityItem, type PriorityView } from "@/lib/priorities";

const KEY = "credo.priorities.decisions.v1";
export type PriorityDecision = "completed" | "dismissed" | "snoozed";
type Stored = Record<string, { status: PriorityDecision; at: string; until?: string; fingerprint: string }>;

export const SNOOZE_DAYS = 7;

export interface PrioritiesState extends PriorityView {
  loading: boolean;
  hasData: boolean;
  healthScore: number | null;
  totalOpen: number;                       // all ranked items still open
  decide: (item: PriorityItem, status: PriorityDecision) => void;
  undo: () => void;
  lastDecision: { item: PriorityItem; status: PriorityDecision } | null;
}

export function usePriorities(): PrioritiesState {
  const { accounts, transactions, loading, hasData } = useFinancialData();
  const fh = useFinancialHealth();
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
    () => rankPriorities({ hasData, findings: fh.active, recommendations: intel.recommendations, health: fh.health, contribution: fh.contribution }),
    [hasData, fh.active, intel.recommendations, fh.health, fh.contribution],
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
      const f = fh.active.find((x) => `bs:${x.id}` === item.id);
      if (f) fh.decide(f, status === "completed" ? "resolved" : "dismissed");
    }
    setLast({ item, status });
  }, [stored, persist, fh]);

  const undo = useCallback(() => {
    if (!lastDecision || !prevStored) return;
    persist(prevStored);
    if (lastDecision.item.source === "blindspot" && lastDecision.status !== "snoozed") fh.reopen(lastDecision.item.id.replace(/^bs:/, ""));
    setLast(null);
    setPrevStored(null);
  }, [lastDecision, prevStored, persist, fh]);

  return {
    ...view,
    loading: loading || fh.loading,
    hasData,
    healthScore: fh.health.score,
    totalOpen: visible.length,
    decide,
    undo,
    lastDecision,
  };
}
