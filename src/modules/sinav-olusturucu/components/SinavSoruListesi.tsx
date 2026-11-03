// Sol paneldeki soru listesi: sanal pencere, sürükle-bırak sıralama, arama
// ve seçili sorunun satır içi düzenleme panelini açması.
//
// Liste uzun olabildiği için satırlar sanallaştırılıyor (`sanalPencereHesapla`);
// bu yüzden sabit satır yüksekliği (`SORU_LISTE_SATIR_YUKSEKLIGI`) bir stil
// tercihi değil, hesabın girdisidir — değiştiren, pencere hesabını da düzeltmeli.

import { useEffect, useMemo, useRef, useState } from "react";

import { ArrowDown, ArrowUp, BookOpen, Copy, FileImage, GripVertical, Type } from "lucide-react";
import { useDokunmatik } from "@/lib/dokunmatik";
import type { SoruOgesi } from "../types";

import { mantiksalSoruSiraHaritasi, soruPuani } from "../utils";

import { sanalPencereHesapla, soruListeEtiketi, soruListesiniFiltrele } from "../dayaniklilik";

import { InlineSoruDuzenlemePanel } from "./SinavSoruPanel";
import { kisayol } from "../lib/kisayol";

const SORU_LISTE_SATIR_YUKSEKLIGI = 56;

export function SoruListesi({
  sorular,
  seciliSoruId,
  onSec,
  onChange,
  onYukari,
  onAsagi,
  onSil,
  onSirala,
  onCogalt,
  onKitaptaGoster,
  ciftSutun,
  soruIcerikGenisligi,
  duzenlemePaneliGoster = true,
  testModu = false,
}: {
  sorular: SoruOgesi[];
  seciliSoruId: string | null;
  onSec: (id: string | null) => void;
  onChange: (id: string, patch: Partial<SoruOgesi>) => void;
  onYukari: (id: string) => void;
  onAsagi: (id: string) => void;
  onSil: (id: string) => void;
  onSirala?: (kaynakId: string, hedefId: string) => void;
  onCogalt?: (id: string) => void;
  onKitaptaGoster?: (soru: SoruOgesi) => void;
  ciftSutun: boolean;
  soruIcerikGenisligi: (soru: SoruOgesi) => number;
  duzenlemePaneliGoster?: boolean;
  testModu?: boolean;
}) {
  // Dokunmatikte HTML5 sürükle-bırak çalışmıyor (Y4): dokunma olayları
  // dragstart üretmiyor. Orada tutamak gizlenir, her satırda görünür ↑ ↓
  // düğmeleri çıkar (mevcut `onYukari`/`onAsagi` taşıma işlevleri).
  const dokunmatik = useDokunmatik();
  const [suruklenenId, setSuruklenenId] = useState<string | null>(null);
  const [ustuneId, setUstuneId] = useState<string | null>(null);
  const [arama, setArama] = useState("");
  const [konu, setKonu] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const listeKokRef = useRef<HTMLDivElement | null>(null);
  const siraMap = useMemo(() => mantiksalSoruSiraHaritasi(sorular), [sorular]);
  const gorunenler = useMemo(
    () => soruListesiniFiltrele(sorular, { arama, konu }),
    [sorular, arama, konu],
  );
  const konuSecenekleri = useMemo(() => {
    const gruplar = new Map<string, string>();
    for (const soru of sorular) {
      const ham = soru.kaynakKonu?.trim();
      if (!ham) continue;
      const anahtar = ham.toLocaleLowerCase("tr-TR");
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, ham);
    }
    return [...gruplar.values()].sort((a, b) => a.localeCompare(b, "tr"));
  }, [sorular]);
  const sanallastir = gorunenler.length >= 60 && !duzenlemePaneliGoster;
  const pencere = sanallastir
    ? sanalPencereHesapla(gorunenler, scrollTop, 560, SORU_LISTE_SATIR_YUKSEKLIGI)
    : { baslangic: 0, bitis: gorunenler.length, ustBosluk: 0, altBosluk: 0, dilim: gorunenler };

  useEffect(() => {
    if (!sanallastir || !seciliSoruId || !listeKokRef.current) return;
    const index = gorunenler.findIndex(({ soru }) => soru.id === seciliSoruId);
    if (index < 0) return;
    const ust = index * SORU_LISTE_SATIR_YUKSEKLIGI;
    const alt = ust + SORU_LISTE_SATIR_YUKSEKLIGI;
    const kok = listeKokRef.current;
    if (ust < kok.scrollTop || alt > kok.scrollTop + kok.clientHeight) {
      kok.scrollTo({ top: Math.max(0, ust - kok.clientHeight / 2), behavior: "smooth" });
    }
  }, [seciliSoruId, gorunenler, sanallastir]);

  if (sorular.length === 0)
    return (
      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
        Henüz soru yok.{" "}
        <span className="oa-fare-ipucu">Soru görseli ekleyin, metin soru yazın veya panodaki
        görseli {kisayol("Ctrl+V")} ile yapıştırın.</span>
        <span className="oa-dokun-ipucu">Üstteki <b>Soru ekle</b> düğmesine dokunun: görsel, metin, çizim ya da denklem sorusu ekleyebilirsiniz.</span>
      </p>
    );
  return (
    <div className="mt-2">
      <div className="mb-2 flex gap-1.5" aria-label="Soru listesi araması">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Sorularda ara..."
          aria-label="Sorularda ara"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-brand-400"
        />
        {konuSecenekleri.length > 1 && (
          <select value={konu} onChange={(e) => setKonu(e.target.value)} aria-label="Konuya göre filtrele" className="max-w-[45%] truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
            <option value="">Tüm konular</option>
            {konuSecenekleri.map((deger) => <option key={deger}>{deger}</option>)}
          </select>
        )}
      </div>
      {(arama.trim() || konu) && (
        <p className="mb-1.5 text-[10px] font-semibold text-slate-400" role="status" aria-live="polite">
          {gorunenler.length} sonuç
        </p>
      )}
      {gorunenler.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">Aramayla eşleşen soru bulunamadı.</p>
      ) : (
      <div
        ref={listeKokRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className={sanallastir ? "max-h-[560px] overflow-y-auto pr-1" : "space-y-2"}
      >
      {pencere.ustBosluk > 0 && <div aria-hidden style={{ height: pencere.ustBosluk }} />}
      <div className="space-y-2">
      {pencere.dilim.map(({ soru, asilIndex: index }) => {
        const secili = seciliSoruId === soru.id;
        const puan = soruPuani(soru);
        return (
          <div
            key={soru.id}
            data-soru-satir
            style={sanallastir ? { height: SORU_LISTE_SATIR_YUKSEKLIGI - 8 } : undefined}
            onDragOver={(e) => {
              if (!onSirala || !suruklenenId || suruklenenId === soru.id)
                return;
              e.preventDefault();
              setUstuneId(soru.id);
            }}
            onDragLeave={() => setUstuneId((v) => (v === soru.id ? null : v))}
            onDrop={(e) => {
              if (!onSirala || !suruklenenId) return;
              e.preventDefault();
              if (suruklenenId !== soru.id) onSirala(suruklenenId, soru.id);
              setSuruklenenId(null);
              setUstuneId(null);
            }}
            className={`group rounded-xl transition ${
              ustuneId === soru.id ? "ring-2 ring-brand-400" : "ring-0"
            } ${
              suruklenenId === soru.id
                ? "opacity-40 ring-2 ring-brand-400 shadow-lg"
                : ""
            }`}
          >
            <div className="flex items-center gap-1">
              {onSirala && !dokunmatik && (
                <span
                  draggable
                  onDragStart={(e) => {
                    setSuruklenenId(soru.id);
                    e.dataTransfer.effectAllowed = "move";
                    const satir =
                      e.currentTarget.closest<HTMLElement>("[data-soru-satir]");
                    if (satir) {
                      const kutu = satir.getBoundingClientRect();
                      e.dataTransfer.setDragImage(
                        satir,
                        e.clientX - kutu.left,
                        e.clientY - kutu.top,
                      );
                    }
                  }}
                  onDragEnd={() => {
                    setSuruklenenId(null);
                    setUstuneId(null);
                  }}
                  title="Sürükleyerek sırala"
                  className="shrink-0 cursor-grab px-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                >
                  <GripVertical size={14} />
                </span>
              )}
              <button
                type="button"
                onClick={() => onSec(secili ? null : soru.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  secili
                    ? "border-brand-300 bg-brand-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="shrink-0 font-bold text-slate-700">
                  {siraMap.get(soru.id) ?? index + 1})
                </span>
                {soru.tur === "gorsel" ? (
                  <FileImage size={14} className="shrink-0 text-slate-400" />
                ) : (
                  <Type size={14} className="shrink-0 text-slate-400" />
                )}
                {/* `title`: satır yüksekliği sabit (sanal kaydırma ona bağlı,
                    bkz. SORU_LISTE_SATIR_YUKSEKLIGI), o yüzden metin iki
                    satıra çıkarılamaz. Kesilen ad en azından üstüne gelince
                    tam okunabiliyor. */}
                {/* Sanal kaydırma yokken (< 60 soru) satır yüksekliği serbest: ad iki
                    satıra iner. Telefonda tek satırda yalnız "Fizik 9,…" kalıyordu (OA52). */}
                <span title={soruListeEtiketi(soru, sorular, 240)} className={`min-w-0 flex-1 text-slate-600 ${sanallastir ? "truncate" : "line-clamp-2 break-words leading-snug"}`}>{soruListeEtiketi(soru, sorular)}</span>
                {soru.paketId && soru.paketParcaSayisi && (
                  <span title={soru.paketBasligi || "Çok sayfalı soru"} className="shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">
                    {soru.paketSira ?? 1}/{soru.paketParcaSayisi}
                  </span>
                )}
                {puan != null && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {puan} P
                  </span>
                )}
                {/* Doğru şık rozeti (Y8): Yazılı şablonunda doğru şık hiçbir
                    yerde görünmüyordu; öğretmen havuzdan/kırpmadan gelen bilginin
                    aktarıldığını doğrulayamıyordu. Kâğıda basılmaz. */}
                {soru.dogruSik && (
                  <span title={`Doğru şık: ${soru.dogruSik} (Test türünde cevap anahtarına basılır)`} className="shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                    ✓{soru.dogruSik}
                  </span>
                )}
              </button>
              {onKitaptaGoster && soru.kaynakKitapId && (soru.kaynakSayfa ?? soru.kaynakSayfaNo) && (
                <button
                  type="button"
                  onClick={() => onKitaptaGoster(soru)}
                  title={`${soru.kaynakAd ?? "Kaynak"} · Kitapta göster`}
                  aria-label={`${siraMap.get(soru.id) ?? index + 1}. soruyu kitapta göster`}
                  className={`shrink-0 rounded-lg border border-sky-200 bg-sky-50 p-1.5 text-sky-700 transition hover:bg-sky-100 focus:opacity-100 ${
                    secili ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                  }`}
                >
                  <BookOpen size={13} />
                </button>
              )}
              {onCogalt && (
                <button
                  type="button"
                  onClick={() => onCogalt(soru.id)}
                  title="Soruyu çoğalt"
                  className={`shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus:opacity-100 ${
                    secili ? "opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
                  }`}
                >
                  <Copy size={13} />
                </button>
              )}
              {dokunmatik && (
                <>
                  <button
                    type="button"
                    onClick={() => onYukari(soru.id)}
                    disabled={index === 0}
                    aria-label={`${siraMap.get(soru.id) ?? index + 1}. soruyu yukarı taşı`}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAsagi(soru.id)}
                    disabled={index === sorular.length - 1}
                    aria-label={`${siraMap.get(soru.id) ?? index + 1}. soruyu aşağı taşı`}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </>
              )}
            </div>
            {secili && duzenlemePaneliGoster && (
              <InlineSoruDuzenlemePanel
                soru={soru}
                // Ham dizi indeksi DEĞİL, mantıksal sıra haritası. Çok parçalı
                // (paket) sorularda index+1 kağıttaki numarayla uyuşmuyordu:
                // panel "5. soruyu düzenle" derken kağıtta "3)" basılıyordu.
                sira={siraMap.get(soru.id) ?? index + 1}
                ciftSutun={ciftSutun}
                icerikGenislikMm={soruIcerikGenisligi(soru)}
                onChange={(patch) => onChange(soru.id, patch)}
                onYukari={() => onYukari(soru.id)}
                onAsagi={() => onAsagi(soru.id)}
                onDelete={() => onSil(soru.id)}
                testModu={testModu}
              />
            )}
          </div>
        );
      })}
      </div>
      {pencere.altBosluk > 0 && <div aria-hidden style={{ height: pencere.altBosluk }} />}
      </div>
      )}
    </div>
  );
}
