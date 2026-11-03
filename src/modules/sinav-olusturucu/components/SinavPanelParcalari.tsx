// Sağ paneli oluşturan küçük, durumsuz parçalar: boş çalışma alanı,
// açılır bölüm, panel başlığı, mm girişi ve seçenek satırı.
//
// `MmInput` "yazarken sınırlama" hatasını bilerek çözmüş durumda: değeri
// blur/Enter'da uygular, her tuş vuruşunda değil. Yazarken sınırlamak
// "10" yazmak isteyen öğretmenin "1"ini anında alt sınıra çekiyordu.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { FileImage, Scissors, Type, UploadCloud } from "lucide-react";

import { INPUT_CLASS } from "../constants";

import { AlanEtiket } from "./ModalParcalari";
import { sayiSinirla } from "../utils";
import { kisayol } from "../lib/kisayol";

export function BosCalismaAlani({
  onGorsel,
  onMetin,
  onKirpma,
}: {
  onGorsel: () => void;
  onMetin: () => void;
  onKirpma: () => void;
}) {
  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[460px] max-sm:h-auto max-sm:min-h-0 max-sm:py-8 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white">
      <div className="max-w-xl px-6 text-center">
        <UploadCloud size={60} className="mx-auto text-slate-300" />
        <h2 className="mt-4 text-lg font-bold text-slate-700">
          Yazılı kağıdını hazırlamaya başlayın
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          <span className="oa-fare-ipucu">Soru görseli ekleyin, metin soru yazın ya da ekran görüntüsü aldığınız
          soruyu doğrudan <b>{kisayol("Ctrl+V")}</b> ile bu ekrana yapıştırın.</span>
          <span className="oa-dokun-ipucu">Aşağıdaki düğmelerle ya da üstteki <b>Soru ekle</b> menüsünden görsel,
          metin veya PDF'den soru ekleyin.</span> Sorular A4
          kağıda gerçek ölçüleriyle yerleştirilir; her sayfanın ne kadar
          dolduğunu üstteki çubuktan izleyebilirsiniz.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onGorsel}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <FileImage size={16} /> Soru Görseli Ekle
          </button>
          <button
            type="button"
            onClick={onMetin}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Type size={16} /> Metin Soru Ekle
          </button>
          <button
            type="button"
            onClick={onKirpma}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
          >
            <Scissors size={16} /> PDF'den Soru Kes
          </button>
        </div>
      </div>
    </div>
  );
}

// Eskiden her panel `renk` prop'uyla farklı bir kenarlık/ikon rengi
// (mavi/indigo/mor/teal/amber/yeşil/lacivert) alıyordu — anlamsal bir örüntü
// yoktu (Seçili Soru=mavi, Başlık=gri, Sayfa Düzeni=indigo, ...rastgele),
// uygulamanın geri kalanındaki sade renk diline aykırı, gökkuşağı gibi
// duruyordu (UI incelemesinde bulundu); renk sistemi tamamen kaldırıldı, tek
// tutarlı nötr stil. `AcilirBolum` artık Hızlı İşleme de kullandığı için
// `@/components/AcilirBolum`'a taşındı — burada yalnız re-export.
export { AcilirBolum } from "@/components/AcilirBolum";

export function PanelBaslik({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </h2>
  );
}

export function MmInput({
  label,
  value,
  onChange,
  min,
  max,
  unit = "mm",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  // Her tuş vuruşunda min/max'a kenetlemek, kullanıcı küçük bir sayı yazarken
  // (ör. "8" yazmaya çalışırken "1" anında min'e sabitlenip ardından "800"e
  // dönüşüyordu) yazmayla yarışıyordu. Serbest yazıma izin verip sınırlamayı
  // yalnızca odak kaybında (blur/Enter) uygularız.
  const [metin, setMetin] = useState(String(value));
  useEffect(() => {
    setMetin(String(value));
  }, [value]);

  function uygula() {
    const sayi = Math.round(Number(metin));
    onChange(sayiSinirla(Number.isFinite(sayi) ? sayi : value, min, max));
  }

  return (
    <label className="block">
      <AlanEtiket>
        {label} <span className="font-normal text-slate-400">({unit})</span>
      </AlanEtiket>
      <input
        type="number"
        min={min}
        max={max}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        onBlur={uygula}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={INPUT_CLASS}
      />
    </label>
  );
}

export function Secenek({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
      />
      {children}
    </label>
  );
}
