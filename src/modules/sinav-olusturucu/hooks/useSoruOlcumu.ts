// Soru yüksekliklerinin GERÇEK ölçümü.
//
// Gizli ölçüm alanındaki her soru, önizlemeyle birebir aynı bileşenle ve aynı
// genişlikte çizilir; `offsetHeight` mm'ye çevrilir. Sayfalayıcı (`layout/a4`)
// bu ölçülere dayanır — buradaki bir hata "ekranda sığıyor, kâğıtta taşıyor"
// sınıfının tamamını üretir.
//
// NEDEN AYRI DOSYA: DEVAM.md §9.5'te "doğru uzun vadeli çözüm ölçümü
// hooks/useSoruOlcumu.ts'e taşımak" diye yazılıydı (Faz D madde 3). Ekran
// dosyasında dururken efekt, kendisiyle hiç ilgisi olmayan onlarca state'in
// arasında kalıyordu ve dizisizliğinin bilinçli olduğu ancak uzun bir yorumla
// savunulabiliyordu. Kendi dosyasında sözleşmesi görünür: bir ref ver, ölçüleri
// al.

import { useLayoutEffect, useRef, useState } from "react";
import { MM_PX } from "../constants";
import { BOLME_OLCUM_ESIGI_MM, type BlokOlcusu } from "../layout/soruBolme";
import { blokUstPx, ustDuzeyBloklar } from "../layout/metinBloklari";

/** Ölçüm alanındaki bir öğeyi sorusuna bağlayan öznitelik. */
export const OLCUM_ID_ONITELIGI = "data-olcum-id";

/**
 * Ölçüm alanına takılacak ref ile soru id → yükseklik (mm) haritasını döndürür.
 *
 * Kullanım: dönen `olcumRef` gizli ölçüm kabına, her soru öğesine de
 * `data-olcum-id={soru.id}` verilir.
 */
export function useSoruOlcumu() {
  const olcumRef = useRef<HTMLDivElement | null>(null);
  const [yukseklikler, setYukseklikler] = useState<Record<string, number>>({});
  // Çok uzun soruların üst düzey metin bloklarının konumları (mm); yalnız
  // sayfaya bölünebilecek kadar uzun sorular için tutulur (bkz. layout/soruBolme).
  const [bloklar, setBloklar] = useState<Record<string, BlokOlcusu>>({});

  // BAĞIMLILIK DİZİSİ BİLEREK YOK — eklemeyin. Yerleşimi etkileyen girdiler
  // (punto, sütun düzeni, kenar boşluğu, metin içeriği, görsel genişliği, madde
  // sayısı, BEP punto artışı…) onlarca ve iç içe; eksik bir dizi ölçümü ESKİ
  // değerde dondurur ve sonuç SESSİZCE yanlış sayfalama olur — hata vermez,
  // yalnız çıktı bozulur. Her render'dan sonra ölçmek bu sınıfın tamamını
  // imkânsız kılıyor. Döngüyü 0.4 mm toleranslı karşılaştırma kesiyor: değer
  // değişmediyse ESKİ nesne referansı döndürülür, React re-render'dan vazgeçer.
  // Ölçüm alanı `visibility:hidden` (display:none DEĞİL) olduğu için
  // offsetHeight gerçek; görsellerin yüksekliği de CSS aspect-ratio'dan geldiği
  // için (bkz. SinavKagit'teki anaGorsel) decode'u beklemek gerekmiyor.
  useLayoutEffect(() => {
    const kok = olcumRef.current;
    if (!kok) return;
    const yeni: Record<string, number> = {};
    const yeniBlok: Record<string, BlokOlcusu> = {};
    kok.querySelectorAll<HTMLElement>(`[${OLCUM_ID_ONITELIGI}]`).forEach((el) => {
      const id = el.getAttribute(OLCUM_ID_ONITELIGI);
      if (!id) return;
      yeni[id] = el.offsetHeight / MM_PX;
      if (yeni[id] < BOLME_OLCUM_ESIGI_MM) return;
      const ust = el.getBoundingClientRect().top;
      const yuvarla = (px: number) => Math.round(((px - ust) / MM_PX) * 10) / 10;
      const kok = el.querySelector<HTMLElement>("[data-onizleme-id]");
      const metinSorusu = kok?.getAttribute("data-soru-tur") === "metin";
      // Soru köküne ait zengin metin: maddelerin içindekiler sayılmaz.
      const metin = Array.from(el.querySelectorAll<HTMLElement>("[data-zengin-kok]")).find(
        (e) => !e.closest("[data-madde-oge]"),
      );
      const gruplar = metinSorusu && metin ? ustDuzeyBloklar(metin) : [];
      const maddeler = Array.from(el.querySelectorAll<HTMLElement>("[data-madde-oge]"));
      // Bölünecek bir şey yok: tek blok ve (satır arası kesilebilir) madde yok.
      if (gruplar.length < 2 && maddeler.length === 0) return;
      yeniBlok[id] = {
        ustMm: gruplar.map((g) => yuvarla(blokUstPx(g))),
        toplamMm: yeni[id],
        ...(maddeler.length > 0
          ? { maddeUstMm: maddeler.map((m) => yuvarla(m.getBoundingClientRect().top)) }
          : {}),
      };
    });
    setBloklar((eski) =>
      JSON.stringify(eski) === JSON.stringify(yeniBlok) ? eski : yeniBlok,
    );
    setYukseklikler((eski) => {
      const eskiIdler = Object.keys(eski);
      const yeniIdler = Object.keys(yeni);
      const degismedi =
        eskiIdler.length === yeniIdler.length &&
        yeniIdler.every(
          (id) => Math.abs((eski[id] ?? -999) - (yeni[id] ?? 0)) < 0.4,
        );
      return degismedi ? eski : yeni;
    });
  });

  return { olcumRef, yukseklikler, bloklar };
}
