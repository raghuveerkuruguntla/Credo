"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Landmark, ArrowLeftRight, PieChart, Wallet,
  TrendingUp, BarChart3, LineChart, Bot, Settings, Lightbulb, HeartPulse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const groups: { heading: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    heading: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/health", label: "Health & Insights", icon: HeartPulse },
      { href: "/insights", label: "Insights", icon: Lightbulb },
      { href: "/accounts", label: "Accounts", icon: Landmark },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    heading: "Plan",
    items: [
      { href: "/spending", label: "Spending", icon: PieChart },
      { href: "/budget", label: "Budget", icon: Wallet },
      { href: "/forecast", label: "Forecast & What-if", icon: TrendingUp },
    ],
  },
  {
    heading: "Grow",
    items: [
      { href: "/net-worth", label: "Net Worth", icon: BarChart3 },
      { href: "/investments", label: "Investments", icon: LineChart },
      { href: "/ai", label: "AI Coach", icon: Bot },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="relative z-10 hidden lg:flex flex-col w-60 shrink-0 h-full border-r border-white/[0.06] bg-[#0a0b0f]/70 backdrop-blur-xl">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 h-16 px-5 shrink-0 border-b border-white/[0.06]">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.4)]">
          <span className="text-white font-bold text-base leading-none">C</span>
        </div>
        <span className="text-[15px] font-bold text-white tracking-tight">Credo</span>
      </Link>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{group.heading}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-500/15 text-white border border-indigo-500/25"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: account */}
      <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
          <UserButton />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.firstName ?? "Account"}</p>
            <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
              <Settings className="w-3 h-3" /> Settings
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
