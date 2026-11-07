"use client";

// Interactive landing-page demo of the Health Score + what-if simulator. It runs
// the exact same engine as the in-app Health page (lib/health), on a sample
// household that is clearly labelled as such.

import { useMemo, useState, type CSSProperties } from "react";
import { computeHealth, projectHealth, type HealthInputs, type IndicatorStatus } from "@/lib/health";

const SAMPLE: HealthInputs = {
  cash: 9600,
  monthlyIncome: 6200,
  monthlyExpenses: 5500,
  monthlyDebtPayments: 1500,
  monthlyDiscretionary: 1500,
  revolvingBalance: 4200,
  revolvingLimit: 14000,
  historyMonths: 6,
  historyDays: 180,
  incomeVariation: 0.02,
  spendingWindows: [5600, 5450, 5500],
  costCreepMonthly: 24,
  checkingCash: 2600,
  billsNext30: 2300,
  paymentIncidents: 0,
};

const TONE: Record<IndicatorStatus, { text: string; bar: string }> = {
  strong: { text: "#86EFAC", bar: "#4ADE80" },
  "on-track": { text: "#C4B5FD", bar: "#A78BFA" },
  "needs-work": { text: "#FCD34D", bar: "#F59E0B" },
};

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const glass: CSSProperties = {
  background: "linear-gradient(160deg, rgba(40,35,60,0.45) 0%, rgba(16,14,26,0.55) 100%)",
  border: "1px solid rgba(186,164,250,0.22)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 28px 60px rgba(0,0,0,0.45)",
  backdropFilter: "blur(20px) saturate(140%)",
  WebkitBackdropFilter: "blur(20px) saturate(140%)",
};

export default function HealthDemo() {
  const [spendLess, setSpendLess] = useState(0);
  const [extraToCards, setExtraToCards] = useState(150);

  const today = useMemo(() => computeHealth(SAMPLE), []);
  const future = useMemo(() => projectHealth(SAMPLE, { spendLess, extraToCards }), [spendLess, extraToCards]);
  const delta = (future.health.score ?? 0) - (today.score ?? 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Today */}
      <div className="rounded-[26px] p-6 sm:p-7" style={glass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ color: "rgba(208,198,255,0.9)" }}>Health score today</p>
          <span className="text-[11px] text-slate-400">Sample household</span>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-6xl font-bold text-white tracking-tight">{today.score ?? "—"}</span>
          <span className="text-slate-400 text-lg">/ 100</span>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(124,92,224,0.18)", color: "#DDD6FE" }}>{today.label}</span>
        </div>
        <ul className="mt-6 space-y-3">
          {today.categories.map((c) => (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="text-slate-300">{c.name}</span>
                <span className="font-semibold" style={{ color: c.status ? TONE[c.status].text : "#94a3b8" }}>{c.score ?? "—"}</span>
              </div>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }} aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${c.score ?? 0}%`, background: c.status ? TONE[c.status].bar : "transparent" }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{c.summary}</p>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-slate-400 mt-4">Five categories, each built from metrics scored against published targets. The score is their average. No black box.</p>
      </div>

      {/* What-if */}
      <div className="rounded-[26px] p-6 sm:p-7 flex flex-col gap-5" style={glass}>
        <p className="text-[12px] font-semibold tracking-[0.14em] uppercase" style={{ color: "rgba(208,198,255,0.9)" }}>What if… six months from now</p>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <label htmlFor="demo-cards" className="text-slate-200 font-medium">Extra toward credit cards</label>
            <span className="text-white font-semibold">{usd(extraToCards)}/mo</span>
          </div>
          <input id="demo-cards" type="range" min={0} max={700} step={25} value={extraToCards}
            onChange={(e) => setExtraToCards(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-400 bg-white/10" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <label htmlFor="demo-spend" className="text-slate-200 font-medium">Spend less each month</label>
            <span className="text-white font-semibold">{usd(spendLess)}/mo</span>
          </div>
          <input id="demo-spend" type="range" min={0} max={800} step={25} value={spendLess}
            onChange={(e) => setSpendLess(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-400 bg-white/10" />
        </div>

        <div className="rounded-2xl p-5" style={{ background: "rgba(124,92,224,0.14)", border: "1px solid rgba(167,139,250,0.35)" }}>
          <p className="text-[13px]" style={{ color: "#DDD6FE" }}>Health score in 6 months</p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="text-5xl font-bold text-white" aria-live="polite">{future.health.score ?? "—"}</span>
            <span className="text-slate-300 text-sm">{delta >= 0 ? "+" : ""}{delta} from {today.score ?? "—"} today</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl p-3" style={{ background: "rgba(10,8,18,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-slate-400 text-[12px]">Card balance</p>
            <p className="text-white font-semibold text-lg">{usd(future.inputs.revolvingBalance)}</p>
            <p className="text-[11px] text-slate-400">{future.cardsPaidOffInMonths !== null ? `Paid off in month ${future.cardsPaidOffInMonths}` : `from ${usd(SAMPLE.revolvingBalance)}`}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(10,8,18,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-slate-400 text-[12px]">Emergency cushion</p>
            <p className="text-white font-semibold text-lg">{future.health.indicators.find((x) => x.id === "cushion")?.display}</p>
            <p className="text-[11px] text-slate-400">from {today.indicators.find((x) => x.id === "cushion")?.display}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">Sample household: {usd(SAMPLE.monthlyIncome)}/mo income, {usd(SAMPLE.monthlyExpenses)}/mo spending, {usd(SAMPLE.cash)} in savings, {usd(SAMPLE.revolvingBalance)} on cards. Interest ignored for simplicity.</p>
      </div>
    </div>
  );
}
