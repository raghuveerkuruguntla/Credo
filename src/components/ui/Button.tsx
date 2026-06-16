import { cn } from "@/lib/utils";
import { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-stone-100 text-stone-900 hover:bg-white shadow-[0_0_20px_rgba(99,102,241,0.12)]",
  secondary: "bg-white/[0.07] text-stone-300 hover:bg-white/[0.12]",
  ghost: "text-stone-400 hover:bg-white/[0.06] hover:text-stone-100",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
  outline: "border border-white/[0.12] text-stone-300 hover:bg-white/[0.05]",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-md",
  md: "text-sm px-4 py-2 rounded-lg",
  lg: "text-sm px-6 py-2.5 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

export function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
