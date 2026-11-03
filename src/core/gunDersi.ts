// core/gunDersi.ts — OA73: "bu gün hangi dersin günüydü?" kuralı (SAF; UI ve DB bilmez).
//
// NEDEN VAR: aynı şubeye iki ders giren öğretmen (9-C Salı "Fizik", Perşembe "Seçmeli Fizik")
// için Hızlı İşleme işaretleri (↑/↓, kitap, Yok) iki dersin performansına birden yazılıyordu.
// Ders programı geçmiş günleri ayırmak için KULLANILAMAZ: ilk haftalarda program sık değişir,
// bugünkü program geçen haftanın Salı'sını yanlış derse taşır. Bu yüzden günün dersi KAYIT
// ANINDA (Hızlı İşleme'de seçili ders) GunlukIslendi.ders'e yazılır ve burada okunur.
import { dersAnahtari } from "@shared/types";

/** Kayıttaki ders sınıfın derslerinden biriyse sınıftaki adı; değilse undefined = ORTAK gün
 *  (iki derse de sayılır). Tek dersli sınıfta hep undefined: orada süzme hiç yapılmaz. */
export function gunDersiCoz(kayitliDers: string | undefined | null, sinifDersleri: string[]): string | undefined {
  if (sinifDersleri.length < 2 || !kayitliDers) return undefined;
  const a = dersAnahtari(kayitliDers);
  if (!a) return undefined;
  return sinifDersleri.find((d) => dersAnahtari(d) === a);
}

/** Gün istenen derse sayılır mı: dersi kayıtlı değilse (eski gün, telefon zarfı) ORTAKTIR → evet. */
export function gunDerseSayilir(gunDersi: string | undefined, ders: string): boolean {
  return gunDersi === undefined || dersAnahtari(gunDersi) === dersAnahtari(ders);
}

/** Günlük işaretlerin hangi derse göre süzüleceği. Tek dersli sınıfta undefined (süzme yok →
 *  notlar OA73 öncesiyle birebir). İki derslide verilen ders, verilmezse sınıfın ana (ilk) dersi —
 *  OA69'daki ödev/sınav kuralıyla (ogrenciSinavDersi, odevDerseUyar) aynı. */
export function gunlukSuzmeDersi(sinifDersleri: string[], ders?: string): string | undefined {
  if (sinifDersleri.length < 2) return undefined;
  return ders?.trim() || sinifDersleri[0];
}
