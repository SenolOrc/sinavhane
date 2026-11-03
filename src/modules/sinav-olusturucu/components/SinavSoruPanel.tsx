// Seçili sorunun satır içi düzenleme paneli (metin/görsel ayarları, maddeler,
// puan) ve yalnız burada + modallarda kullanılan madde/puan alanları.
//
// Panel ile `SinavModallari.tsx` aynı parçaları paylaşıyor (`MaddeSatiri`,
// `RichTextEditor`, `MmInput`): soru ekleme ile soru düzenleme aynı alanları
// göstermek zorunda, ayrışırlarsa "eklerken vardı, düzenlerken yok" çıkar.

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  PenTool,
  Scissors,
  Sigma,
  Trash2,
  X,
} from "lucide-react";
import type { Madde, SoruOgesi } from "../types";
import { INPUT_CLASS, SATIR_MM } from "../constants";

import { AlanEtiket, MiniButon, TogglePill } from "./ModalParcalari";
import {
  CIZIM_MIN_OLCEK,
  cizimOlcekDegerlendir,
  gorselYerlesimHesapla,
  htmlToText,
  maddeHarfi,
  METIN_ALANI_DAR_ESIK_MM,
  sayiSinirla,
  soruPuani,
  yeniId,
} from "../utils";
import { htmlTemizle } from "../security/html";

import { RichTextEditor } from "./SinavZenginMetin";
import { MmInput } from "./SinavPanelParcalari";
export function InlineSoruDuzenlemePanel({
  soru,
  sira,
  kagitSirasi,
  ciftSutun,
  icerikGenislikMm,
  sutunIcerikMm,
  tamIcerikMm,
  onChange,
  onYukari,
  onAsagi,
  onDelete,
  onParcaKirp,
  onCizimDuzenle,
  onEkCizimDuzenle,
  onDenklemDuzenle,
  onEkDenklemDuzenle,
  testModu = false,
}: {
  soru: SoruOgesi;
  sira: number;
  /** Kağıtta basılan numara; B grubu/BEP'te liste sırasından farklı olur. */
  kagitSirasi?: number | null;
  ciftSutun: boolean;
  icerikGenislikMm: number;
  /** Çizim ölçek kuralı için: sütun ve tam sayfa içerik genişliği (mm). */
  sutunIcerikMm?: number;
  tamIcerikMm?: number;
  onChange: (patch: Partial<SoruOgesi>) => void;
  onYukari: () => void;
  onAsagi: () => void;
  onDelete: () => void;
  onParcaKirp?: () => void;
  onCizimDuzenle?: () => void;
  onEkCizimDuzenle?: (parcaId: string) => void;
  onDenklemDuzenle?: () => void;
  onEkDenklemDuzenle?: (parcaId: string) => void;
  testModu?: boolean;
}) {
  const [acik, setAcik] = useState(true);
  // İçerik ve Görsel/Yerleşim TEK sekmede: ayrı olduklarında birbirlerine üç
  // ayrı yerde "öbür sekmeye geç" bağlantısı vermek zorunda kalıyorlardı
  // (açıklama metni ↔ metin konumu ↔ görsel boyu aynı kararın parçaları).
  // Bir tasarım kullanıcıyı kendi içinde yönlendiriyorsa bölünme yanlış
  // eksendedir.
  const [sekme, setSekme] = useState<"duzen" | "puan">("duzen");
  useEffect(() => {
    setSekme("duzen");
  }, [soru.id]);
  const puan = soruPuani(soru);
  const maddePuanliMi = soru.maddeler.some((madde) => madde.puan != null);
  const yerlesim = gorselYerlesimHesapla(soru, icerikGenislikMm);
  const { govdeMm, yanYana, metinAlaniMm } = yerlesim;
  const maxGorselMm = Math.round(yerlesim.maxGorselMm);
  const kokVarMi = !!htmlToText(soru.altMetinHtml);
  const metinDarMi =
    yanYana && kokVarMi && metinAlaniMm < METIN_ALANI_DAR_ESIK_MM;

  // Çizim sorusu sütuna sığmak için çok küçülüyorsa (etiketler okunmaz hâle gelir)
  // bilgi/ipucu göster. Ölçek, PNG'nin GERÇEK doğal boyutundan hesaplanır
  // (utils.cizimOlcekDegerlendir); kâğıttaki otomatik tam genişlik kararıyla aynı kural.
  const cizimOlcek = useMemo(
    () =>
      cizimOlcekDegerlendir(
        soru,
        sutunIcerikMm ?? icerikGenislikMm,
        tamIcerikMm ?? icerikGenislikMm,
        ciftSutun,
      ),
    [soru, sutunIcerikMm, tamIcerikMm, icerikGenislikMm, ciftSutun],
  );
  const cizimKucultmeOrani = cizimOlcek ? cizimOlcek.oran : null;

  // Yeni eklenen maddenin editörü otomatik odaklanır (aksi halde odak "Madde ekle"
  // düğmesinde kalıp ilk harf yutuluyordu).
  const [odakMaddeId, setOdakMaddeId] = useState<string | null>(null);
  function maddeEkle() {
    const yeni = { id: yeniId(), metinHtml: "", puan: null, cevapSatir: 0 };
    setOdakMaddeId(yeni.id);
    onChange({ maddeler: [...soru.maddeler, yeni] });
  }

  function maddeGuncelle(id: string, patch: Partial<Madde>) {
    onChange({
      maddeler: soru.maddeler.map((madde) =>
        madde.id === id ? { ...madde, ...patch } : madde,
      ),
    });
  }

  function maddeSil(id: string) {
    onChange({ maddeler: soru.maddeler.filter((madde) => madde.id !== id) });
  }

  function maddeTasi(id: string, yon: "yukari" | "asagi") {
    const index = soru.maddeler.findIndex((madde) => madde.id === id);
    if (index < 0) return;
    const hedef = yon === "yukari" ? index - 1 : index + 1;
    if (hedef < 0 || hedef >= soru.maddeler.length) return;
    const kopya = [...soru.maddeler];
    const [tasinan] = kopya.splice(index, 1);
    kopya.splice(hedef, 0, tasinan);
    onChange({ maddeler: kopya });
  }

  function ekGorselGuncelle(
    id: string,
    patch: Partial<NonNullable<SoruOgesi["ekGorseller"]>[number]>,
  ) {
    onChange({
      ekGorseller: (soru.ekGorseller ?? []).map((parca) =>
        parca.id === id ? { ...parca, ...patch } : parca,
      ),
    });
  }

  function ekGorselSil(id: string) {
    onChange({
      ekGorseller: (soru.ekGorseller ?? []).filter((parca) => parca.id !== id),
    });
  }

  return (
    <div className="mt-1 rounded-xl border border-brand-200 bg-white p-3 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAcik((a) => !a)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          title={acik ? "Paneli daralt" : "Paneli genişlet"}
        >
          {acik ? (
            <ChevronDown size={15} className="shrink-0 text-slate-400" />
          ) : (
            <ChevronRight size={15} className="shrink-0 text-slate-400" />
          )}
          <span className="shrink-0 text-sm font-bold text-slate-800">
            {sira}. soruyu düzenle
            {kagitSirasi != null && kagitSirasi !== sira && (
              <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                kağıtta {kagitSirasi}.
              </span>
            )}
            {kagitSirasi === null && (
              <span className="ml-1.5 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                kağıtta yok
              </span>
            )}
          </span>
          {!acik && (
            <span className="truncate text-[11px] text-slate-400">
              {soru.tur === "gorsel" ? "görsel" : "metin"} ·{" "}
              {puan != null ? `${puan} P` : "puan yok"} · {soru.maddeler.length}{" "}
              madde
            </span>
          )}
        </button>
        <div className="flex shrink-0 gap-1">
          <MiniButon title="Yukarı taşı" onClick={onYukari}>
            <ArrowUp size={13} />
          </MiniButon>
          <MiniButon title="Aşağı taşı" onClick={onAsagi}>
            <ArrowDown size={13} />
          </MiniButon>
          <MiniButon title="Soruyu sil" onClick={onDelete} danger>
            <Trash2 size={13} />
          </MiniButon>
        </div>
      </div>

      {acik && (
        <div className="mt-3">
          {/* Doğru şık SEKMELERİN ÜSTÜNDE. Önceden "İçerik & Yerleşim"
              sekmesinin en dibinde, maddelerin ve "Madde ekle"nin altındaydı;
              öğretmen kaydırmadan göremediği için cevap anahtarının nasıl
              doldurulduğunu hiç fark etmemişti. Sekme dışında durması bilerek:
              hangi sekmede olursan ol soruyu seçtiğin anda görünür. */}
          {testModu && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
              <AlanEtiket>Doğru şık (cevap anahtarı için)</AlanEtiket>
              <div className="mt-1 flex flex-wrap gap-1">
                {["A", "B", "C", "D", "E"].map((harf) => {
                  const isaretli = soru.dogruSik === harf;
                  return (
                    <button
                      key={harf}
                      type="button"
                      aria-pressed={isaretli}
                      onClick={() => onChange({ dogruSik: isaretli ? undefined : harf })}
                      className={`h-8 w-8 rounded-lg border text-sm font-bold transition ${
                        isaretli
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {harf}
                    </button>
                  );
                })}
                {soru.dogruSik && (
                  <button
                    type="button"
                    onClick={() => onChange({ dogruSik: undefined })}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Temizle
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-emerald-800/70">
                Yalnızca "Cevap Anahtarı" çıktısında görünür; kağıda basılmaz.
                Boş bıraktığın soru anahtara eklenmez.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1">
            <TogglePill aktif={sekme === "duzen"} onClick={() => setSekme("duzen")}>
              {soru.tur === "gorsel" ? "İçerik & Görsel" : "İçerik & Yerleşim"}
            </TogglePill>
            <TogglePill aktif={sekme === "puan"} onClick={() => setSekme("puan")}>
              Puan & Bilgi
            </TogglePill>
          </div>

          {sekme === "duzen" && (
            <div className="mt-3">
              <div>
                <AlanEtiket>
                  {soru.tur === "metin" ? "Soru kökü" : "Soru açıklaması"}
                </AlanEtiket>
                {soru.tur === "metin" ? (
                  <RichTextEditor
                    value={soru.metinHtml ?? ""}
                    onChange={(html) =>
                      onChange({ metinHtml: htmlTemizle(html) })
                    }
                    placeholder="Soru kökünü yazın..."
                    minHeight="70px"
                  />
                ) : soru.metinKonumu === "yok" ? (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                    Metin konumu &quot;Yok&quot; seçili, bu yüzden açıklama alanı
                    kapalı. Açmak için aşağıdaki &quot;Metin konumu&quot;ndan
                    başka bir seçenek seçin.
                  </p>
                ) : (
                  <>
                    <RichTextEditor
                      value={soru.altMetinHtml ?? ""}
                      onChange={(html) =>
                        onChange({ altMetinHtml: htmlTemizle(html) })
                      }
                      placeholder="Görselle ilgili açıklama / soru kökü..."
                      minHeight="60px"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Bu metnin görsele göre nerede duracağı (
                      {soru.metinKonumu === "ust"
                        ? "üstte"
                        : soru.metinKonumu === "alt"
                        ? "altta"
                        : soru.metinKonumu === "sag"
                          ? "sağda"
                          : "solda"}
                      ) aşağıdaki &quot;Metin konumu&quot;ndan ayarlanır.
                    </p>
                  </>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <AlanEtiket>Maddeler (a, b, c...)</AlanEtiket>
                  {soru.maddeler.length > 1 && (
                    <div className="flex gap-1">
                      {([1, 2, 3] as const).map((kolon) => (
                        <TogglePill
                          key={kolon}
                          aktif={soru.maddeKolon === kolon}
                          onClick={() => onChange({ maddeKolon: kolon })}
                        >
                          {kolon} kolon
                        </TogglePill>
                      ))}
                    </div>
                  )}
                </div>
                {soru.maddeler.length > 0 && (
                  <div className="mt-1 space-y-2">
                    {soru.maddeler.map((madde, index) => (
                      <MaddeSatiri
                        testModu={testModu}
                        odakla={madde.id === odakMaddeId}
                        key={madde.id}
                        madde={madde}
                        index={index}
                        onChange={(patch) => maddeGuncelle(madde.id, patch)}
                        onSil={() => maddeSil(madde.id)}
                        onYukari={
                          index > 0
                            ? () => maddeTasi(madde.id, "yukari")
                            : undefined
                        }
                        onAsagi={
                          index < soru.maddeler.length - 1
                            ? () => maddeTasi(madde.id, "asagi")
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={maddeEkle}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <Plus size={13} /> Madde ekle
                </button>
                {soru.maddeler.length > 0 && (
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    Kısa maddeleri 2-3 kolona dizerek kağıttan yer
                    kazanabilirsiniz. Cevap satırı, öğrencinin yazması için
                    maddenin altında bırakılan boşluktur.
                  </p>
                )}
              </div>

            </div>
          )}

          {sekme === "duzen" && (
            <div className="mt-3">
              {ciftSutun && (
                <div>
                  <AlanEtiket>Yerleşim</AlanEtiket>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <TogglePill
                      aktif={!soru.tamGenislik}
                      onClick={() => onChange({ tamGenislik: false })}
                    >
                      Sütun içinde
                    </TogglePill>
                    <TogglePill
                      aktif={soru.tamGenislik}
                      onClick={() => onChange({ tamGenislik: true })}
                    >
                      Tam genişlik
                    </TogglePill>
                  </div>
                  {cizimOlcek?.otoTam && (
                    <p className="mt-1 rounded-lg bg-sky-50 px-2 py-1 text-[10px] leading-relaxed text-sky-800" role="status" data-oto-tam-genislik="1">
                      Şekil sütuna sığsaydı %{Math.round(cizimOlcek.oran * 100)} küçülüp yazıları
                      ~7 pt altına düşecekti; bu yüzden kâğıtta otomatik
                      TAM GENİŞLİKTE basılıyor. Sütunda tutmak için “Görsel boyu”nu
                      elle küçültün.
                    </p>
                  )}
                  {cizimKucultmeOrani !== null && cizimKucultmeOrani < CIZIM_MIN_OLCEK && !cizimOlcek?.otoTam && !soru.tamGenislik && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] leading-relaxed text-amber-700" role="status">
                      Çizim sütuna sığmak için %{Math.round(cizimKucultmeOrani * 100)} küçüldü; yazılar küçük çıkabilir.
                      Okunabilirlik için “Tam genişlik” seçin.
                    </p>
                  )}
                </div>
              )}

              {soru.tur === "gorsel" ? (
                <div className={ciftSutun ? "mt-3" : ""}>
                  <AlanEtiket>Görsel boyu</AlanEtiket>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(
                      [
                        ["Küçük", 0.35],
                        ["Orta", 0.6],
                        ["Büyük", 1],
                      ] as const
                    ).map(([ad, oran]) => {
                      const hedef = Math.round(maxGorselMm * oran);
                      return (
                        <TogglePill
                          key={ad}
                          aktif={Math.abs(soru.genislikMm - hedef) <= 2}
                          onClick={() => onChange({ genislikMm: hedef })}
                        >
                          {ad}
                        </TogglePill>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <div className="flex-1">
                      <MmInput
                        label="İnce ayar"
                        value={soru.genislikMm}
                        onChange={(v) =>
                          onChange({
                            genislikMm: sayiSinirla(v, 8, maxGorselMm),
                          })
                        }
                        min={8}
                        max={maxGorselMm}
                      />
                    </div>
                    <span className="pb-2 text-[11px] font-semibold text-slate-500">
                      alanın %
                      {Math.round(
                        (Math.min(soru.genislikMm, maxGorselMm) / govdeMm) *
                          100,
                      )}
                      'i
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    İpucu: Kağıt üzerinde görselin köşesindeki mavi tutamacı
                    sürükleyerek de boyutlandırabilirsiniz.
                  </p>

                  <button
                    type="button"
                    onClick={onParcaKirp}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!onParcaKirp || !soru.gorselDataUrl}
                  >
                    <Scissors size={13} /> Görselden parça kes / ekle
                  </button>

                  {onCizimDuzenle && (
                    <button
                      type="button"
                      onClick={onCizimDuzenle}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                    >
                      <PenTool size={13} /> Çizimi yeniden düzenle
                    </button>
                  )}

                  {onDenklemDuzenle && (
                    <button
                      type="button"
                      onClick={onDenklemDuzenle}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                    >
                      <Sigma size={13} /> Denklemi yeniden düzenle
                    </button>
                  )}

                  {(soru.ekGorseller ?? []).length > 0 && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <AlanEtiket>Ek görsel parçaları</AlanEtiket>
                      <div className="mt-2 space-y-2">
                        {(soru.ekGorseller ?? []).map((parca, index) => (
                          <div
                            key={parca.id}
                            className="rounded-lg bg-white p-2 ring-1 ring-slate-100"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-600">
                                Parça {index + 1}
                                {parca.secimNo
                                  ? ` · ${parca.secimNo}. seçim`
                                  : ""}
                              </span>
                              <div className="flex items-center gap-1">
                                {parca.cizimVerisi && onEkCizimDuzenle && (
                                  <MiniButon
                                    title="Çizimi düzenle"
                                    onClick={() => onEkCizimDuzenle(parca.id)}
                                  >
                                    <PenTool size={13} />
                                  </MiniButon>
                                )}
                                {parca.denklemVerisi && onEkDenklemDuzenle && (
                                  <MiniButon
                                    title="Denklemi düzenle"
                                    onClick={() => onEkDenklemDuzenle(parca.id)}
                                  >
                                    <Sigma size={13} />
                                  </MiniButon>
                                )}
                                <MiniButon
                                  title="Parçayı sil"
                                  onClick={() => ekGorselSil(parca.id)}
                                  danger
                                >
                                  <Trash2 size={13} />
                                </MiniButon>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <AlanEtiket>Konum</AlanEtiket>
                                <div className="mt-1 grid grid-cols-2 gap-1">
                                  <TogglePill
                                    aktif={parca.konum === "alt"}
                                    onClick={() =>
                                      ekGorselGuncelle(parca.id, {
                                        konum: "alt",
                                      })
                                    }
                                  >
                                    Altına
                                  </TogglePill>
                                  <TogglePill
                                    aktif={parca.konum === "yan"}
                                    onClick={() =>
                                      ekGorselGuncelle(parca.id, {
                                        konum: "yan",
                                      })
                                    }
                                  >
                                    Yanına
                                  </TogglePill>
                                </div>
                              </div>
                              <MmInput
                                label="Genişlik"
                                value={parca.genislikMm}
                                onChange={(v) =>
                                  ekGorselGuncelle(parca.id, {
                                    genislikMm: sayiSinirla(v, 8, maxGorselMm),
                                  })
                                }
                                min={8}
                                max={maxGorselMm}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <AlanEtiket>Metin konumu</AlanEtiket>
                    <div className="mt-1 grid grid-cols-5 gap-1">
                      {(
                        [
                          ["ust", "Üstte"],
                          ["alt", "Altta"],
                          ["sag", "Sağda"],
                          ["sol", "Solda"],
                          ["yok", "Yok"],
                        ] as const
                      ).map(([deger, etiket]) => (
                        <TogglePill
                          key={deger}
                          aktif={soru.metinKonumu === deger}
                          onClick={() => onChange({ metinKonumu: deger })}
                        >
                          {etiket}
                        </TogglePill>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      Buradaki konum, yukarıdaki açıklama metnini etkiler.
                      “Üstte”: kâğıtta önce soru kökü, sonra şekil, en altta
                      şıklar. “Sağda/Solda”: şekil küçülür, şıklar şeklin
                      ALTINDA tam genişlikte dizilir.
                    </p>
                    {metinDarMi && (
                      <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-rose-600 ring-1 ring-rose-200">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        Metne yalnızca ≈{Math.round(metinAlaniMm)} mm alan
                        kalıyor; uzun kelimeler kağıtta harf harf alt satıra
                        bölünür. Görseli küçültün, ek görselleri kaldırın ya da
                        metin konumunu "Altta" yapın.
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <AlanEtiket>Görsel hizası</AlanEtiket>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {(
                        [
                          ["sol", "Sol"],
                          ["orta", "Orta"],
                          ["sag", "Sağ"],
                        ] as const
                      ).map(([deger, etiket]) => (
                        <TogglePill
                          key={deger}
                          aktif={soru.hizalama === deger}
                          onClick={() => onChange({ hizalama: deger })}
                        >
                          {etiket}
                        </TogglePill>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                !ciftSutun && (
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-500">
                    Bu soru için ek bir yerleşim ayarı yok.
                  </p>
                )
              )}
            </div>
          )}

          {sekme === "puan" && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <AlanEtiket>Soru puanı</AlanEtiket>
                  <PuanInput
                    value={puan}
                    disabled={maddePuanliMi}
                    onChange={(yeni) => onChange({ puan: yeni })}
                    ipucu={
                      maddePuanliMi
                        ? "Madde puanlarından otomatik toplanıyor."
                        : "Boş bırakılırsa kağıtta puan yazmaz."
                    }
                  />
                </div>
                <div>
                  <MmInput
                    label="Boşluk sonrası"
                    value={soru.boslukMm}
                    onChange={(v) =>
                      onChange({ boslukMm: sayiSinirla(v, 0, 80) })
                    }
                    min={0}
                    max={80}
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    ≈ {(soru.boslukMm / SATIR_MM).toFixed(1)} cevap satırı
                  </p>
                </div>
              </div>

              <div className="mt-2">
                <MmInput
                  label="Punto"
                  value={soru.punto}
                  onChange={(v) => onChange({ punto: sayiSinirla(v, 6, 40) })}
                  min={6}
                  max={40}
                  unit="pt"
                />
              </div>

              <label className="mt-2 block">
                <AlanEtiket>Kazanım (isteğe bağlı)</AlanEtiket>
                <input
                  value={soru.kazanim ?? ""}
                  onChange={(e) => onChange({ kazanim: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="Kağıda basılmaz, sadece listede görünür"
                />
              </label>

              <label className="mt-2 block">
                <AlanEtiket>
                  Bölüm başlığı / yönerge (bu sorunun üstünde · opsiyonel)
                </AlanEtiket>
                <input
                  value={soru.bolumBasligi ?? ""}
                  onChange={(e) => onChange({ bolumBasligi: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="Örn. A) Aşağıdaki soruları cevaplayınız (her biri 5 puan)"
                />
                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  Yeni bir bölüm başlatan sorunun üstüne yazın; kağıtta kalın
                  bir satır olarak basılır. Boş bırakılırsa görünmez.
                </p>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MaddeSatiri({
  madde,
  index,
  onChange,
  onSil,
  onYukari,
  onAsagi,
  testModu,
  odakla,
}: {
  odakla?: boolean;
  madde: Madde;
  index: number;
  onChange: (patch: Partial<Madde>) => void;
  onSil: () => void;
  onYukari?: () => void;
  onAsagi?: () => void;
  /** Panel de kâğıtla AYNI harfi göstermeli; ayrışırsa öğretmen panelde "ç"
   *  görüp kâğıtta "D" arar. */
  testModu?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">
          {maddeHarfi(index, testModu)})
        </span>
        <div className="flex gap-1">
          {onYukari && (
            <MiniButon title="Maddeyi yukarı taşı" onClick={onYukari}>
              <ArrowUp size={12} />
            </MiniButon>
          )}
          {onAsagi && (
            <MiniButon title="Maddeyi aşağı taşı" onClick={onAsagi}>
              <ArrowDown size={12} />
            </MiniButon>
          )}
          <MiniButon title="Maddeyi sil" onClick={onSil} danger>
            <X size={12} />
          </MiniButon>
        </div>
      </div>
      <RichTextEditor
        value={madde.metinHtml}
        onChange={(html) => onChange({ metinHtml: htmlTemizle(html) })}
        placeholder={`Madde ${maddeHarfi(index, testModu)}) metni...`}
        minHeight="42px"
        kompakt
        autoFocus={odakla}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <AlanEtiket>Madde puanı</AlanEtiket>
          <PuanInput
            value={madde.puan}
            onChange={(puan) => onChange({ puan })}
          />
        </div>
        <div>
          <AlanEtiket>Cevap satırı</AlanEtiket>
          <div className="flex items-end gap-2">
            <input
              type="number"
              min={0}
              max={20}
              value={madde.cevapSatir}
              onChange={(e) =>
                onChange({
                  cevapSatir: sayiSinirla(
                    Math.round(Number(e.target.value)),
                    0,
                    20,
                  ),
                })
              }
              className={INPUT_CLASS}
            />
            <span className="shrink-0 pb-2 text-[10px] text-slate-400">
              ≈ {madde.cevapSatir * SATIR_MM} mm
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PuanInput({
  value,
  onChange,
  disabled,
  ipucu,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  ipucu?: string;
}) {
  return (
    <div>
      <input
        type="number"
        min={0}
        max={100}
        placeholder="—"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? null
              : sayiSinirla(Math.round(Number(e.target.value)), 0, 100),
          )
        }
        className={`${INPUT_CLASS} disabled:bg-slate-100 disabled:text-slate-400`}
      />
      {ipucu && <p className="mt-1 text-[10px] text-slate-400">{ipucu}</p>}
    </div>
  );
}
