import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({ icon: Icon, title, description, action, compact = false, className }: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 text-center", compact ? "min-h-40 py-6" : "min-h-56 py-10", className)}>
      {Icon && <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon size={26} aria-hidden="true" /></span>}
      <h2 className={cn("text-sm font-bold text-slate-700", Icon && "mt-3")}>{title}</h2>
      {description && <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
