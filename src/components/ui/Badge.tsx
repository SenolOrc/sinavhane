import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";

const TON: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ tone = "neutral", icon, className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TON[tone], className)} {...props}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

