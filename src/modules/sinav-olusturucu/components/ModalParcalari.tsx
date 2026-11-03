import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useModalErisilebilirligi } from "@/lib/modalErisilebilirligi";
import { useDarEkran } from "@/lib/useDarEkran";

export function ModalKabuk({
  baslik,
  onClose,
  children,
  genislik = "max-w-lg",
  kapanabilir = true,
  tamYukseklik = false,
}: {
  baslik: string;
  onClose: () => void;
  children: ReactNode;
  genislik?: string;
  kapanabilir?: boolean;
  /**
   * Gövde 90vh'yi DOLDURUR ve içerik kendi içinde bölüşür (dikey esnek kolon).
   *
   * NEDEN OPSİYONEL: varsayılan davranışta modal içeriği kadar uzar ve tek
   * parça olarak kayar — kısa modallar için doğrusu bu. Ama çizim editöründe
   * araç çubuğu `sticky` olduğu için tuval, ekranın altında kalan artık bir
   * şeride sıkışıyordu; öğretmen "yaptıklarım görünmüyor" derken bunu
   * görüyordu. Bu kipte artan yeri tuval alıyor.
   */
  tamYukseklik?: boolean;
}) {
  const baslikId = useId();
  const diyalogRef = useRef<HTMLDivElement>(null);
  useModalErisilebilirligi({ containerRef: diyalogRef, onKapat: onClose, kapanabilir });
  // TELEFONDA TAM EKRAN (K10/T9/D16). 360 px'te "Metin Soru Ekle" ortalanmış
  // bir kart olarak açılıyor, Kaydet/Kapat ilk görünümde ekran dışında
  // kalıyordu. Dar ekranda pencere tüm ekranı kaplar; dış katman bilerek
  // `items-center justify-center` DEĞİL — index.css'teki genel "ortalanmış
  // modal" kuralı paneli 100dvh-1.5rem ile sınırlayıp kart gibi bırakırdı.
  const telefon = useDarEkran();
  return (
    <div className={telefon
      ? "fixed inset-0 z-50 flex flex-col bg-white"
      : "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"}>
      <div
        ref={diyalogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslikId}
        className={telefon
          ? `h-full w-full rounded-none bg-white p-4 ${tamYukseklik ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`
          : `w-full ${genislik} rounded-2xl bg-white p-5 shadow-2xl ${
          tamYukseklik
            ? "flex h-[90vh] flex-col overflow-hidden"
            : "max-h-[90vh] overflow-y-auto"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between">
          <h3 id={baslikId} className="text-base font-bold text-slate-800">{baslik}</h3>
          <MiniButon title="Kapat" onClick={onClose}>
            <X size={15} />
          </MiniButon>
        </div>
        <div className={tamYukseklik ? "mt-3 flex min-h-0 flex-1 flex-col" : "mt-3"}>{children}</div>
      </div>
    </div>
  );
}

/** Modalların alt eylem şeridi. Sağa yaslı, düğmeler arası boşluk sabit. */
//
// Dokunmatik ve dar ekranda şerit pencerenin altına YAPIŞIR (D16/T9): klavye
// açıkken ya da içerik uzunken Kaydet/Kapat pencerenin iç kaydırmasının
// altında kalıyor, öğretmen kaydetmek için klavyeyi kapatmak zorunda
// kalıyordu. Masaüstünde (fare, ≥ 640 px) görünüm değişmez.
export function ModalAlt({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:border-t max-sm:border-slate-100 max-sm:bg-white max-sm:px-4 max-sm:py-3 [@media(pointer:coarse)]:sticky [@media(pointer:coarse)]:bottom-0 [@media(pointer:coarse)]:z-10 [@media(pointer:coarse)]:border-t [@media(pointer:coarse)]:border-slate-100 [@media(pointer:coarse)]:bg-white [@media(pointer:coarse)]:py-3">
      {children}
    </div>
  );
}

// Modal alt düğmeleri.
//
// NEDEN BİLEŞEN: aynı `Vazgeç` düğmesi (aynı yedi Tailwind sınıfıyla) beş
// modalda birebir tekrarlıyordu; yanındaki onay düğmesi de yalnız rengi ve
// metniyle değişiyordu. Sınıf listesi kopyalandığı için modallar zaten
// AYRIŞMAYA başlamıştı: CizimEditoruModal'daki üç küçük onay `rounded-lg
// border px-3 py-2` kullanırken buradakiler `rounded-xl ... px-4 py-2`
// kullanıyordu. Tek kapı, Faz D madde 6'nın (modal standardı) da zeminidir.
export function VazgecDugmesi({
  onClick,
  etiket = "Vazgeç",
}: {
  onClick: () => void;
  etiket?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
    >
      {etiket}
    </button>
  );
}

/**
 * Modalın onay düğmesi. `yikici` bir renk tercihi değil ANLAM taşır: geri
 * alınamayan işlemler (sil, üzerine yaz, temizle) kırmızı olmalı — öğretmenin
 * yanlışlıkla basmasını zorlaştıran tek görsel ipucu bu.
 */
export function OnayDugmesi({
  onClick,
  yikici = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  yikici?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        yikici ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
      }`}
    >
      {children}
    </button>
  );
}

export function AlanEtiket({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold text-slate-500">{children}</span>
  );
}

export function MiniButon({
  title,
  onClick,
  danger = false,
  disabled = false,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function TogglePill({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onClick}
      className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
        aktif
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Kaydedilmemiş iş varken kapatma onayı — dört modalın ORTAK sorusu.
 *
 * `ModalKabuk` üzerine kurulu olması bir biçim tercihi değil: odak tuzağını,
 * Escape'i ve gövde kilidini oradan alıyor. Önceki hâllerinde bunların hiçbiri
 * yoktu (Çizim elle katman çiziyordu, ikisi `window.confirm` kullanıyordu).
 * İç içe modal `useModalErisilebilirligi`'nin yığın mantığıyla zaten
 * destekleniyor: Escape en üstteki modala gider.
 *
 * Onay düğmesi `yikici` — iş gerçekten atılıyor, geri alınamıyor.
 */
export function KaydedilmemisUyarisi({
  baslik,
  aciklama,
  atEtiketi = "Kapat ve at",
  vazgecEtiketi = "Vazgeç",
  onVazgec,
  onAt,
}: {
  baslik: string;
  aciklama: string;
  atEtiketi?: string;
  /**
   * Etiketler bilerek değiştirilebilir. Tek standart TEK METİN demek değil:
   * "Çizime dön" / "Kaydetmeden kapat", genel "Vazgeç" / "Kapat ve at"tan daha
   * iyi çünkü sonucu adıyla söylüyorlar. Standartlaşan şey davranış, odak
   * tuzağı ve görünüm — sözcükler değil. (Bu ayrımı `cizim:ui` testi yakaladı:
   * etiketi tekdüzeleştirmek gerçek bir UX gerilemesiydi.)
   */
  vazgecEtiketi?: string;
  onVazgec: () => void;
  onAt: () => void;
}) {
  return (
    <ModalKabuk baslik={baslik} onClose={onVazgec} genislik="max-w-sm">
      <p className="text-sm leading-relaxed text-slate-600">{aciklama}</p>
      <ModalAlt>
        <VazgecDugmesi onClick={onVazgec} etiket={vazgecEtiketi} />
        <OnayDugmesi yikici onClick={onAt}>{atEtiketi}</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}
