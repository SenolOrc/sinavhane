import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui";

/**
 * Kaydedilmemiş değişiklik varken ekrandan çıkışı yakalar.
 * `onKaydet` verilirse birincil eylem "Kaydet ve çık" olur (2026-09 telefon
 * denetimi: yalnız "bırak" seçeneği vardı; aceleyle kırmızıya basan öğretmen
 * işaretlerini kaybediyor, kaydetmek için dört adım geri dönmek gerekiyordu).
 *
 * OA53 (okulda yaşanan tuzak): Ayarlar → Performans şablonunda toplam %100
 * değilken "Kaydet ve çık" sessizce başarısız oluyor, pencere kapanıyor ve
 * öğretmen ekranda kalıyordu; tekrar çıkmaya çalışınca aynı pencere. Hangi
 * düğmeye basarsa bassın "bir şey değişmiyor" gibi görünüyordu.
 * Artık:
 * - `kaydetEngeli` (ör. "Grupların toplamı %100 olmalı") verilirse "Kaydet ve
 *   çık" kilitli ve sebep pencerede yazılı;
 * - `onKaydet` false dönerse pencere AÇIK kalır, sebep pencerede görünür;
 * - "Kaydetmeden çık" gizli bir bağlantı değil, açık bir düğme;
 * - "Ekranda kal" `onKal` ile değişikliğin olduğu yere götürebilir.
 */
export function KaydedilmemisDegisiklikKoruyucu({ etkin, onKaydet, kaydetEngeli, onKal, yer, uyari }: {
  etkin: boolean;
  onKaydet?: () => boolean | void;
  /** Kaydetmeyi engelleyen durum (geçersiz değer). Pencerede gösterilir. */
  kaydetEngeli?: string | null;
  /** "Ekranda kal" / "Düzeltmeye git" sonrası (ör. ilgili bölüme kaydır). */
  onKal?: () => void;
  /** Değişikliğin nerede olduğu, ör. "Performans şablonu". */
  yer?: string;
  /** "Kaydet ve çık"tan önce okunması gereken etki (ör. "78 öğrencinin notu değişir"). Ekranın
   *  kendi Kaydet onayı bu yolda da atlanmasın diye pencerede gösterilir (denetim 2026-10). */
  uyari?: string | null;
}) {
  const engelleyici = useBlocker(etkin);
  const [kaydetHatasi, setKaydetHatasi] = useState("");

  useEffect(() => {
    if (!etkin) return undefined;
    const uyari = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", uyari);
    return () => window.removeEventListener("beforeunload", uyari);
  }, [etkin]);

  const acik = engelleyici.state === "blocked";
  useEffect(() => { if (!acik) setKaydetHatasi(""); }, [acik]);

  const kal = () => { engelleyici.reset?.(); onKal?.(); };
  const yerMetni = yer ? `${yer} bölümünde kaydedilmemiş değişiklik var.` : "Bu ekranda kaydedilmemiş değişiklik var.";

  if (onKaydet) {
    const engel = kaydetEngeli || kaydetHatasi;
    return (
      <ConfirmDialog
        open={acik}
        title="Kaydedilmemiş değişiklikler var"
        description={engel ? `${yerMetni} Şu an kaydedilemiyor.` : `${yerMetni} Çıkmadan önce kaydedelim mi?`}
        confirmLabel={engel ? "Düzeltmeye git" : "Kaydet ve çık"}
        cancelLabel="Ekranda kal"
        tone="primary"
        onConfirm={() => {
          if (engel) { kal(); return; }
          if (onKaydet() === false) {
            setKaydetHatasi("Kaydedilemedi. Ekrandaki kırmızı uyarıyı düzeltin ya da değişiklikleri bırakıp çıkın.");
            return;
          }
          engelleyici.proceed?.();
        }}
        onClose={kal}
      >
        {engel && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{engel}</p>}
        {!engel && uyari && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-900">{uyari}</p>}
        <button type="button" onClick={() => engelleyici.proceed?.()}
          className="min-h-11 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
          Kaydetmeden çık (değişiklikler kaybolur)
        </button>
      </ConfirmDialog>
    );
  }
  return (
    <ConfirmDialog
      open={acik}
      title="Kaydedilmemiş değişiklikler var"
      description="Bu ekrandan şimdi ayrılırsanız son değişiklikleriniz kaybolabilir. Ayrılmadan önce kaydın tamamlanmasını bekleyebilirsiniz."
      confirmLabel="Değişiklikleri bırak"
      cancelLabel="Ekranda kal"
      onConfirm={() => engelleyici.proceed?.()}
      onClose={kal}
    />
  );
}
