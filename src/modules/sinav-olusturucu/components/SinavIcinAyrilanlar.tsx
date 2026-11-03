// modules/sinav-olusturucu/components/SinavIcinAyrilanlar.tsx — OA77 "Sınav için ayırdıkların".
// Öğretmen kitap okurken (telefonda da) bir nota "Sınavda sor" der; o notlar burada, masaüstündeki
// Sınav Hazırla tarafında listelenir. "Kitapta aç" o sayfayı açar (soruyu kırpıp Sınava gönderir),
// "Sınava aldım" notu listenin altına indirir (silmez). Veri: db.kitapNotlari (amac === "sinav").
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Check, RotateCcw } from "lucide-react";
import { kitapNotuGuncelle, sinavIcinAyrilanNotlar } from "@/db/repo";
import { trTarih } from "@/lib/tarih";

export function SinavIcinAyrilanlar({ kompakt = false }: { kompakt?: boolean }) {
  const nav = useNavigate();
  const [surum, setSurum] = useState(0);
  const [hata, setHata] = useState("");
  const [alinanlarAcik, setAlinanlarAcik] = useState(false);
  void surum;
  const notlar = sinavIcinAyrilanNotlar();
  const bekleyen = notlar.filter((n) => !n.sinavaAlindi);
  const alinan = notlar.filter((n) => n.sinavaAlindi);

  function isaretle(id: string, alindi: boolean) {
    setHata("");
    try {
      kitapNotuGuncelle(id, { sinavaAlindi: alindi ? new Date().toISOString().slice(0, 10) : undefined });
      setSurum((n) => n + 1);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Kaydedilemedi.");
    }
  }

  const satir = (n: (typeof notlar)[number]) => (
    <li key={n.id} className="flex min-w-0 flex-wrap items-start gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-[11px] font-semibold text-rose-700">{n.kitapAd} · s. {n.sayfa}<span className="ml-1 font-normal text-slate-400">· {trTarih(n.eklenme)}</span></div>
        <p className={`mt-0.5 line-clamp-3 break-words text-sm leading-snug ${n.sinavaAlindi ? "text-slate-400 line-through" : "text-slate-700"}`}>{n.metinHtml}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={() => nav(`/ders-kitabi/${n.kitapId}`, { state: { hedefSayfa: n.sayfa, vurguId: n.id, from: "sinav-olusturucu" } })}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 [@media(pointer:coarse)]:min-h-11">
          <BookOpen size={14} /> Kitapta aç
        </button>
        {n.sinavaAlindi ? (
          <button type="button" onClick={() => isaretle(n.id, false)} title={`Sınava alındı: ${trTarih(n.sinavaAlindi)}`}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 [@media(pointer:coarse)]:min-h-11">
            <RotateCcw size={13} /> Geri al
          </button>
        ) : (
          <button type="button" onClick={() => isaretle(n.id, true)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 [@media(pointer:coarse)]:min-h-11">
            <Check size={14} /> Sınava aldım
          </button>
        )}
      </div>
    </li>
  );

  if (!notlar.length) {
    if (kompakt) return null;
    return (
      <section id="ayrilanlar" className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
        <b className="text-slate-700">Sınav için ayırdıkların</b> — henüz yok. Kitap okurken bir nota <b>“Sınavda sor”</b> dersen burada listelenir
        (telefonda işaretlediklerin de).
      </section>
    );
  }
  return (
    <section id="ayrilanlar" aria-labelledby="ayrilanlar-baslik" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/40 p-3 sm:p-4">
      <h2 id="ayrilanlar-baslik" className="text-base font-bold text-slate-800">Sınav için ayırdıkların <span className="text-rose-700">({bekleyen.length})</span></h2>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Kitap okurken “Sınavda sor” dediğin notlar. <b>Kitapta aç</b> → soruyu kırp → <b>Sınava gönder</b>. Bitince <b>Sınava aldım</b> de.</p>
      {hata && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{hata}</p>}
      {bekleyen.length > 0
        ? <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">{bekleyen.map(satir)}</ul>
        : <p className="mt-2 text-sm text-emerald-700">Hepsini sınava aldın ✓</p>}
      {alinan.length > 0 && (
        <div className="mt-2">
          <button type="button" aria-expanded={alinanlarAcik} onClick={() => setAlinanlarAcik((x) => !x)}
            className="min-h-10 text-xs font-semibold text-slate-500 hover:underline">
            {alinanlarAcik ? "▾" : "▸"} Sınava alınanlar ({alinan.length})
          </button>
          {alinanlarAcik && <ul className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white">{alinan.map(satir)}</ul>}
        </div>
      )}
    </section>
  );
}
