// core/odevAyar.ts — ödev ayarları (OA59): ağırlık, işaretli ödevde "yapmadı" puanı, bağlı performans notu.
// SAF. Varsayılan hep "ayar yok": ağırlık 1, yapmadı 0, bütün notlara sayılır — eski ödevler aynen çalışır.

export const ODEV_AGIRLIK_EN_AZ = 0.5;
export const ODEV_AGIRLIK_EN_COK = 10;

/** Geçerliyse sayı, geçersizse ya da varsayılana (1) eşitse undefined. */
export function odevAgirligiGecerli(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < ODEV_AGIRLIK_EN_AZ || v > ODEV_AGIRLIK_EN_COK || v === 1) return undefined;
  return Math.round(v * 100) / 100;
}

/** "Yapmadı (−)" puanı: 0 varsayılan (undefined); 1–99 geçerli. */
export function odevEksiPuaniGecerli(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 100) return undefined;
  return Math.round(v * 10) / 10;
}

/** Bağlı performans notu: 1, 2 ya da 3 (e-Okul sütunu). */
export function odevNotNoGecerli(v: unknown): number | undefined {
  return v === 1 || v === 2 || v === 3 ? v : undefined;
}

export interface AgirlikliOdev { puan100: number; agirlik?: number }

/** Ağırlıklı ortalama; ödev yoksa null. Ağırlık boş = 1.
 *  OA74: sonuç girdinin SIRASINA bağlı olmamalı — kayan nokta toplamı sıraya duyarlı olduğu için
 *  aynı ödevler farklı sırayla gelince 70.74 / 70.74000000000001 çıkıyordu (fuzz "karistirma").
 *  Toplama değere göre sıralanmış kopya üzerinde yapılır ve sonuç 1e-9'a yuvarlanır. */
export function odevAgirlikliOrtalama(liste: AgirlikliOdev[]): number | null {
  if (!liste.length) return null;
  const sirali = liste
    .map((x) => ({ p: x.puan100, w: x.agirlik !== undefined && x.agirlik > 0 ? x.agirlik : 1 }))
    .sort((x, y) => x.p - y.p || x.w - y.w);
  let t = 0, a = 0;
  for (const x of sirali) {
    t += x.p * x.w;
    a += x.w;
  }
  // OA93: eskiden 9 ondalığa KESİLİYORDU (Math.round(x*1e9)/1e9): 575/6 = 95,8333… → 95,833333333;
  // 0,6×bu + 0,4×92,5 = 94,4999999998 → e-Okul'a 95 yerine 94 gidiyordu. 15 anlamlı basamak kayan
  // nokta gürültüsünü siler ama değeri kesmez; son yuvarlama (notBasamak) 12 basamakla doğru sonuca varır.
  return a > 0 ? Number((t / a).toPrecision(15)) : null;
}
