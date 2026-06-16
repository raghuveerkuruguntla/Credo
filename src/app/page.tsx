import Link from "next/link";
import { Zap, Shield, Bot, TrendingUp, BarChart3, Wallet, ArrowRight, Check, Sparkles, Lock, Star } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

const features = [
  { icon: BarChart3, title: "Unified Dashboard", desc: "Every account, balance, and your full net worth in one clean view." },
  { icon: Wallet, title: "Smart Budgeting", desc: "Set monthly limits per category and track them against real spending." },
  { icon: TrendingUp, title: "Future Forecasting", desc: "Run what-if scenarios to see how today's choices shape tomorrow." },
  { icon: Bot, title: "AI Financial Assistant", desc: "Ask anything about your money — answers grounded in your real data." },
  { icon: Shield, title: "Bank-Level Security", desc: "256-bit encryption, Plaid connections, and zero credential storage." },
  { icon: Sparkles, title: "Investment Tracking", desc: "Monitor holdings, allocation, and portfolio performance over time." },
];

const tiers = [
  { name: "Free", price: "$0", note: "forever", features: ["2 institutions", "Dashboard & net worth", "This/last month spending", "10 AI questions/mo"], cta: "Get started", highlight: false },
  { name: "Plus", price: "$9.99", note: "/mo", features: ["5 institutions", "Advanced analytics", "Forecasting", "AI budget suggestions", "50 AI questions/mo"], cta: "Start with Plus", highlight: true },
  { name: "Pro", price: "$19.99", note: "/mo", features: ["Unlimited institutions", "Investment analytics", "Data export (CSV)", "Unlimited AI questions", "Priority support"], cta: "Go Pro", highlight: false },
];

const trust = [
  { icon: Lock, label: "256-bit encryption" },
  { icon: Shield, label: "Powered by Plaid" },
  { icon: Check, label: "No credential storage" },
];

export default function LandingPage() {
  return (
    <div className="dark-app relative min-h-screen bg-[#0a0b0f] text-slate-200 overflow-x-hidden">
      <AnimatedBackground />
      {/* Brand glow behind hero */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] max-w-full h-[520px] bg-indigo-600/15 blur-[140px] rounded-full" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="sticky top-0 z-40 bg-[#0a0b0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.45)]">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Finza</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-5">
              <a href="#features" className="hidden sm:inline text-sm text-slate-400 hover:text-slate-100 transition-colors">Features</a>
              <a href="#pricing" className="hidden sm:inline text-sm text-slate-400 hover:text-slate-100 transition-colors">Pricing</a>
              <Link href="/login" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">Sign in</Link>
              <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:from-indigo-400 hover:to-violet-500 transition-all whitespace-nowrap shadow-[0_0_24px_rgba(99,102,241,0.35)]">
                Get started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-3 h-3" /> AI-powered personal finance
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5 sm:mb-6">
            Your money,<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent">finally under control</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Connect your banks, cards, and investments. Finza turns it into a clear picture — with smart budgets, future forecasts, and an AI that actually knows your numbers.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link href="/signup" className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:from-indigo-400 hover:to-violet-500 transition-all flex items-center justify-center gap-2 text-base shadow-[0_0_36px_rgba(99,102,241,0.4)]">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-slate-200 font-semibold px-6 py-3 rounded-full border border-white/[0.12] hover:bg-white/[0.05] transition-colors text-base text-center">
              Sign in
            </Link>
          </div>
          {/* Trust strip */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {trust.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Icon className="w-3.5 h-3.5 text-indigo-400" /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* Product preview */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#171a21] to-[#0f1117] shadow-[0_40px_120px_-20px_rgba(99,102,241,0.25)] overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-red-400/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <div className="w-3 h-3 rounded-full bg-green-400/70" />
              <div className="flex-1 mx-2 sm:mx-4 bg-white/[0.05] rounded-md px-3 py-1 text-xs text-slate-500 truncate">finza.app/dashboard</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6">
              {[
                { label: "Net Worth", value: "$75,887", change: "+$1,287 this month", up: true },
                { label: "Cash", value: "$17,271", change: "Across 2 accounts", up: false },
                { label: "Investments", value: "$60,750", change: "+2.3% this month", up: true },
                { label: "Monthly Spend", value: "$2,430", change: "75% of budget", up: false },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">{c.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{c.value}</p>
                  <p className={`text-xs mt-1 ${c.up ? "text-emerald-400" : "text-slate-500"}`}>{c.change}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-white/[0.06] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-4xl font-bold text-white text-center tracking-tight mb-3">Everything you need to master your money</h2>
            <p className="text-slate-400 text-center max-w-xl mx-auto mb-10 sm:mb-14">One calm, secure place for every account, decision, and dollar.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#171a21] to-[#0f1117] p-6 hover:border-indigo-500/30 transition-colors">
                  <div className="w-11 h-11 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-500/15 transition-colors">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-100 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/[0.06] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-4xl font-bold text-white text-center tracking-tight mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-center mb-10 sm:mb-14">Start free. Upgrade only when you need more.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-md md:max-w-none mx-auto">
              {tiers.map((tier) => (
                <div key={tier.name} className={`relative rounded-2xl border p-6 ${tier.highlight ? "border-indigo-500/40 bg-gradient-to-b from-[#1b1a2e] to-[#12111f] shadow-[0_0_44px_-10px_rgba(99,102,241,0.5)]" : "border-white/[0.08] bg-gradient-to-b from-[#171a21] to-[#0f1117]"}`}>
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                        <Star className="w-3 h-3" /> Most popular
                      </span>
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-white mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-500 text-sm">{tier.note}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-indigo-400" : "text-emerald-400"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`block text-center py-2.5 rounded-full text-sm font-semibold transition-all ${tier.highlight ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 shadow-[0_0_24px_rgba(99,102,241,0.35)]" : "bg-white/[0.06] text-slate-100 border border-white/[0.1] hover:bg-white/[0.1]"}`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 py-16 sm:py-20">
          <div className="relative max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 sm:px-12 py-12 sm:py-16 text-center shadow-[0_30px_100px_-20px_rgba(99,102,241,0.55)] overflow-hidden">
            <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
            <h2 className="relative text-2xl sm:text-4xl font-bold text-white mb-4 tracking-tight">Take control of your financial future</h2>
            <p className="relative text-indigo-50/90 mb-8 max-w-lg mx-auto">Join Finza and turn scattered accounts into one clear, confident plan.</p>
            <Link href="/signup" className="relative bg-white text-indigo-700 font-bold px-8 py-3 rounded-full hover:bg-indigo-50 transition-colors inline-flex items-center gap-2">
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] py-10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-5 sm:justify-between text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-100">Finza</span>
            </div>
            <p className="text-xs text-slate-500 max-w-md order-last sm:order-none">
              Finza provides financial information and budgeting support. It does not provide legal, tax, or investment advice.
            </p>
            <div className="flex gap-5 text-xs text-slate-500">
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
