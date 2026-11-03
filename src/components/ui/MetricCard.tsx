import type { ReactNode } from "react";
import { cn } from "./cn";

export type MetricTone = "neutral" | "brand" | "success" | "warning" | "danger";

const DEGER: Record<MetricTone, string> = {
  neutral: "text-slate-800",
  brand: "text-brand-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

export function MetricCard({ label, value, detail, icon, tone = "neutral", selected = false, onClick, className }: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const icerik = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
        {icon && <span className="shrink-0 text-slate-400" aria-hidden="true">{icon}</span>}
      </div>
      <div className={cn("mt-1.5 text-2xl font-bold", DEGER[tone])}>{value}</div>
      {detail && <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>}
    </>
  );
  const ortak = cn(
    "w-full rounded-2xl border bg-white p-4 text-left shadow-card transition",
    selected ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-200",
    onClick && "hover:border-brand-300 hover:bg-brand-50/30",
    className,
  );
  return onClick ? <button type="button" aria-pressed={selected} onClick={onClick} className={ortak}>{icerik}</button> : <div className={ortak}>{icerik}</div>;
}

