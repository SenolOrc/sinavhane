// Şekilli şıklar (A–E şıklarının her biri küçük bir devre/grafik/şekil) için
// saf (DOM'suz) yerleşim hesabı.
//
// Kâğıt (SinavKagit) ve kaba yükseklik tahmini (a4.kabaTahminMm) AYNI
// fonksiyonları kullanır; ayrışırlarsa ilk tahmin ile DOM ölçümü tutmaz.
// Gerçek sayfalama yine DOM'dan ölçülür — buradaki yükseklik ölçüm gelmeden
// önceki tahmin ve testlerin güvencesidir.
//
// Geometri: şıklar eşit boyutlu hücrelerden oluşan bir ızgaradır. Her hücrede
// üst solda harf ("A)"), altında şekil, en altta (varsa) şık metni başlık
// olarak durur. Şekiller AYNI ölçekle basılır: çizim editörü şekli içeriğe
// kırptığı için beş şeklin PNG boyu farklıdır; her birini kutuya sığacak
// biçimde büyütmek aynı pilin/ampulün şıktan şıka farklı boyda çıkması
// demekti. PNG genişliği bilinen şekiller doğal oranlarını korur; bilinmeyen
// (yüklenmiş fotoğraf vb.) şekiller kutuya sığdırılır.

import { PT_MM } from "../constants";
import type { Madde, SikGorselDuzeni, SoruOgesi } from "../types";
import { CIZIM_PNG_KALITE, htmlToText, pngGenislikPx } from "../utils";

export type SikGorselDuzenSecimi = Exclude<SikGorselDuzeni, "otomatik">;

/** Şık harfinin solunda numara oluğu: SinavKagit.numaraMm ile aynı olmak zorunda. */
export const SEKILLI_SIK_NUMARA_MM = 7;
export const SEKILLI_SIK_SUTUN_ARASI_MM = 3;
export const SEKILLI_SIK_SATIR_ARASI_MM = 3;
/** Harf satırı ile şekil arası. */
export const SEKILLI_SIK_HARF_ARASI_MM = 0.8;
/** Şekil yüksekliğinin üst sınırı: çok uzun bir şekil sayfayı doldurmasın. */
export const SEKILLI_SIK_AZAMI_YUKSEKLIK_MM = 60;
/** Otomatik kipte tek sütunda şeklin varsayılan azami genişliği. */
export const SEKILLI_SIK_VARSAYILAN_AZAMI_MM = 55;
/** Doğal boyun en çok bu kadar büyütülmesine izin verilir. */
export const SEKILLI_SIK_AZAMI_BUYUTME = 1.25;
export const SEKILLI_SIK_MIN_GENISLIK_MM = 12;
export const SEKILLI_SIK_AZAMI_GENISLIK_MM = 120;
const VARSAYILAN_ORAN = 1.35;

export const SEKILLI_SIK_DUZEN_ADLARI: readonly (readonly [SikGorselDuzeni, string])[] = [
  ["otomatik", "Otomatik"],
  ["yan5", "5 yan yana"],
  ["uc-iki", "3 + 2"],
  ["iki-sutun", "2 sütun"],
  ["tek", "Tek sütun"],
];

export function sekilliSikMi(soru: Pick<SoruOgesi, "maddeler">): boolean {
  return soru.maddeler.some((m) => !!m.gorselDataUrl);
}

/** Şekilli düzen yalnız Test kipinde çizilir/ölçülür (yazılı kipinde şık şekli yok sayılır). */
export function sekilliSikAktif(soru: Pick<SoruOgesi, "maddeler">, testModu?: boolean): boolean {
  return !!testModu && sekilliSikMi(soru);
}

export function sekilliSikSutunSayisi(duzen: SikGorselDuzenSecimi, adet: number): number {
  const n = Math.max(1, adet);
  switch (duzen) {
    case "yan5": return Math.min(n, 5);
    case "uc-iki": return Math.min(n, 3);
    case "iki-sutun": return Math.min(n, 2);
    default: return 1;
  }
}

function oranGecerli(oran: number | undefined): number {
  return typeof oran === "number" && Number.isFinite(oran) && oran > 0 ? Math.min(8, Math.max(0.25, oran)) : VARSAYILAN_ORAN;
}

/** Şekil PNG'sinin kâğıttaki doğal genişliği (mm); PNG değilse `null`. */
function dogalGenislikMm(dataUrl: string | undefined): number | null {
  const px = pngGenislikPx(dataUrl);
  return px ? ((px / CIZIM_PNG_KALITE) * 25.4) / 96 : null;
}

/** Şekilli şıkların kullanabileceği genişlik (mm) = içerik − numara oluğu. */
export function sekilliSikGenisligiMm(icerikGenislikMm: number): number {
  return Math.max(20, icerikGenislikMm - SEKILLI_SIK_NUMARA_MM);
}

function hucreGenisligiMm(genislikMm: number, kolon: number): number {
  return (genislikMm - (kolon - 1) * SEKILLI_SIK_SUTUN_ARASI_MM) / kolon;
}

/** Şekillerin tipik oranına göre okunur kalması için hücrenin en az olması gereken genişlik. */
function enAzHucreMm(tipikOran: number): number {
  return tipikOran >= 1.6 ? 40 : tipikOran >= 0.9 ? 30 : 24;
}

/** Şekilli şık oranlarının ortancası (şekli olmayan şıklar sayılmaz). */
function tipikOran(soru: Pick<SoruOgesi, "maddeler">): number {
  const oranlar = soru.maddeler.filter((m) => m.gorselDataUrl).map((m) => oranGecerli(m.gorselOran)).sort((a, b) => a - b);
  if (oranlar.length === 0) return VARSAYILAN_ORAN;
  return oranlar[Math.floor((oranlar.length - 1) / 2)];
}

/**
 * Otomatik düzen: en çok sütunlu düzenden başlayıp hücrenin okunur kalacağı ilk
 * düzeni seçer. 3+2 yalnız 5-6 şıkta aranır (4 şıkta "3+1" çirkin, 2 sütun
 * zaten 2+2). Hiçbiri yetmezse tek sütun.
 */
export function sekilliSikOtomatikDuzen(
  soru: Pick<SoruOgesi, "maddeler" | "sikGorselGenislikMm">,
  genislikMm: number,
): SikGorselDuzenSecimi {
  const n = soru.maddeler.length;
  const istenen = soru.sikGorselGenislikMm ?? enAzHucreMm(tipikOran(soru));
  const adaylar: SikGorselDuzenSecimi[] = n === 5 || n === 6 ? ["yan5", "uc-iki", "iki-sutun"] : ["yan5", "iki-sutun"];
  for (const aday of adaylar) {
    const k = sekilliSikSutunSayisi(aday, n);
    if (k === 1 && n > 1) continue;
    if (hucreGenisligiMm(genislikMm, k) >= istenen) return aday;
  }
  return "tek";
}

export function sekilliSikDuzeniCoz(
  soru: Pick<SoruOgesi, "maddeler" | "sikGorselDuzeni" | "sikGorselGenislikMm">,
  genislikMm: number,
): SikGorselDuzenSecimi {
  const secim = soru.sikGorselDuzeni;
  if (secim && secim !== "otomatik") return secim;
  return sekilliSikOtomatikDuzen(soru, genislikMm);
}

export type SekilliSikOlcusu = {
  duzen: SikGorselDuzenSecimi;
  kolon: number;
  satir: number;
  hucreMm: number;
  /** Şekil kutusunun yüksekliği (hücrede tüm şekillerin ortak alanı). */
  kutuYukMm: number;
  harfYukMm: number;
  /** Her şıkın şekil genişliği (mm); şekilsiz şıkta 0. */
  gorselMm: number[];
};

/** Şekil genişliklerini ve ortak kutu yüksekliğini hesaplar. */
export function sekilliSikOlcusu(
  soru: Pick<SoruOgesi, "maddeler" | "punto" | "sikGorselDuzeni" | "sikGorselGenislikMm">,
  genislikMm: number,
): SekilliSikOlcusu {
  const n = soru.maddeler.length;
  const duzen = sekilliSikDuzeniCoz(soru, genislikMm);
  const kolon = sekilliSikSutunSayisi(duzen, n);
  const hucreMm = hucreGenisligiMm(genislikMm, kolon);
  const hedefMm = Math.min(
    hucreMm,
    soru.sikGorselGenislikMm ?? Math.min(hucreMm, SEKILLI_SIK_VARSAYILAN_AZAMI_MM),
  );
  const figurler = soru.maddeler.map((m) =>
    m.gorselDataUrl
      ? { oran: oranGecerli(m.gorselOran), dogal: dogalGenislikMm(m.gorselDataUrl) }
      : null,
  );
  const dolu = figurler.filter((f): f is { oran: number; dogal: number | null } => f !== null);
  const hepsiDogalBiliniyor = dolu.length > 0 && dolu.every((f) => f.dogal !== null);
  let gorselMm = figurler.map((f) => {
    if (!f) return 0;
    if (hepsiDogalBiliniyor) {
      const enGenis = Math.max(...dolu.map((d) => d.dogal as number));
      const olcek = Math.min(hedefMm / enGenis, SEKILLI_SIK_AZAMI_BUYUTME);
      return (f.dogal as number) * olcek;
    }
    return hedefMm;
  });
  const yukler = (w: number[]) => w.map((mm, i) => (figurler[i] ? mm / (figurler[i] as { oran: number }).oran : 0));
  let kutuYukMm = Math.max(0, ...yukler(gorselMm));
  if (kutuYukMm > SEKILLI_SIK_AZAMI_YUKSEKLIK_MM) {
    const f = SEKILLI_SIK_AZAMI_YUKSEKLIK_MM / kutuYukMm;
    gorselMm = gorselMm.map((mm) => mm * f);
    kutuYukMm = SEKILLI_SIK_AZAMI_YUKSEKLIK_MM;
  }
  return {
    duzen,
    kolon,
    satir: Math.ceil(n / kolon),
    hucreMm,
    kutuYukMm,
    harfYukMm: soru.punto * PT_MM * 1.45,
    gorselMm,
  };
}

/** Başlık (şık metni) kaç satır tutar: hücre genişliğine ve punto'ya göre kaba tahmin. */
function baslikYukMm(metinHtml: string, hucreMm: number, punto: number): number {
  const metin = htmlToText(metinHtml).trim();
  if (!metin) return 0;
  const harfMm = punto * PT_MM * 0.5;
  const satirKarakter = Math.max(4, Math.floor(hucreMm / harfMm));
  return Math.ceil(metin.length / satirKarakter) * punto * PT_MM * 1.45;
}

/** Şekilli şık bloğunun toplam yüksekliği (mm), soru kökü ve boşluk HARİÇ. */
export function sekilliSikYuksekligiMm(
  soru: Pick<SoruOgesi, "maddeler" | "punto" | "sikGorselDuzeni" | "sikGorselGenislikMm">,
  genislikMm: number,
): number {
  const o = sekilliSikOlcusu(soru, genislikMm);
  let toplam = 0;
  for (let satir = 0; satir < o.satir; satir++) {
    let enYuksek = 0;
    for (let k = 0; k < o.kolon; k++) {
      const madde = soru.maddeler[satir * o.kolon + k];
      if (!madde) continue;
      const hucre = o.harfYukMm + (madde.gorselDataUrl ? SEKILLI_SIK_HARF_ARASI_MM + o.kutuYukMm : 0)
        + baslikYukMm(madde.metinHtml, o.hucreMm, soru.punto);
      enYuksek = Math.max(enYuksek, hucre);
    }
    toplam += enYuksek;
  }
  return toplam + Math.max(0, o.satir - 1) * SEKILLI_SIK_SATIR_ARASI_MM;
}

/** Düzenleme panelinde şeklin genişlik girdisi için izin verilen aralık. */
export function sekilliSikGenislikSiniri(genislikMm: number, duzen: SikGorselDuzenSecimi, adet: number) {
  const hucre = hucreGenisligiMm(genislikMm, sekilliSikSutunSayisi(duzen, adet));
  return { min: SEKILLI_SIK_MIN_GENISLIK_MM, max: Math.max(SEKILLI_SIK_MIN_GENISLIK_MM, Math.min(SEKILLI_SIK_AZAMI_GENISLIK_MM, Math.floor(hucre))) };
}

export type SikSekli = Pick<Madde, "gorselDataUrl" | "gorselOran" | "cizimVerisi">;

/**
 * "Bu şekli tüm şıklara kopyala": kaynak şekli diğer şıklara başlangıç olarak
 * yazar (kaynak şık `haricMaddeId` olarak verilirse dokunulmaz); öğretmen
 * yalnız farkları düzenler. Çizim belgesi DERİN kopyalanır — şıklar sonradan
 * bağımsız düzenlenir, ortak nesneyi paylaşırlarsa biri ötekini bozar.
 * Şık metni ve diğer alanlar korunur.
 */
export function sekliTumSiklaraKopyala(maddeler: Madde[], sekil: SikSekli, haricMaddeId?: string): Madde[] {
  if (!sekil.gorselDataUrl) return maddeler;
  return maddeler.map((madde) => {
    if (madde.id === haricMaddeId) return madde;
    const kopya: Madde = { ...madde, gorselDataUrl: sekil.gorselDataUrl };
    if (sekil.gorselOran !== undefined) kopya.gorselOran = sekil.gorselOran; else delete kopya.gorselOran;
    if (sekil.cizimVerisi) kopya.cizimVerisi = structuredClone(sekil.cizimVerisi); else delete kopya.cizimVerisi;
    return kopya;
  });
}

/** Şıktan şekli kaldırır (şık metni kalır). */
export function sekliKaldir(madde: Madde): Madde {
  const { gorselDataUrl: _g, gorselOran: _o, cizimVerisi: _c, ...kalan } = madde;
  return kalan;
}
