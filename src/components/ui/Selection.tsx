import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SelectionOption<T extends string | number> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "md",
  className,
}: {
  value: T;
  options: Array<SelectionOption<T>>;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1", className)}>
      {options.map((secenek) => {
        const secili = secenek.value === value;
        return (
          <button
            key={String(secenek.value)}
            type="button"
            aria-pressed={secili}
            disabled={secenek.disabled}
            onClick={() => onChange(secenek.value)}
            className={cn(
              "rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "min-h-7 px-2.5 py-1 text-xs" : "min-h-8 px-3 py-1.5 text-sm",
              secili ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70",
            )}
          >
            {secenek.label}
          </button>
        );
      })}
    </div>
  );
}

export interface TabOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export function Tabs<T extends string>({ value, options, onChange, label, className }: {
  value: T;
  options: Array<TabOption<T>>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  // overflow-x-auto DAR ekranda/çok sekmede taşmayı çözmek için gerekli — ama
  // içerik hiç taşmasa bile (ör. Raporlar'ın 2 kısa sekmesi) Windows'ta
  // sahipsiz, işlevsiz bir scrollbar izi bırakıyordu (UI incelemesinde
  // bulundu). Kaydırma davranışı AYNI kalıyor, yalnız görsel iz kaldırıldı.
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      style={{ msOverflowStyle: "none" }}
    >
      {options.map((secenek) => {
        const secili = secenek.value === value;
        return (
          <button
            key={secenek.value}
            type="button"
            role="tab"
            aria-selected={secili}
            tabIndex={secili ? 0 : -1}
            disabled={secenek.disabled}
            onClick={() => onChange(secenek.value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              const tabs = Array.from(
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)') ?? [],
              );
              const currentIndex = tabs.indexOf(event.currentTarget);
              if (currentIndex < 0 || tabs.length === 0) return;
              event.preventDefault();
              const nextIndex = event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              tabs[nextIndex]?.focus();
              tabs[nextIndex]?.click();
            }}
            className={cn(
              "-mb-px inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40",
              secili ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            {secenek.icon}
            {secenek.label}
            {secenek.badge}
          </button>
        );
      })}
    </div>
  );
}
