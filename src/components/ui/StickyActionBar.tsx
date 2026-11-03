import type { ReactNode } from "react";
import { useKlavyeAcik } from "@/lib/useKlavyeAcik";
import { cn } from "./cn";

/**
 * Ekranın altına yapışan eylem çubuğu.
 * Telefonda (2026-09 denetimi) ~175 px tutuyor, klavye açıkken odaklanan kutuyu
 * örtüyordu. Artık: özet tek satır (kısaltılır), düğmeler yan yana; klavye
 * açıkken çubuk tamamen gizlenir (yazılan alan görünür kalsın).
 */
export function StickyActionBar({ summary, actions, className }: {
  summary?: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  const klavye = useKlavyeAcik();
  if (klavye) return null;
  return (
    <div data-yapiskan-cubuk="" className={cn("sticky bottom-0 z-20 mt-5 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_-18px_rgb(15_23_42/0.35)] backdrop-blur sm:px-4 sm:py-3", className)}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1.5">
        {summary && <div className="min-w-0 flex-1 basis-full truncate text-xs text-slate-600 sm:basis-auto sm:whitespace-normal sm:text-sm">{summary}</div>}
        <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
