import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/[0.08] text-stone-300",
  success: "bg-emerald-500/15 text-emerald-300",
  warning: "bg-amber-500/15 text-amber-300",
  danger: "bg-red-500/15 text-red-300",
  info: "bg-orange-500/15 text-orange-300",
  muted: "bg-white/[0.08] text-stone-400",
};

export function Badge({ children, variant = "default", className }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
