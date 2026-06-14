import Link from "next/link";
import { Zap, Shield, Bot, TrendingUp, BarChart3, Wallet, ArrowRight, Check } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Unified Dashboard", desc: "See all accounts, balances, and net worth in one place." },
  { icon: Wallet, title: "Smart Budgeting", desc: "Manual, percentage-based, or AI-suggested budgets that adapt to you." },
  { icon: TrendingUp, title: "Future Forecasting", desc: "Run what-if simulations to see how decisions impact your finances." },
  { icon: Bot, title: "AI Financial Assistant", desc: "Ask anything about your money. Get answers grounded in your real data." },
  { icon: Shield, title: "Bank-Level Security", desc: "256-bit encryption, Plaid integration, and no credential storage." },
  { icon: Zap, title: "Investment Tracking", desc: "Monitor holdings, allocation, dividends, and portfolio performance." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">FinPilot</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900">Pricing</a>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
          <Link href="/signup" className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Zap className="w-3 h-3" /> AI-powered personal finance
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Your money,<br />
          <span className="text-indigo-600">finally under control</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Connect all your bank accounts, credit cards, and investments. Get AI-powered insights, smart budgets, and future forecasts — all in one secure platform.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/dashboard" className="bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 text-base">
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="text-slate-700 font-semibold px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-base">
            View demo
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-4">No credit card required · 256-bit encrypted · SOC2 compliant</p>
      </section>

      {/* Dashboard preview */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200 overflow-hidden bg-slate-50">
          <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="flex-1 mx-4 bg-slate-800 rounded-md px-3 py-1 text-xs text-slate-400">app.finpilot.com/dashboard</div>
          </div>
          <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50">
            {[
              { label: "Net Worth", value: "$75,887", change: "+$1,287 this month", color: "bg-indigo-50 border-indigo-100" },
              { label: "Cash", value: "$17,271", change: "Across 2 accounts", color: "bg-green-50 border-green-100" },
              { label: "Investments", value: "$60,750", change: "+2.3% this month", color: "bg-blue-50 border-blue-100" },
              { label: "Monthly Spend", value: "$2,430", change: "75% of budget used", color: "bg-orange-50 border-orange-100" },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.change}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Everything you need to master your finances</h2>
          <div className="grid grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-100 p-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Simple, transparent pricing</h2>
        <p className="text-slate-600 text-center mb-12">Start free. Upgrade when you need more.</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { name: "Free", price: "$0", features: ["2 institutions", "Basic analytics", "1 budget", "10 AI questions/mo"], cta: "Get started", highlight: false },
            { name: "Plus", price: "$9.99/mo", features: ["5 institutions", "Advanced analytics", "Unlimited budgets", "50 AI questions/mo"], cta: "Try Plus", highlight: true },
            { name: "Pro", price: "$19.99/mo", features: ["Unlimited institutions", "Advanced AI", "Investment analytics", "Data exports"], cta: "Try Pro", highlight: false },
          ].map((tier) => (
            <div key={tier.name} className={`rounded-2xl border p-6 ${tier.highlight ? "border-indigo-300 shadow-lg shadow-indigo-100 bg-indigo-50" : "border-slate-200"}`}>
              <h3 className="font-bold text-lg text-slate-900 mb-1">{tier.name}</h3>
              <p className="text-2xl font-bold text-slate-900 mb-4">{tier.price}</p>
              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${tier.highlight ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-4">Take control of your financial future</h2>
          <p className="text-indigo-200 mb-8">Join thousands of users who trust FinPilot to manage their money smarter.</p>
          <Link href="/dashboard" className="bg-white text-indigo-600 font-bold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors inline-flex items-center gap-2">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">FinPilot</span>
          </div>
          <p className="text-xs text-slate-400">
            FinPilot provides financial information and budgeting support. It does not provide legal, tax, or investment advice.
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
