import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type PageWidth = "narrow" | "standard" | "wide" | "workspace" | "full";
export type PageDensity = "comfortable" | "compact";

const GENISLIK: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-5xl",
  wide: "max-w-6xl",
  workspace: "max-w-7xl",
  full: "max-w-none",
};

const YOGUNLUK: Record<PageDensity, string> = {
  comfortable: "px-4 py-5 sm:px-6 sm:py-7 lg:px-8",
  compact: "px-3 py-3 sm:px-4 sm:py-4",
};

export interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  width?: PageWidth;
  density?: PageDensity;
}

export function PageShell({ width = "standard", density = "comfortable", className, ...props }: PageShellProps) {
  return <div className={cn("mx-auto w-full", GENISLIK[width], YOGUNLUK[density], className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      {/* Telefonda başlık en az ~18rem yer ister; yoksa eylemler alta iner
          (eskiden başlık 3-4 harflik sütuna sıkışıp satır satır kırılıyordu). */}
      <div className="min-w-[min(100%,18rem)] flex-1">
        {eyebrow && <div className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-600">{eyebrow}</div>}
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="shrink-0 text-brand-600" aria-hidden="true">{icon}</span>}
          <h1 className="min-w-0 text-2xl font-bold leading-tight text-slate-900">{title}</h1>
        </div>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

