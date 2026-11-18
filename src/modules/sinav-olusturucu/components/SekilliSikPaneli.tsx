// Şekilli şık düzenleme parçaları (yalnız Test kipi): şık başına şekil
// ekle/düzenle/kaldır düğmeleri ve sorunun şekilli şık düzeni/boyu ayarı.
// `SinavSoruPanel` içindeki `MaddeSatiri` ve soru paneli bunları kullanır.

import { useRef, useState } from "react";
import { Copy, ImagePlus, PenTool, Trash2, Upload } from "lucide-react";

import type { Madde, SikGorselDuzeni, SoruOgesi } from "../types";
import {
  SEKILLI_SIK_DUZEN_ADLARI,
  sekilliSikGenisligiMm,
  sekilliSikGenislikSiniri,
  sekilliSikOlcusu,
  type SikSekli,
} from "../layout/sekilliSiklar";
import { AlanEtiket, TogglePill } from "./ModalParcalari";
import { MmInput } from "./SinavPanelParcalari";

/** Şık şekli için yüklenebilecek en büyük dosya (taslak doğrulayıcısı 8 MB'ye izin verir; şıklar küçük olmalı). */
export const SIK_SEKLI_AZAMI_BAYT = 2 * 1024 * 1024;
const IZINLI_TURLER = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Yüklenen/yapıştırılan görseli şık şekline çevirir (veri URL'si + oran). */
export function sekilDosyasiniOku(dosya: Blob): Promise<SikSekli> {
  return new Promise((coz, reddet) => {
    if (!IZINLI_TURLER.includes(dosya.type)) {
      reddet(new Error("Şık şekli için PNG, JPG, WEBP veya GIF görseli seçin."));
      return;
    }
    if (dosya.size > SIK_SEKLI_AZAMI_BAYT) {
      reddet(new Error("Şekil 2 MB'den büyük. Lütfen daha küçük bir görsel seçin."));
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onerror = () => reddet(new Error("Görsel okunamadı. Lütfen tekrar deneyin."));
    okuyucu.onload = () => {
      const dataUrl = String(okuyucu.result ?? "");
      const resim = new Image();
      resim.onload = () =>
        coz({
          gorselDataUrl: dataUrl,
          gorselOran: resim.naturalHeight > 0 ? resim.naturalWidth / resim.naturalHeight : 1.35,
        });
      resim.onerror = () => reddet(new Error("Görsel boyutu okunamadı."));
      resim.src = dataUrl;
    };
    okuyucu.readAsDataURL(dosya);
  });
}

/** Şık satırındaki şekil bölümü: küçük önizleme + ekle/düzenle/kaldır + kopyala. */
export function SikSekliAlani({
  madde,
  harf,
  digerSekilVar,
  onCiz,
  onSekil,
  onKaldir,
  onTumSiklaraKopyala,
}: {
  madde: Madde;
  harf: string;
  /** Başka bir şıkta zaten şekil varsa kopyalama önce onay ister. */
  digerSekilVar: boolean;
  onCiz: () => void;
  onSekil: (sekil: SikSekli) => void;
  onKaldir: () => void;
  onTumSiklaraKopyala: () => void;
}) {
  const dosyaRef = useRef<HTMLInputElement | null>(null);
  const [hata, setHata] = useState("");
  const var_ = !!madde.gorselDataUrl;

  async function sekliAl(dosya: Blob | undefined) {
    if (!dosya) return;
    try {
      setHata("");
      onSekil(await sekilDosyasiniOku(dosya));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Görsel eklenemedi.");
    }
  }

  async function panodanYapistir() {
    try {
      const ogeler = await navigator.clipboard.read();
      for (const oge of ogeler) {
        const tur = oge.types.find((t) => t.startsWith("image/"));
        if (tur) {
          await sekliAl(await oge.getType(tur));
          return;
        }
      }
      setHata("Panoda görsel yok.");
    } catch {
      setHata("Pano okunamadı. Görseli dosyadan yükleyin.");
    }
  }

  const dugme =
    "inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition";
  return (
    <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-white p-2" data-testid={`sik-sekil-${harf}`}>
      <div className="flex items-start gap-2">
        {var_ ? (
          <img
            src={madde.gorselDataUrl}
            alt={`${harf} şıkkının şekli`}
            className="h-14 w-20 shrink-0 rounded border border-slate-200 bg-white object-contain"
          />
        ) : (
          <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
            şekil yok
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          <button
            type="button"
            onClick={onCiz}
            data-testid={`sik-sekil-ciz-${harf}`}
            className={`${dugme} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
          >
            <PenTool size={12} /> {var_ ? (madde.cizimVerisi ? "Şekli düzenle" : "Yeniden çiz") : "Şekil ekle"}
          </button>
          <button
            type="button"
            onClick={() => dosyaRef.current?.click()}
            className={`${dugme} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}
          >
            <Upload size={12} /> Görsel yükle
          </button>
          <button
            type="button"
            onClick={() => void panodanYapistir()}
            className={`${dugme} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}
          >
            <ImagePlus size={12} /> Yapıştır
          </button>
          {var_ && (
            <button
              type="button"
              onClick={onKaldir}
              data-testid={`sik-sekil-kaldir-${harf}`}
              className={`${dugme} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
            >
              <Trash2 size={12} /> Kaldır
            </button>
          )}
        </div>
      </div>
      {var_ && (
        <button
          type="button"
          onClick={() => {
            if (digerSekilVar && !window.confirm("Diğer şıklardaki şekiller bu şekille DEĞİŞTİRİLECEK. Devam edilsin mi?")) return;
            onTumSiklaraKopyala();
          }}
          data-testid={`sik-sekil-kopyala-${harf}`}
          className={`${dugme} mt-2 w-full border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
        >
          <Copy size={12} /> Bu şekli tüm şıklara kopyala
        </button>
      )}
      {hata && <p className="mt-1 text-[10px] font-medium text-rose-600">{hata}</p>}
      <input
        ref={dosyaRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          void sekliAl(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Sorunun şekilli şık düzeni ve şekil genişliği; yalnız şıklarda şekil varken gösterilir. */
export function SekilliSikAyarlari({
  soru,
  icerikGenislikMm,
  onChange,
  soruSekliniKopyala,
}: {
  soru: SoruOgesi;
  icerikGenislikMm: number;
  onChange: (patch: Partial<SoruOgesi>) => void;
  /** Sorunun ana şekli varsa onu tüm şıklara başlangıç olarak kopyalar. */
  soruSekliniKopyala?: () => void;
}) {
  const genislik = sekilliSikGenisligiMm(icerikGenislikMm);
  const olcu = sekilliSikOlcusu(soru, genislik);
  const sinir = sekilliSikGenislikSiniri(genislik, olcu.duzen, soru.maddeler.length);
  const secili: SikGorselDuzeni = soru.sikGorselDuzeni ?? "otomatik";
  const gosterilenMm = Math.round(Math.max(...olcu.gorselMm));
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2" data-testid="sekilli-sik-ayarlari">
      <AlanEtiket>Şekilli şık düzeni</AlanEtiket>
      <div className="mt-1 flex flex-wrap gap-1">
        {SEKILLI_SIK_DUZEN_ADLARI.map(([deger, ad]) => (
          <TogglePill key={deger} aktif={secili === deger} onClick={() => onChange({ sikGorselDuzeni: deger === "otomatik" ? undefined : deger })}>
            {ad}
          </TogglePill>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 items-end gap-2">
        <MmInput
          label="Şekil genişliği"
          value={soru.sikGorselGenislikMm ?? gosterilenMm}
          min={sinir.min}
          max={sinir.max}
          onChange={(mm) => onChange({ sikGorselGenislikMm: mm })}
        />
        <button
          type="button"
          disabled={soru.sikGorselGenislikMm === undefined}
          onClick={() => onChange({ sikGorselGenislikMm: undefined })}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Otomatik boy
        </button>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
        Şu an: {SEKILLI_SIK_DUZEN_ADLARI.find(([d]) => d === olcu.duzen)?.[1]} · hücre ≈ {Math.round(olcu.hucreMm)} mm · şekil ≈ {gosterilenMm} mm.
        Şekiller aynı ölçekle basılır; hücreler eşit boydadır.
      </p>
      {soruSekliniKopyala && (
        <button
          type="button"
          onClick={soruSekliniKopyala}
          data-testid="sik-soru-sekli-kopyala"
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Copy size={12} /> Sorunun şeklini tüm şıklara kopyala
        </button>
      )}
    </div>
  );
}
