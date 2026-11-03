// core/donem.ts — SAF FONKSİYON (UI yok, DB yok). Dönem Yaşam Döngüsü'nün Yıl
// Sonu birleştirme kuralı TEK burada yaşar (Öğrenci Kartı, Raporlar, ŞÖK bu
// dosyadan okur — kural kopyalanmaz).
//
// İLKE: veri türüne göre birleştirme farklıdır.
//  - Sınav/performans TOPLAM puanı: D1 ve D2 sonucu AYRI hesaplanıp ortalanır
//    (tüm notların tek havuzda ortalaması DEĞİL). Tek dönemin verisi varsa
//    Yıl Sonu = o dönem.
//  - Katılım/ödev: havuzlama (bu dosyanın DIŞINDA — lib/ogrenciPerformans.ts
//    D1+D2 etiketli ham kayıtları birleştirip core/performans.ts'e verir).
//  - Devamsızlık/MEBİ: her zaman güncel kümülatif değer; dönem kırılımı
//    istenirse D1 anlık görüntüsünden (DonemSnapshot) çıkarılır, ASLA tahmin
//    edilmez — snapshot yoksa "hesaplanamıyor" döner.

import { notYuvarla, dortBasamak } from "@/core/notBasamak";
import type { PerformansSonuc } from "@shared/types";

export type DonemSecim = 1 | 2 | "yil";

/** Dönem sonucu + yuvarlanmamış dönem değeri (öğretmen kararı OA74, MEB md. 51: bölme virgülden sonra
 *  4 basamak yürütülür). `toplamPuanHam` yoksa (eski çağıran) `toplamPuan` kullanılır. */
export type DonemPerformansSonucu = PerformansSonuc & { toplamPuanHam?: number };

/**
 * Sınav/performans toplam puanının Yıl Sonu birleştirmesi: iki dönem sonucu
 * ayrı hesaplanıp (aynı ağırlıklı ortalama biçiminde) ortalanır. Gruplar da
 * (şeffaflık için) aynı şekilde ortalanır; bir dönemde veri yoksa diğer
 * dönemin grup değeri aynen kullanılır.
 *
 * KURAL (öğretmen kararı, OA74): yıl sonu = YUVARLANMAMIŞ dönem değerlerinin ortalaması (4 basamak),
 * nota yalnız EN SONDA yuvarlanır. Eskiden ekranda görünen yuvarlanmış D1/D2 ortalanıyordu:
 * 76,6 ve 62,3 (tam sayı) → (77 + 62) / 2 = 69,5 → 70; şimdi (76,6 + 62,3) / 2 = 69,45 → 69.
 * D1/D2 sütunları ekranda yine yuvarlanmış görünür.
 */
export function yilSonuSonucBirlestir(
  d1: DonemPerformansSonucu | null,
  d2: DonemPerformansSonucu | null,
): DonemPerformansSonucu | null {
  if (!d1 && !d2) return null;
  if (!d1) return d2;
  if (!d2) return d1;
  const gruplar: Record<string, number> = {};
  const anahtarlar = new Set([...Object.keys(d1.gruplar), ...Object.keys(d2.gruplar)]);
  for (const k of anahtarlar) {
    const a = d1.gruplar[k];
    const b = d2.gruplar[k];
    if (a == null && b == null) continue; // iki dönemde de verisiz → kırılımda yok
    gruplar[k] = a != null && b != null ? notYuvarla((a + b) / 2) : (a ?? b)!;
  }
  // Bir grup YIL SONU'nda yalnız İKİ dönemde de verisizse eksiktir; tek dönemde
  // bile verisi varsa (yukarıda o dönemin değeri kullanıldı) eksik sayılmaz.
  const e2 = new Set(d2.eksikGruplar ?? []);
  const eksikGruplar = (d1.eksikGruplar ?? []).filter((g) => e2.has(g));
  const ham = dortBasamak(((d1.toplamPuanHam ?? d1.toplamPuan) + (d2.toplamPuanHam ?? d2.toplamPuan)) / 2);
  return {
    ogrenciId: d1.ogrenciId,
    toplamPuan: notYuvarla(ham),
    toplamPuanHam: ham,
    gruplar,
    eksikGruplar,
  };
}

export interface KirilimSonucu {
  d1: number | null;
  d2: number | null;
  hesaplanamiyor: boolean;
  /** OA94: güncel < snapshot (e-Okul 1. dönemi sonradan düşürmüş) — D2 0'a kırpılmaz, null + bu işaret. */
  tutarsiz?: boolean;
}

/**
 * Devamsızlık/MEBİ gibi kümülatif sayaçların dönem kırılımı: D1 = snapshot
 * anındaki değer, D2 = güncel − snapshot. Snapshot alınmamışsa TAHMİN ETMEZ,
 * hesaplanamıyor: true döner (D1/D2 null).
 */
export function kumulatifKirilimHesapla(guncel: number, d1SnapshotDegeri?: number): KirilimSonucu {
  if (d1SnapshotDegeri == null) return { d1: null, d2: null, hesaplanamiyor: true };
  const fark = Number((guncel - d1SnapshotDegeri).toPrecision(12));
  if (fark < 0) return { d1: d1SnapshotDegeri, d2: null, hesaplanamiyor: false, tutarsiz: true };
  return { d1: d1SnapshotDegeri, d2: fark, hesaplanamiyor: false };
}
