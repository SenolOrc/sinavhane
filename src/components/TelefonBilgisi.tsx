// components/TelefonBilgisi.tsx — ağır ekranlarda (Sınav Oluşturucu, PDF'ten soru
// kırpma) telefonda bir kez gösterilen bilgilendirme. Ekran KAPANMAZ, sadeleşmez;
// öğretmen ne yapabileceğini ve nerede daha rahat edeceğini bilir.
import { useState } from "react";
import { Info, X } from "lucide-react";
import { useDarEkran } from "@/lib/useDarEkran";

export function TelefonBilgisi({ anahtar, metin }: { anahtar: string; metin: string }) {
  const dar = useDarEkran();
  const depoAnahtari = `oa-telefon-bilgisi:${anahtar}`;
  const [kapali, setKapali] = useState(() => { try { return localStorage.getItem(depoAnahtari) === "1"; } catch { return false; } });
  if (!dar || kapali) return null;
  return (
    <div role="note" className="mb-2 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 py-1.5 pl-3 pr-1 text-xs leading-snug text-sky-900">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{metin}</p>
      <button type="button" aria-label="Bilgilendirmeyi kapat" className="shrink-0 rounded p-1 hover:bg-sky-100"
        onClick={() => { setKapali(true); try { localStorage.setItem(depoAnahtari, "1"); } catch { /* yalnız bu oturum */ } }}>
        <X size={14} />
      </button>
    </div>
  );
}
