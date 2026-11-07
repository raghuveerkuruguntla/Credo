"use client";

import Link from "next/link";
import { useState } from "react";
import { useBlindSpots } from "@/lib/useBlindSpots";
import { coachPrompt, BLINDSPOT_VERSION, type BlindSpot, type Severity, type Certainty, type BlindSpotGroup } from "@/lib/blindspots";
import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import EmptyState, { LoadingState } from "@/components/EmptyState";
import WhyExplanation from "@/components/WhyExplanation";
import {
  Radar, ShieldAlert, AlertTriangle, Sparkles, Bot, Check, X, ChevronDown, ArrowRight,
  HeartPulse, RotateCcw, EyeOff, Info, Target,
} from "lucide-react";

const SEV: Record<Severity, { label: string; chip: string; dot: string; icon: typeof ShieldAlert; border: string }> = {
  critical: { label: "Critical", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30", dot: "bg-rose-400", icon: ShieldAlert, border: "border-rose-500/30" },
  attention: { label: "Needs attention", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400", icon: AlertTriangle, border: "border-amber-500/20" },
  opportunity: { label: "Opportunity", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", icon: Sparkles, border: "border-white/[0.08]" },
};

const CERT: Record<Certainty, { label: string; hint: string; cls: string }> = {
  verified: { label: "Verified", hint: "Directly in your transactions or balances", cls: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  likely: { label: "Likely", hint: "A strong pattern or a projection", cls: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  possible: { label: "Worth checking", hint: "A suggestion; we can't confirm it from data", cls: "text-stone-300 border-white/15 bg-white/[0.04]" },
};

const GROUP: Record<BlindSpotGroup, string> = {
  "hidden-spending": "Hidden spending",
  risk: "Risk",
  opportunity: "Missed opportunity",
  behavior: "Spending pattern",
};

type Filter = "all" | Severity;

function impactLine(f: BlindSpot) {
  if (!f.impact) return null;
  const amt = formatCurrency(Math.round(f.impact.amount));
  if (f.impact.period === "one-time") return { text: `${amt} one-time`, tone: "text-rose-300" };
  return f.impact.kind === "loss"
    ? { text: `${amt}/yr if it continues`, tone: "text-rose-300" }
    : { text: `up to ${amt}/yr to gain`, tone: "text-emerald-300" };
}

function FindingCard({ f, gain, open, onToggle, onDecide, rank }: {
  f: BlindSpot; gain: number; open: boolean; rank: number;
  onToggle: () => void; onDecide: (s: "resolved" | "dismissed") => void;
}) {
  const s = SEV[f.severity];
  const c = CERT[f.certainty];
  const imp = impactLine(f);
  const Icon = s.icon;
  return (
    <Card className={cn("transition-colors", s.border)}>
      <CardContent className="pt-5 pb-5">
        <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left flex gap-3 items-start cursor-pointer">
          <span className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", s.chip)}><Icon className="w-4 h-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[11px] text-stone-500">#{rank}</span>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", s.chip)}>{s.label}</span>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", c.cls)} title={c.hint}>{c.label}</span>
              <span className="text-[11px] text-stone-500">{GROUP[f.group]}</span>
            </span>
            <span className="block text-[15px] font-semibold text-stone-100">{f.title}</span>
            <span className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs">
              {imp && <span className={imp.tone}>{imp.text}</span>}
              {gain > 0 && <span className="text-indigo-300 inline-flex items-center gap-1"><HeartPulse className="w-3 h-3" /> +{gain} health pts if resolved</span>}
            </span>
          </span>
          <ChevronDown className={cn("w-4 h-4 text-stone-500 shrink-0 mt-2 transition-transform", open && "rotate-180")} aria-hidden />
        </button>

        {open && (
          <div className="mt-4 pl-12 space-y-4">
            <p className="text-sm text-stone-300 leading-relaxed">{f.summary}</p>
            <p className="text-sm text-stone-400"><span className="text-stone-300 font-medium">If nothing changes: </span>{f.consequence}</p>
            <div>
              <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide mb-2">Recommended actions</p>
              <ol className="space-y-1.5">
                {f.actions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ol>
            </div>
            <WhyExplanation explanation={f.explanation} />
            <p className="text-xs text-stone-500">{f.priorityReason}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`/ai?ask=${encodeURIComponent(coachPrompt(f, gain))}`} className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500">
                <Bot className="w-4 h-4" /> Ask the coach
              </Link>
              {f.links.map((l) => (
                <Link key={l.href + l.label} href={l.href} className="inline-flex items-center gap-1 text-sm px-3.5 py-2 rounded-xl border border-white/10 text-stone-300 hover:bg-white/[0.05]">
                  {l.label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
              <span className="flex-1" />
              <button type="button" onClick={() => onDecide("resolved")} className="inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 cursor-pointer">
                <Check className="w-4 h-4" /> Mark resolved
              </button>
              <button type="button" onClick={() => onDecide("dismissed")} className="inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border border-white/10 text-stone-400 hover:bg-white/[0.05] cursor-pointer">
                <X className="w-4 h-4" /> Not an issue
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BlindSpotsPage() {
  const bs = useBlindSpots();
  const [filter, setFilter] = useState<Filter>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showClosed, setShowClosed] = useState(false);

  if (bs.loading) return <div className="p-6"><LoadingState /></div>;
  if (!bs.hasData) {
    return (
      <div className="p-6">
        <EmptyState title="Connect an account to scan for blind spots" message="Credo looks through your balances, transactions and recurring bills for money you're losing without noticing. Connect a bank or card to start." />
      </div>
    );
  }

  const { active, closed } = bs;
  const top = active[0];
  const counts = { critical: 0, attention: 0, opportunity: 0 } as Record<Severity, number>;
  for (const f of active) counts[f.severity]++;
  const shown = filter === "all" ? active : active.filter((f) => f.severity === filter);
  const isOpen = (id: string) => openIds.has(id) || (openIds.size === 0 && top?.id === id && filter === "all");
  const toggle = (id: string) => {
    const next = new Set(openIds.size === 0 && top ? [top.id] : openIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpenIds(next);
  };
  const scoreTone = bs.score >= 80 ? "text-emerald-300" : bs.score >= 50 ? "text-amber-300" : "text-rose-300";
  const scoreBar = bs.score >= 80 ? "bg-emerald-400" : bs.score >= 50 ? "bg-amber-400" : "bg-rose-400";
  const topGain = top ? bs.gainFor(top) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2"><Radar className="w-5 h-5 text-indigo-400" /> Financial Blind Spots</h1>
          <p className="text-sm text-stone-400">Money you may be losing, risks building up, and opportunities you&apos;re missing. Found in your own data.</p>
        </div>
        <p className="text-xs text-stone-500">Scanned {bs.report.txnCount} transactions over {bs.report.historyDays} days · detector v{BLINDSPOT_VERSION}</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Blind spot score</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={cn("text-5xl font-bold tracking-tight", scoreTone)}>{bs.score}</span>
              <span className="text-stone-500">/ 100</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-3" aria-hidden><div className={cn("h-full rounded-full", scoreBar)} style={{ width: `${bs.score}%` }} /></div>
            <p className="text-xs text-stone-500 mt-2">100 means nothing found. Critical issues count most.</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {(["critical", "attention", "opportunity"] as Severity[]).map((k) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] p-2.5 text-left cursor-pointer">
                  <span className="flex items-center gap-1.5 text-[11px] text-stone-400"><span className={cn("w-2 h-2 rounded-full", SEV[k].dot)} />{SEV[k].label}</span>
                  <span className="block text-xl font-semibold text-white mt-0.5">{counts[k]}</span>
                </button>
              ))}
            </div>
            <Link href="/health" className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3 py-2.5 text-sm hover:bg-indigo-500/15">
              <span className="text-stone-300">
                {bs.penalty > 0 ? <>These lower your health score by <b className="text-white">{bs.penalty} pts</b> ({bs.baseHealth.score} → {bs.healthScore})</> : <>Health score: <b className="text-white">{bs.healthScore}</b>, no deduction</>}
              </span>
              <ArrowRight className="w-4 h-4 text-indigo-300 shrink-0" />
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-indigo-500/25">
          <CardContent className="pt-6 pb-6 h-full flex flex-col">
            <p className="text-xs text-indigo-300 uppercase tracking-wide font-semibold flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Fix this first</p>
            {top ? (
              <>
                <h2 className="text-lg font-semibold text-white mt-2">{top.title}</h2>
                <p className="text-sm text-stone-400 mt-1">{top.summary}</p>
                <p className="text-sm text-stone-300 mt-3"><span className="font-medium text-white">Why first: </span>{top.priorityReason.replace(/^Ranked here because /, "").replace(/^./, (c) => c.toUpperCase())}</p>
                <p className="text-sm text-stone-300 mt-1"><span className="font-medium text-white">First step: </span>{top.actions[0]}</p>
                <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                  <Link href={`/ai?ask=${encodeURIComponent(coachPrompt(top, topGain))}`} className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500">
                    <Bot className="w-4 h-4" /> Talk it through with the coach
                  </Link>
                  {topGain > 0 && <span className="text-xs text-indigo-300 inline-flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5" /> +{topGain} health pts when resolved</span>}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white mt-2">No open blind spots</h2>
                <p className="text-sm text-stone-400 mt-1">Nothing in your current data needs attention. Credo re-checks every time your accounts sync.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Annual impact */}
      {active.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Leaking each year</p>
            <p className="text-2xl font-bold text-rose-300 mt-1">{formatCurrency(Math.round(bs.annualLoss))}</p>
            <p className="text-xs text-stone-500 mt-1">If the issues below continue: price increases, fees, interest, rising spending.</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Could gain each year</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">up to {formatCurrency(Math.round(bs.annualOpportunity))}</p>
            <p className="text-xs text-stone-500 mt-1">From opportunities you choose to act on. Estimates; some may overlap.</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Freed up by fixing them</p>
            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(Math.round(bs.fixableMonthly))}<span className="text-sm text-stone-500 font-normal">/mo</span></p>
            <Link href="/health#whatif" className="text-xs text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1 mt-1">See it in the what-if simulator <ArrowRight className="w-3 h-3" /></Link>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter blind spots">
          {([["all", `All (${active.length})`], ["critical", `Critical (${counts.critical})`], ["attention", `Needs attention (${counts.attention})`], ["opportunity", `Opportunities (${counts.opportunity})`]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={cn("text-sm px-3.5 py-2 rounded-full border cursor-pointer transition-colors", filter === k ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200" : "border-white/10 text-stone-400 hover:bg-white/[0.05]")}>
              {label}
            </button>
          ))}
          <span className="flex-1" />
          <span className="text-xs text-stone-500 inline-flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />Ordered by impact, urgency, consequences and ease</span>
        </div>
      )}

      {/* Findings */}
      <div className="space-y-3">
        {shown.map((f) => (
          <FindingCard key={f.id} f={f} rank={active.indexOf(f) + 1} gain={bs.gainFor(f)} open={isOpen(f.id)} onToggle={() => toggle(f.id)} onDecide={(st) => bs.decide(f.id, st)} />
        ))}
        {active.length > 0 && shown.length === 0 && <p className="text-sm text-stone-400 px-1">Nothing in this group.</p>}
      </div>

      {/* Certainty legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
        {(Object.keys(CERT) as Certainty[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={cn("px-2 py-0.5 rounded-full border", CERT[k].cls)}>{CERT[k].label}</span>{CERT[k].hint}</span>
        ))}
      </div>

      {/* Resolved & dismissed */}
      {closed.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <button type="button" onClick={() => setShowClosed(!showClosed)} aria-expanded={showClosed} className="w-full flex items-center justify-between text-sm text-stone-300 cursor-pointer">
              <span>Resolved &amp; dismissed ({closed.length})</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showClosed && "rotate-180")} />
            </button>
            {showClosed && (
              <ul className="mt-3 divide-y divide-white/[0.05]">
                {closed.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm text-stone-300">
                        {f.decision === "resolved" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-stone-500" />}
                        {f.title}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {f.decision === "resolved" ? "Marked resolved" : "Dismissed"} {new Date(f.decidedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {f.decision === "resolved" && " · still showing in your latest data, so it may not be fully fixed yet"}
                      </span>
                    </span>
                    <button type="button" onClick={() => bs.reopen(f.id)} className="text-xs inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 cursor-pointer"><RotateCcw className="w-3 h-3" /> Reopen</button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Honest limits */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-3">What we can&apos;t check from account data</p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {bs.report.cannotCheck.map((x) => (
              <li key={x.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-sm font-medium text-stone-200">{x.title}</p>
                <p className="text-xs text-stone-400 mt-1">{x.detail}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-stone-500 mt-3">Credo never moves money or cancels anything for you. Every action here is a suggestion you carry out yourself.</p>
        </CardContent>
      </Card>
    </div>
  );
}
