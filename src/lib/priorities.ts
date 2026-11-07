// ─────────────────────────────────────────────────────────────────────────────
// Credo Financial Priority Engine  (v1.0.0)
//
// "Less financial noise. More financial clarity."
//
// Filters everything Credo knows (blind spots, health score, recommendations,
// upcoming bills, cash-flow projections) down to the ONE thing that most
// deserves attention, plus at most two quieter secondary items. It reuses the
// existing detectors; it does not recompute data.
//
// Ranking: urgency → impact → consequence → relevance to the user's goals →
// actionability. Immediate risks always outrank long-term optimisation, and
// only one item per underlying problem ("theme") is shown.
//
// It never invents problems: if nothing meaningful is found the state is
// "on-track", with at most one gentle, genuinely useful suggestion.
// ─────────────────────────────────────────────────────────────────────────────

import type { BlindSpot } from "@/lib/blindspots";
import type { Recommendation } from "@/lib/intelligence";
import type { HealthScore } from "@/lib/health";

export const PRIORITY_VERSION = "1.0.0";

export type PriorityLevel = "high" | "medium" | "low";
export type DashboardState = "getting-started" | "needs-attention" | "on-track" | "all-clear";

/** One underlying problem → at most one card. */
export type Theme =
  | "cash-shortfall" | "card-debt" | "cushion" | "recurring-costs"
  | "discretionary" | "billing-error" | "idle-cash" | "fees" | "other";

export interface PriorityFactor { label: string; detail: string; points: number }

export interface PriorityItem {
  id: string;                    // stable id (source-prefixed)
  source: "blindspot" | "recommendation";
  theme: Theme;
  level: PriorityLevel;
  title: string;                 // short, actionable
  why: string;                   // why it matters right now
  impact: string | null;         // "$288/yr", "$64 one-time", null if not money
  action: string;                // the recommended action
  cta: { label: string; href: string };
  score: number;                 // ranking score (higher first)
  factors: PriorityFactor[];     // the reasoning behind the rank, shown to users
  scoreCost: number;             // overall health points the underlying metric costs now (model-derived; 0 if none)
  costText: string | null;       // the same, explained
  fingerprint: string;           // changes when the situation materially changes
  coachContext: string;          // facts handed to the AI coach
}

const THEME_OF: [RegExp, Theme][] = [
  [/^(lowbalance|overdrawn|fees:overdraft)/, "cash-shortfall"],
  [/^(utilization|fees:interest|card-debt-growing|rec_debt)/, "card-debt"],
  [/^(cushion|income-concentration|rec_savings)/, "cushion"],
  [/^(subscriptions|increase:|negotiable-bills|rec_subs)/, "recurring-costs"],
  [/^(spike:|lifestyle-inflation|payday-spikes|impulse:|small:|budget:|rec_trim)/, "discretionary"],
  [/^dup:/, "billing-error"],
  [/^idle-cash/, "idle-cash"],
  [/^fees:other/, "fees"],
];
const themeOf = (id: string): Theme => THEME_OF.find(([re]) => re.test(id))?.[1] ?? "other";

const whole = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

/** Bucket money so small fluctuations don't count as a "material change". */
const bucket = (n: number) => (n <= 0 ? 0 : Math.round(Math.log2(n + 1)));

function levelFor(b: BlindSpot): PriorityLevel {
  if (b.severity === "critical") return "high";
  if (b.group === "risk" && b.urgencyDays != null && b.urgencyDays <= 7) return "high";
  if (b.severity === "attention") return "medium";
  return "low";
}

function impactText(b: BlindSpot): string | null {
  if (!b.impact) return null;
  if (b.impact.period === "one-time") return `${whole(b.impact.amount)} one-time`;
  return b.impact.kind === "loss" ? `${whole(b.impact.amount)}/yr at risk` : `up to ${whole(b.impact.amount)}/yr`;
}

function fromBlindSpot(b: BlindSpot, health: HealthScore | null, cost: { overall: number; text: string } | null): PriorityItem {
  const level = levelFor(b);
  const annual = b.impact?.amount ?? 0;
  const factors: PriorityFactor[] = [];

  // 1. Urgency (0–40): deadlines and immediate risk dominate.
  const urg = b.urgencyDays == null ? 0 : b.urgencyDays <= 3 ? 40 : b.urgencyDays <= 7 ? 32 : b.urgencyDays <= 30 ? 12 : 0;
  factors.push({ label: "Urgency", detail: b.urgencyDays == null ? "No deadline" : b.urgencyDays <= 1 ? "Needs action now" : `Within ${b.urgencyDays} days`, points: urg });

  // 2. Financial impact (0–25), log-scaled so a $10k habit can't drown out a deadline.
  const imp = Math.min(25, Math.log10(annual + 1) * 7);
  factors.push({ label: "Impact", detail: annual ? impactText(b) ?? "" : "Protects your stability rather than a dollar amount", points: Math.round(imp) });

  // 3. Consequence (0–25): what happens if ignored. Risks compound; habits don't.
  const cons = b.severity === "critical" ? 25 : b.group === "risk" ? 15 : b.severity === "attention" ? 10 : 3;
  factors.push({ label: "Consequence", detail: b.consequence, points: cons });

  // 4. Relevance (0–12): in your weakest health category, costs score points, or conflicts with a budget you set.
  const inWeakest = !!health?.weakest && health.weakest.id === b.category;
  const rel = (b.id.startsWith("budget:") ? 12 : 0) + (inWeakest ? 8 : 0) + Math.min(4, cost?.overall ?? 0);
  factors.push({
    label: "Relevance",
    detail: b.id.startsWith("budget:") ? "Conflicts with a budget you set" : inWeakest ? `In your weakest health category (${health?.weakest?.name.toLowerCase()})` : cost ? cost.text : "Not in your weakest area",
    points: Math.min(12, rel),
  });

  // 5. Actionability (0–10): can you realistically do something about it?
  const act = (b.ease === "easy" ? 7 : b.ease === "medium" ? 4 : 1) + (b.certainty === "verified" ? 3 : b.certainty === "likely" ? 2 : 0);
  factors.push({ label: "Actionability", detail: `${b.ease === "easy" ? "Quick to act on" : b.ease === "medium" ? "Takes some effort" : "A longer-term change"} · ${b.certainty === "verified" ? "confirmed in your data" : b.certainty === "likely" ? "a strong pattern" : "worth checking"}`, points: act });

  // Immediate risks first: a level floor guarantees ordering across levels.
  const floor = level === "high" ? 200 : level === "medium" ? 100 : 0;
  const score = floor + urg + imp + cons + Math.min(12, rel) + act;

  return {
    id: `bs:${b.id}`,
    source: "blindspot",
    theme: themeOf(b.id),
    level,
    title: b.title,
    why: b.summary,
    impact: impactText(b),
    action: b.actions[0] ?? "Review the details.",
    cta: { label: "View details", href: b.links[0]?.href ?? "/health#insights" },
    score: Math.round(score),
    factors,
    scoreCost: cost?.overall ?? 0,
    costText: cost?.text ?? null,
    fingerprint: `${b.severity}|${b.certainty}|${bucket(annual)}|${b.urgencyDays != null && b.urgencyDays <= 7 ? "soon" : "later"}`,
    coachContext: `${b.title}. ${b.summary} If ignored: ${b.consequence} Suggested first step: ${b.actions[0] ?? ""}`,
  };
}

function fromRecommendation(r: Recommendation): PriorityItem {
  const annual = Math.max(0, r.materiality);
  const imp = Math.min(25, Math.log10(annual + 1) * 7);
  const act = r.action.type === "adjustable" ? 9 : 7;
  const factors: PriorityFactor[] = [
    { label: "Urgency", detail: "No deadline", points: 0 },
    { label: "Impact", detail: r.impactLabel, points: Math.round(imp) },
    { label: "Consequence", detail: "An optimisation; nothing breaks if you wait", points: 3 },
    { label: "Relevance", detail: "Improves your monthly cash flow", points: 0 },
    { label: "Actionability", detail: "A specific amount you can act on", points: act },
  ];
  return {
    id: `rec:${r.id}`,
    source: "recommendation",
    theme: themeOf(r.id),
    level: "low",
    title: r.title,
    why: r.body,
    impact: r.impactLabel,
    action: r.title,
    cta: { label: "Explore action", href: "/insights" },
    score: Math.round(imp + 3 + act),
    factors,
    scoreCost: 0,
    costText: null,
    fingerprint: `rec|${bucket(annual)}`,
    coachContext: `${r.title}. ${r.body} Expected payoff: ${r.impactLabel}.`,
  };
}

export interface PriorityInput {
  hasData: boolean;
  findings: BlindSpot[];            // open findings from the Financial Intelligence Engine
  recommendations: Recommendation[];
  health: HealthScore | null;
  contribution?: (b: BlindSpot) => { overall: number; text: string } | null;
}

/** All candidates, ranked, one per theme. */
export function rankPriorities(input: PriorityInput): PriorityItem[] {
  const items = [
    // Informational insights are interesting, not tasks: they never become priorities.
    ...input.findings.filter((b) => b.kind !== "info").map((b) => fromBlindSpot(b, input.health, input.contribution?.(b) ?? null)),
    ...input.recommendations.map(fromRecommendation),
  ].sort((a, b) => b.score - a.score);

  // One card per underlying problem: keep the highest-ranked item per theme.
  const seen = new Set<Theme>();
  const out: PriorityItem[] = [];
  for (const it of items) {
    if (it.theme !== "other" && seen.has(it.theme)) continue;
    seen.add(it.theme);
    out.push(it);
  }
  return out;
}

export interface PriorityView {
  state: DashboardState;
  primary: PriorityItem | null;
  secondary: PriorityItem[];        // at most two, never more urgent than primary
  attentionCount: number;           // high + medium items visible
}

/**
 * Decide what the dashboard shows. `visible` must already exclude items the
 * user completed, dismissed or snoozed (unless their situation changed).
 */
export function buildView(hasData: boolean, ranked: PriorityItem[], visible: PriorityItem[]): PriorityView {
  if (!hasData) return { state: "getting-started", primary: null, secondary: [], attentionCount: 0 };
  const meaningful = visible.filter((i) => i.level !== "low");
  if (meaningful.length) {
    const [primary, ...rest] = meaningful;
    // Secondary: remaining meaningful items first, then (only if room) one opportunity.
    const opportunities = visible.filter((i) => i.level === "low");
    const secondary = [...rest, ...opportunities].slice(0, 2);
    return { state: "needs-attention", primary, secondary, attentionCount: meaningful.length };
  }
  // Nothing meaningful: never manufacture problems. Offer at most one opportunity.
  const opportunity = visible.find((i) => i.level === "low") ?? null;
  if (opportunity) return { state: "on-track", primary: opportunity, secondary: [], attentionCount: 0 };
  return { state: ranked.length ? "all-clear" : "on-track", primary: null, secondary: [], attentionCount: 0 };
}

/** Questions users can ask the coach straight from a card. */
export const COACH_QUESTIONS = [
  "Why is this my top priority?",
  "What happens if I ignore this?",
  "How will this affect my financial health score?",
  "What if I choose a different approach?",
  "Can you walk me through fixing this?",
] as const;

export function coachQuestion(item: PriorityItem, question: string, healthScore?: number | null): string {
  const rank = item.factors.map((f) => `${f.label}: ${f.detail}`).join("; ");
  const score = item.costText ? ` From the scoring model: ${item.costText}` : "";
  return `${question}\n\nContext from Credo's priority engine — priority: ${item.level}. ${item.coachContext}${score}${healthScore != null ? ` My overall health score is ${healthScore}.` : ""} Ranking factors: ${rank}.`;
}
