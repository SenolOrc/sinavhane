// modules/ders-kitabi/lib/kirpmaOnizleme.ts — kırpma/bölge-notu OLUŞTURULDUĞU
// ANDA, PDF'e yeniden gitmeden, okuyucuda ZATEN render edilmiş sayfa canvas'ından
// küçük bir önizleme üretir (genişlik ~480px, JPEG 0.8). packages/shared'daki
// seçim-geometrisi yardımcısı (yalnızca OKUNUR, değiştirilmez) CSS-piksel → canvas-
// piksel dönüşümü için kullanılır; asıl küçültme/kırpma burada, ders-kitabi'ne özgü.
import { secimCanvasPikseline, type Dikdortgen } from "@shared/pdf-kirpma";

// 2026-09 denetimi: 160 px havuzda bulanıktı, sorular tanınmıyordu. Önizleme
// IndexedDB'de saklanır (ana veritabanı JSON'unu şişirmez).
// Denetim (2026-10, B5): ölçü artık GENİŞLİK 480 px (uzun kenar 400 değil). Soru
// kırpmaları yatay ağırlıklı; kart/büyük önizleme genişliğe göre çizildiğinden yazı
// okunur kalsın. Çok uzun-dar kırpma dosyayı şişirmesin diye uzun kenar 960 px'te kesilir.
export const ONIZLEME_HEDEF_GENISLIK_PX = 480;
export const ONIZLEME_AZAMI_UZUN_KENAR_PX = 960;
const JPEG_KALITE = 0.8;

/** Kaynak boyutundan önizleme ölçeği (büyütmez). PDF'ten yeniden üretimde de aynı kural. */
export function onizlemeOlcegi(w: number, h: number): number {
  return Math.min(1, ONIZLEME_HEDEF_GENISLIK_PX / Math.max(w, 1), ONIZLEME_AZAMI_UZUN_KENAR_PX / Math.max(w, h, 1));
}

/** Denetim (2026-10, B5): eski (uzun kenarı 160 px) önizleme mi? Görüntülenirken PDF'ten
 *  tembel olarak 480 px'e yenilenir (lib/onizlemeYenile.ts). */
export function eskiKucukOnizlemeMi(dogalW: number, dogalH: number): boolean {
  return dogalW > 0 && dogalH > 0 && Math.max(dogalW, dogalH) <= 200;
}

export function kirpmaOnizlemesiUret(
  canvas: HTMLCanvasElement,
  cssKutu: Dikdortgen,
  cssBoyutu: { width: number; height: number },
): { dataUrl: string; genislik: number } {
  const pikselKutu = secimCanvasPikseline(cssKutu, cssBoyutu, canvas);
  const olcek = onizlemeOlcegi(pikselKutu.w, pikselKutu.h);
  const cikisW = Math.max(1, Math.round(pikselKutu.w * olcek));
  const cikisH = Math.max(1, Math.round(pikselKutu.h * olcek));
  const out = document.createElement("canvas");
  out.width = cikisW;
  out.height = cikisH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas oluşturulamadı.");
  ctx.drawImage(canvas, pikselKutu.x, pikselKutu.y, pikselKutu.w, pikselKutu.h, 0, 0, cikisW, cikisH);
  // Genişlik de döner: ekrandaki canvas küçükse (uzaklaştırılmış sayfa) çağıran taraf
  // 480 px'lik sürümü PDF'ten arka planda üretir (lib/onizlemeYenile.ts).
  return { dataUrl: out.toDataURL("image/jpeg", JPEG_KALITE), genislik: cikisW };
}
