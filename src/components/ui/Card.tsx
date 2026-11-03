import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type CardTone = "default" | "muted" | "brand" | "success" | "warning" | "danger";
export type CardPadding = "none" | "sm" | "md" | "lg";

const TON: Record<CardTone, string> = {
  default: "border-slate-200 bg-white shadow-card",
  muted: "border-slate-200 bg-slate-50",
  brand: "border-brand-200 bg-brand-50/70",
  success: "border-emerald-200 bg-emerald-50/70",
  warning: "border-amber-200 bg-amber-50/70",
  danger: "border-red-200 bg-red-50/70",
};

const BOSLUK: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article";
  tone?: CardTone;
  padding?: CardPadding;
}

export function Card({ as: Etiket = "section", tone = "default", padding = "lg", className, ...props }: CardProps) {
  return <Etiket className={cn("rounded-2xl border", TON[tone], BOSLUK[padding], className)} {...props} />;
}

export function CardHeader({ title, description, actions, className }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

