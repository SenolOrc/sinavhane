// components/GeriButon.tsx — geri dönme kontrolü (drill-down ekranlarda ortak).
// Eskiden her ekran kendi düz metin linkini yazıyordu (buton hissi yoktu) — artık tek yerden.
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function GeriButon({ onClick, children = "Geri" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
    >
      <ChevronLeft size={15} /> {children}
    </button>
  );
}
