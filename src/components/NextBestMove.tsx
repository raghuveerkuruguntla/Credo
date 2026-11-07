"use client";

// "Your Next Best Move" — the Financial Priority Engine on the home dashboard.
// Less financial noise. More financial clarity: one primary recommendation,
// at most two quiet secondary ones, and honest calm states when nothing needs
// attention.

import Link from "next/link";
import AskCoachLink from "@/components/AskCoachLink";
import { useState } from "react";
import { usePriorities, SNOOZE_DAYS } from "@/lib/usePriorities";
import { COACH_QUESTIONS, coachQuestion, type PriorityItem, type PriorityLevel } from "@/lib/priorities";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { cn } from "@/lib/utils";
import {
  Compass, ArrowRight, Check, X, Clock, ChevronDown, Sparkles, HeartPulse, Leaf, Link2, MessageCircle,
} from "lucide-react";

const LEVEL: Record<PriorityLevel, { label: string; dot: string; text: string }> = {
  high: { label: "High priority", dot: "bg-rose-400", text: "text-rose-200/90" },
  medium: { label: "Medium priority", dot: "bg-amber-400", text: "text-amber-200/90" },
  low: { label: "Low priority", dot: "bg-slate-400", text: "text-slate-300" },
};

const shell = "rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.015]";

function Level({ level }: { level: PriorityLevel }) {
  const l = LEVEL[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", l.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", l.dot)} aria-hidden /> {l.label}
    </span>
  );
}

function Controls({ item, onDecide, compact }: { item: PriorityItem; onDecide: (s: "completed" | "dismissed" | "snoozed") => void; compact?: boolean }) {
  const btn = "inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer";
  return (
    <div className={cn("flex flex-wrap items-center", compact ? "gap-0.5" : "gap-1")}>
      <button type="button" className={btn} onClick={() => onDecide("completed")}><Check className="w-3.5 h-3.5" /> Mark done</button>
      <button type="button" className={btn} onClick={() => onDecide("snoozed")} title={`Hide for ${SNOOZE_DAYS} days`}><Clock className="w-3.5 h-3.5" /> Snooze {SNOOZE_DAYS}d</button>
      <button type="button" className={btn} onClick={() => onDecide("dismissed")}><X className="w-3.5 h-3.5" /> Dismiss</button>
    </div>
  );
}

function AskCoach({ item, healthScore }: { item: PriorityItem; healthScore: number | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COACH_QUESTIONS.map((q) => (
        <AskCoachLink
          key={q} question={coachQuestion(item, q, healthScore)}
          className="text-xs text-slate-300 rounded-full border border-white/[0.08] px-3 py-1.5 hover:border-indigo-400/40 hover:text-white hover:bg-indigo-500/[0.06] transition-colors"
        >
          {q}
        </AskCoachLink>
      ))}
    </div>
  );
}

function WhyRanked({ item, rankLabel }: { item: PriorityItem; rankLabel: string }) {
  const max = 40;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">{rankLabel} Credo weighs urgency first, then impact, consequences, relevance to your goals, and how actionable it is. Immediate risks always come before long-term optimisation.</p>
      <ul className="space-y-1.5">
        {item.factors.map((f) => (
          <li key={f.label} className="grid grid-cols-[96px_1fr] sm:grid-cols-[110px_80px_1fr] items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="text-slate-300">{f.label}</span>
            <span className="hidden sm:block h-1 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden>
              <span className="block h-full bg-indigo-400/70 rounded-full" style={{ width: `${Math.min(100, (f.points / max) * 100)}%` }} />
            </span>
            <span className="text-slate-500 col-start-2 sm:col-start-3">{f.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrimaryCard({ item, onDecide, healthScore, isOpportunity }: { item: PriorityItem; onDecide: (s: "completed" | "dismissed" | "snoozed") => void; healthScore: number | null; isOpportunity?: boolean }) {
  const [panel, setPanel] = useState<"none" | "why" | "ask">("none");
  return (
    <article className={cn(shell, "p-5 sm:p-6 relative overflow-hidden")}>
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Level level={item.level} />
          {item.impact && <span className="text-[11px] text-slate-400">· {item.impact}</span>}
          {item.scoreCost > 0 && <span className="text-[11px] text-indigo-300/90 inline-flex items-center gap-1" title={item.costText ?? undefined}>· <HeartPulse className="w-3 h-3" /> costing ~{item.scoreCost} health pts</span>}
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight mt-2">{isOpportunity ? `Consider: ${item.title}` : item.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-3xl">{item.why}</p>
        <p className="text-sm text-slate-200 mt-3 max-w-3xl"><span className="text-slate-400">Recommended action: </span>{item.action}</p>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Link href={item.cta.href} className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-white text-[#0a0b0f] hover:bg-slate-200 transition-colors">
            {item.cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
          <button type="button" onClick={() => setPanel(panel === "ask" ? "none" : "ask")} aria-expanded={panel === "ask"}
            className={cn("inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border transition-colors cursor-pointer", panel === "ask" ? "border-indigo-400/40 text-white bg-indigo-500/10" : "border-white/[0.1] text-slate-300 hover:bg-white/[0.05]")}>
            <MessageCircle className="w-4 h-4" /> Ask the coach
          </button>
          <button type="button" onClick={() => setPanel(panel === "why" ? "none" : "why")} aria-expanded={panel === "why"}
            className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-xl text-slate-400 hover:text-slate-100 transition-colors cursor-pointer">
            Why this? <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", panel === "why" && "rotate-180")} />
          </button>
          <span className="flex-1" />
          <Controls item={item} onDecide={onDecide} />
        </div>

        {panel === "ask" && <div className="mt-4 pt-4 border-t border-white/[0.06]"><AskCoach item={item} healthScore={healthScore} /></div>}
        {panel === "why" && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <WhyRanked item={item} rankLabel={isOpportunity ? "Nothing urgent was found, so this is a gentle improvement rather than a problem." : "This ranks first among everything Credo checked."} />
          </div>
        )}
      </div>
    </article>
  );
}

function SecondaryRow({ item, onDecide, healthScore }: { item: PriorityItem; onDecide: (s: "completed" | "dismissed" | "snoozed") => void; healthScore: number | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn(shell, "px-4 py-3")}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 text-left cursor-pointer">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", LEVEL[item.level].dot)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-slate-200 truncate">{item.title}</span>
          {item.impact && <span className="block text-[11px] text-slate-500">{item.impact}</span>}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-500 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="mt-3 pl-[18px] space-y-3">
          <p className="text-[13px] text-slate-400 leading-relaxed">{item.why}</p>
          <p className="text-[13px] text-slate-200"><span className="text-slate-400">Recommended action: </span>{item.action}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={item.cta.href} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-200 hover:bg-white/[0.05]">{item.cta.label} <ArrowRight className="w-3.5 h-3.5" /></Link>
            <AskCoachLink question={coachQuestion(item, COACH_QUESTIONS[4], healthScore)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]"><MessageCircle className="w-3.5 h-3.5" /> Ask the coach</AskCoachLink>
            <span className="flex-1" />
            <Controls item={item} onDecide={onDecide} compact />
          </div>
        </div>
      )}
    </div>
  );
}

const STATE_CHIP = {
  "needs-attention": { label: "Needs attention", cls: "text-amber-200/90 bg-amber-400/10 border-amber-400/20" },
  "on-track": { label: "On track", cls: "text-emerald-200/90 bg-emerald-400/10 border-emerald-400/20" },
  "all-clear": { label: "On track", cls: "text-emerald-200/90 bg-emerald-400/10 border-emerald-400/20" },
  "getting-started": { label: "Getting started", cls: "text-indigo-200/90 bg-indigo-400/10 border-indigo-400/20" },
} as const;

function CompactNextBestMove({ p }: { p: ReturnType<typeof usePriorities> }) {
  const item = p.primary;
  const more = p.secondary.length;
  return (
    <section aria-labelledby="nbm-title" className="h-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#171a21] to-[#0f1117] p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 id="nbm-title" className="text-sm font-semibold text-slate-100 flex items-center gap-1.5"><Compass className="w-4 h-4 text-indigo-400" /> Your next best move</h2>
        <span className={cn("inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border", STATE_CHIP[p.state].cls)}>{STATE_CHIP[p.state].label}</span>
      </div>
      {item ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Level level={item.level} />
            {item.scoreCost > 0 && <span className="text-[11px] text-indigo-300/90">costing ~{item.scoreCost} health pts</span>}
          </div>
          <p className="text-[15px] font-semibold text-white mt-1.5">{p.state === "on-track" ? `Consider: ${item.title}` : item.title}</p>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.action}</p>
          <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
            <Link href={item.cta.href} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-[#0a0b0f] hover:bg-slate-200">{item.cta.label} <ArrowRight className="w-3.5 h-3.5" /></Link>
            <AskCoachLink question={coachQuestion(item, COACH_QUESTIONS[0], p.healthScore)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.05]"><MessageCircle className="w-3.5 h-3.5" /> Ask the coach</AskCoachLink>
            <span className="flex-1" />
            <Link href="/health#insights" className="text-xs text-slate-500 hover:text-slate-300">{more ? `+${more} more` : "View all"}</Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-white">{p.state === "all-clear" ? "You're in a good position" : "You're doing well!"}</p>
          <p className="text-xs text-slate-400 mt-1">No major financial actions need your attention right now.</p>
          <div className="mt-auto pt-4"><Link href="/health#insights" className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">View insights <ArrowRight className="w-3 h-3" /></Link></div>
        </>
      )}
    </section>
  );
}

export default function NextBestMove({ compact = false }: { compact?: boolean }) {
  const p = usePriorities();
  // One urgent issue stands alone: secondary items start collapsed behind it.
  const [secondaryToggle, setSecondaryToggle] = useState<boolean | null>(null);

  if (p.loading) {
    return <section aria-busy="true" className={cn(shell, compact ? "h-full min-h-[180px]" : "h-48", "animate-pulse")} aria-label="Your next best move" />;
  }
  if (compact && p.state !== "getting-started") return <CompactNextBestMove p={p} />;

  const showSecondary = secondaryToggle ?? p.primary?.level !== "high";
  const chip = STATE_CHIP[p.state];
  const header = {
    "needs-attention": { title: "Your next best move", sub: "We've analyzed your finances. Here's what deserves your attention." },
    "on-track": { title: "You're doing well!", sub: "No immediate financial risks detected." },
    "all-clear": { title: "You're in a good position", sub: "No major financial actions need your attention right now." },
    "getting-started": { title: "Let's understand your finances", sub: "Connect your accounts to unlock personalized financial priorities." },
  }[p.state];

  const meta = p.state === "needs-attention" && p.primary
    ? `${p.attentionCount === 1 ? "1 important action" : `${p.attentionCount} important actions`}${p.secondary.length ? ` · ${p.secondary.length} additional insight${p.secondary.length > 1 ? "s" : ""}` : ""}`
    : null;

  return (
    <section aria-labelledby="nbm-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border", chip.cls)}>
              {p.state === "getting-started" ? <Sparkles className="w-3 h-3" /> : p.state === "needs-attention" ? <Compass className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
              {chip.label}
            </span>
            {meta && <span className="text-[11px] text-slate-500">{meta}</span>}
          </div>
          <h2 id="nbm-title" className="text-lg sm:text-xl font-semibold text-white tracking-tight">{header.title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{header.sub}</p>
        </div>
        {p.state !== "getting-started" && (
          <Link href="/health" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 rounded-full border border-white/[0.07] px-3 py-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-indigo-300" /> Health score <span className="text-white font-semibold">{p.healthScore ?? "—"}</span>
          </Link>
        )}
      </div>

      {p.lastDecision && (
        <div className="flex items-center gap-3 text-xs text-slate-400" role="status">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          {p.lastDecision.status === "completed" ? "Marked done" : p.lastDecision.status === "snoozed" ? `Snoozed for ${SNOOZE_DAYS} days` : "Dismissed"}: {p.lastDecision.item.title}
          <button type="button" onClick={p.undo} className="text-indigo-300 hover:text-indigo-200 cursor-pointer">Undo</button>
        </div>
      )}

      {p.state === "getting-started" && (
        <div className={cn(shell, "p-6 sm:p-8 flex flex-wrap items-center gap-5")}>
          <span className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center"><Link2 className="w-5 h-5 text-indigo-300" /></span>
          <div className="flex-1 min-w-[220px]">
            <p className="text-sm text-slate-300 max-w-xl">Credo looks at your balances, bills, spending and savings, then shows you the one thing worth your attention. Connections are read-only and encrypted.</p>
          </div>
          <PlaidLinkButton size="sm" label="Connect an account" className="bg-white text-[#0a0b0f] hover:bg-slate-200 rounded-xl px-4 py-2 font-medium" />
        </div>
      )}

      {p.state === "all-clear" && (
        <div className={cn(shell, "p-6 flex items-center gap-4")}>
          <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0"><Leaf className="w-5 h-5 text-emerald-300" /></span>
          <p className="text-sm text-slate-300">Everything we flagged has been handled. Credo keeps checking as your accounts update, and will only speak up when something genuinely needs you.</p>
        </div>
      )}

      {p.state === "on-track" && !p.primary && (
        <div className={cn(shell, "p-6 flex items-center gap-4")}>
          <span className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0"><Leaf className="w-5 h-5 text-emerald-300" /></span>
          <p className="text-sm text-slate-300">Keep doing what you&apos;re doing. Consider increasing your savings contribution this month if you have room.</p>
        </div>
      )}

      {p.primary && (
        <PrimaryCard key={p.primary.id} item={p.primary} onDecide={(s) => p.decide(p.primary!, s)} healthScore={p.healthScore} isOpportunity={p.state === "on-track"} />
      )}

      {p.secondary.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setSecondaryToggle(!showSecondary)} aria-expanded={showSecondary} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 cursor-pointer">
            Also worth a look ({p.secondary.length}) <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showSecondary && "rotate-180")} />
          </button>
          {showSecondary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {p.secondary.map((s) => <SecondaryRow key={s.id} item={s} onDecide={(st) => p.decide(s, st)} healthScore={p.healthScore} />)}
            </div>
          )}
        </div>
      )}

      {p.state !== "getting-started" && (
        <div className="flex justify-end">
          <Link href="/health#insights" className="text-xs text-slate-500 hover:text-slate-300 inline-flex items-center gap-1">View all insights <ArrowRight className="w-3 h-3" /></Link>
        </div>
      )}
    </section>
  );
}
