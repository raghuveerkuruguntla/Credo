"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Zap, Bell, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/spending", label: "Spending" },
  { href: "/budget", label: "Budget" },
  { href: "/forecast", label: "Forecast" },
  { href: "/net-worth", label: "Net Worth" },
  { href: "/investments", label: "Investments" },
  { href: "/ai", label: "AI Assistant" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const plan = ((user?.publicMetadata?.plan as string) ?? "FREE").toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-[#0d0b0a]/85 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(249,115,22,0.35)]">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-[15px] font-bold text-stone-50 tracking-tight">FinPilot</span>
        </Link>

        {/* Center nav */}
        <nav className="flex-1 flex items-center justify-center gap-0.5 min-w-0 overflow-x-auto">
          {navItems.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-white/[0.08] text-stone-50 border border-white/[0.08]"
                    : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] border border-transparent"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {plan === "FREE" ? (
            <Link
              href="/billing"
              className="hidden lg:block text-xs font-semibold bg-stone-100 text-stone-900 hover:bg-white px-4 py-2 rounded-full transition-colors shadow-[0_0_20px_rgba(249,115,22,0.15)]"
            >
              Upgrade
            </Link>
          ) : (
            <Link
              href="/billing"
              className="hidden lg:block text-xs font-semibold text-orange-300 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 px-3.5 py-1.5 rounded-full transition-colors"
            >
              {plan === "PRO" ? "Pro" : "Plus"} ✨
            </Link>
          )}
          <button className="p-2 text-stone-400 hover:text-stone-100 rounded-full hover:bg-white/[0.06] transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <Link
            href="/settings"
            className={cn(
              "p-2 rounded-full transition-colors",
              pathname.startsWith("/settings")
                ? "bg-white/[0.08] text-stone-50"
                : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.06]"
            )}
          >
            <Settings className="w-4 h-4" />
          </Link>
          <div className="ml-1">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
}
