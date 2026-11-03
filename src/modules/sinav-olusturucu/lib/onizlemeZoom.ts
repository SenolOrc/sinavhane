/**
 * Kâğıt önizlemesinin EKRAN ölçeği.
 *
 * Kâğıt sabit 700 px genişlikte çiziliyor (`MM_PX = 700 / 210`), yani gerçek
 * A4'ün 96 dpi'daki genişliğinin (~794 px) altında. Büyük ekranda kâğıt küçük
 * kalıyor ve öğretmen yazının/görselin gerçekte ne kadar yer kapladığını
 * ancak çıktı alınca görebiliyordu.
 *
 * ÖNEMLİ — `MM_PX` bu iş için DEĞİŞTİRİLEMEZ: sayfalama matematiği de
 * (`layout/a4.ts`, kapasite hesapları) o sabitten besleniyor. Onu oynatmak
 * §15.5'te kapatılan A4 hizasını geri kırar. Bu yüzden ölçek yalnız bir CSS
 * `transform` — yerleşim ve sayfalama zoom'dan HABERSİZ kalır, çıktı da öyle.
 */

const ANAHTAR = "ogretmen-asistani.sinav.onizleme-zoom.v1";

/** Kâğıdın çizildiği piksel genişliği (A4_GENISLIK_MM * MM_PX = 210 * 700/210). */
export const KAGIT_PIKSEL_GENISLIK = 700;

export const ZOOM_ADIMLARI = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const VARSAYILAN_ZOOM = 1;

export function zoomSinirla(deger: number): number {
  const ilk = ZOOM_ADIMLARI[0];
  const son = ZOOM_ADIMLARI[ZOOM_ADIMLARI.length - 1];
  return Math.min(son, Math.max(ilk, deger));
}

/** Bir adım büyüt/küçült. Listedeki en yakın komşuya gider. */
export function zoomAdimla(mevcut: number, yon: 1 | -1): number {
  const sirali = [...ZOOM_ADIMLARI];
  if (yon === 1) return sirali.find((adim) => adim > mevcut + 0.001) ?? sirali[sirali.length - 1];
  return [...sirali].reverse().find((adim) => adim < mevcut - 0.001) ?? sirali[0];
}

export function zoomOku(): number {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    const deger = ham ? Number(ham) : NaN;
    return Number.isFinite(deger) ? zoomSinirla(deger) : VARSAYILAN_ZOOM;
  } catch {
    return VARSAYILAN_ZOOM;
  }
}

export function zoomKaydet(deger: number): void {
  try {
    localStorage.setItem(ANAHTAR, String(zoomSinirla(deger)));
  } catch {
    // Tercih yardımcıdır; kapalı depolama önizlemeyi engellemez.
  }
}
