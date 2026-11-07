"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

// Full nav list for the mobile "more" sheet (the bottom tab bar covers the rest).
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
  { href: "/settings", label: "Settings" },
];

// Mobile / tablet header. Desktop navigation lives in the Sidebar (lg+).
export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[#0a0b0f]/85 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.4)]">
            <span className="text-white font-bold text-base leading-none">C</span>
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">Credo</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <UserButton />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            className="p-2 text-slate-300 hover:text-slate-100 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Full-nav sheet */}
      {open && (
        <div className="border-t border-white/[0.06] bg-[#0a0b0f]/95 backdrop-blur-xl">
          <nav className="px-4 py-3 grid grid-cols-2 gap-1.5">
            {navItems.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-500/15 text-white border border-indigo-500/25"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] border border-transparent"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
