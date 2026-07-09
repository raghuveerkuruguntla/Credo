"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Lightbulb, ArrowLeftRight, Landmark, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/ai", label: "AI", icon: Bot },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden shrink-0 border-t border-white/[0.06] bg-[#0a0b0f]/95 backdrop-blur-xl pb-safe"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                    active && "bg-indigo-500/15"
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
