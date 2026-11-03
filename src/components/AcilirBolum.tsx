// components/AcilirBolum.tsx — kontrollü açılır bölüm (accordion).
// Önce sinav-olusturucu içindeydi; Hızlı İşleme'nin kazanım akordiyonu da
// aynı bileşeni kullanınca paylaşıma çıkarıldı (CLAUDE.md: paylaşılan UI
// parçası components/'e çıkar, modül içine kopyalanmaz).
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function AcilirBolum({
  baslik,
  acik,
  onToggle,
  children,
  ikon,
}: {
  baslik: ReactNode;
  acik: boolean;
  onToggle: () => void;
  children: ReactNode;
  ikon?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-l-4 border-slate-100 border-l-slate-300 bg-white">
      <button
        type="button"
        aria-expanded={acik}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {ikon && <span className="shrink-0 text-slate-400">{ikon}</span>}
          <span className="truncate text-xs font-bold uppercase tracking-wide text-slate-600">
            {baslik}
          </span>
        </span>
        {acik ? (
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        )}
      </button>
      {acik && <div className="border-t border-slate-100 p-3">{children}</div>}
    </section>
  );
}
